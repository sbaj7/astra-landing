// Admin Subscription Manager Edge Function
// Purpose: Manage manual subscription grants for Astra MD users
// Security: Requires a verified Supabase user in the referral_admins allowlist

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

// Initialize Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Stripe coupon IDs for 100% discount
const MANUAL_GRANT_COUPON_ID = "MANUAL_GRANT_100_OFF";

interface ManualSubscriptionRequest {
  action: "grant" | "revoke" | "list" | "sync_stripe" | "check_expiration";
  userId?: string;
  userEmail?: string;
  plan?: "plus" | "pro";
  expiresAt?: string;
  notes?: string;
  grantedBy?: string;
  syncToStripe?: boolean;
  page?: number;
  limit?: number;
}

class ResponseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requireSubscriptionAdmin(req: Request, supabase: any) {
  const accessToken = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!accessToken) throw new ResponseError(401, "Authentication required");

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new ResponseError(401, "Invalid or expired session");

  const { data: admin, error: adminError } = await supabase
    .from("referral_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (adminError) throw adminError;
  if (!admin) throw new ResponseError(403, "Subscription management access required");
  return data.user;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") throw new ResponseError(405, "Method not allowed");

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    const adminUser = await requireSubscriptionAdmin(req, supabaseAdmin);

    let body: ManualSubscriptionRequest;
    try {
      body = await req.json();
    } catch {
      throw new ResponseError(400, "Invalid JSON");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ResponseError(400, "Invalid request");
    }
    body.grantedBy = adminUser.email || adminUser.id;
    const { action } = body;

    console.log(`🔧 Admin subscription action: ${action}`);

    switch (action) {
      case "grant":
        return await grantManualSubscription(supabaseAdmin, stripe, body);

      case "revoke":
        return await revokeManualSubscription(supabaseAdmin, body);

      case "list":
        return await listSubscriptions(supabaseAdmin, body);

      case "sync_stripe":
        return await syncManualSubscriptionToStripe(supabaseAdmin, stripe, body);

      case "check_expiration":
        return await checkAndExpireSubscriptions(supabaseAdmin);

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Admin subscription error:", error instanceof Error ? error.name : "UnknownError");
    return new Response(
      JSON.stringify({ error: error instanceof ResponseError ? error.message : "Admin subscription request failed" }),
      { status: error instanceof ResponseError ? error.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Grant manual subscription to a user
async function grantManualSubscription(
  supabase: any,
  stripe: Stripe,
  request: ManualSubscriptionRequest
) {
  const { userId, userEmail, plan, expiresAt, notes, grantedBy, syncToStripe = false } = request;

  // Validate required fields
  if (!plan || !["plus", "pro"].includes(plan) || !grantedBy) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: plan, grantedBy" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find user by ID or email
  let user;
  if (userId) {
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    user = data;
  } else if (userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ResponseError(400, "Valid user email required");
    }
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .ilike("email", normalizedEmail)
      .single();

    if (error) throw error;
    user = data;
  } else {
    return new Response(
      JSON.stringify({ error: "Either userId or userEmail must be provided" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!user) {
    return new Response(
      JSON.stringify({ error: "User not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update user with manual subscription
  const parsedExpiration = expiresAt ? new Date(expiresAt) : null;
  if (parsedExpiration && (Number.isNaN(parsedExpiration.getTime()) || parsedExpiration <= new Date())) {
    throw new ResponseError(400, "Expiration must be a future date");
  }
  const updateData: Record<string, unknown> = {
    manual_subscription_enabled: true,
    manual_subscription_plan: plan,
    manual_subscription_expires_at: parsedExpiration?.toISOString() || null,
    manual_subscription_granted_by: grantedBy,
    manual_subscription_granted_at: new Date().toISOString(),
    manual_subscription_notes: typeof notes === "string" ? notes.trim().slice(0, 2000) || null : null,
    manual_subscription_stripe_synced: false,
    subscription_status: plan,
    updated_at: new Date().toISOString(),
  };

  // Also update metadata to maintain compatibility
  const metadata = user.metadata || {};
  if (metadata.subscription?.is_manual_grant) {
    metadata.subscription = metadata.manual_subscription_previous || null;
  }
  delete metadata.manual_subscription_previous;
  metadata.manual_subscription = {
    plan_key: plan,
    status: "active",
    granted_by: grantedBy,
    granted_at: new Date().toISOString(),
  };
  updateData.metadata = metadata;

  const { error: updateError } = await supabase
    .from("auth_users")
    .update(updateData)
    .eq("id", user.id);

  if (updateError) throw updateError;

  // Log to audit table
  await supabase.from("subscription_audit_log").insert({
    user_id: user.id,
    action: "grant",
    plan_type: plan,
    performed_by: grantedBy,
    notes: notes || `Manual grant of ${plan} subscription`,
    metadata: {
      expires_at: expiresAt,
      sync_to_stripe: syncToStripe,
    },
  });

  // Optionally sync to Stripe
  let stripeSubscription = null;
  if (syncToStripe) {
    stripeSubscription = await createStripeSubscriptionWithFullDiscount(
      stripe,
      user,
      plan
    );

    // Update sync status
    await supabase
      .from("auth_users")
      .update({ manual_subscription_stripe_synced: true })
      .eq("id", user.id);
  }

  console.log(`Manual subscription granted (${plan})`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Successfully granted ${plan} subscription to ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        plan: plan,
        expires_at: expiresAt,
      },
      stripe_subscription: stripeSubscription,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Revoke manual subscription
async function revokeManualSubscription(
  supabase: any,
  request: ManualSubscriptionRequest
) {
  const { userId, userEmail, grantedBy } = request;

  // Find user
  let user;
  if (userId) {
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    user = data;
  } else if (userEmail) {
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .ilike("email", userEmail.toLowerCase())
      .single();

    if (error) throw error;
    user = data;
  } else {
    return new Response(
      JSON.stringify({ error: "Either userId or userEmail must be provided" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!user) {
    return new Response(
      JSON.stringify({ error: "User not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user has manual subscription
  if (!user.manual_subscription_enabled) {
    return new Response(
      JSON.stringify({ error: "User does not have a manual subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const previousPlan = user.manual_subscription_plan;

  // Update user to revoke manual subscription
  const metadata = user.metadata || {};
  const stripeSubscription = metadata.subscription?.is_manual_grant
    ? metadata.manual_subscription_previous || null
    : metadata.subscription;
  const restoredPlan = stripeSubscription && ["active", "trialing"].includes(stripeSubscription.status)
    ? stripeSubscription.plan_key || "free"
    : "free";
  const updateData: Record<string, unknown> = {
    manual_subscription_enabled: false,
    manual_subscription_plan: null,
    manual_subscription_expires_at: null,
    manual_subscription_granted_by: null,
    manual_subscription_granted_at: null,
    manual_subscription_notes: null,
    manual_subscription_stripe_synced: false,
    subscription_status: restoredPlan,
    updated_at: new Date().toISOString(),
  };

  // Also update metadata
  metadata.subscription = stripeSubscription;
  delete metadata.manual_subscription;
  delete metadata.manual_subscription_previous;
  updateData.metadata = metadata;

  const { error: updateError } = await supabase
    .from("auth_users")
    .update(updateData)
    .eq("id", user.id);

  if (updateError) throw updateError;

  // Log to audit table
  await supabase.from("subscription_audit_log").insert({
    user_id: user.id,
    action: "revoke",
    plan_type: previousPlan,
    performed_by: grantedBy || "admin",
    notes: `Manual subscription revoked`,
  });

  console.log("Manual subscription revoked");

  return new Response(
    JSON.stringify({
      success: true,
      message: `Successfully revoked manual subscription for ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        previous_plan: previousPlan,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// List all subscriptions with pagination
async function listSubscriptions(supabase: any, request: ManualSubscriptionRequest) {
  const page = Math.max(1, Math.floor(Number(request.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(request.limit) || 50)));
  const offset = (page - 1) * limit;

  // Get total count
  const { count: totalCount } = await supabase
    .from("auth_users")
    .select("*", { count: "exact", head: true });

  // Get paginated users with subscription info
  const { data: users, error } = await supabase
    .from("auth_users")
    .select(`
      id,
      email,
      full_name,
      subscription_status,
      manual_subscription_enabled,
      manual_subscription_plan,
      manual_subscription_expires_at,
      manual_subscription_granted_by,
      manual_subscription_granted_at,
      manual_subscription_notes,
      stripe_customer_id,
      metadata,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Process users to categorize by subscription type
  const processedUsers = users.map((user: any) => {
    const stripeSubscription = user.metadata?.subscription;
    const hasStripeSubscription = stripeSubscription?.status === "active";
    const hasManualSubscription = user.manual_subscription_enabled;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      subscription_type: hasManualSubscription ? "manual" : hasStripeSubscription ? "stripe" : "free",
      subscription_status: user.subscription_status,
      plan: user.manual_subscription_plan || stripeSubscription?.plan_key || "free",
      manual_grant: hasManualSubscription ? {
        plan: user.manual_subscription_plan,
        expires_at: user.manual_subscription_expires_at,
        granted_by: user.manual_subscription_granted_by,
        granted_at: user.manual_subscription_granted_at,
        notes: user.manual_subscription_notes,
      } : null,
      stripe: hasStripeSubscription ? {
        customer_id: user.stripe_customer_id,
        subscription_id: stripeSubscription?.id,
        plan_key: stripeSubscription?.plan_key,
        current_period_end: stripeSubscription?.current_period_end,
      } : null,
      created_at: user.created_at,
    };
  });

  // Get summary statistics
  const stats = {
    total_users: totalCount,
    manual_subscriptions: users.filter((u: any) => u.manual_subscription_enabled).length,
    stripe_subscriptions: users.filter((u: any) =>
      u.metadata?.subscription?.status === "active" && !u.manual_subscription_enabled
    ).length,
    free_users: users.filter((u: any) =>
      !u.manual_subscription_enabled && u.subscription_status === "free"
    ).length,
  };

  return new Response(
    JSON.stringify({
      success: true,
      data: processedUsers,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
      stats,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Create Stripe subscription with 100% discount
async function createStripeSubscriptionWithFullDiscount(
  stripe: Stripe,
  user: any,
  plan: "plus" | "pro"
) {
  try {
    // First ensure we have or create a Stripe customer
    let stripeCustomerId = user.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          supabase_user_id: user.id,
          manual_grant: "true",
        },
      });
      stripeCustomerId = customer.id;
    }

    // Get the price ID based on plan
    const priceId = plan === "pro"
      ? Deno.env.get("STRIPE_PRO_PRICE_ID")
      : Deno.env.get("STRIPE_PLUS_PRICE_ID");

    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${plan}`);
    }

    // Create or get the 100% off coupon
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve(MANUAL_GRANT_COUPON_ID);
    } catch (e) {
      // Create the coupon if it doesn't exist
      coupon = await stripe.coupons.create({
        id: MANUAL_GRANT_COUPON_ID,
        percent_off: 100,
        duration: "forever",
        name: "Manual Grant - 100% Discount",
        metadata: {
          purpose: "manual_subscription_grant",
        },
      });
    }

    // Create the subscription with 100% discount
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      discounts: [{ coupon: coupon.id }],
      metadata: {
        manual_grant: "true",
        granted_by: user.manual_subscription_granted_by,
        granted_at: user.manual_subscription_granted_at,
      },
      // Ensure no payment is collected
      collection_method: "charge_automatically",
      days_until_due: null,
      payment_settings: {
        save_default_payment_method: "off",
      },
    });

    console.log("Created Stripe subscription with 100% discount");
    return subscription;
  } catch (error) {
    console.error("Stripe subscription creation failed:", error instanceof Error ? error.name : "UnknownError");
    throw error;
  }
}

// Sync existing manual subscription to Stripe
async function syncManualSubscriptionToStripe(
  supabase: any,
  stripe: Stripe,
  request: ManualSubscriptionRequest
) {
  const { userId, userEmail, grantedBy } = request;

  // Find user
  let user;
  if (userId) {
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    user = data;
  } else if (userEmail) {
    const { data, error } = await supabase
      .from("auth_users")
      .select("*")
      .ilike("email", userEmail.toLowerCase())
      .single();

    if (error) throw error;
    user = data;
  }

  if (!user || !user.manual_subscription_enabled) {
    return new Response(
      JSON.stringify({ error: "User not found or doesn't have a manual subscription" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create Stripe subscription with full discount
  const stripeSubscription = await createStripeSubscriptionWithFullDiscount(
    stripe,
    user,
    user.manual_subscription_plan
  );

  // Update user record
  await supabase
    .from("auth_users")
    .update({
      manual_subscription_stripe_synced: true,
      stripe_customer_id: stripeSubscription.customer,
    })
    .eq("id", user.id);

  // Log to audit
  await supabase.from("subscription_audit_log").insert({
    user_id: user.id,
    action: "sync_stripe",
    plan_type: user.manual_subscription_plan,
    performed_by: grantedBy || "admin",
    notes: "Manual subscription synced to Stripe with 100% discount",
    metadata: {
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: `Successfully synced manual subscription to Stripe for ${user.email}`,
      stripe_subscription: stripeSubscription,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Check and expire subscriptions that have passed their expiration date
async function checkAndExpireSubscriptions(supabase: any) {
  // Call the database function to check expirations
  const { error } = await supabase.rpc("check_manual_subscription_expiration");

  if (error) throw error;

  // Get count of expired subscriptions
  const { data: expiredCount } = await supabase
    .from("subscription_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "expire")
    .gte("performed_at", new Date(Date.now() - 60000).toISOString()); // Last minute

  return new Response(
    JSON.stringify({
      success: true,
      message: `Expiration check completed`,
      expired_count: expiredCount || 0,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
