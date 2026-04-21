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

type PlanKey = "plus" | "pro";

function readFirstNonEmptyEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    if (!key) continue;
    const value = Deno.env.get(key);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

const priceIdCandidates: Record<PlanKey, string[]> = {
  plus: ["STRIPE_PLUS_PRICE_ID", "STRIPE_STARTER_PRICE_ID", "VITE_STRIPE_PLUS_PRICE_ID"],
  pro: ["STRIPE_PRO_PRICE_ID", "VITE_STRIPE_PRO_PRICE_ID"]
};

const resolvedPriceIds = Object.fromEntries(
  (Object.entries(priceIdCandidates) as [PlanKey, string[]][]).map(([plan, envKeys]) => [
    plan,
    readFirstNonEmptyEnv(envKeys)
  ])
) as Record<PlanKey, string | undefined>;

const missingPlanIds = (Object.entries(resolvedPriceIds) as [PlanKey, string | undefined][]).filter(
  ([, value]) => !value
);

if (missingPlanIds.length > 0) {
  const missingPlans = missingPlanIds.map(([plan]) => plan).join(", ");
  throw new Error(
    `Missing Stripe price IDs for plan(s): ${missingPlans}. ` +
      `Set STRIPE_<PLAN>_PRICE_ID environment variables for the billing function (e.g. STRIPE_PLUS_PRICE_ID).`
  );
}

// Price ID mapping for your plans (validated above)
const PRICE_IDS = resolvedPriceIds as Record<PlanKey, string>;

// Reverse mapping for subscription lookups
const PLAN_BY_PRICE_ID = Object.fromEntries(
  (Object.entries(PRICE_IDS) as [PlanKey, string][]).map(([plan, priceId]) => [priceId, plan])
) as Record<string, PlanKey>;

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

  // Subscription fields
  subscription_status?: string | null;
  subscription_plan?: string | null;
  stripe_customer_id?: string | null;

  // Manual subscription fields - for admin-granted subscriptions
  manual_subscription_enabled?: boolean | null;
  manual_subscription_plan?: string | null;
  manual_subscription_expires_at?: string | null;
  manual_subscription_granted_by?: string | null;
  manual_subscription_granted_at?: string | null;
  manual_subscription_notes?: string | null;
  manual_subscription_stripe_synced?: boolean | null;

  // Timestamps
  created_at?: string | null;
  updated_at?: string | null;
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

function normalizePlanKeyInput(value: unknown): PlanKey | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "plus" || normalized === "pro" ? (normalized as PlanKey) : undefined;
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

/**
 * Normalizes email address for consistent Stripe customer lookup
 * - Converts to lowercase
 * - Trims whitespace
 * - Validates format
 */
function normalizeEmail(email: string | undefined | null): string | null {
  if (!email || typeof email !== "string") {
    return null;
  }
  const normalized = email.trim().toLowerCase();
  return normalized.includes("@") ? normalized : null;
}

/**
 * Searches for existing Stripe customer with comprehensive deduplication logic
 * Returns customer if found, null otherwise
 */
async function findExistingStripeCustomer(
  supabaseUserId: string,
  email: string | null
): Promise<Stripe.Customer | null> {
  // Strategy 1: Search by Supabase user ID in Stripe metadata (most reliable)
  try {
    const customersByMetadata = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${supabaseUserId}'`,
      limit: 1
    });

    if (customersByMetadata.data.length > 0) {
      const customer = customersByMetadata.data[0];
      // Verify it's not deleted
      if (!("deleted" in customer)) {
        console.log(`✅ Found existing Stripe customer via metadata: ${customer.id}`);
        return customer;
      }
    }
  } catch (searchError) {
    console.warn("⚠️ Stripe metadata search failed (non-fatal):", searchError);
    // Continue to email search
  }

  // Strategy 2: Search by email (fallback for legacy customers)
  if (email) {
    try {
      const customersByEmail = await stripe.customers.list({
        email: email,
        limit: 10 // Get multiple to handle potential duplicates
      });

      if (customersByEmail.data.length > 0) {
        // Prefer customer that has matching supabase_user_id in metadata
        const matchingCustomer = customersByEmail.data.find(
          c => c.metadata?.supabase_user_id === supabaseUserId
        );

        if (matchingCustomer) {
          console.log(`✅ Found existing Stripe customer via email+metadata: ${matchingCustomer.id}`);
          return matchingCustomer;
        }

        // Otherwise, return the first customer (will be updated with metadata)
        const firstCustomer = customersByEmail.data[0];
        console.log(`⚠️ Found Stripe customer via email only: ${firstCustomer.id} (will update metadata)`);
        return firstCustomer;
      }
    } catch (emailSearchError) {
      console.warn("⚠️ Stripe email search failed:", emailSearchError);
    }
  }

  return null;
}

