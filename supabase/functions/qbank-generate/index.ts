// qbank-generate — generates one USMLE-style one-best-answer item with OpenAI.
//
// Pipeline: author (gpt-5.1, structured JSON output, NBME rules) -> critic/flaw
// gate (second pass that repairs any technical flaw or factual issue) -> validate
// -> persist to qbank_items -> return. Grounding/RAG is a TODO hook (retrieve()).
//
// Secret required: OPENAI_API_KEY (already configured for this project).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "gpt-5.1";
const GENERATOR_VERSION = "qbank-gen-1-openai";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// JSON schema for the item. OpenAI strict mode requires every property in
// `required` and additionalProperties:false on every object — both satisfied.
const ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topic", "concept", "keywords", "vignette", "lead_in", "options", "teaching_point", "citations"],
  properties: {
    topic: { type: "string" },            // the specific entity/disease tested, e.g. "G6PD deficiency"
    concept: { type: "string" },          // the precise tested principle, e.g. "oxidative hemolysis trigger"
    keywords: { type: "array", items: { type: "string" } }, // buzzwords/discriminators
    vignette: { type: "string" },
    lead_in: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "correct", "rationale"],
        properties: {
          text: { type: "string" },
          correct: { type: "boolean" },
          rationale: { type: "string" },
        },
      },
    },
    teaching_point: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "source"],
        properties: { label: { type: "string" }, source: { type: "string" } },
      },
    },
  },
};

const STEP_PERSONA: Record<string, string> = {
  step1:
    "You are an NBME item writer for USMLE Step 1. Items test APPLICATION of foundational science (mechanism, 'most likely cause', deficient enzyme/structure). Vignettes are shorter and mechanism-loaded.",
  step2:
    "You are an NBME item writer for USMLE Step 2 CK. Items test clinical DIAGNOSIS and MANAGEMENT ('most likely diagnosis', 'best next step'). Vignettes are fuller clinical pictures.",
  step3:
    "You are an NBME item writer for USMLE Step 3. Items test independent-practice MANAGEMENT including initial vs. subsequent care across settings, and biostatistics/literature interpretation. Vignettes are the longest.",
};

const NBME_RULES = `Write ONE USMLE one-best-answer item. Keep it SPARE, like a real NBME item.

THE CORE PRINCIPLE — the vignette must be VAGUE. Give an incomplete clinical picture: ordinary findings that fit several conditions, with no pathognomonic sign, no named diagnostic test result, and no complete classic triad. The reader should have to reason, not pattern-match. If the diagnosis is obvious from the stem, it is too detailed — make it vaguer. Describe findings in plain language; never name the buzzword/eponym/classic sign. Test ONE concept; the difficulty comes from the vague vignette, not a tricky lead-in.

FORM:
- Opening sentence: "A [age]-year-old [man/woman/boy/girl] [comes to the physician / is brought to the emergency department / ...] because of [chief complaint] for [duration]."
- The "vignette" is DECLARATIVE prose only — no question mark, and it never restates the lead-in. A treatment already given is stated as a fact ("She has received 1 L of intravenous 0.9% saline.").
- The single question is the "lead_in", ending in "?" (not a preposition).
- EXACTLY 5 options, exactly ONE correct; distractors homogeneous (same category), plausible, on one continuum; one of them should be the tempting surface answer. No technical flaws (no "all/none of the above", no negative stems, no grammatical or length cues).
- Each option needs a one-sentence "rationale": for the correct option, why it is right; for EACH distractor, the specific reason it is wrong. Assert only well-established facts.

LENGTH: Step 1 short (~2-4 sentences); Step 2/3 fuller (~4-7) but still minimal — every clause must earn its place.

TAGS: topic (specific entity, canonical name), concept (the principle tested), keywords (3-6, FOR TAGGING ONLY — do not stuff into the stem). "teaching_point" is a thorough 4-7 sentence explanation: the core concept, why the correct answer is right, the key discriminating feature that rules out the most tempting distractor, and the high-yield take-home point.`;

