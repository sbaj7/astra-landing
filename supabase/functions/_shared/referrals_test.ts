import {
  assertEquals
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateCommissionAmount,
  findPromotionCodeId,
  normalizeReferralCode
} from "./referrals.ts";

Deno.test("normalizes manually entered referral codes", () => {
  assertEquals(normalizeReferralCode(" dr-smith! "), "DR-SMITH");
});

Deno.test("finds an expanded Stripe promotion code", () => {
  assertEquals(findPromotionCodeId({
    total_details: {
      breakdown: {
        discounts: [{ discount: { promotion_code: { object: "promotion_code", id: "promo_123" } } }]
      }
    }
  }), "promo_123");
});

Deno.test("finds an unexpanded Stripe promotion code ID", () => {
  assertEquals(findPromotionCodeId({ discounts: [{ promotion_code: "promo_456" }] }), "promo_456");
});

Deno.test("returns no promotion code when no code was applied", () => {
  assertEquals(findPromotionCodeId({ discounts: [] }), null);
});

Deno.test("calculates a fixed commission for each recurring invoice", () => {
  assertEquals(calculateCommissionAmount(3000, {
    commission_type: "fixed",
    commission_amount_cents: 1000,
    commission_rate_bps: null
  }), 1000);
});

Deno.test("calculates and rounds percentage commissions", () => {
  assertEquals(calculateCommissionAmount(2999, {
    commission_type: "percentage",
    commission_amount_cents: null,
    commission_rate_bps: 1500
  }), 450);
});

Deno.test("does not commission zero-dollar invoices", () => {
  assertEquals(calculateCommissionAmount(0, {
    commission_type: "fixed",
    commission_amount_cents: 1000,
    commission_rate_bps: null
  }), 0);
});
