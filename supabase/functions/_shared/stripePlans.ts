import type Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export type PlanKey = "plus" | "pro";

export const PLAN_KEYS: PlanKey[] = ["plus", "pro"];

export const PLAN_DEFINITIONS: Record<PlanKey, { lookupKey: string; productId: string }> = {
  plus: {
    lookupKey: "astra_plus_monthly",
    productId: "prod_TAsFEeftsdyYHE"
  },
  pro: {
    lookupKey: "astra_pro_monthly",
    productId: "prod_TAsHuURFOd0asN"
  }
};

export async function getActivePlanPrices(
  stripe: Stripe
): Promise<Record<PlanKey, Stripe.Price>> {
  const response = await stripe.prices.list({
    active: true,
    lookup_keys: PLAN_KEYS.map((planKey) => PLAN_DEFINITIONS[planKey].lookupKey),
    type: "recurring",
    limit: PLAN_KEYS.length
  });

  const pricesByLookupKey = new Map<string, Stripe.Price>();
  for (const price of response.data as Stripe.Price[]) {
    if (price.lookup_key) {
      pricesByLookupKey.set(price.lookup_key, price);
    }
  }

  return Object.fromEntries(
    PLAN_KEYS.map((planKey) => {
      const definition = PLAN_DEFINITIONS[planKey];
      const price = pricesByLookupKey.get(definition.lookupKey);

      if (
        !price ||
        price.unit_amount === null ||
        !price.recurring ||
        price.recurring.usage_type !== "licensed"
      ) {
        throw new Error(`Missing valid active Stripe price for ${definition.lookupKey}`);
      }

      return [planKey, price];
    })
  ) as Record<PlanKey, Stripe.Price>;
}

export function getPlanKeyForPrice(price: Stripe.Price | null | undefined): PlanKey | null {
  if (!price) return null;

  const metadataPlan = price.metadata?.plan_key;
  if (metadataPlan === "plus" || metadataPlan === "pro") {
    return metadataPlan;
  }

  const lookupPlan = PLAN_KEYS.find(
    (planKey) => PLAN_DEFINITIONS[planKey].lookupKey === price.lookup_key
  );
  if (lookupPlan) return lookupPlan;

  const productId = typeof price.product === "string" ? price.product : price.product?.id;
  return PLAN_KEYS.find(
    (planKey) => PLAN_DEFINITIONS[planKey].productId === productId
  ) ?? null;
}