// Per-Step vignette length/detail calibration (from USMLE format research).
const STEP_DETAIL: Record<string, string> = {
  step1: "Step 1: short stem (~2-4 sentences) framing a mechanism/identification point; one or two key findings is enough.",
  step2: "Step 2 CK: fuller picture (~4-7 sentences) with the vitals/exam/labs a clinician would use — only what bears on the answer.",
  step3: "Step 3: ~5-8 sentences; state the care setting and, when relevant, the course over time.",
};

const DIFFICULTY_NOTE: Record<string, string> = {
  easy: "Difficulty: EASY — straightforward but still requires one inference.",
  medium: "Difficulty: MEDIUM — a single key discriminator decides between 1-2 plausible options.",
  hard: "Difficulty: HARD — the tempting surface answer is wrong; the deciding discriminator is subtle and easy to miss.",
  mixed: "Difficulty: board-appropriate, leaning hard.",
};

// Plain-text layout for the STREAMING path (renders progressively + parses cleanly).
const STREAM_FORMAT = `OUTPUT FORMAT — output PLAIN TEXT in EXACTLY this layout and nothing else (no JSON, no markdown, no preamble). Use these exact line markers, in this order:
TOPIC: <specific entity tested>
VIGNETTE:
<the vignette, 1-2 short paragraphs, declarative prose only, no question>
QUESTION: <the single lead-in, ending in ?>
A. <option>
B. <option>
C. <option>
D. <option>
E. <option>
ANSWER: <one letter A-E>
WHY-A: <one sentence — why A is correct, or the specific reason it is wrong>
WHY-B: <one sentence>
WHY-C: <one sentence>
WHY-D: <one sentence>
WHY-E: <one sentence>
EXPLANATION:
<a thorough 4-7 sentence explanation: the core concept, why the correct answer is right, the key discriminating feature that rules out the most tempting distractor, and the high-yield take-home point>
Exactly five options A-E, exactly one correct. Provide a WHY line for EVERY option. The vignette must come before the QUESTION line.`;

function buildInput(cell: Cell): string {
  return (
    `Generate one item.\n` +
    `System: ${cell.systemLabel || cell.system}\n` +
    `Discipline/specialty: ${cell.specialtyLabel || cell.specialty}\n` +
    `Physician task: ${cell.taskLabel || cell.task}\n` +
    (cell.topic
      ? `TOPIC — write the item specifically about this exact condition (this is the diagnosis/entity being tested): ${cell.topic}. Tag "topic" with this exact name. Remember the vignette must NOT name it directly.\n`
      : "") +
    `${DIFFICULTY_NOTE[cell.difficulty || "mixed"]}\n` +
    `${STEP_DETAIL[cell.step] || STEP_DETAIL.step1}\n` +
    (cell.avoid?.length ? `Do NOT repeat these already-tested concepts: ${cell.avoid.join("; ")}.\n` : "")
  );
}

// Streaming generation via the Responses API; forwards text deltas as SSE
// (`data: {"delta":"..."}` ... `data: [DONE]`).
async function streamItem(cell: Cell): Promise<Response> {
  const key = Deno.env.get("OPENAI_API_KEY");
  const fail = (msg: string, status = 500) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "content-type": "application/json" } });
  if (!key) return fail("OPENAI_API_KEY not configured");

  const persona = STEP_PERSONA[cell.step] || STEP_PERSONA.step1;
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      instructions: `${persona}\n\n${NBME_RULES}\n\n${STREAM_FORMAT}`,
      input: buildInput(cell),
      reasoning: { effort: "low" }, // low (not none) so the model can run the omission self-check
      max_output_tokens: 2400,
      stream: true,
    }),
  });
  if (!upstream.ok || !upstream.body) return fail(`OpenAI ${upstream.status}: ${(await upstream.text()).slice(0, 300)}`);

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
            } else if (ev === "response.completed") {
              controller.enqueue(enc.encode("data: [DONE]\n\n")); controller.close(); return;
            } else if (ev === "response.failed" || ev === "error") {
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
}

