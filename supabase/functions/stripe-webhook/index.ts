import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Stripe configuration
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

if (!stripeWebhookSecret) {
  console.warn("⚠️ STRIPE_WEBHOOK_SECRET not set - webhook signature verification disabled!");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10"
});

// Supabase configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment configuration");
}

const createSupabaseClient = () => createClient(supabaseUrl, supabaseKey);

/**
 * Updates auth_users table with Stripe customer ID
 */
async function syncCustomerToDatabase(
  supabase: ReturnType<typeof createSupabaseClient>,
  stripeCustomerId: string,
  supabaseUserId: string,
  email: string | null
): Promise<void> {
  console.log(`🔄 Syncing Stripe customer ${stripeCustomerId} to database for user ${supabaseUserId}...`);

  const now = new Date().toISOString();

  // Update by supabase user ID
  const { data, error } = await supabase
    .from("auth_users")
    .update({
      stripe_customer_id: stripeCustomerId,
      metadata: supabase.rpc("jsonb_set", {
        target: "metadata",
        path: "{stripe_customer_id}",
        new_value: JSON.stringify(stripeCustomerId)
      }) as any,
      updated_at: now
    })
    .eq("auth0_id", supabaseUserId)
    .select();

  if (error) {
    console.error(`❌ Failed to sync customer to database:`, error);
    throw error;
  }

  console.log(`✅ Synced Stripe customer ${stripeCustomerId} to database`);
}

/**
 * Updates subscription status in auth_users table
 */
async function syncSubscriptionToDatabase(
  supabase: ReturnType<typeof createSupabaseClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  console.log(`🔄 Syncing subscription ${subscription.id} for customer ${stripeCustomerId}...`);

  // Find the auth_users record by stripe_customer_id
  const { data: authUsers, error: fetchError } = await supabase
    .from("auth_users")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .limit(1);

  if (fetchError) {
    console.error(`❌ Failed to fetch user by stripe_customer_id:`, fetchError);
    throw fetchError;
  }

  if (!authUsers || authUsers.length === 0) {
    console.warn(`⚠️ No user found with stripe_customer_id: ${stripeCustomerId}`);
    return;
  }

  const authUser = authUsers[0];
  const now = new Date().toISOString();

  // Extract subscription details
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const subscriptionData = {
    id: subscription.id,
    status: subscription.status,
    price_id: priceId,
    current_period_end: subscription.current_period_end,
    current_period_start: subscription.current_period_start,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    trial_end: subscription.trial_end ?? null,
    synced_at: now
  };

  // Determine subscription status
  let subscriptionStatus = "free";
  if (subscription.status === "active" || subscription.status === "trialing") {
    subscriptionStatus = "active";
  } else if (subscription.status === "past_due") {
    subscriptionStatus = "past_due";
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    subscriptionStatus = "canceled";
  }

  // Update metadata and subscription_status
  const existingMetadata = authUser.metadata || {};
  const updatedMetadata = {
    ...existingMetadata,
    subscription: subscriptionData,
    stripe_customer_id: stripeCustomerId,
    last_billing_sync_at: now
  };

  const { error: updateError } = await supabase
    .from("auth_users")
    .update({
      metadata: updatedMetadata,
      subscription_status: subscriptionStatus,
      updated_at: now
    })
    .eq("id", authUser.id);

  if (updateError) {
    console.error(`❌ Failed to update subscription in database:`, updateError);
    throw updateError;
  }

  console.log(`✅ Synced subscription ${subscription.id} with status ${subscriptionStatus}`);
}

/**
 * Handles checkout.session.completed event
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createSupabaseClient>,
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log(`🎉 Checkout completed: ${session.id}`);

  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  const supabaseUserId = session.metadata?.supabase_user_id;

  if (!stripeCustomerId) {
    console.error(`❌ No customer ID in checkout session ${session.id}`);
    return;
  }

  if (supabaseUserId) {
    await syncCustomerToDatabase(supabase, stripeCustomerId, supabaseUserId, session.customer_email);
  }

  // If there's a subscription, sync it
  if (session.subscription) {
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionToDatabase(supabase, subscription);
  }
}

/**
 * Main webhook handler
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (stripeWebhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          stripeWebhookSecret
        );
        console.log(`✅ Webhook signature verified for event: ${event.type}`);
      } catch (err: any) {
        console.error(`❌ Webhook signature verification failed:`, err.message);
        return new Response(
          JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // No signature verification (for testing only)
      console.warn("⚠️ Processing webhook without signature verification");
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabase = createSupabaseClient();

    // Handle different event types
    switch (event.type) {
      case "customer.created":
      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        const supabaseUserId = customer.metadata?.supabase_user_id;

        if (supabaseUserId) {
          await syncCustomerToDatabase(supabase, customer.id, supabaseUserId, customer.email);
        } else {
          console.warn(`⚠️ Customer ${customer.id} has no supabase_user_id in metadata`);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToDatabase(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToDatabase(supabase, subscription);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[stripe-webhook] error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
