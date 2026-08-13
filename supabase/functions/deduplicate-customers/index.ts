import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

// Admin key for security (set this in environment variables)
const ADMIN_KEY = Deno.env.get("ADMIN_API_KEY");

// Stripe configuration
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
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

type DuplicateGroup = {
  email: string;
  customers: Array<{
    id: string;
    created: number;
    metadata: Record<string, any>;
    subscriptions: number;
  }>;
  supabase_users: string[];
};

/**
 * Scans Stripe for duplicate customers by email
 */
async function scanForDuplicates(): Promise<DuplicateGroup[]> {
  console.log("🔍 Scanning Stripe for duplicate customers...");

  const emailMap = new Map<string, Stripe.Customer[]>();
  let hasMore = true;
  let startingAfter: string | undefined;

  // Fetch all customers from Stripe
  while (hasMore) {
    const customers = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter
    });

    for (const customer of customers.data) {
      if (customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        if (!emailMap.has(normalizedEmail)) {
          emailMap.set(normalizedEmail, []);
        }
        emailMap.get(normalizedEmail)!.push(customer);
      }
    }

    hasMore = customers.has_more;
    if (hasMore && customers.data.length > 0) {
      startingAfter = customers.data[customers.data.length - 1].id;
    }
  }

  console.log(`📊 Found ${emailMap.size} unique email addresses`);

  // Filter to only emails with duplicates
  const duplicates: DuplicateGroup[] = [];

  for (const [email, customers] of emailMap.entries()) {
    if (customers.length > 1) {
      // Get subscription counts for each customer
      const customerDetails = await Promise.all(
        customers.map(async (customer) => {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 100
          });

          return {
            id: customer.id,
            created: customer.created,
            metadata: customer.metadata || {},
            subscriptions: subscriptions.data.length
          };
        })
      );

      // Get associated supabase users
      const supabaseUserIds = customers
        .map(c => c.metadata?.supabase_user_id)
        .filter((id): id is string => !!id);

      duplicates.push({
        email,
        customers: customerDetails,
        supabase_users: supabaseUserIds
      });
    }
  }

  console.log(`⚠️ Found ${duplicates.length} emails with duplicate customers`);
  return duplicates;
}

/**
 * Gets recommended merge action for a duplicate group
 */
function getRecommendedMerge(group: DuplicateGroup): {
  keep: string;
  delete: string[];
  reason: string;
} {
  const { customers } = group;

  // Priority 1: Keep customer with active subscriptions
  const withSubscriptions = customers.filter(c => c.subscriptions > 0);
  if (withSubscriptions.length === 1) {
    const keep = withSubscriptions[0];
    const deleteIds = customers.filter(c => c.id !== keep.id).map(c => c.id);
    return {
      keep: keep.id,
      delete: deleteIds,
      reason: "Has active subscriptions"
    };
  }

  // Priority 2: Keep customer with supabase_user_id metadata
  const withMetadata = customers.filter(c => c.metadata?.supabase_user_id);
  if (withMetadata.length === 1) {
    const keep = withMetadata[0];
    const deleteIds = customers.filter(c => c.id !== keep.id).map(c => c.id);
    return {
      keep: keep.id,
      delete: deleteIds,
      reason: "Has Supabase user ID in metadata"
    };
  }

  // Priority 3: Keep oldest customer
  const sorted = [...customers].sort((a, b) => a.created - b.created);
  const keep = sorted[0];
  const deleteIds = customers.filter(c => c.id !== keep.id).map(c => c.id);

  return {
    keep: keep.id,
    delete: deleteIds,
    reason: "Oldest customer"
  };
}

/**
 * Merges duplicate customers (deletes duplicates, keeps primary)
 */
