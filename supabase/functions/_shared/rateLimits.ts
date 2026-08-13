import { HttpError, type RequestIdentity } from "./requestIdentity.ts";
import {
  getSubscriptionDailyChatLimit,
  type SubscriptionTier
} from "./usageLimits.ts";

export type RateLimitState = {
  allowed: boolean;
  used: number;
  remaining: number;
  resetAt: string;
};

type SubscriptionRecord = {
  subscription_status?: string | null;
  manual_subscription_enabled?: boolean | null;
  manual_subscription_plan?: string | null;
  manual_subscription_expires_at?: string | null;
};

const ANONYMOUS_CHAT_LIMIT = 3;
const QBANK_DAILY_LIMITS: Readonly<Record<SubscriptionTier | "anonymous", number>> = Object.freeze({
  anonymous: 20,
  free: 100,
  plus: 500,
  pro: 2000
});
const QBANK_TUTOR_DAILY_LIMITS: Readonly<Record<SubscriptionTier | "anonymous", number>> = Object.freeze({
  anonymous: 30,
  free: 150,
  plus: 750,
  pro: 3000
});

function normalizeTier(value: unknown): SubscriptionTier {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "free";
  if (normalized === "plus" || normalized === "pro") return normalized;
  return "free";
}

export function effectiveTier(record: SubscriptionRecord | null | undefined): SubscriptionTier {
  if (!record) return "free";
  const manualExpiresAt = record.manual_subscription_expires_at
    ? new Date(record.manual_subscription_expires_at)
    : null;
  const manualIsCurrent = Boolean(record.manual_subscription_enabled) &&
    (!manualExpiresAt || (!Number.isNaN(manualExpiresAt.getTime()) && manualExpiresAt > new Date()));
  return normalizeTier(
    manualIsCurrent
      ? record.manual_subscription_plan || record.subscription_status
      : record.subscription_status
  );
}

export async function loadSubscriptionTier(
  supabase: any,
  identity: RequestIdentity
): Promise<SubscriptionTier | "anonymous"> {
  if (identity.kind === "anonymous") return "anonymous";
  const { data, error } = await supabase
    .from("auth_users")
    .select("subscription_status, manual_subscription_enabled, manual_subscription_plan, manual_subscription_expires_at")
    .eq("auth0_id", identity.user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) {
    throw new HttpError(503, "Usage service unavailable");
  }
  return effectiveTier(data?.[0]);
}

function normalizeRpcResult(data: unknown): RateLimitState {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new HttpError(503, "Usage service unavailable");
  }
  const record = row as Record<string, unknown>;
  return {
    allowed: record.allowed === true,
    used: Number(record.used) || 0,
    remaining: Math.max(0, Number(record.remaining) || 0),
    resetAt: typeof record.reset_at === "string"
      ? record.reset_at
      : new Date(Date.now() + 86_400_000).toISOString()
  };
}

export async function consumeRateLimit(
  supabase: any,
  scopeKey: string,
  bucket: string,
  limit: number,
  windowSeconds = 86_400
): Promise<RateLimitState> {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_scope_key: scopeKey,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  if (error) {
    throw new HttpError(503, "Usage service unavailable");
  }
  return normalizeRpcResult(data);
}

export async function inspectRateLimit(
  supabase: any,
  scopeKey: string,
  bucket: string,
  limit: number,
  windowSeconds = 86_400
): Promise<RateLimitState> {
  const { data, error } = await supabase.rpc("get_api_rate_limit", {
    p_scope_key: scopeKey,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  if (error) {
    throw new HttpError(503, "Usage service unavailable");
  }
  return normalizeRpcResult(data);
}

export async function getChatAllowance(
  supabase: any,
  identity: RequestIdentity
): Promise<{ tier: SubscriptionTier | "anonymous"; limit: number }> {
  const tier = await loadSubscriptionTier(supabase, identity);
  return {
    tier,
    limit: tier === "anonymous" ? ANONYMOUS_CHAT_LIMIT : getSubscriptionDailyChatLimit(tier)
  };
}

export async function getQbankAllowance(
  supabase: any,
  identity: RequestIdentity,
  kind: "generate" | "tutor"
): Promise<{ tier: SubscriptionTier | "anonymous"; limit: number }> {
  const tier = await loadSubscriptionTier(supabase, identity);
  return {
    tier,
    limit: kind === "generate" ? QBANK_DAILY_LIMITS[tier] : QBANK_TUTOR_DAILY_LIMITS[tier]
  };
}
