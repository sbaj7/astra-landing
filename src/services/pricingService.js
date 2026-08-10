const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const pricingApiUrl = import.meta.env.VITE_PRICING_API_URL ||
  (supabaseUrl ? `${supabaseUrl}/functions/v1/pricing` : null);

const isValidPlan = (plan) => (
  plan &&
  (plan.id === 'plus' || plan.id === 'pro') &&
  Number.isInteger(plan.amount) &&
  plan.amount >= 0 &&
  typeof plan.currency === 'string' &&
  typeof plan.interval === 'string' &&
  Number.isInteger(plan.interval_count) &&
  plan.interval_count > 0
);

export const fetchPricing = async ({ signal } = {}) => {
  if (!pricingApiUrl) {
    throw new Error('Pricing API is not configured');
  }

  const response = await fetch(pricingApiUrl, {
    method: 'GET',
    headers: supabaseAnonKey ? { apikey: supabaseAnonKey } : {},
    cache: 'no-store',
    signal
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load pricing');
  }

  if (!Array.isArray(payload?.plans) || payload.plans.length !== 2) {
    throw new Error('Pricing API returned an invalid plan catalog');
  }

  const plans = Object.fromEntries(
    payload.plans.map((plan) => {
      if (!isValidPlan(plan)) {
        throw new Error('Pricing API returned invalid plan data');
      }
      return [plan.id, plan];
    })
  );

  if (!plans.plus || !plans.pro) {
    throw new Error('Pricing API did not return every required plan');
  }

  return plans;
};
