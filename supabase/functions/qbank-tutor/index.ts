// qbank-tutor — answers a student's follow-up questions about a practice item
// they just answered. Streams a concise tutor reply (SSE: data:{delta} ... [DONE]).
//
// Body: { item: {vignette, leadIn, options:[{text,correct,rationale}], teachingPoint, topic},
//         messages: [{role:'user'|'assistant', content}], step }
//
// Secret required: OPENAI_API_KEY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  deriveRequestFingerprint,
  HttpError,
  resolveRequestIdentity,
  statusForError
} from "../_shared/requestIdentity.ts";
import { consumeRateLimit, getQbankAllowance } from "../_shared/rateLimits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "gpt-5.6";

const PERSONA =
  "You are a sharp, friendly USMLE tutor helping a student understand a question they just answered. " +
  "Use the question, the correct answer, and the explanation below as ground truth. " +
  "Answer their question directly and concisely in plain markdown. Be specific; do not restate the whole question.";

function questionContext(item: any, step?: string): string {
  const opts = Array.isArray(item?.options)
    ? item.options.map((o: any, i: number) =>
        `${String.fromCharCode(65 + i)}. ${o.text}${o.correct ? "  (correct answer)" : ""}`).join("\n")
    : "";
  return [
    step ? `Exam: ${step}` : "",
    item?.topic ? `Topic: ${item.topic}` : "",
    "",
    "VIGNETTE:",
    item?.vignette || "",
    "",
    item?.leadIn ? `QUESTION: ${item.leadIn}` : "",
    "",
    "OPTIONS:",
    opts,
    "",
    item?.teachingPoint ? `EXPLANATION:\n${item.teachingPoint}` : "",
  ].filter(Boolean).join("\n");
}

function transcript(messages: any[]): string {
  if (!Array.isArray(messages)) return "";
  return messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => `${m.role === "assistant" ? "Tutor" : "Student"}: ${m.content.trim()}`)
    .join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const fail = (msg: string, status = 500) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "content-type": "application/json" } });

  if (req.method !== "POST") return fail("Method not allowed", 405);
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 250_000) return fail("Request too large", 413);

  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid JSON", 400); }

  try {
    const identity = await resolveRequestIdentity(req, {
      allowAnonymous: true,
      anonymousToken: body.anonymous_id
    });
    const serviceClient = createServiceClient();
    const burstLimit = await consumeRateLimit(
      serviceClient,
      identity.rateLimitKey,
      "qbank_tutor_minute",
      identity.kind === "authenticated" ? 40 : 12,
      60
    );
    if (!burstLimit.allowed) return fail("Too many requests. Please wait and try again.", 429);
    if (identity.kind === "anonymous") {
      const networkKey = await deriveRequestFingerprint(req, "qbank-tutor-anonymous-network");
      const networkLimit = await consumeRateLimit(
        serviceClient,
        networkKey,
        "qbank_tutor_anonymous_network_daily",
        500
      );
      if (!networkLimit.allowed) return fail("Anonymous tutor limit reached. Please sign in.", 429);
    }
    const { limit } = await getQbankAllowance(serviceClient, identity, "tutor");
    const usage = await consumeRateLimit(
      serviceClient,
      identity.rateLimitKey,
      "qbank_tutor_daily",
      limit
    );
    if (!usage.allowed) {
      return fail("Daily tutor limit reached", 429);
    }
  } catch (error) {
    console.error("QBank tutor authorization failed:", error instanceof Error ? error.name : "UnknownError");
    return fail(
      error instanceof HttpError ? error.message : "Tutor service unavailable",
      statusForError(error)
    );
  }

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return fail("OPENAI_API_KEY not configured");

  const { item, messages, step } = body;
  if (!Array.isArray(messages) || !messages.length) return fail("messages required", 400);

  const instructions = `${PERSONA}\n\n--- THE QUESTION ---\n${questionContext(item, step)}`;
  const input = transcript(messages);

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input,
      reasoning: { effort: "low" },
      max_output_tokens: 1200,
      stream: true,
      store: false,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    await upstream.text().catch(() => "");
    return fail(`OpenAI request failed: ${upstream.status}`, upstream.status >= 500 ? 502 : upstream.status);
  }

  const reader = upstream.body.getReader();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const sse = new ReadableStream({
    async pull(controller) {
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          let i;
          while ((i = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, i).trim();
            buffer = buffer.slice(i + 2);
            if (!block) continue;
            let ev = "", data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) ev = line.slice(6).trim();
              else if (line.startsWith("data:")) data = line.slice(5).trim();
            }
            if (!data) continue;
            if (ev === "response.output_text.delta") {
              try { const p = JSON.parse(data); controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta: p.delta })}\n\n`)); } catch { /* ignore */ }
            } else if (ev === "response.completed" || ev === "response.failed" || ev === "error") {
              controller.enqueue(enc.encode("data: [DONE]\n\n")); controller.close(); return;
            }
          }
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) { controller.error(e); } finally { reader.releaseLock(); }
    },
  });
  return new Response(sse, { headers: { ...corsHeaders, "content-type": "text/event-stream", "cache-control": "no-cache" } });
});
