import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selectCurrentSubscription } from "./subscriptions.ts";

Deno.test("selects a trialing subscription", () => {
  const subscription = selectCurrentSubscription([
    { id: "sub_trial", status: "trialing" }
  ]);

  assertEquals(subscription?.id, "sub_trial");
});

Deno.test("ignores terminal subscriptions", () => {
  const subscription = selectCurrentSubscription([
    { id: "sub_canceled", status: "canceled" },
    { id: "sub_expired", status: "incomplete_expired" }
  ]);

  assertEquals(subscription, null);
});

Deno.test("selects a recoverable unpaid subscription before creating another", () => {
  const subscription = selectCurrentSubscription([
    { id: "sub_unpaid", status: "past_due" }
  ]);

  assertEquals(subscription?.id, "sub_unpaid");
});
