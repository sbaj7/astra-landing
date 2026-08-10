import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { getActivePlanPrices, PLAN_KEYS } from "../_shared/stripePlans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10"
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const prices = await getActivePlanPrices(stripe);
    const plans = PLAN_KEYS.map((planKey) => {
      const price = prices[planKey];
      return {
        id: planKey,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count ?? 1
      };
    });

    return new Response(JSON.stringify({ plans }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("[pricing] error", error);
    return new Response(JSON.stringify({ error: "Pricing is temporarily unavailable" }), {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  }
});
