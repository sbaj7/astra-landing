import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  getSubscriptionDailyChatLimit,
  SUBSCRIPTION_DAILY_CHAT_LIMITS
} from "./usageLimits.ts";

Deno.test("Plus receives the advertised 50 daily chats", () => {
  assertEquals(SUBSCRIPTION_DAILY_CHAT_LIMITS.plus, 50);
  assertEquals(getSubscriptionDailyChatLimit("plus"), 50);
});

Deno.test("Pro remains unlimited", () => {
  assertEquals(getSubscriptionDailyChatLimit("pro"), Infinity);
});

Deno.test("Unknown tiers fall back to the free limit", () => {
  assertEquals(getSubscriptionDailyChatLimit("trialing"), 10);
  assertEquals(getSubscriptionDailyChatLimit(null), 10);
});
