import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";

export type VerifiedAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<Record<string, unknown>> | null;
};

export type RequestIdentity =
  | {
      kind: "authenticated";
      user: VerifiedAuthUser;
      rateLimitKey: string;
    }
  | {
      kind: "anonymous";
      anonymousKey: string;
      legacyAnonymousId: string;
      rateLimitKey: string;
    };

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const encoder = new TextEncoder();
let cachedHmacKey: Promise<CryptoKey> | null = null;

function requiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new HttpError(503, "Service configuration unavailable");
  }
  return value;
}

function getHmacKey(): Promise<CryptoKey> {
  if (!cachedHmacKey) {
    const secret = requiredEnvironmentVariable("USAGE_HASH_SECRET");
    cachedHmacKey = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }
  return cachedHmacKey;
}

export async function hashPrivateIdentifier(namespace: string, value: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${namespace}:${value}`)
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function extractBearerToken(req: Request): string | null {
  const authorization = req.headers.get("authorization")?.trim() || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function normalizeAnonymousToken(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(401, "Anonymous session required");
  }
  const token = value.trim();
  if (token.length < 16 || token.length > 200 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new HttpError(401, "Anonymous session invalid");
  }
  return token;
}

function requestNetworkKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  return address.slice(0, 80);
}

function requestAgentKey(req: Request): string {
  return (req.headers.get("user-agent")?.trim() || "unknown").slice(0, 240);
}

export function deriveRequestFingerprint(req: Request, namespace: string): Promise<string> {
  return hashPrivateIdentifier(
    namespace,
    `${requestNetworkKey(req)}|${requestAgentKey(req)}`
  );
}

export async function deriveAnonymousIdentity(
  req: Request,
  anonymousToken: unknown
): Promise<Extract<RequestIdentity, { kind: "anonymous" }>> {
  const token = normalizeAnonymousToken(anonymousToken);
  const anonymousKey = await hashPrivateIdentifier("anonymous-storage", token);
  const rateLimitKey = await hashPrivateIdentifier(
    "anonymous-rate",
    `${token}|${requestNetworkKey(req)}|${requestAgentKey(req)}`
  );
  return {
    kind: "anonymous",
    anonymousKey,
    legacyAnonymousId: token,
    rateLimitKey
  };
}

export async function resolveRequestIdentity(
  req: Request,
  options: { allowAnonymous?: boolean; anonymousToken?: unknown } = {}
): Promise<RequestIdentity> {
  const supabaseUrl = requiredEnvironmentVariable("SUPABASE_URL");
  const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
  const anonymousApiKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() || "";
  const bearerToken = extractBearerToken(req);

  if (bearerToken && bearerToken !== anonymousApiKey) {
    const authClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await authClient.auth.getUser(bearerToken);
    if (error || !data.user?.id) {
      throw new HttpError(401, "Authentication required");
    }
    const user = data.user as VerifiedAuthUser;
    return {
      kind: "authenticated",
      user,
      rateLimitKey: await hashPrivateIdentifier("authenticated-rate", user.id)
    };
  }

  if (!options.allowAnonymous) {
    throw new HttpError(401, "Authentication required");
  }
  return deriveAnonymousIdentity(req, options.anonymousToken);
}

export function createServiceClient() {
  return createClient(
    requiredEnvironmentVariable("SUPABASE_URL"),
    requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function statusForError(error: unknown, fallback = 500): number {
  return error instanceof HttpError ? error.status : fallback;
}