async function getOrCreateStripeCustomer(
  supabaseUser: SupabaseUser,
  supabaseClient: SupabaseClient,
  authUser: AuthUserRecord
): Promise<StripeCustomerResult> {
  const existingMetadata = cloneMetadata(authUser.metadata);
  const normalizedFullName = normalizeFullName(supabaseUser);
  const normalizedEmail = normalizeEmail(supabaseUser.email);
  const nowIso = new Date().toISOString();

  if (!normalizedEmail) {
    throw new Error("User email is required for Stripe operations");
  }

  let customer: Stripe.Customer | null = null;

  // Step 1: Check if we have a stored stripe_customer_id (from new column or metadata)
  const storedCustomerId =
    (authUser as any).stripe_customer_id || // New column (after migration)
    existingMetadata.stripe_customer_id;    // Old metadata field

  if (storedCustomerId && typeof storedCustomerId === "string") {
    const trimmedId = storedCustomerId.trim();
    if (trimmedId) {
      try {
        const retrieved = await stripe.customers.retrieve(trimmedId);
        if (!("deleted" in retrieved)) {
          customer = retrieved;
          console.log(`✅ Retrieved stored Stripe customer: ${customer.id}`);
        } else {
          console.warn(`⚠️ Stored Stripe customer ${trimmedId} is deleted`);
        }
      } catch (retrieveError) {
        console.warn(`⚠️ Failed to retrieve stored Stripe customer ${trimmedId}:`, retrieveError);
      }
    }
  }

  // Step 2: If no stored customer found, search comprehensively
  if (!customer) {
    console.log(`🔍 Searching for existing Stripe customer for user ${supabaseUser.id}...`);
    customer = await findExistingStripeCustomer(supabaseUser.id, normalizedEmail);
  }

  // Step 3: Create new customer if none found (with idempotency key to prevent duplicates)
  if (!customer) {
    console.log(`➕ Creating new Stripe customer for ${normalizedEmail}...`);

    // Use idempotency key based on supabase user ID to prevent duplicate creation on retry
    const idempotencyKey = `create_customer_${supabaseUser.id}`;

    try {
      customer = await stripe.customers.create({
        email: normalizedEmail,
        name: normalizedFullName,
        metadata: {
          supabase_user_id: supabaseUser.id,
          created_via: "billing-supabase-function",
          created_at: nowIso
        }
      }, {
        idempotencyKey: idempotencyKey
      });
      console.log(`✅ Created new Stripe customer: ${customer.id}`);
    } catch (createError: any) {
      // Check if this is a duplicate creation error due to race condition
      if (createError.type === "idempotency_error") {
        console.warn(`⚠️ Idempotency conflict detected, searching for recently created customer...`);
        // Wait briefly and search again
        await new Promise(resolve => setTimeout(resolve, 500));
        customer = await findExistingStripeCustomer(supabaseUser.id, normalizedEmail);

        if (!customer) {
          throw new Error("Failed to create or find Stripe customer after idempotency conflict");
        }
      } else {
        throw createError;
      }
    }
  }

  // Step 4: Update customer metadata if needed (ensure supabase_user_id is set)
  if (!customer.metadata?.supabase_user_id || customer.metadata.supabase_user_id !== supabaseUser.id) {
    console.log(`🔄 Updating Stripe customer ${customer.id} metadata...`);
    customer = await stripe.customers.update(customer.id, {
      email: normalizedEmail,
      name: normalizedFullName || customer.name || undefined,
      metadata: {
        ...customer.metadata,
        supabase_user_id: supabaseUser.id,
        last_updated: nowIso
      }
    });
  }

  // Step 5: Persist customer ID to database (both new column and metadata for backwards compatibility)
  const metadata = {
    ...existingMetadata,
    stripe_customer_id: customer.id,
    stripe_customer_email: customer.email ?? normalizedEmail,
    stripe_customer_name: customer.name ?? normalizedFullName ?? null,
    last_billing_sync_at: nowIso
  };

  const additionalFields: Record<string, any> = {
    stripe_customer_id: customer.id // Write to new dedicated column
  };

  if (normalizedEmail && normalizedEmail !== authUser.email) {
    additionalFields.email = normalizedEmail;
  }
  if (normalizedFullName && normalizedFullName !== authUser.full_name) {
    additionalFields.full_name = normalizedFullName;
  }

  const needsUpdate =
    metadata.stripe_customer_id !== existingMetadata.stripe_customer_id ||
    metadata.stripe_customer_email !== existingMetadata.stripe_customer_email ||
    metadata.stripe_customer_name !== existingMetadata.stripe_customer_name ||
    metadata.last_billing_sync_at !== existingMetadata.last_billing_sync_at ||
    (authUser as any).stripe_customer_id !== customer.id ||
    Object.keys(additionalFields).length > 0;

  const updatedAuthUser = needsUpdate
    ? await persistAuthUserMetadata(supabaseClient, authUser, metadata, additionalFields)
    : { ...authUser, metadata };

  console.log(`✅ Stripe customer resolution complete: ${customer.id}`);

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
  planKey: PlanKey | undefined,
  returnUrl: string | undefined,
  supabaseClient: SupabaseClient
): Promise<HandlerResponse> {
  if (!planKey || !PRICE_IDS[planKey]) {
    return {
      status: 400,
      body: { error: `Invalid plan: ${planKey}. Must be 'plus' or 'pro'` }
    };
  }

  const priceId = PRICE_IDS[planKey];
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

      // Fetch fresh user data including manual subscription fields
      const { data: freshUser } = await supabaseClient
        .from("auth_users")
        .select("*")
        .eq("id", hydratedAuthUser.id)
        .single();

      return {
        status: 200,
        body: {
          subscription: null,
          user: freshUser || hydratedAuthUser
        }
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

    // Fetch fresh user data including manual subscription fields
    const { data: freshUser } = await supabaseClient
      .from("auth_users")
      .select("*")
      .eq("id", hydratedAuthUser.id)
      .single();

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
        },
        user: freshUser || hydratedAuthUser
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
