import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  deriveAnonymousIdentity,
  HttpError,
  resolveRequestIdentity,
  statusForError,
  type RequestIdentity,
  type VerifiedAuthUser
} from "../_shared/requestIdentity.ts";
import {
  consumeRateLimit,
  getChatAllowance,
  inspectRateLimit
} from "../_shared/rateLimits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});

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
const ALLOWED_PROFILE_KEYS = new Set(['organization', 'role', 'specialty']);

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
        result[key] = trimmed.slice(0, 160);
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }
    const url = new URL(req.url);
    const pathname = url.pathname.split("/").pop();
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 6_000_000) {
      throw new HttpError(413, "Request too large");
    }
    const supabase = createServiceClient();
    let body: Record<string, any> = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new HttpError(400, "Invalid JSON object");
        }
      } catch {
        throw new HttpError(400, "Invalid JSON");
      }
    }
    const identity = await resolveRequestIdentity(req, {
      allowAnonymous: true,
      anonymousToken: body.anonymous_id
    });
    switch(pathname) {
      case "check-limit":
        return await handleCheckLimit(supabase, identity);
      case "increment-usage":
        return await handleIncrementUsage(supabase, identity);
      case "sync-user":
        return await handleSyncUser(req, body, supabase, identity);
      case "save-session":
        return await handleSaveSession(body, supabase, identity);
      case "get-sessions":
        return await handleGetSessions(body, supabase, identity);
      case "delete-session":
        return await handleDeleteSession(body, supabase, identity);
      case "qbank-save-session":
        return await handleQbankSaveSession(body, supabase, identity);
      case "qbank-get-sessions":
        return await handleQbankGetSessions(body, supabase, identity);
      case "qbank-delete-session":
        return await handleQbankDeleteSession(body, supabase, identity);
      case "qbank-clear-sessions":
        return await handleQbankClearSessions(body, supabase, identity);
      case "update-profile":
        return await handleUpdateProfile(body, supabase, identity);
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
    console.error("[auth-management] Error:", error instanceof Error ? error.name : "UnknownError");
    const status = statusForError(error);
    return new Response(JSON.stringify({
      error: error instanceof HttpError ? error.message : "Account request failed"
    }), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

function requireAuthenticated(identity: RequestIdentity): Extract<RequestIdentity, { kind: "authenticated" }> {
  if (identity.kind !== "authenticated") {
    throw new HttpError(401, "Authentication required");
  }
  return identity;
}

function verifiedUserMetadata(user: VerifiedAuthUser): Record<string, any> {
  const source = user.user_metadata && typeof user.user_metadata === "object"
    ? user.user_metadata as Record<string, unknown>
    : {};
  const metadata: Record<string, string> = {};
  for (const key of ["full_name", "name", "avatar_url", "picture"]) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      metadata[key] = value.trim().slice(0, key.includes("avatar") || key === "picture" ? 2048 : 160);
    }
  }
  return metadata;
}

function verifiedAppMetadata(user: VerifiedAuthUser): Record<string, unknown> {
  const source = user.app_metadata && typeof user.app_metadata === "object"
    ? user.app_metadata as Record<string, unknown>
    : {};
  const metadata: Record<string, unknown> = {};
  if (typeof source.provider === "string") {
    metadata.provider = source.provider.slice(0, 80);
  }
  if (Array.isArray(source.providers)) {
    metadata.providers = source.providers
      .filter((provider): provider is string => typeof provider === "string")
      .slice(0, 10)
      .map((provider) => provider.slice(0, 80));
  }
  return metadata;
}

