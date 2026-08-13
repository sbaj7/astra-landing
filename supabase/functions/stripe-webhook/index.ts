import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { getPlanKeyForPrice } from "../_shared/stripePlans.ts";
import { calculateCommissionAmount, findPromotionCodeId, objectId } from "../_shared/referrals.ts";

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
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
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
  console.log("Syncing Stripe customer to database");

  const now = new Date().toISOString();

  // Update by supabase user ID
  const { data, error } = await supabase
    .from("auth_users")
    .update({
      stripe_customer_id: stripeCustomerId,
      updated_at: now
    })
    .eq("auth0_id", supabaseUserId)
    .select();

  if (error) {
    console.error("Failed to sync customer to database:", error?.code || "database_error");
    throw error;
  }

  console.log("Synced Stripe customer to database");
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

  console.log("Syncing Stripe subscription");

  // Find the auth_users record by stripe_customer_id
  const { data: authUsers, error: fetchError } = await supabase
    .from("auth_users")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .limit(1);

  if (fetchError) {
    console.error("Failed to fetch user by Stripe customer ID:", fetchError?.code || "database_error");
    throw fetchError;
  }

  if (!authUsers || authUsers.length === 0) {
    console.warn("No user found for Stripe customer");
    return;
  }

  const authUser = authUsers[0];
  const now = new Date().toISOString();

  // Extract subscription details
  const price = subscription.items.data[0]?.price;
  const priceId = price?.id ?? null;
  const planKey = getPlanKeyForPrice(price);
  const subscriptionData = {
    id: subscription.id,
    status: subscription.status,
    plan_key: planKey,
    price_id: priceId,
    current_period_end: subscription.current_period_end,
    current_period_start: subscription.current_period_start,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    trial_end: subscription.trial_end ?? null,
    synced_at: now
  };

  // Determine subscription status
  const subscriptionStatus =
    subscription.status === "active" || subscription.status === "trialing"
      ? planKey || "free"
      : "free";

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
    console.error("Failed to update subscription in database:", updateError?.code || "database_error");
    throw updateError;
  }

  console.log(`Synced subscription with status ${subscriptionStatus}`);
}

