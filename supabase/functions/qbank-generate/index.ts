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

const NBME_RULES = `Write ONE one-best-answer item that reads like a real NBME exam item.

AUTHENTICITY (most important — items have been too complicated):
- Test EXACTLY ONE high-yield concept. Do NOT combine multiple diagnoses, comorbid layers, or two teaching points in one item.
- Use a CLASSIC, textbook presentation of that concept. Do not use rare/atypical presentations or zebras unless the atypical feature IS the single teaching point.
- Keep the vignette TIGHT: include only the details a competent student needs to reason to the answer. Minimal red herrings. No unnecessary comorbidities, extra labs, or distracting history.
- The reasoning should be a single clean inference chain, not a multi-step puzzle.
- Match real board difficulty for the requested level (see difficulty note); "medium" = a typical, fair board question, not a trick.

STRUCTURE (NBME rules):
- Vignette order: demographics -> history -> physical exam -> labs/imaging. Bulk of text precedes the lead-in.
- Tests APPLICATION/reasoning, not rote recall.
- COVER-THE-OPTIONS RULE: a well-prepared student should answer from the vignette + lead-in WITHOUT seeing the options. The lead-in is a single focused question.
- EXACTLY 5 options. Exactly ONE is correct (correct:true); four are distractors (correct:false).
- Distractors must be HOMOGENEOUS with the answer (same category — all diagnoses, or all mechanisms, or all next-steps), PLAUSIBLE with partial knowledge, on a single continuum.
- Each option gets a one-sentence rationale (why correct / why ruled out).
- AVOID every technical flaw: no grammatical cues, no absolute terms ("always"/"never") in distractors, no longest-option-correct, no convergence, no "all/none of the above", no negatively-phrased stems ("except"/"not"), no obscure-vocabulary cueing, no implausible distractors.
- Only assert well-established, high-yield facts. Cite each key claim in "citations" with a label and a source (standard reference, guideline, or PMID).

TAGS (for tracking strengths/gaps — be specific and consistent):
- topic: the specific entity/disease/structure being tested (e.g. "G6PD deficiency", "Wenckebach AV block"). Use canonical names so the same concept tags identically across items.
- concept: the precise principle the item turns on (e.g. "oxidative stress triggers hemolysis", "progressive PR prolongation").
- keywords: 3-6 buzzwords/discriminators a student should recognize.
- teaching_point: 1-2 sentences on the single core concept.`;

const DIFFICULTY_NOTE: Record<string, string> = {
  easy: "Difficulty: EASY — classic presentation, clear discriminating feature.",
  medium: "Difficulty: MEDIUM — typical board difficulty.",
  hard: "Difficulty: HARD — subtle discriminators, close distractors, requires multi-step reasoning.",
  mixed: "Difficulty: board-appropriate.",
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
    (cell.avoid?.length ? `Do NOT repeat these already-tested concepts: ${cell.avoid.join("; ")}.\n` : "") +
    (passages ? `\nGround the item ONLY in these sources:\n${passages}\n` : "");

  const resp = await openai([{ role: "system", content: system }, { role: "user", content: userText }]);
  return extractJson(resp);
}

async function critique(_cell: Cell, item: any): Promise<any> {
  const resp = await openai(
    [
      {
        role: "system",
        content:
          `You are an NBME test-item reviewer. Review and, if needed, REPAIR the item for: ` +
          `(1) tests EXACTLY ONE high-yield concept — if it stacks multiple diagnoses/layers or is overcomplicated, SIMPLIFY it to a single clean concept with a classic presentation and trim red herrings; ` +
          `(2) exactly one defensible best answer; (3) homogeneous, plausible distractors on one continuum; (4) the cover-the-options rule; (5) every technical flaw; (6) factual accuracy. ` +
          `Keep the topic/concept/keywords tags accurate. Return a corrected item in the SAME JSON schema (EXACTLY 5 options, one correct). If already excellent, return it unchanged.`,
      },
      { role: "user", content: `Item to review:\n${JSON.stringify(item)}` },
    ],
  );
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

    if ((Deno.env.get("QBANK_CRITIC") ?? "1") === "1") {
      try {
        const reviewed = await critique(cell, item);
        if (!validate(reviewed)) item = reviewed;
      } catch (_e) { /* keep author item if critic fails */ }
    }

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
