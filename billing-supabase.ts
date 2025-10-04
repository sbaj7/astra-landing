import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const DEFAULT_RETURN_URL = Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5174";

// Stripe configuration
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10"
});

// Price ID mapping for your plans
const PRICE_IDS = {
  plus: "price_1SE9M8G09pqeBTCI5Mob7OU8",      // $30 Plus tier
  pro: "price_1SE9MHG09pqeBTCIEOlxQ97F"        // $70 Pro tier
};

// Reverse mapping for subscription lookups
const PLAN_BY_PRICE_ID: Record<string, string> = {
  [PRICE_IDS.plus]: "plus",
  [PRICE_IDS.pro]: "pro"
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "trialing",
  "active",
  "past_due"
]);

function deriveSubscriptionStatus(
  planKey: string | null,
  subscription: Stripe.Subscription | null
): string {
  if (planKey && subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return planKey;
  }
  return "free";
}

// Supabase configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment configuration");
}

const createSupabaseClient = () => createClient(supabaseUrl, supabaseKey);

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
};

type AuthUserRecord = {
  id: string;
  auth0_id: string;
  email?: string | null;
  full_name?: string | null;
  metadata?: Record<string, any> | null;
  subscription_status?: string | null;
};

type HandlerResponse = {
  status: number;
  body: Record<string, any>;
};

type StripeCustomerResult = {
  customer: Stripe.Customer;
  authUser: AuthUserRecord;
};

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneMetadata(metadata: unknown): Record<string, any> {
  return isRecord(metadata) ? { ...metadata } : {};
}

