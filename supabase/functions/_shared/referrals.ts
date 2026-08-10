export type ReferralCommissionRule = {
  commission_type: "fixed" | "percentage";
  commission_amount_cents: number | null;
  commission_rate_bps: number | null;
};

export function normalizeReferralCode(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40)
    : "";
}

export function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

export function findPromotionCodeId(value: unknown, visited = new Set<unknown>()): string | null {
  if (!value || typeof value !== "object" || visited.has(value)) return null;
  visited.add(value);

  const record = value as Record<string, unknown>;
  if (record.object === "promotion_code" && typeof record.id === "string") return record.id;

  const direct = record.promotion_code;
  if (typeof direct === "string" && direct.startsWith("promo_")) return direct;
  const directId = objectId(direct);
  if (directId?.startsWith("promo_")) return directId;

  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findPromotionCodeId(item, visited);
        if (found) return found;
      }
    } else if (child && typeof child === "object") {
      const found = findPromotionCodeId(child, visited);
      if (found) return found;
    }
  }
  return null;
}

export function calculateCommissionAmount(amountPaidCents: number, rule: ReferralCommissionRule): number {
  if (!Number.isInteger(amountPaidCents) || amountPaidCents <= 0) return 0;

  if (rule.commission_type === "fixed") {
    return Number.isInteger(rule.commission_amount_cents) && Number(rule.commission_amount_cents) > 0
      ? Number(rule.commission_amount_cents)
      : 0;
  }

  return Number.isInteger(rule.commission_rate_bps) && Number(rule.commission_rate_bps) > 0
    ? Math.round(amountPaidCents * Number(rule.commission_rate_bps) / 10000)
    : 0;
}
