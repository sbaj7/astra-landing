export type SubscriptionTier = "free" | "plus" | "pro";

export const SUBSCRIPTION_DAILY_CHAT_LIMITS: Readonly<Record<SubscriptionTier, number>> =
  Object.freeze({
    free: 10,
    plus: 50,
    pro: Infinity
  });

export function getSubscriptionDailyChatLimit(tier: unknown): number {
  const normalizedTier = typeof tier === "string" ? tier.toLowerCase() : "free";

  if (normalizedTier === "plus" || normalizedTier === "pro") {
    return SUBSCRIPTION_DAILY_CHAT_LIMITS[normalizedTier];
  }

  return SUBSCRIPTION_DAILY_CHAT_LIMITS.free;
}
