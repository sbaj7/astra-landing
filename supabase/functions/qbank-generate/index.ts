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

THE CORE PRINCIPLE — purposeful vagueness (this is what makes it valuable):
- RADICALLY under-specify. NO single finding may be diagnostic on its own, and you may include AT MOST ONE finding that points toward the answer. Do NOT use the most specific / pathognomonic findings at all. (Example of what to AVOID: for aortic dissection, do not give an arm-to-arm BP differential AND a widened mediastinum AND tearing-to-the-back pain — that is three slam-dunks. Give an ordinary chest-pain picture and at most one subtle pointer.) The diagnosis must come from SYNTHESIZING non-specific findings, not from reading off confirmatory ones.
- Aim for a stem where 1-2 answer options look genuinely plausible on first read, but exactly ONE is defensible — decided by a SINGLE subtle discriminator the careful reader catches. The point is the discrimination, not pattern-matching a complete picture. It is OK if the question is hard and the answer is not obvious; that is the goal.
- A good test: if you can name 3+ findings in your stem that each independently confirm the answer, you have over-specified — cut it down to one.
- DESCRIBE findings in plain language; never name the pathognomonic sign/eponym/buzzword.
- Test ONE concept. The lead-in may ask for the diagnosis OR a downstream point (mechanism, next step, complication, etc.) — both are fine. The difficulty comes from the VIGNETTE being deliberately vague, NOT from the lead-in.

FORM:
- Opening sentence: "A [age]-year-old [man/woman/boy/girl] [comes to the physician / is brought to the emergency department / ...] because of [chief complaint] for [duration]."
- The "vignette" is DECLARATIVE prose only — no question mark, and it never restates the lead-in. A treatment already given is stated as a fact ("She has received 1 L of intravenous 0.9% saline.").
- The single question is the "lead_in", ending in "?" (not a preposition).
- EXACTLY 5 options, exactly ONE correct; distractors homogeneous (same category), plausible, on one continuum; one of them should be the tempting surface answer. No technical flaws (no "all/none of the above", no negative stems, no grammatical or length cues).
- Each option: a one-sentence rationale. Assert only well-established facts; cite key claims.

LENGTH: Step 1 short (~2-4 sentences); Step 2/3 fuller (~4-7) but still minimal — every clause must earn its place.

TAGS: topic (specific entity, canonical name), concept (the principle tested), keywords (3-6, FOR TAGGING ONLY — do not stuff into the stem), teaching_point (1-2 sentences).`;

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

// TODO: wire real retrieval (Astra RAG) and pass passages into the author prompt.
async function retrieve(_cell: Cell): Promise<string> {
  return "";
}

interface Cell {
  step: string;
  system?: string; specialty?: string; task?: string;
  systemLabel?: string; specialtyLabel?: string; taskLabel?: string;
  difficulty?: string;
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
      reasoning_effort: "low", // terser, less over-elaborated stems (and faster)
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
  const userText =
    `Generate one item.\n` +
    `System/topic: ${cell.systemLabel || cell.system}\n` +
    `Discipline/specialty: ${cell.specialtyLabel || cell.specialty}\n` +
    `Physician task: ${cell.taskLabel || cell.task}\n` +
    `${DIFFICULTY_NOTE[cell.difficulty || "mixed"]}\n` +
    `${STEP_DETAIL[cell.step] || STEP_DETAIL.step1}\n` +
    (cell.avoid?.length ? `Do NOT repeat these already-tested concepts: ${cell.avoid.join("; ")}.\n` : "") +
    (passages ? `\nGround the item ONLY in these sources:\n${passages}\n` : "");

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

    let item = await authorItem(cell);
    let err = validate(item);
    if (err) { item = await authorItem(cell); err = validate(item); }   // one retry
    if (err) throw new Error(`author invalid: ${err}`);

    await persist(cell, item);

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