async function ensureInternalUser(supabase: any, identity: RequestIdentity) {
  const authenticated = requireAuthenticated(identity);
  const { data: rows, error } = await supabase
    .from("auth_users")
    .select("*")
    .eq("auth0_id", authenticated.user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new HttpError(503, "Account service unavailable");
  if (rows?.[0]) return rows[0];

  const metadata = verifiedUserMetadata(authenticated.user);
  const now = new Date().toISOString();
  const { data: created, error: createError } = await supabase
    .from("auth_users")
    .insert({
      auth0_id: authenticated.user.id,
      email: authenticated.user.email || "",
      full_name: metadata.full_name || metadata.name || authenticated.user.email || "User",
      metadata: {
        avatar_url: metadata.avatar_url || metadata.picture || null,
        supabase_profile: metadata,
        first_login: now
      },
      created_at: now,
      updated_at: now
    })
    .select()
    .single();
  if (!createError && created) return created;

  const { data: retryRows, error: retryError } = await supabase
    .from("auth_users")
    .select("*")
    .eq("auth0_id", authenticated.user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (retryError || !retryRows?.[0]) {
    throw new HttpError(503, "Account service unavailable");
  }
  return retryRows[0];
}

async function requestOwner(supabase: any, identity: RequestIdentity) {
  if (identity.kind === "authenticated") {
    const user = await ensureInternalUser(supabase, identity);
    return { userId: user.id as string, anonymousId: null };
  }

  if (identity.legacyAnonymousId !== identity.anonymousKey) {
    const legacyIds = [identity.legacyAnonymousId];
    const chatMigration = await supabase
      .from("user_chat_sessions")
      .update({ anonymous_id: identity.anonymousKey })
      .in("anonymous_id", legacyIds);
    const qbankMigration = await supabase
      .from("qbank_sessions")
      .update({ anonymous_id: identity.anonymousKey })
      .in("anonymous_id", legacyIds);
    if (chatMigration.error || qbankMigration.error) {
      throw new HttpError(503, "History service unavailable");
    }
  }
  return { userId: null, anonymousId: identity.anonymousKey };
}

/* -------------------------------------------------------------------------- */
/*  Plan-based chat limits (Anonymous=3, Free=10, Plus=50, Pro=Unlimited)    */
/* -------------------------------------------------------------------------- */
async function handleCheckLimit(supabase: any, identity: RequestIdentity) {
  const { limit } = await getChatAllowance(supabase, identity);
  if (!Number.isFinite(limit)) {
    return json({
      used: 0,
      remaining: 999999,
      reset_at: new Date(Date.now() + 86_400_000).toISOString(),
      unlimited: true
    });
  }
  const state = await inspectRateLimit(supabase, identity.rateLimitKey, "chat_daily", limit);
  return json({
    used: state.used,
    remaining: state.remaining,
    reset_at: state.resetAt
  });
}

async function handleIncrementUsage(supabase: any, identity: RequestIdentity) {
  const { limit } = await getChatAllowance(supabase, identity);
  if (!Number.isFinite(limit)) {
    return json({ success: true, unlimited: true });
  }
  const state = await consumeRateLimit(supabase, identity.rateLimitKey, "chat_daily", limit);
  if (!state.allowed) {
    return json({
      error: "daily_limit_reached",
      used: state.used,
      remaining: 0,
      reset_at: state.resetAt
    }, 429);
  }
  return json({
    success: true,
    used: state.used,
    remaining: state.remaining,
    reset_at: state.resetAt
  });
}

/* -------------------------------------------------------------------------- */
/*  Supabase user sync                                                        */
/* -------------------------------------------------------------------------- */
async function handleSyncUser(
  req: Request,
  body: Record<string, any>,
  supabase: any,
  identity: RequestIdentity
) {
  const authenticated = requireAuthenticated(identity);
  const verifiedUser = authenticated.user;
  const verifiedMetadata = verifiedUserMetadata(verifiedUser);
  const supabase_user = {
    id: verifiedUser.id,
    email: verifiedUser.email || "",
    full_name: verifiedMetadata.full_name || verifiedMetadata.name || verifiedUser.email || "User",
    avatar_url: verifiedMetadata.avatar_url || verifiedMetadata.picture || null,
    metadata: verifiedMetadata,
    app_metadata: verifiedAppMetadata(verifiedUser),
    identities: verifiedUser.identities || []
  };
  const now = new Date().toISOString();
  const incomingMetadata = typeof supabase_user.metadata === "object" && supabase_user.metadata !== null ? supabase_user.metadata : {};
  const incomingSettings = sanitizeSettings(incomingMetadata?.settings);
  const appMetadata = typeof supabase_user.app_metadata === "object" && supabase_user.app_metadata !== null ? supabase_user.app_metadata : {};
  const identities = Array.isArray(supabase_user.identities) ? supabase_user.identities : [];
  const identitySummaries = identities
    .map((identity) => ({
      provider: typeof identity?.provider === "string"
        ? identity.provider
        : typeof identity?.identity_provider === "string"
          ? identity.identity_provider
          : null
    }))
    .filter((identity) => Boolean(identity.provider));
  const primaryProvider = (appMetadata?.provider || identitySummaries.find((item) => !!item.provider)?.provider || (supabase_user.email ? "email" : "unknown")) as string;
  const normalizedFullName = supabase_user.full_name || incomingMetadata.full_name || incomingMetadata.name || supabase_user.email || "User";
  const { data: existingUser, error: fetchError } = await supabase
    .from("auth_users")
    .select("*")
    .eq("auth0_id", supabase_user.id)
    .maybeSingle();
  if (fetchError) {
    console.error("Failed to load Supabase user record:", fetchError?.code || "database_error");
    throw new HttpError(503, "User synchronization unavailable");
  }
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
    const { data: updatedUser, error: updateError } = await supabase.from("auth_users").update({
      updated_at: now,
      email: supabase_user.email || existingUser.email,
      full_name: normalizedFullName,
      metadata: nextMetadata
    }).eq("id", existingUser.id).select().single();
    if (updateError || !updatedUser) {
      console.error("Failed to update Supabase user record:", updateError?.code || "database_error");
      throw new HttpError(503, "User synchronization unavailable");
    }
    targetUser = updatedUser;
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
      console.error("Failed to create Supabase user record:", error?.code || "database_error");
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
  if (body.anonymous_id && targetUser) {
    const anonymousIdentity = await deriveAnonymousIdentity(req, body.anonymous_id);
    const anonymousIds = [anonymousIdentity.anonymousKey, anonymousIdentity.legacyAnonymousId];
    const chatTransfer = await supabase.from("user_chat_sessions").update({
      user_id: targetUser.id,
      anonymous_id: null
    }).in("anonymous_id", anonymousIds);
    const qbankTransfer = await supabase.from("qbank_sessions").update({
      user_id: targetUser.id,
      anonymous_id: null
    }).in("anonymous_id", anonymousIds);
    await supabase.from("anonymous_limits").delete().in("anonymous_id", anonymousIds);
    if (chatTransfer.error || qbankTransfer.error) {
      throw new HttpError(503, "History transfer unavailable");
    }
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

/* -------------------------------------------------------------------------- */
/*  Chat sessions                                                             */
/* -------------------------------------------------------------------------- */
async function handleSaveSession(body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const { title, messages, mode } = body;
  if (typeof title !== "string" || !Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
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
  if (JSON.stringify(messages).length > 5_000_000) {
    throw new HttpError(413, "Conversation too large");
  }
  const owner = await requestOwner(supabase, identity);
  const { data, error } = await supabase.from("user_chat_sessions").insert({
    user_id: owner.userId,
    anonymous_id: owner.anonymousId,
    title: title.trim().substring(0, 100) || "Saved conversation",
    messages,
    mode: typeof mode === "string" ? mode.substring(0, 64) : "search",
    created_at: new Date().toISOString()
  }).select().single();
  if (error) {
    console.error("Error saving session:", error?.code || "database_error");
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

async function handleGetSessions(body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const owner = await requestOwner(supabase, identity);
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 20));
  let query = supabase.from("user_chat_sessions").select("*").order("created_at", {
    ascending: false
  }).limit(limit);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anonymous_id", owner.anonymousId);
  const { data, error } = await query;
  if (error) {
    console.error("Error getting sessions:", error?.code || "database_error");
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

async function handleDeleteSession(body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const { session_id } = body;
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
  const owner = await requestOwner(supabase, identity);
  let query = supabase.from("user_chat_sessions").delete().eq("id", session_id);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anonymous_id", owner.anonymousId);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) {
    console.error("Failed to delete session:", error?.code || "database_error");
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

/* -------------------------------------------------------------------------- */
/*  QBank session history (mirrors chat history, service-role)                */
/* -------------------------------------------------------------------------- */
async function handleQbankSaveSession(body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const { session } = body;
  if (!session || !Array.isArray(session.answers) || !session.answers.length || session.answers.length > 200) {
    return json({ error: "session with answers required" }, 400);
  }
  if (JSON.stringify(session.answers).length > 5_000_000) {
    throw new HttpError(413, "QBank session too large");
  }
  const owner = await requestOwner(supabase, identity);
  const total = session.answers.length;
  const correct = session.answers.filter((answer: any) => answer && answer.correct).length;
  const { data, error } = await supabase.from("qbank_sessions").insert({
    user_id: owner.userId,
    anonymous_id: owner.anonymousId,
    started_at: session.startedAt ? new Date(session.startedAt).toISOString() : new Date().toISOString(),
    step: session.step || null,
    mode: session.mode || null,
    difficulty: session.difficulty || null,
    total,
    correct,
    answers: session.answers,
    created_at: new Date().toISOString()
  }).select().single();
  if (error) {
    console.error("Error saving qbank session:", error?.code || "database_error");
    return json({ error: "Failed to save session" }, 500);
  }
  return json({ session: data });
}

async function handleQbankGetSessions(body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const owner = await requestOwner(supabase, identity);
  const limit = Math.min(200, Math.max(1, Number(body.limit) || 60));
  let query = supabase.from("qbank_sessions").select("*").order("started_at", { ascending: false }).limit(limit);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anonymous_id", owner.anonymousId);
  const { data, error } = await query;
  if (error) {
    console.error("Error getting qbank sessions:", error?.code || "database_error");
    return json({ error: "Failed to get sessions" }, 500);
  }
  return json({ sessions: data || [] });
}

async function handleQbankDeleteSession(body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const { session_id } = body;
  if (!session_id) return json({ error: "session_id required" }, 400);
  const owner = await requestOwner(supabase, identity);
  let query = supabase.from("qbank_sessions").delete().eq("id", session_id);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anonymous_id", owner.anonymousId);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) {
    console.error("Failed to delete qbank session:", error?.code || "database_error");
    return json({ error: "Failed to delete session" }, 500);
  }
  if (!data) return json({ error: "Session not found" }, 404);
  return json({ success: true });
}

async function handleQbankClearSessions(_body: Record<string, any>, supabase: any, identity: RequestIdentity) {
  const owner = await requestOwner(supabase, identity);
  let query = supabase.from("qbank_sessions").delete();
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anonymous_id", owner.anonymousId);
  const { error } = await query;
  if (error) {
    console.error("Failed to clear qbank sessions:", error?.code || "database_error");
    return json({ error: "Failed to clear sessions" }, 500);
  }
  return json({ success: true });
}

/* -------------------------------------------------------------------------- */
/*  Profile updates                                                           */
/* -------------------------------------------------------------------------- */
async function handleUpdateProfile(
  body: Record<string, any>,
  supabase: any,
  identity: RequestIdentity
) {
  const { full_name, profile, settings } = body;
  const authenticated = requireAuthenticated(identity);
  const verifiedUser = authenticated.user;
  const verifiedMetadata = verifiedUserMetadata(verifiedUser);
  const supabase_user = {
    id: verifiedUser.id,
    email: verifiedUser.email || "",
    avatar_url: verifiedMetadata.avatar_url || verifiedMetadata.picture || null,
    metadata: verifiedMetadata,
    app_metadata: verifiedAppMetadata(verifiedUser),
    identities: verifiedUser.identities || []
  };
  const now = new Date().toISOString();
  const profileUpdates = typeof profile === "object" && profile !== null
    ? Object.fromEntries(
        Object.entries(profile)
          .filter(([key, value]) => ALLOWED_PROFILE_KEYS.has(key) && typeof value === "string")
          .map(([key, value]) => [key, (value as string).trim().slice(0, 160)])
      )
    : {};
  const incomingMetadata = typeof supabase_user.metadata === "object" && supabase_user.metadata !== null ? supabase_user.metadata : {};
  const appMetadata = typeof supabase_user.app_metadata === "object" && supabase_user.app_metadata !== null ? supabase_user.app_metadata : {};
  const identities = Array.isArray(supabase_user.identities) ? supabase_user.identities : [];
  const identitySummaries = identities
    .map((identity) => ({
      provider: typeof identity?.provider === "string"
        ? identity.provider
        : typeof identity?.identity_provider === "string"
          ? identity.identity_provider
          : null
    }))
    .filter((identity) => Boolean(identity.provider));
  const primaryProvider = (appMetadata?.provider || identitySummaries.find((item) => !!item.provider)?.provider || (supabase_user.email ? "email" : "unknown")) as string;
  const { data: existingUser, error: fetchError } = await supabase.from("auth_users").select("*").eq("auth0_id", supabase_user.id).maybeSingle();
  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Failed to fetch user for profile update:", fetchError?.code || "database_error");
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
    ...Object.fromEntries(Object.entries(profileUpdates).map(([key, value]) => [
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
  const normalizedFullName = typeof full_name === "string" && full_name.trim().slice(0, 160) || existingUser?.full_name || incomingMetadata.full_name || incomingMetadata.name || supabase_user.email || "User";
  const payload: Record<string, unknown> = {
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
    console.error("Failed to write user profile:", upsertError?.code || "database_error");
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