/**
 * Handles checkout.session.completed event
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createSupabaseClient>,
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log("Checkout completed");

  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  const supabaseUserId = session.metadata?.supabase_user_id;

  if (!stripeCustomerId) {
    console.error("Checkout session has no customer ID");
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

  await attributeCheckoutReferral(supabase, session);
}

async function retrieveCheckoutWithDiscounts(sessionId: string): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["total_details.breakdown.discounts.discount.promotion_code"]
    });
  } catch (error) {
    console.warn("[referrals] Expanded Checkout retrieval failed; retrying without expansion", error instanceof Error ? error.name : "UnknownError");
    return await stripe.checkout.sessions.retrieve(sessionId);
  }
}

async function getReferralCodeByPromotionCode(
  supabase: ReturnType<typeof createSupabaseClient>,
  promotionCodeId: string
) {
  const { data, error } = await supabase
    .from("referral_codes")
    .select("*, referral_partners(*)")
    .eq("stripe_promotion_code_id", promotionCodeId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data || data.referral_partners?.status !== "active") return null;
  return data;
}

async function createAttribution(
  supabase: ReturnType<typeof createSupabaseClient>,
  session: Stripe.Checkout.Session,
  promotionCodeId: string
) {
  const stripeCustomerId = objectId(session.customer);
  if (!stripeCustomerId) return null;

  const { data: existing, error: existingError } = await supabase
    .from("referral_attributions")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const referralCode = await getReferralCodeByPromotionCode(supabase, promotionCodeId);
  if (!referralCode) return null;

  const attribution = {
    partner_id: referralCode.partner_id,
    referral_code_id: referralCode.id,
    supabase_user_id: session.metadata?.supabase_user_id || null,
    stripe_customer_id: stripeCustomerId,
    stripe_checkout_session_id: session.id,
    stripe_subscription_id: objectId(session.subscription),
    stripe_promotion_code_id: promotionCodeId
  };

  const { data, error } = await supabase
    .from("referral_attributions")
    .insert(attribution)
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: racedAttribution, error: raceError } = await supabase
      .from("referral_attributions")
      .select("*")
      .eq("stripe_customer_id", stripeCustomerId)
      .single();
    if (raceError) throw raceError;
    return racedAttribution;
  }
  if (error) throw error;

  await supabase.from("referral_audit_events").insert({
    action: "attribution.created",
    entity_type: "attribution",
    entity_id: data.id,
    metadata: {
      referral_code: referralCode.code,
      checkout_session_id: session.id,
      stripe_customer_id: stripeCustomerId
    }
  });

  return data;
}

async function attributeCheckoutReferral(
  supabase: ReturnType<typeof createSupabaseClient>,
  session: Stripe.Checkout.Session
) {
  const hydratedSession = await retrieveCheckoutWithDiscounts(session.id);
  const promotionCodeId = findPromotionCodeId(hydratedSession);
  if (!promotionCodeId) return null;
  return await createAttribution(supabase, hydratedSession, promotionCodeId);
}

async function findOrCreateInvoiceAttribution(
  supabase: ReturnType<typeof createSupabaseClient>,
  invoice: Stripe.Invoice
) {
  const stripeCustomerId = objectId(invoice.customer);
  const subscriptionId = objectId(invoice.subscription);
  if (!stripeCustomerId) return null;

  const { data: existing, error } = await supabase
    .from("referral_attributions")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;
  if (!subscriptionId) return null;

  const sessions = await stripe.checkout.sessions.list({
    subscription: subscriptionId,
    limit: 10
  } as Stripe.Checkout.SessionListParams);

  for (const session of sessions.data) {
    const attribution = await attributeCheckoutReferral(supabase, session);
    if (attribution) return attribution;
  }
  return null;
}

async function recordInvoiceCommission(
  supabase: ReturnType<typeof createSupabaseClient>,
  invoice: Stripe.Invoice,
  stripeEventId: string
) {
  if (invoice.amount_paid <= 0 || !invoice.paid) return;

  const attribution = await findOrCreateInvoiceAttribution(supabase, invoice);
  if (!attribution) return;

  const { data: partner, error } = await supabase
    .from("referral_partners")
    .select("*")
    .eq("id", attribution.partner_id)
    .single();
  if (error) throw error;

  const commissionAmount = calculateCommissionAmount(invoice.amount_paid, partner);

  if (!commissionAmount || commissionAmount <= 0) return;

  const availableAt = new Date(Date.now() + partner.hold_days * 86_400_000).toISOString();
  const { error: commissionError } = await supabase.rpc("record_referral_commission", {
    p_attribution_id: attribution.id,
    p_stripe_event_id: stripeEventId,
    p_stripe_invoice_id: invoice.id,
    p_stripe_charge_id: objectId((invoice as any).charge),
    p_gross_amount_cents: invoice.amount_paid,
    p_commission_amount_cents: commissionAmount,
    p_currency: invoice.currency,
    p_available_at: availableAt
  });

  if (commissionError) throw commissionError;
}

async function reverseCommissionForCharge(
  supabase: ReturnType<typeof createSupabaseClient>,
  stripeEventId: string,
  chargeId: string | null,
  reason: string
) {
  if (!chargeId) return;
  const { error } = await supabase.rpc("reverse_referral_commission", {
    p_stripe_event_id: stripeEventId,
    p_stripe_invoice_id: null,
    p_stripe_charge_id: chargeId,
    p_reason: reason
  });
  if (error) throw error;
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

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing Stripe signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
      console.log(`✅ Webhook signature verified for event: ${event.type}`);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err instanceof Error ? err.name : "UnknownError");
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          console.warn("Stripe customer has no Supabase user ID in metadata");
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
        if (event.type === "invoice.payment_succeeded") {
          await recordInvoiceCommission(supabase, invoice, event.id);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await reverseCommissionForCharge(supabase, event.id, charge.id, "Stripe charge refunded");
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await reverseCommissionForCharge(
          supabase,
          event.id,
          objectId(dispute.charge),
          `Stripe dispute opened: ${dispute.reason}`
        );
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
    console.error("[stripe-webhook] error:", error instanceof Error ? error.name : "UnknownError");
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
