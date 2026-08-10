const PAID_PLANS = new Set(['plus', 'pro']);
const ENTITLED_STATUSES = new Set(['active', 'trialing']);

const normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';

const firstMatching = (values, allowedValues) => (
  values.map(normalize).find((value) => allowedValues.has(value)) || ''
);

export const getEffectiveSubscriptionPlan = (profile, subscription, now = new Date()) => {
  const manualPlan = normalize(profile?.manual_subscription_plan);
  const manualExpiresAt = profile?.manual_subscription_expires_at;
  const manualIsValid = Boolean(profile?.manual_subscription_enabled) &&
    PAID_PLANS.has(manualPlan) &&
    (!manualExpiresAt || new Date(manualExpiresAt) > now);

  if (manualIsValid) return manualPlan;

  const profileSubscription = profile?.subscription || profile?.metadata?.subscription;
  const explicitTier = firstMatching([
    profile?.subscription_tier,
    profile?.subscription_status
  ], PAID_PLANS);

  if (explicitTier) return explicitTier;

  const plan = firstMatching([
    subscription?.plan_key,
    profileSubscription?.plan_key,
    profile?.subscription_plan
  ], PAID_PLANS);
  const status = firstMatching([
    subscription?.status,
    profileSubscription?.status,
    profile?.subscription_status
  ], ENTITLED_STATUSES);

  return plan && status ? plan : 'free';
};