function normalizePlanKeyInput(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeFullName(supabaseUser: SupabaseUser): string {
  const metadata = isRecord(supabaseUser.user_metadata) ? supabaseUser.user_metadata : {};
  return (
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (typeof supabaseUser.email === "string" && supabaseUser.email.trim()) ||
    "User"
  );
}

async function ensureAuthUserRecord(
  supabase: SupabaseClient,
  supabaseUser: SupabaseUser
): Promise<AuthUserRecord> {
  const { data: existingUser, error } = await supabase
    .from("auth_users")
    .select("*")
    .eq("auth0_id", supabaseUser.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (existingUser) {
    return existingUser as AuthUserRecord;
  }

  const now = new Date().toISOString();
  const incomingMetadata = isRecord(supabaseUser.user_metadata) ? supabaseUser.user_metadata : {};
  const metadata = {
    avatar_url: incomingMetadata.avatar_url || incomingMetadata.picture || null,
    supabase_profile: incomingMetadata,
    first_login: now,
    last_login: now
  };

  const { data: newUser, error: insertError } = await supabase
    .from("auth_users")
    .insert({
      auth0_id: supabaseUser.id,
      email: supabaseUser.email || "",
      full_name: normalizeFullName(supabaseUser),
      metadata,
      subscription_status: "free",
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return newUser as AuthUserRecord;
}

async function persistAuthUserMetadata(
  supabase: SupabaseClient,
  user: AuthUserRecord,
  metadata: Record<string, any>,
  additionalFields: Record<string, any> = {}
): Promise<AuthUserRecord> {
  const payload: Record<string, any> = {
    metadata,
    updated_at: new Date().toISOString(),
    ...additionalFields
  };

  const { data, error } = await supabase
    .from("auth_users")
    .update(payload)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update auth_users metadata", error);
    return { ...user, metadata };
  }

  return data as AuthUserRecord;
}

async function getOrCreateStripeCustomer(
  supabaseUser: SupabaseUser,
  supabaseClient: SupabaseClient,
  authUser: AuthUserRecord
): Promise<StripeCustomerResult> {
  const existingMetadata = cloneMetadata(authUser.metadata);
  const normalizedFullName = normalizeFullName(supabaseUser);
  const nowIso = new Date().toISOString();

  let stripeCustomerId =
    typeof existingMetadata.stripe_customer_id === "string" && existingMetadata.stripe_customer_id.trim()
      ? existingMetadata.stripe_customer_id.trim()
      : null;

  let customer: Stripe.Customer | null = null;

  if (stripeCustomerId) {
    try {
      const retrieved = await stripe.customers.retrieve(stripeCustomerId);
      if ("deleted" in retrieved) {
        stripeCustomerId = null;
      } else {
        customer = retrieved;
      }
    } catch (customerError) {
      console.warn("Unable to load Stripe customer via stored id", customerError);
      stripeCustomerId = null;
    }
  }

  if (!customer && supabaseUser.email) {
    const existingCustomers = await stripe.customers.list({
      email: supabaseUser.email,
      limit: 1
    });
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    }
  }

  if (!customer) {
    if (!supabaseUser.email) {
      throw new Error("User email is required for Stripe operations");
    }
    customer = await stripe.customers.create({
      email: supabaseUser.email,
      name: normalizedFullName,
      metadata: {
        supabase_user_id: supabaseUser.id
      }
    });
  } else {
    customer = await stripe.customers.update(customer.id, {
      email: supabaseUser.email || customer.email || undefined,
      name: normalizedFullName || customer.name || undefined,
      metadata: {
        ...customer.metadata,
        supabase_user_id: supabaseUser.id
      }
    });
  }

  const metadata = {
    ...existingMetadata,
    stripe_customer_id: customer.id,
    stripe_customer_email: customer.email ?? supabaseUser.email ?? existingMetadata.stripe_customer_email ?? null,
    stripe_customer_name: customer.name ?? normalizedFullName ?? existingMetadata.stripe_customer_name ?? null,
    last_billing_sync_at: nowIso
  };

  const additionalFields: Record<string, any> = {};
  if (supabaseUser.email && supabaseUser.email !== authUser.email) {
    additionalFields.email = supabaseUser.email;
  }
  if (normalizedFullName && normalizedFullName !== authUser.full_name) {
    additionalFields.full_name = normalizedFullName;
  }

  const needsUpdate =
    metadata.stripe_customer_id !== existingMetadata.stripe_customer_id ||
    metadata.stripe_customer_email !== existingMetadata.stripe_customer_email ||
    metadata.stripe_customer_name !== existingMetadata.stripe_customer_name ||
    metadata.last_billing_sync_at !== existingMetadata.last_billing_sync_at ||
    Object.keys(additionalFields).length > 0;

  const updatedAuthUser = needsUpdate
    ? await persistAuthUserMetadata(supabaseClient, authUser, metadata, additionalFields)
    : { ...authUser, metadata };

  return {
    customer,
    authUser: updatedAuthUser
  };
}

async function syncSubscriptionMetadata(
  supabaseClient: SupabaseClient,
  supabaseUser: SupabaseUser,
  authUser: AuthUserRecord,
  customer: Stripe.Customer,
  subscription: Stripe.Subscription | null,
  planKey: string | null,
  priceId: string | null
): Promise<AuthUserRecord> {
  const metadata = cloneMetadata(authUser.metadata);
  const nowIso = new Date().toISOString();

  metadata.stripe_customer_id = customer.id;
  metadata.last_billing_sync_at = nowIso;

  if (subscription) {
    metadata.subscription = {
      id: subscription.id,
      status: subscription.status,
      plan_key: planKey,
      price_id: priceId,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      trial_end: subscription.trial_end ?? null,
      synced_at: nowIso
    };
  } else {
    metadata.subscription = null;
  }

  const additional: Record<string, any> = {};
  if (supabaseUser.email && supabaseUser.email !== authUser.email) {
    additional.email = supabaseUser.email;
  }

  const nextSubscriptionStatus = deriveSubscriptionStatus(planKey, subscription);
  if (authUser.subscription_status !== nextSubscriptionStatus) {
    additional.subscription_status = nextSubscriptionStatus;
  }

  return await persistAuthUserMetadata(supabaseClient, authUser, metadata, additional);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const {
      action,
      supabase_user,
      plan: planFromRequest,
      planKey: legacyPlanKey,
      return_url
    } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabase_user?.id) {
      return new Response(
        JSON.stringify({ error: "Supabase user is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createSupabaseClient();
    const supabaseUser = supabase_user as SupabaseUser;
    const authUser = await ensureAuthUserRecord(supabaseClient, supabaseUser);
    const planKey = normalizePlanKeyInput(planFromRequest) ?? normalizePlanKeyInput(legacyPlanKey);

    let result: HandlerResponse;

    switch (action) {
      case "create_checkout_session":
        result = await createCheckoutSession(supabaseUser, authUser, planKey, return_url, supabaseClient);
        break;
      case "create_portal_session":
        result = await createPortalSession(supabaseUser, authUser, return_url, supabaseClient);
        break;
      case "get_subscription":
        result = await getSubscription(supabaseUser, authUser, supabaseClient);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[billing] error", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createCheckoutSession(
  supabaseUser: SupabaseUser,
  authUser: AuthUserRecord,
  planKey: string | undefined,
  returnUrl: string | undefined,
  supabaseClient: SupabaseClient
): Promise<HandlerResponse> {
  if (!planKey || !PRICE_IDS[planKey as keyof typeof PRICE_IDS]) {
    return {
      status: 400,
      body: { error: `Invalid plan: ${planKey}. Must be 'plus' or 'pro'` }
    };
  }

  const priceId = PRICE_IDS[planKey as keyof typeof PRICE_IDS];
  const baseReturnUrl = returnUrl || DEFAULT_RETURN_URL;

  try {
    const { customer } = await getOrCreateStripeCustomer(supabaseUser, supabaseClient, authUser);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: "subscription",
      success_url: `${baseReturnUrl}?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseReturnUrl}?billing=cancelled`,
      metadata: {
        supabase_user_id: supabaseUser.id,
        plan_key: planKey
      }
    });

    return {
      status: 200,
      body: { url: session.url, session_id: session.id }
    };
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return {
      status: 500,
      body: { error: "Failed to create checkout session" }
    };
  }
}

async function createPortalSession(
  supabaseUser: SupabaseUser,
  authUser: AuthUserRecord,
  returnUrl: string | undefined,
  supabaseClient: SupabaseClient
): Promise<HandlerResponse> {
  const baseReturnUrl = returnUrl || DEFAULT_RETURN_URL;

  try {
    const { customer } = await getOrCreateStripeCustomer(supabaseUser, supabaseClient, authUser);

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: baseReturnUrl
    });

    return {
      status: 200,
      body: { url: session.url }
    };
  } catch (error) {
    console.error("Stripe portal session creation failed:", error);
    return {
      status: 500,
      body: { error: "Failed to create portal session" }
    };
  }
}

async function getSubscription(
  supabaseUser: SupabaseUser,
  authUser: AuthUserRecord,
  supabaseClient: SupabaseClient
): Promise<HandlerResponse> {
  try {
    const { customer, authUser: hydratedAuthUser } = await getOrCreateStripeCustomer(
      supabaseUser,
      supabaseClient,
      authUser
    );

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      await syncSubscriptionMetadata(supabaseClient, supabaseUser, hydratedAuthUser, customer, null, null, null);

      return {
        status: 200,
        body: { subscription: null }
      };
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const planKey = priceId ? PLAN_BY_PRICE_ID[priceId] ?? null : null;

    await syncSubscriptionMetadata(
      supabaseClient,
      supabaseUser,
      hydratedAuthUser,
      customer,
      subscription,
      planKey,
      priceId
    );

    return {
      status: 200,
      body: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          current_period_start: subscription.current_period_start,
          price_id: priceId,
          plan_key: planKey
        }
      }
    };
  } catch (error) {
    console.error("Subscription lookup failed:", error);
    return {
      status: 500,
      body: { error: "Failed to get subscription status" }
    };
  }
}
