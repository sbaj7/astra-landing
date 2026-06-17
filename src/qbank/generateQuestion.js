// Generator service boundary.
//
// Primary path: the `qbank-generate` Supabase edge function (grounded Claude
// pipeline: author -> critic/flaw gate -> validate). If that fails or isn't
// configured yet (no ANTHROPIC_API_KEY secret), we fall back to a structured
// STUB so the full UX still works end to end.

import { supabase } from '../services/supabaseClient.js';
import { labelFor } from './blueprint.js';

let counter = 0;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export async function generateQuestion(cell, { signal, avoid = [] } = {}) {
  const payload = {
    step: cell.step,
    system: cell.system, specialty: cell.specialty, task: cell.task,
    systemLabel: labelFor(cell.step, 'systems', cell.system),
    specialtyLabel: labelFor(cell.step, 'specialties', cell.specialty),
    taskLabel: labelFor(cell.step, 'tasks', cell.task),
    difficulty: cell.difficulty || 'mixed',
    avoid,
  };

  try {
    const { data, error } = await supabase.functions.invoke('qbank-generate', { body: payload });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    if (data && Array.isArray(data.options) && data.options.length >= 4) {
      return { ...data, system: cell.system, specialty: cell.specialty, task: cell.task, step: cell.step };
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
    difficulty: cell.difficulty || 'mixed',
    vignette: `[Sample ${taskLabel} vignette — ${sys}/${spec}] A patient presents with a focused history, exam findings, and labs (demographics → history → exam → data). (Placeholder from the stub generator; the live pipeline returns a grounded NBME-style vignette here once ANTHROPIC_API_KEY is set.)`,
    leadIn: `Which of the following is the most likely ${cell.task === 'diagnosis' ? 'diagnosis' : 'best next step'}?`,
    options: shuffle([correct, ...distractors]),
    teachingPoint: `Teaching point for ${sys} (${spec}, ${taskLabel}). The live generator grounds this in retrieved guidelines/trials with citations.`,
    citations: [{ label: 'Source pending — set ANTHROPIC_API_KEY to enable live generation', url: '' }],
  };
}