// TODO: wire real retrieval (Astra RAG) and pass passages into the author prompt.
async function retrieve(_cell: Cell): Promise<string> {
  return "";
}

interface Cell {
  step: string;
  system?: string; specialty?: string; task?: string;
  systemLabel?: string; specialtyLabel?: string; taskLabel?: string;
  difficulty?: string;
  topic?: string;
  avoid?: string[];
}

async function openai(messages: unknown): Promise<any> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_completion_tokens: 5000,
      reasoning_effort: "low", // low so the model can run the omission self-check
      response_format: {
        type: "json_schema",
        json_schema: { name: "usmle_item", strict: true, schema: ITEM_SCHEMA },
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 400)}`);
  }
  return res.json();
}

function extractJson(resp: any): any {
  const msg = resp?.choices?.[0]?.message;
  if (!msg) throw new Error("no choices");
  if (msg.refusal) throw new Error("model refusal");
  return JSON.parse(msg.content);
}

function validate(item: any): string | null {
  if (!item || typeof item.vignette !== "string" || typeof item.lead_in !== "string") return "missing fields";
  if (!Array.isArray(item.options) || item.options.length < 4 || item.options.length > 5) return "need 4-5 options";
  const correct = item.options.filter((o: any) => o && o.correct === true);
  if (correct.length !== 1) return "need exactly one correct option";
  if (item.options.some((o: any) => !o.text || typeof o.text !== "string")) return "empty option";
  return null;
}

async function authorItem(cell: Cell): Promise<any> {
  const persona = STEP_PERSONA[cell.step] || STEP_PERSONA.step1;
  const passages = await retrieve(cell);
  const system = `${persona}\n\n${NBME_RULES}`;
  const userText = buildInput(cell) + (passages ? `\nGround the item ONLY in these sources:\n${passages}\n` : "");

  const resp = await openai([{ role: "system", content: system }, { role: "user", content: userText }]);
  return extractJson(resp);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function persist(cell: Cell, item: any) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const sb = createClient(url, key);
    const hash = await sha256(item.vignette + "|" + item.lead_in);
    await sb.from("qbank_items").upsert(
      {
        step: cell.step, system: cell.system, specialty: cell.specialty, task: cell.task,
        difficulty: cell.difficulty || "mixed",
        topic: item.topic, concept: item.concept, keywords: item.keywords || [],
        vignette: item.vignette, lead_in: item.lead_in, options: item.options,
        teaching_point: item.teaching_point, citations: item.citations,
        content_hash: hash, generator_version: GENERATOR_VERSION, status: "live",
      },
      { onConflict: "content_hash", ignoreDuplicates: true },
    );
  } catch (_e) { /* best-effort */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const cell: Cell = await req.json();
    if (!cell?.step) throw new Error("missing step");

    if ((cell as any).stream) return await streamItem(cell);

    let item = await authorItem(cell);
    let err = validate(item);
    if (err) { item = await authorItem(cell); err = validate(item); }   // one retry
    if (err) throw new Error(`author invalid: ${err}`);
    if (cell.topic) item.topic = cell.topic; // pin canonical topic

    // Save for the calibration flywheel without blocking the response.
    const saving = persist(cell, item).catch(() => {});
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(saving);

    const shaped = {
      id: crypto.randomUUID(),
      step: cell.step, system: cell.system, specialty: cell.specialty, task: cell.task,
      difficulty: cell.difficulty || "mixed",
      topic: item.topic, concept: item.concept, keywords: item.keywords || [],
      vignette: item.vignette,
      leadIn: item.lead_in,
      options: shuffle(item.options).map((o: any) => ({ text: o.text, correct: !!o.correct, rationale: o.rationale })),
      teachingPoint: item.teaching_point,
      citations: (item.citations || []).map((c: any) => ({ label: c.label, url: c.source && /^https?:/.test(c.source) ? c.source : "" })),
    };
    return new Response(JSON.stringify(shaped), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
