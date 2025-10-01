import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10"
});

const priceMap: Record<string, string | undefined> = {
  starter: Deno.env.get("STRIPE_STARTER_PRICE_ID"),
  professional: Deno.env.get("STRIPE_PRO_PRICE_ID"),
  enterprise: Deno.env.get("STRIPE_ENTERPRISE_PRICE_ID")
};

const planByPriceId: Record<string, string> = Object.entries(priceMap).reduce(
  (acc, [planKey, priceId]) => {
    if (priceId) acc[priceId] = planKey;
    return acc;
  },
  {} as Record<string, string>
);

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment configuration");
}

const createSupabaseClient = () => createClient(supabaseUrl, supabaseKey);

const normalizeMetadata = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata || typeof metadata !== "object") {
    return {} as Record<string, unknown>;
  }
  return { ...metadata } as Record<string, unknown>;
};

type Auth0User = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

type HandlerResponse = {
  status: number;
  body: Record<string, unknown>;
};

const ensureAuthUser = async (auth0User: Auth0User) => {
  const supabase = createSupabaseClient();

  const { data: existingUser } = await supabase
    .from("auth_users")
    .select("*")
    .eq("auth0_id", auth0User.sub)
    .maybeSingle();

  if (existingUser) {
    return existingUser;
  }

  const metadata = {
    picture: auth0User.picture,
    email_verified: false,
    first_login: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("auth_users")
    .insert({
      auth0_id: auth0User.sub,
      email: auth0User.email || "",
      full_name: auth0User.name || auth0User.email?.split("@")[0] || "User",
      metadata
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
};

const ensureStripeCustomer = async (auth0User: Auth0User, userRecord: any) => {
  const supabase = createSupabaseClient();
  const metadata = normalizeMetadata(userRecord?.metadata);

  if (metadata.stripe_customer_id && typeof metadata.stripe_customer_id === "string") {
    return metadata.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: auth0User.email,
    name: auth0User.name,
    metadata: {
      auth0_id: auth0User.sub
    }
  });

  const nextMetadata = { ...metadata, stripe_customer_id: customer.id };

  await supabase
    .from("auth_users")
    .update({ metadata: nextMetadata })
    .eq("id", userRecord.id);

  return customer.id;
};

const createCheckout = async (auth0User: Auth0User, plan: string, returnUrl?: string) => {
  const userRecord = await ensureAuthUser(auth0User);
  const customerId = await ensureStripeCustomer(auth0User, userRecord);

  const priceId = priceMap[plan];
  if (!priceId) {
    throw new Error(`Unsupported plan: ${plan}`);
  }

  const success = returnUrl ? `${returnUrl}?billing=success` : undefined;
  const cancel = returnUrl ? `${returnUrl}?billing=cancelled` : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_update: {
      address: "auto"
    },
    allow_promotion_codes: true,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: success || `${returnUrl || "https://example.com"}?billing=success`,
    cancel_url: cancel || `${returnUrl || "https://example.com"}?billing=cancelled`
  });

  return {
    status: 200,
    body: {
      url: session.url,
      sessionId: session.id
    }
  } satisfies HandlerResponse;
};

const createPortal = async (auth0User: Auth0User, returnUrl?: string) => {
  const userRecord = await ensureAuthUser(auth0User);
  const customerId = await ensureStripeCustomer(auth0User, userRecord);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || "https://example.com"
  });

  return {
    status: 200,
    body: {
      url: session.url
    }
  } satisfies HandlerResponse;
};

const getSubscription = async (auth0User: Auth0User) => {
  const userRecord = await ensureAuthUser(auth0User);
  const metadata = normalizeMetadata(userRecord?.metadata);

  let subscription = null;
  if (metadata.stripe_customer_id) {
    const customerId = metadata.stripe_customer_id as string;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      expand: ["data.plan.product"],
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      const active = subscriptions.data[0];
      const planKey = planByPriceId[active.plan.id] || null;

      subscription = {
        id: active.id,
        status: active.status,
        current_period_end: active.current_period_end,
        current_period_start: active.current_period_start,
        cancel_at_period_end: active.cancel_at_period_end,
        plan_name: typeof active.plan.product === "object" ? active.plan.product?.name : undefined,
        plan_key: planKey,
        price_id: active.plan.id,
        amount: active.plan.amount,
        currency: active.plan.currency
      };
    }
  }

  return {
    status: 200,
    body: {
      subscription,
      subscription_status: userRecord.subscription_status,
      metadata
    }
  } satisfies HandlerResponse;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body?.action;
    const auth0User = body?.auth0_user as Auth0User | undefined;

    if (!auth0User || !auth0User.sub) {
      return new Response(
        JSON.stringify({ error: "auth0_user is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: HandlerResponse;

    switch (action) {
      case "create_checkout_session":
        result = await createCheckout(auth0User, body.plan, body.return_url);
        break;
      case "create_portal_session":
        result = await createPortal(auth0User, body.return_url);
        break;
      case "get_subscription":
        result = await getSubscription(auth0User);
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
