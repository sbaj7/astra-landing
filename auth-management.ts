import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

type SubscriptionSnapshot = {
  id: string | null;
  status: string | null;
  plan_key: string | null;
  price_id: string | null;
  current_period_end: number | null;
  current_period_start: number | null;
  cancel_at_period_end: boolean;
  synced_at: string | null;
};

function extractSubscriptionMetadata(metadata: unknown): SubscriptionSnapshot | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const subscription = (metadata as Record<string, any>).subscription;
  if (!subscription || typeof subscription !== "object" || Array.isArray(subscription)) {
    return null;
  }

  const planKey = typeof subscription.plan_key === "string" ? subscription.plan_key : null;
  const status = typeof subscription.status === "string" ? subscription.status : null;

  return {
    id: typeof subscription.id === "string" ? subscription.id : null,
    status,
    plan_key: planKey,
    price_id: typeof subscription.price_id === "string" ? subscription.price_id : null,
    current_period_end: typeof subscription.current_period_end === "number" ? subscription.current_period_end : null,
    current_period_start: typeof subscription.current_period_start === "number" ? subscription.current_period_start : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    synced_at: typeof subscription.synced_at === "string" ? subscription.synced_at : null
  };
}

function attachSubscriptionFields(user: any) {
  if (!user) {
    return null;
  }
  const subscription = extractSubscriptionMetadata(user.metadata);
  const columnPlan =
    typeof user.subscription_status === "string" && user.subscription_status.trim().length > 0
      ? user.subscription_status.trim()
      : null;
  const subscriptionPlan = subscription?.plan_key ?? columnPlan;
  return {
    ...user,
    subscription,
    subscription_plan: subscriptionPlan,
    subscription_status: subscription?.status ?? null,
    subscription_tier: columnPlan
  };
}

const ALLOWED_SETTING_KEYS = new Set(['theme', 'accentColor', 'language', 'spokenLanguage']);

