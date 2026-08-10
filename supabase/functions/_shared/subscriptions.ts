export type StripeSubscriptionLike = {
  status: string;
};

const currentSubscriptionStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused"
]);

export function selectCurrentSubscription<T extends StripeSubscriptionLike>(subscriptions: T[]): T | null {
  return subscriptions.find((subscription) => currentSubscriptionStatuses.has(subscription.status)) || null;
}
