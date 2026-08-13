// Generator service boundary.
//
// Primary path: the `qbank-generate` Supabase edge function (grounded Claude
// pipeline: author -> critic/flaw gate -> validate). If that fails or isn't
// configured yet (no ANTHROPIC_API_KEY secret), we fall back to a structured
// STUB so the full UX still works end to end.

import { supabase } from '../services/supabaseClient.js';
import authService from '../services/authService.js';
import { labelFor } from './blueprint.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

let counter = 0;

function buildPayload(cell, avoid = []) {
  return {
    step: cell.step,
    system: cell.system, specialty: cell.specialty, task: cell.task,
    topic: cell.topic || '',
    systemLabel: labelFor(cell.step, 'systems', cell.system),
    specialtyLabel: labelFor(cell.step, 'specialties', cell.specialty),
    taskLabel: labelFor(cell.step, 'tasks', cell.task),
    difficulty: cell.difficulty || 'mixed',
    avoid,
    anonymous_id: authService.getAnonymousId(),
  };
}

// Parse the streaming delimited text into the item shape (tolerant of partial text).
export function parseStreamItem(text, cell) {
  // Pin the canonical topic we asked for (so mastery tags overlap), falling back
  // to whatever the model emitted.
  const topic = cell.topic || (text.match(/^TOPIC:\s*(.+)$/m) || [])[1]?.trim() || '';
  let vignette = '';
  const vIdx = text.indexOf('VIGNETTE:');
  if (vIdx !== -1) {
    const after = text.slice(vIdx + 'VIGNETTE:'.length);
    const q = after.search(/\n\s*QUESTION:/);
    vignette = (q === -1 ? after : after.slice(0, q)).trim();
  }
  const leadIn = (text.match(/^QUESTION:\s*(.+)$/m) || [])[1]?.trim() || '';
  const opts = [];
  const re = /^([A-E])\.[ \t]+(.+)$/gm;
  let m;
  while ((m = re.exec(text))) opts.push({ letter: m[1], text: m[2].trim() });
  const answer = (text.match(/^ANSWER:\s*([A-E])/m) || [])[1] || '';
  // Per-option rationale: "WHY-A: ...". Stop the comprehensive EXPLANATION block
  // from leaking in by only taking up to the next marker / EXPLANATION.
  const why = {};
  const whyRe = /^WHY-([A-E]):[ \t]*(.+)$/gm;
  let w;
  while ((w = whyRe.exec(text))) why[w[1]] = w[2].trim();
  const eIdx = text.indexOf('EXPLANATION:');
  const explanation = eIdx === -1 ? '' : text.slice(eIdx + 'EXPLANATION:'.length).trim();
  const complete = !!(vignette && leadIn && opts.length >= 4 && answer);
  return {
    id: `stream-${cell.step}-${++counter}`,
    step: cell.step, system: cell.system, specialty: cell.specialty, task: cell.task,
    difficulty: cell.difficulty || 'mixed',
    topic, vignette, leadIn,
    options: opts.map((o) => ({ text: o.text, correct: o.letter === answer, rationale: why[o.letter] || '' })),
    teachingPoint: explanation,
    citations: [],
    complete,
  };
}

// Streaming generation: types the question in like the chat. Calls onPartial with
// the progressively-parsed item; resolves with the final item when complete.
export async function streamQuestion(cell, { onPartial, signal, avoid = [] } = {}) {
  let token = SUPABASE_ANON;
  try { const { data } = await supabase.auth.getSession(); if (data?.session?.access_token) token = data.session.access_token; } catch { /* anon */ }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/qbank-generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ ...buildPayload(cell, avoid), stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '', buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i;
    while ((i = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 2);
      if (!block.startsWith('data:')) continue;
      const data = block.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const p = JSON.parse(data);
        if (p.delta) { text += p.delta; onPartial?.(parseStreamItem(text, cell)); }
      } catch { /* ignore */ }
    }
  }
  const item = parseStreamItem(text, cell);
  if (!item.complete || item.options.length < 4) throw new Error('incomplete stream');
  return item;
}

// Tutor chat: stream a concise answer about an already-answered item. Sends the
// item context + the running conversation (history). Calls onDelta with each token.
export async function streamTutor({ item, messages, step }, { onDelta, signal } = {}) {
  let token = SUPABASE_ANON;
  try { const { data } = await supabase.auth.getSession(); if (data?.session?.access_token) token = data.session.access_token; } catch { /* anon */ }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/qbank-tutor`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ item, messages, step, anonymous_id: authService.getAnonymousId() }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`tutor ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i;
    while ((i = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 2);
      if (!block.startsWith('data:')) continue;
      const data = block.slice(5).trim();
      if (data === '[DONE]') continue;
      try { const p = JSON.parse(data); if (p.delta) { full += p.delta; onDelta?.(full); } } catch { /* ignore */ }
    }
  }
  return full;
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export async function generateQuestion(cell, { signal, avoid = [] } = {}) {
  const payload = buildPayload(cell, avoid);

  try {
    const { data, error } = await supabase.functions.invoke('qbank-generate', { body: payload });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    if (data && Array.isArray(data.options) && data.options.length >= 4) {
      return { ...data, system: cell.system, specialty: cell.specialty, task: cell.task, step: cell.step, topic: cell.topic || data.topic };
    }
    throw new Error('malformed generator response');
  } catch (e) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    console.warn('[qbank] live generation unavailable, using stub:', e?.message || e);
    return stubQuestion(cell, signal);
  }
}

// ----------------------------- STUB fallback -----------------------------
async function stubQuestion(cell, signal) {
  await new Promise((res, rej) => {
    const t = setTimeout(res, 350 + Math.random() * 500);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('aborted', 'AbortError')); });
  });

  const sys = labelFor(cell.step, 'systems', cell.system);
  const spec = labelFor(cell.step, 'specialties', cell.specialty);
  const taskLabel = labelFor(cell.step, 'tasks', cell.task);

  const correct = { text: `Correct option (${sys})`, correct: true, rationale: `Single best answer for this ${spec} vignette — matches the lead-in and the reasoning the stem sets up.` };
  const distractors = [
    { text: 'Plausible distractor A', correct: false, rationale: 'Homogeneous with the answer but ruled out by a specific detail in the vignette.' },
    { text: 'Plausible distractor B', correct: false, rationale: 'A common look-alike on this presentation; wrong because the timeline/labs do not fit.' },
    { text: 'Plausible distractor C', correct: false, rationale: 'Reasonable for partial knowledge, but a different mechanism than the stem describes.' },
    { text: 'Plausible distractor D', correct: false, rationale: 'Same category as the answer but a lower pre-test probability here.' },
  ];

  return {
    id: `stub-${++counter}`,
    step: cell.step, system: cell.system, specialty: cell.specialty, task: cell.task,
    topic: cell.topic || '',
    difficulty: cell.difficulty || 'mixed',
    vignette: `[Sample ${taskLabel} vignette — ${sys}/${spec}] A patient presents with a focused history, exam findings, and labs (demographics → history → exam → data). (Placeholder from the stub generator; the live pipeline returns a grounded NBME-style vignette here once ANTHROPIC_API_KEY is set.)`,
    leadIn: `Which of the following is the most likely ${cell.task === 'diagnosis' ? 'diagnosis' : 'best next step'}?`,
    options: shuffle([correct, ...distractors]),
    teachingPoint: `Teaching point for ${sys} (${spec}, ${taskLabel}). The live generator grounds this in retrieved guidelines/trials with citations.`,
    citations: [{ label: 'Source pending — set ANTHROPIC_API_KEY to enable live generation', url: '' }],
  };
}
