import {
  assertEquals,
  assertNotEquals,
  assertThrows
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractBearerToken,
  hashPrivateIdentifier,
  normalizeAnonymousToken
} from "./requestIdentity.ts";
import { effectiveTier } from "./rateLimits.ts";

Deno.test("extractBearerToken accepts a bearer credential", () => {
  const request = new Request("https://example.test", {
    headers: { Authorization: "Bearer session-token" }
  });
  assertEquals(extractBearerToken(request), "session-token");
});

Deno.test("anonymous tokens require sufficient entropy and safe characters", () => {
  assertEquals(normalizeAnonymousToken("anon_1234567890abcdef"), "anon_1234567890abcdef");
  assertThrows(() => normalizeAnonymousToken("short"));
  assertThrows(() => normalizeAnonymousToken("anon token with spaces"));
});

Deno.test("private identifiers are deterministic and namespace-separated", async () => {
  Deno.env.set("USAGE_HASH_SECRET", "test-secret-with-at-least-thirty-two-characters");
  const first = await hashPrivateIdentifier("history", "opaque-token");
  const second = await hashPrivateIdentifier("history", "opaque-token");
  const otherNamespace = await hashPrivateIdentifier("metering", "opaque-token");
  assertEquals(first, second);
  assertNotEquals(first, otherNamespace);
  assertEquals(first.length, 64);
});

Deno.test("manual subscription overrides apply only while current", () => {
  assertEquals(effectiveTier({ subscription_status: "plus" }), "plus");
  assertEquals(effectiveTier({
    subscription_status: "free",
    manual_subscription_enabled: true,
    manual_subscription_plan: "pro",
    manual_subscription_expires_at: "2099-01-01T00:00:00.000Z"
  }), "pro");
  assertEquals(effectiveTier({
    subscription_status: "plus",
    manual_subscription_enabled: true,
    manual_subscription_plan: "pro",
    manual_subscription_expires_at: "2000-01-01T00:00:00.000Z"
  }), "plus");
});
