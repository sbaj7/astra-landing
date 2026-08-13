// Edge Function to check if an email exists in Supabase Auth
// This is used for the two-step authentication flow to determine
// whether to show sign-in or sign-up form

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  deriveRequestFingerprint,
  HttpError,
  statusForError
} from "../_shared/requestIdentity.ts";
import { consumeRateLimit } from "../_shared/rateLimits.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 10_000) throw new HttpError(413, "Request too large");

    const supabaseAdmin = createServiceClient();
    const fingerprint = await deriveRequestFingerprint(req, "email-check");
    const rateLimit = await consumeRateLimit(
      supabaseAdmin,
      fingerprint,
      "email_check_minute",
      10,
      60
    );
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let payload: { email?: unknown };
    try {
      payload = await req.json();
    } catch {
      throw new HttpError(400, "Invalid JSON");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new HttpError(400, "Invalid request");
    }
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 254 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("auth_email_exists", {
      p_email: email
    });

    if (error) {
      console.error("Error querying users:", error?.code || "database_error");
      // Don't expose internal errors to client
      return new Response(
        JSON.stringify({ exists: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return result
    return new Response(
      JSON.stringify({ exists: data === true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in check-email function:", error instanceof Error ? error.name : "UnknownError");

    // Return generic error to avoid leaking information
    return new Response(
      JSON.stringify({ error: error instanceof HttpError ? error.message : "Internal server error" }),
      {
        status: statusForError(error),
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