async function mergeDuplicateCustomers(
  keepCustomerId: string,
  deleteCustomerIds: string[],
  supabase: ReturnType<typeof createSupabaseClient>
): Promise<{ success: boolean; details: string }> {
  console.log(`Merging duplicate customers; deleting ${deleteCustomerIds.length}`);

  try {
    // Get the customer we're keeping
    const keepCustomer = await stripe.customers.retrieve(keepCustomerId);

    // For each customer to delete, migrate their subscriptions
    for (const deleteId of deleteCustomerIds) {
      // Get subscriptions from the customer to delete
      const subscriptions = await stripe.subscriptions.list({
        customer: deleteId,
        limit: 100
      });

      // If they have subscriptions, we need to be careful
      if (subscriptions.data.length > 0) {
        console.warn(`Duplicate customer has ${subscriptions.data.length} subscriptions; manual review required`);
        return {
          success: false,
          details: `Customer ${deleteId} has active subscriptions. Manual review required to prevent data loss.`
        };
      }

      // Update database records pointing to the old customer
      const { error: updateError } = await supabase
        .from("auth_users")
        .update({
          stripe_customer_id: keepCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq("stripe_customer_id", deleteId);

      if (updateError) {
        console.error("Failed to update database for duplicate customer:", updateError?.code || "database_error");
      }

      // Delete the Stripe customer
      await stripe.customers.del(deleteId);
      console.log("Deleted duplicate Stripe customer");
    }

    return {
      success: true,
      details: `Successfully merged ${deleteCustomerIds.length} duplicate customer(s) into ${keepCustomerId}`
    };
  } catch (error: any) {
    console.error("Customer merge failed:", error instanceof Error ? error.name : "UnknownError");
    return {
      success: false,
      details: "Merge failed"
    };
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify admin key
  const adminKey = req.headers.get("x-admin-key");
  if (ADMIN_KEY && adminKey !== ADMIN_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized - invalid admin key" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "scan";

    const supabase = createSupabaseClient();

    switch (action) {
      case "scan": {
        // Scan for duplicates
        const duplicates = await scanForDuplicates();

        // Add merge recommendations
        const report = duplicates.map(group => ({
          ...group,
          recommendation: getRecommendedMerge(group)
        }));

        return new Response(
          JSON.stringify({
            total_duplicate_groups: duplicates.length,
            total_duplicate_customers: duplicates.reduce((sum, g) => sum + g.customers.length - 1, 0),
            duplicates: report
          }, null, 2),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "merge": {
        // Merge specific duplicates
        const body = await req.json();
        const { keep, delete: deleteIds } = body;

        if (!keep || !deleteIds || !Array.isArray(deleteIds)) {
          return new Response(
            JSON.stringify({ error: "Invalid request - need 'keep' customer ID and 'delete' array" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result = await mergeDuplicateCustomers(keep, deleteIds, supabase);

        return new Response(
          JSON.stringify(result),
          {
            status: result.success ? 200 : 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      case "auto-merge": {
        // Automatically merge all safe duplicates
        const duplicates = await scanForDuplicates();
        const results = [];

        for (const group of duplicates) {
          const recommendation = getRecommendedMerge(group);

          // Only auto-merge if it's safe (no subscriptions on delete candidates)
          const deleteCustomers = await Promise.all(
            recommendation.delete.map(id => stripe.customers.retrieve(id))
          );

          const hasSubs = await Promise.all(
            deleteCustomers.map(async (c: Stripe.Customer | Stripe.DeletedCustomer) => {
              const subs = await stripe.subscriptions.list({ customer: c.id, limit: 1 });
              return subs.data.length > 0;
            })
          );

          if (hasSubs.some((has: boolean) => has)) {
            results.push({
              email: group.email,
              skipped: true,
              reason: "Has subscriptions - requires manual review"
            });
            continue;
          }

          const mergeResult = await mergeDuplicateCustomers(
            recommendation.keep,
            recommendation.delete,
            supabase
          );

          results.push({
            email: group.email,
            ...mergeResult
          });
        }

        return new Response(
          JSON.stringify({
            total_processed: results.length,
            results
          }, null, 2),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Use 'scan', 'merge', or 'auto-merge'` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("[deduplicate-customers] error:", error instanceof Error ? error.name : "UnknownError");
    return new Response(
      JSON.stringify({ error: "Customer maintenance request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