function sanitizeSettings(settings: unknown) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null;
  }

  const result: Record<string, string> = {};
  for (const key of ALLOWED_SETTING_KEYS) {
    const rawValue = (settings as Record<string, unknown>)[key];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0) {
        result[key] = trimmed;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due']);
const PLAN_LIMITS: Record<string, number | null> = {
  free: 10,
  plus: 50,
  pro: null
};
const DEFAULT_LIMIT_RESET_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_PLAN_LIMIT = 5;

function getNextResetTimestamp(): string {
  return new Date(Date.now() + DEFAULT_LIMIT_RESET_MS).toISOString();
}

function normalizePlanKey(planKey: unknown): string {
  if (typeof planKey !== 'string') return 'free';
  const normalized = planKey.trim().toLowerCase();
  if (normalized === 'plus' || normalized === 'pro') {
    return normalized;
  }
  return 'free';
}

function deriveUserPlan(user: any) {
  const enriched = attachSubscriptionFields(user) ?? user ?? {};
  const rawPlan = enriched?.subscription_plan ?? enriched?.subscription_tier ?? enriched?.subscription_status ?? 'free';
  const planKey = normalizePlanKey(rawPlan);
  const rawStatus = typeof enriched?.subscription_status === 'string' ? enriched.subscription_status : enriched?.subscription?.status;
  const isActive = rawStatus ? ACTIVE_SUBSCRIPTION_STATUSES.has(String(rawStatus).toLowerCase()) : true;
  if (!isActive) {
    return {
      plan: 'free',
      limit: PLAN_LIMITS.free,
      isUnlimited: false
    };
  }
  const limit = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.free;
  return {
    plan: planKey,
    limit,
    isUnlimited: limit === null
  };
}

async function ensureAuthUserRecord(
  supabase: ReturnType<typeof createClient>,
  {
    supabase_user,
    user_id
  }: {
    supabase_user?: any;
    user_id?: string;
  }
) {
  if (user_id) {
    const { data, error } = await supabase.from("auth_users").select("*").eq("id", user_id).maybeSingle();
    if (error && error.code !== "PGRST116") {
      throw error;
    }
    if (data) {
      return data;
    }
  }

  const authId = supabase_user?.id;
  if (!authId) {
    return null;
  }

  const { data: existing, error } = await supabase.from("auth_users").select("*").eq("auth0_id", authId).maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw error;
  }
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const incomingMetadata = typeof supabase_user.metadata === "object" && supabase_user.metadata !== null ? supabase_user.metadata : {};
  const incomingSettings = sanitizeSettings(incomingMetadata?.settings);
  const appMetadata = typeof supabase_user.app_metadata === "object" && supabase_user.app_metadata !== null ? supabase_user.app_metadata : {};
  const identities = Array.isArray(supabase_user.identities) ? supabase_user.identities : [];
  const identitySummaries = identities.map((identity) => ({
    provider: identity?.provider || identity?.identity_provider || null,
    identity_id: identity?.id || identity?.identity_id || null,
    email: identity?.email || identity?.identity_data?.email || null,
    last_sign_in_at: identity?.last_sign_in_at || identity?.last_signin_at || null
  }));
  const primaryProvider =
    appMetadata?.provider ||
    identitySummaries.find((item) => !!item.provider)?.provider ||
    (supabase_user.email ? "email" : "unknown");

  const metadata: Record<string, any> = {
    avatar_url: supabase_user.avatar_url || incomingMetadata.avatar_url || null,
    supabase_profile: incomingMetadata,
    app_metadata: appMetadata,
    auth_provider: primaryProvider,
    auth_providers: identitySummaries
  };
  if (incomingSettings) {
    metadata.settings = incomingSettings;
  }

  const normalizedFullName =
    supabase_user.full_name ||
    incomingMetadata.full_name ||
    incomingMetadata.name ||
    supabase_user.email ||
    "User";

  const insertPayload = {
    auth0_id: authId,
    email: supabase_user.email || "",
    full_name: normalizedFullName,
    metadata,
    subscription_status: "free",
    created_at: now,
    updated_at: now
  };

  const { data: createdUser, error: insertError } = await supabase
    .from("auth_users")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return createdUser;
}

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const pathname = url.pathname.split("/").pop();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    let body = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch  {
        body = {};
      }
    }
    switch(pathname){
      case "check-limit":
        return await handleCheckLimit(body, supabase);
      case "increment-usage":
        return await handleIncrementUsage(body, supabase);
      case "sync-user":
        return await handleSyncUser(body, supabase);
      case "save-session":
        return await handleSaveSession(body, supabase);
      case "get-sessions":
        return await handleGetSessions(body, supabase);
      case "delete-session":
        return await handleDeleteSession(body, supabase);
      case "update-profile":
        return await handleUpdateProfile(body, supabase);
      default:
        return new Response(JSON.stringify({
          error: `Unknown endpoint: ${pathname}`
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
    }
  } catch (error) {
    console.error("[auth-management] Error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
/* -------------------------------------------------------------------------- */ /*  Usage limits                                                              */ /* -------------------------------------------------------------------------- */
async function handleCheckLimit(body: any, supabase: ReturnType<typeof createClient>) {
  const { anonymous_id, supabase_user, user_id } = body ?? {};

  if (supabase_user?.id || user_id) {
    try {
      return await handleAuthenticatedLimitCheck(supabase, { supabase_user, user_id });
    } catch (error) {
      console.error("Failed to check authenticated user limit:", error);
      return new Response(JSON.stringify({
        error: "Unable to determine usage limit"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }

  if (!anonymous_id) {
    return new Response(JSON.stringify({
      error: "anonymous_id required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  let { data: limitRecord } = await supabase
    .from("anonymous_limits")
    .select("*")
    .eq("anonymous_id", anonymous_id)
    .single();

  const now = new Date();
  if (!limitRecord) {
    const newRecord = {
      anonymous_id,
      chats_used: 0,
      reset_at: getNextResetTimestamp(),
      updated_at: now.toISOString()
    };
    const { data } = await supabase.from("anonymous_limits").insert(newRecord).select().single();
    limitRecord = data ?? newRecord;
  }

  const resetTime = new Date(limitRecord.reset_at);
  if (Number.isNaN(resetTime.getTime()) || resetTime <= now) {
    const nextReset = getNextResetTimestamp();
    const { data } = await supabase
      .from("anonymous_limits")
      .update({
        chats_used: 0,
        reset_at: nextReset,
        updated_at: now.toISOString()
      })
      .eq("anonymous_id", anonymous_id)
      .select()
      .single();
    limitRecord = data ?? {
      anonymous_id,
      chats_used: 0,
      reset_at: nextReset,
      updated_at: now.toISOString()
    };
  }

  const used = limitRecord.chats_used ?? 0;
  const remaining = Math.max(0, ANONYMOUS_PLAN_LIMIT - used);

  return new Response(JSON.stringify({
    plan: "guest",
    limit: ANONYMOUS_PLAN_LIMIT,
    remaining,
    used,
    reset_at: limitRecord.reset_at,
    is_unlimited: false
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

async function handleAuthenticatedLimitCheck(
  supabase: ReturnType<typeof createClient>,
  {
    supabase_user,
    user_id
  }: {
    supabase_user?: any;
    user_id?: string;
  }
) {
  const now = new Date();
  const authUser = await ensureAuthUserRecord(supabase, { supabase_user, user_id });

  if (!authUser) {
    return new Response(JSON.stringify({
      error: "user context required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const planInfo = deriveUserPlan(authUser);

  if (planInfo.isUnlimited) {
    return new Response(JSON.stringify({
      plan: planInfo.plan,
      limit: null,
      remaining: null,
      used: null,
      reset_at: null,
      is_unlimited: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  let { data: limitRecord } = await supabase
    .from("user_limits")
    .select("*")
    .eq("user_id", authUser.id)
    .single();

  if (!limitRecord) {
    const newRecord = {
      user_id: authUser.id,
      chats_used: 0,
      reset_at: getNextResetTimestamp(),
      updated_at: now.toISOString()
    };
    const { data } = await supabase.from("user_limits").insert(newRecord).select().single();
    limitRecord = data ?? newRecord;
  }

  const resetTime = new Date(limitRecord.reset_at);
  if (Number.isNaN(resetTime.getTime()) || resetTime <= now) {
    const nextReset = getNextResetTimestamp();
    const { data } = await supabase
      .from("user_limits")
      .update({
        chats_used: 0,
        reset_at: nextReset,
        updated_at: now.toISOString()
      })
      .eq("user_id", authUser.id)
      .select()
      .single();
    limitRecord = data ?? {
      user_id: authUser.id,
      chats_used: 0,
      reset_at: nextReset,
      updated_at: now.toISOString()
    };
  }

  const used = limitRecord.chats_used ?? 0;
  const limit = typeof planInfo.limit === "number" ? planInfo.limit : PLAN_LIMITS.free;
  const remaining = Math.max(0, limit - used);

  return new Response(JSON.stringify({
    plan: planInfo.plan,
    limit,
    remaining,
    used,
    reset_at: limitRecord.reset_at,
    is_unlimited: false
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

async function handleAuthenticatedIncrementUsage(
  supabase: ReturnType<typeof createClient>,
  {
    supabase_user,
    user_id
  }: {
    supabase_user?: any;
    user_id?: string;
  }
) {
  const now = new Date();
  const authUser = await ensureAuthUserRecord(supabase, { supabase_user, user_id });

  if (!authUser) {
    return new Response(JSON.stringify({
      error: "user context required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const planInfo = deriveUserPlan(authUser);

  if (planInfo.isUnlimited) {
    return new Response(JSON.stringify({
      success: true,
      plan: planInfo.plan,
      is_unlimited: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const limit = typeof planInfo.limit === "number" ? planInfo.limit : PLAN_LIMITS.free;

  let { data: record } = await supabase
    .from("user_limits")
    .select("*")
    .eq("user_id", authUser.id)
    .single();

  if (!record) {
    const newRecord = {
      user_id: authUser.id,
      chats_used: 1,
      reset_at: getNextResetTimestamp(),
      updated_at: now.toISOString()
    };
    const { data } = await supabase.from("user_limits").insert(newRecord).select().single();
    record = data ?? newRecord;
    const remainingAfterInsert = Math.max(0, limit - (record.chats_used ?? 1));
    return new Response(JSON.stringify({
      success: true,
      plan: planInfo.plan,
      used: record.chats_used ?? 1,
      remaining: remainingAfterInsert,
      limit,
      reset_at: record.reset_at,
      is_unlimited: false
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const resetTime = new Date(record.reset_at);
  let currentUsed = record.chats_used ?? 0;
  if (Number.isNaN(resetTime.getTime()) || resetTime <= now) {
    const nextReset = getNextResetTimestamp();
    currentUsed = 0;
    const { data } = await supabase
      .from("user_limits")
      .update({
        chats_used: 0,
        reset_at: nextReset,
        updated_at: now.toISOString()
      })
      .eq("user_id", authUser.id)
      .select()
      .single();
    record = data ?? {
      user_id: authUser.id,
      chats_used: 0,
      reset_at: nextReset,
      updated_at: now.toISOString()
    };
  }

  if (currentUsed >= limit) {
    return new Response(JSON.stringify({
      error: "Chat limit reached",
      plan: planInfo.plan,
      limit,
      used: currentUsed,
      remaining: 0
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const nextUsed = currentUsed + 1;
  const { data: updatedRecord } = await supabase
    .from("user_limits")
    .update({
      chats_used: nextUsed,
      updated_at: now.toISOString()
    })
    .eq("user_id", authUser.id)
    .select()
    .single();

  const finalRecord = updatedRecord ?? { ...record, chats_used: nextUsed };
  const remaining = Math.max(0, limit - nextUsed);

  return new Response(JSON.stringify({
    success: true,
    plan: planInfo.plan,
    used: finalRecord.chats_used ?? nextUsed,
    remaining,
    limit,
    reset_at: finalRecord.reset_at,
    is_unlimited: false
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
async function handleIncrementUsage(body: any, supabase: ReturnType<typeof createClient>) {
  const { anonymous_id, supabase_user, user_id } = body ?? {};

  if (supabase_user?.id || user_id) {
    try {
      return await handleAuthenticatedIncrementUsage(supabase, { supabase_user, user_id });
    } catch (error) {
      console.error("Failed to increment authenticated usage:", error);
      return new Response(JSON.stringify({
        error: "Unable to record usage"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }

  if (!anonymous_id) {
    return new Response(JSON.stringify({
      error: "anonymous_id required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const now = new Date();
  const { data: existingRecord } = await supabase
    .from("anonymous_limits")
    .select("*")
    .eq("anonymous_id", anonymous_id)
    .single();
  let record = existingRecord ?? null;

  if (!record) {
    const resetAt = getNextResetTimestamp();
    const { data: inserted } = await supabase.from("anonymous_limits").insert({
      anonymous_id,
      chats_used: 1,
      reset_at: resetAt,
      updated_at: now.toISOString()
    }).select().single();
    const created = inserted ?? {
      anonymous_id,
      chats_used: 1,
      reset_at: resetAt,
      updated_at: now.toISOString()
    };
    return new Response(JSON.stringify({
      success: true,
      plan: "guest",
      used: created.chats_used ?? 1,
      remaining: Math.max(0, ANONYMOUS_PLAN_LIMIT - (created.chats_used ?? 1)),
      limit: ANONYMOUS_PLAN_LIMIT,
      reset_at: created.reset_at,
      is_unlimited: false
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const resetTime = new Date(record.reset_at);
  if (Number.isNaN(resetTime.getTime()) || resetTime <= now) {
    const nextReset = getNextResetTimestamp();
    const { data } = await supabase
      .from("anonymous_limits")
      .update({
        chats_used: 0,
        reset_at: nextReset,
        updated_at: now.toISOString()
      })
      .eq("id", record.id)
      .select()
      .single();
    record = data ?? {
      ...record,
      chats_used: 0,
      reset_at: nextReset,
      updated_at: now.toISOString()
    };
  }

  const currentUsed = record.chats_used ?? 0;
  if (currentUsed >= ANONYMOUS_PLAN_LIMIT) {
    return new Response(JSON.stringify({
      error: "Chat limit reached",
      plan: "guest",
      limit: ANONYMOUS_PLAN_LIMIT,
      used: currentUsed,
      remaining: 0
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const nextUsed = currentUsed + 1;
  const { data: updatedRecord } = await supabase
    .from("anonymous_limits")
    .update({
      chats_used: nextUsed,
      updated_at: now.toISOString()
    })
    .eq("id", record.id)
    .select()
    .single();

  const finalRecord = updatedRecord ?? { ...record, chats_used: nextUsed };

  return new Response(JSON.stringify({
    success: true,
    plan: "guest",
    used: finalRecord.chats_used ?? nextUsed,
    remaining: Math.max(0, ANONYMOUS_PLAN_LIMIT - (finalRecord.chats_used ?? nextUsed)),
    limit: ANONYMOUS_PLAN_LIMIT,
    reset_at: finalRecord.reset_at,
    is_unlimited: false
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
/* -------------------------------------------------------------------------- */ /*  Supabase user sync                                                        */ /* -------------------------------------------------------------------------- */ async function handleSyncUser(body, supabase) {
  const { supabase_user, anonymous_id } = body;
  if (!supabase_user || !supabase_user.id) {
    return new Response(JSON.stringify({
      error: "supabase_user required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const now = new Date().toISOString();
  const incomingMetadata = typeof supabase_user.metadata === "object" && supabase_user.metadata !== null ? supabase_user.metadata : {};
  const incomingSettings = sanitizeSettings(incomingMetadata?.settings);
  const appMetadata = typeof supabase_user.app_metadata === "object" && supabase_user.app_metadata !== null ? supabase_user.app_metadata : {};
  const identities = Array.isArray(supabase_user.identities) ? supabase_user.identities : [];
  const identitySummaries = identities.map((identity) => ({
    provider: identity?.provider || identity?.identity_provider || null,
    identity_id: identity?.id || identity?.identity_id || null,
    email: identity?.email || identity?.identity_data?.email || null,
    last_sign_in_at: identity?.last_sign_in_at || identity?.last_signin_at || null
  }));
  const primaryProvider = (appMetadata?.provider || identitySummaries.find((item) => !!item.provider)?.provider || (supabase_user.email ? "email" : "unknown")) as string;
  const normalizedFullName = supabase_user.full_name || incomingMetadata.full_name || incomingMetadata.name || supabase_user.email || "User";
  const { data: existingUser } = await supabase.from("auth_users").select("*").eq("auth0_id", supabase_user.id).maybeSingle();
  let targetUser = existingUser;
  if (existingUser) {
    const nextMetadata = {
      ...existingUser.metadata || {},
      last_login: now,
      avatar_url: supabase_user.avatar_url || incomingMetadata.avatar_url || existingUser.metadata?.avatar_url || null,
      supabase_profile: incomingMetadata,
      app_metadata: appMetadata,
      auth_provider: primaryProvider,
      auth_providers: identitySummaries
    };
    if (incomingSettings && Object.keys(incomingSettings).length > 0) {
      nextMetadata.settings = {
        ...(typeof nextMetadata.settings === "object" && nextMetadata.settings !== null ? nextMetadata.settings : {}),
        ...incomingSettings
      };
    }
    const { data: updatedUser } = await supabase.from("auth_users").update({
      updated_at: now,
      email: supabase_user.email || existingUser.email,
      full_name: normalizedFullName,
      metadata: nextMetadata
    }).eq("id", existingUser.id).select().single();
    targetUser = updatedUser ?? existingUser;
  } else {
    const { data: newUser, error } = await supabase.from("auth_users").insert({
      auth0_id: supabase_user.id,
      email: supabase_user.email || "",
      full_name: normalizedFullName,
      metadata: {
        avatar_url: supabase_user.avatar_url || incomingMetadata.avatar_url || null,
        supabase_profile: incomingMetadata,
        app_metadata: appMetadata,
        auth_provider: primaryProvider,
        auth_providers: identitySummaries,
        first_login: now,
        ...(incomingSettings && Object.keys(incomingSettings).length > 0 ? { settings: incomingSettings } : {})
      },
      created_at: now,
      updated_at: now
    }).select().single();
    if (error) {
      console.error("Failed to create Supabase user record:", error);
      return new Response(JSON.stringify({
        error: "Failed to create user"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    targetUser = newUser;
  }
  if (anonymous_id && targetUser) {
    await supabase.from("user_chat_sessions").update({
      user_id: targetUser.id,
      anonymous_id: null
    }).eq("anonymous_id", anonymous_id);
    await supabase.from("anonymous_limits").delete().eq("anonymous_id", anonymous_id);
  }
  const responseUser = attachSubscriptionFields(targetUser);
  return new Response(JSON.stringify({
    user: responseUser
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
/* -------------------------------------------------------------------------- */ /*  Chat sessions                                                             */ /* -------------------------------------------------------------------------- */ async function handleSaveSession(body, supabase) {
  const { title, messages, mode, user_id, anonymous_id } = body;
  if (!title || !messages) {
    return new Response(JSON.stringify({
      error: "title and messages required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const { data, error } = await supabase.from("user_chat_sessions").insert({
    user_id: user_id || null,
    anonymous_id: user_id ? null : anonymous_id,
    title: title.substring(0, 100),
    messages,
    mode: mode || "search",
    created_at: new Date().toISOString()
  }).select().single();
  if (error) {
    console.error("Error saving session:", error);
    return new Response(JSON.stringify({
      error: "Failed to save session"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  return new Response(JSON.stringify({
    session: data
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
async function handleGetSessions(body, supabase) {
  const { user_id, anonymous_id, limit = 20 } = body;
  let query = supabase.from("user_chat_sessions").select("*").order("created_at", {
    ascending: false
  }).limit(limit);
  if (user_id) {
    query = query.eq("user_id", user_id);
  } else if (anonymous_id) {
    query = query.eq("anonymous_id", anonymous_id);
  } else {
    return new Response(JSON.stringify({
      error: "user_id or anonymous_id required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error getting sessions:", error);
    return new Response(JSON.stringify({
      error: "Failed to get sessions"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  return new Response(JSON.stringify({
    sessions: data || []
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
async function handleDeleteSession(body, supabase) {
  const { session_id, user_id, anonymous_id } = body;
  if (!session_id) {
    return new Response(JSON.stringify({
      error: "session_id required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  let query = supabase.from("user_chat_sessions").delete().eq("id", session_id);
  if (user_id) {
    query = query.eq("user_id", user_id);
  } else if (anonymous_id) {
    query = query.eq("anonymous_id", anonymous_id);
  } else {
    return new Response(JSON.stringify({
      error: "user context required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const { data, error } = await query.select("id").maybeSingle();
  if (error) {
    console.error("Failed to delete session:", error);
    return new Response(JSON.stringify({
      error: "Failed to delete session"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  if (!data) {
    return new Response(JSON.stringify({
      error: "Session not found"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  return new Response(JSON.stringify({
    success: true
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
/* -------------------------------------------------------------------------- */ /*  Profile updates                                                           */ /* -------------------------------------------------------------------------- */ async function handleUpdateProfile(body, supabase) {
  const { supabase_user, full_name, profile, settings } = body;
  if (!supabase_user?.id) {
    return new Response(JSON.stringify({
      error: "supabase_user required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const now = new Date().toISOString();
  const profileUpdates = typeof profile === "object" && profile !== null ? profile : {};
  const incomingMetadata = typeof supabase_user.metadata === "object" && supabase_user.metadata !== null ? supabase_user.metadata : {};
  const appMetadata = typeof supabase_user.app_metadata === "object" && supabase_user.app_metadata !== null ? supabase_user.app_metadata : {};
  const identities = Array.isArray(supabase_user.identities) ? supabase_user.identities : [];
  const identitySummaries = identities.map((identity) => ({
    provider: identity?.provider || identity?.identity_provider || null,
    identity_id: identity?.id || identity?.identity_id || null,
    email: identity?.email || identity?.identity_data?.email || null,
    last_sign_in_at: identity?.last_sign_in_at || identity?.last_signin_at || null
  }));
  const primaryProvider = (appMetadata?.provider || identitySummaries.find((item)=>!!item.provider)?.provider || (supabase_user.email ? "email" : "unknown")) as string;
  const { data: existingUser, error: fetchError } = await supabase.from("auth_users").select("*").eq("auth0_id", supabase_user.id).maybeSingle();
  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Failed to fetch user for profile update:", fetchError);
    return new Response(JSON.stringify({
      error: "Unable to load user"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const baseMetadata = existingUser?.metadata && typeof existingUser.metadata === "object" ? existingUser.metadata : {};
  const existingProfile = baseMetadata.profile && typeof baseMetadata.profile === "object" ? baseMetadata.profile : {};
  const existingSettings = sanitizeSettings(baseMetadata.settings) || {};
  const mergedProfile = {
    ...existingProfile,
    ...Object.fromEntries(Object.entries(profileUpdates).map(([key, value])=>[
        key,
        typeof value === "string" ? value.trim() : value
      ]))
  };
  const incomingSettings = sanitizeSettings(settings);
  const mergedSettings = {
    ...existingSettings,
    ...(incomingSettings || {})
  };
  const nextMetadata = {
    ...baseMetadata,
    supabase_profile: incomingMetadata,
    profile: mergedProfile,
    avatar_url: supabase_user.avatar_url || incomingMetadata.avatar_url || baseMetadata.avatar_url || null,
    app_metadata: appMetadata,
    auth_provider: primaryProvider,
    auth_providers: identitySummaries,
    settings: mergedSettings
  };
  if (Object.keys(mergedSettings).length === 0) {
    delete nextMetadata.settings;
  }
  const normalizedFullName = typeof full_name === "string" && full_name.trim() || existingUser?.full_name || incomingMetadata.full_name || incomingMetadata.name || supabase_user.email || "User";
  const payload = {
    auth0_id: supabase_user.id,
    email: supabase_user.email || existingUser?.email || "",
    full_name: normalizedFullName,
    metadata: nextMetadata,
    updated_at: now
  };
  if (!existingUser) {
    payload.created_at = now;
  }
  const { data: updatedUser, error: upsertError } = await supabase.from("auth_users").upsert(payload, {
    onConflict: "auth0_id"
  }).select().single();
  if (upsertError) {
    console.error("Failed to write user profile:", upsertError);
    return new Response(JSON.stringify({
      error: "Unable to update profile"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const responseUser = attachSubscriptionFields(updatedUser);
  return new Response(JSON.stringify({
    user: responseUser
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
