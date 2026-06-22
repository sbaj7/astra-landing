// Content-based mastery store + adaptive planner.
//
// Mastery is tracked per (step, axis, value) so the dashboard can show
// strengths/weaknesses by System, Specialty, and Physician Task independently.
// Persisted in localStorage for now; swap for Supabase (`user_skill` table) when
// the backend lands — the read/write surface below is the seam to replace.

import { BLUEPRINT } from './blueprint.js';
import { topicsForSystem } from './topics.js';

const KEY = 'astra_qbank_mastery_v1';
const RESP_KEY = 'astra_qbank_responses_v1';

const read = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

// mastery[step][axis][value] = { correct, attempts }
export const loadMastery = () => read(KEY, {});
export const loadResponses = () => read(RESP_KEY, []);

const cellScore = (rec) => {
  if (!rec || !rec.attempts) return null; // unseen
  // Laplace-smoothed accuracy so 1/1 isn't treated as certain mastery.
  return (rec.correct + 1) / (rec.attempts + 2);
};

// Mastery for a single (step, axis, value); null when never attempted.
export const masteryFor = (mastery, step, axis, value) =>
  cellScore(mastery?.[step]?.[axis]?.[value]);

// Record one answered item across all three of its axis tags.
export const recordResponse = (item, correct, latencyMs) => {
  const mastery = loadMastery();
  const bump = (axis, value) => {
    if (!value) return;
    mastery[item.step] ??= {};
    mastery[item.step][axis] ??= {};
    const rec = (mastery[item.step][axis][value] ??= { correct: 0, attempts: 0 });
    rec.attempts += 1;
    if (correct) rec.correct += 1;
  };
  bump('systems', item.system);
  bump('specialties', item.specialty);
  bump('tasks', item.task);
  bump('topics', item.topic);     // granular, generator-tagged concept (deep gaps)
  write(KEY, mastery);

  const responses = loadResponses();
  responses.push({
    step: item.step, system: item.system, specialty: item.specialty, task: item.task,
    topic: item.topic, concept: item.concept, difficulty: item.difficulty, correct, latencyMs, ts: Date.now(),
  });
  write(RESP_KEY, responses);
  return mastery;
};

export const resetProgress = () => { write(KEY, {}); write(RESP_KEY, []); };

// Rebuild the local mastery + response log from the account's synced sessions, so
// adaptive picking (fresh/weak/mastered) and the dashboard reflect ALL of the
// user's history across every device — not just what this browser stored.
export const rebuildFromSessions = (sessions = []) => {
  const mastery = {};
  const responses = [];
  const ordered = [...sessions].sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  for (const s of ordered) {
    for (const a of (s.answers || [])) {
      const item = a && a.item;
      if (!item || !item.step) continue;
      const correct = !!a.correct;
      mastery[item.step] ??= {};
      const bump = (axis, value) => {
        if (!value) return;
        mastery[item.step][axis] ??= {};
        const rec = (mastery[item.step][axis][value] ??= { correct: 0, attempts: 0 });
        rec.attempts += 1;
        if (correct) rec.correct += 1;
      };
      bump('systems', item.system);
      bump('specialties', item.specialty);
      bump('tasks', item.task);
      bump('topics', item.topic);
      responses.push({
        step: item.step, system: item.system, specialty: item.specialty, task: item.task,
        topic: item.topic, difficulty: item.difficulty, correct, ts: s.startedAt || Date.now(),
      });
    }
  }
  write(KEY, mastery);
  write(RESP_KEY, responses);
  return mastery;
};

// ---- Stats ----
// Wilson score 95% interval for a proportion — robust at small n and near 0/1,
// so a 7/10 reads as "70% (42–89%)" rather than a falsely precise 70%.
export const wilson = (correct, n) => {
  if (!n) return { p: 0, low: 0, high: 0 };
  const z = 1.96;
  const phat = correct / n;
  const denom = 1 + (z * z) / n;
  const center = (phat + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n))) / denom;
  return { p: phat, low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
};

// ---- Predicted USMLE outcome (ESTIMATE) ----
// Only Step 2 CK is scored (official norm ~ mean 245, SD 15). Step 1 & Step 3 are
// officially pass/fail, so they get a predicted pass band, not a percentile.
// The %correct -> score map is a rough, tunable heuristic (our items are NOT
// norm-calibrated like UWorld), so this is labeled an estimate everywhere.
const STEP2_MEAN = 245;
const STEP2_SD = 15;
const SCORE_SLOPE = 120;     // score ≈ p*SLOPE + INTERCEPT  (0.70 -> 244, 0.80 -> 256)
const SCORE_INTERCEPT = 160;
export const MIN_N_PREDICT = 20; // predictions are too noisy below this

const erf = (x) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

export const predictStep = (step, p, n) => {
  if (!n || n < MIN_N_PREDICT) return { status: 'pending', need: MIN_N_PREDICT, n: n || 0 };
  if (step === 'step2') {
    const score = Math.max(1, Math.min(300, Math.round(p * SCORE_SLOPE + SCORE_INTERCEPT)));
    const percentile = Math.max(1, Math.min(99, Math.round(normCdf((score - STEP2_MEAN) / STEP2_SD) * 100)));
    return { status: 'score', score, percentile };
  }
  const band = p >= 0.65 ? 'Likely pass' : p >= 0.55 ? 'Borderline' : 'At risk';
  return { status: 'passfail', band };
};

// Global per-step summary from the raw response log.
export const summarizeByStep = (responses = loadResponses()) => {
  const out = {};
  responses.forEach((r) => {
    const s = (out[r.step] ??= { n: 0, correct: 0 });
    s.n += 1; if (r.correct) s.correct += 1;
  });
  Object.values(out).forEach((s) => { Object.assign(s, wilson(s.correct, s.n)); });
  return out;
};

// ---- Planner ----
// Build a session plan of N cells. Each cell = { system, specialty, task }.
// Sampling weight = blueprint_weight x (1 - mastery), constrained to the user's
// chosen systems/specialties so the set still "looks like" the chosen Step/topic.
const weightedPick = (items, mastery, step, axis, restrictTo) => {
  const pool = restrictTo && restrictTo.length
    ? items.filter((i) => restrictTo.includes(i.key))
    : items;
  const list = pool.length ? pool : items;
  const weights = list.map((i) => {
    const m = masteryFor(mastery, step, axis, i.key);
    const gap = m == null ? 0.6 : 1 - m; // unseen gets a moderate, exploratory weight
    return Math.max(0.04, i.weight * gap);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i].key;
  }
  return list[list.length - 1].key;
};

// Pick ONE canonical topic from the system's pool using the user's scorecard:
// FRESH (never seen) is top priority, then WEAK (low % correct), and MASTERED
// topics rarely recur. `exclude` removes topics already shown this session.
export const pickTopic = (step, systemKey, exclude = []) => {
  const all = topicsForSystem(systemKey);
  const ex = new Set(exclude);
  let pool = all.filter((t) => !ex.has(t));
  if (!pool.length) pool = all; // pool exhausted this session — allow repeats
  const mastery = loadMastery();
  const weights = pool.map((t) => {
    const m = masteryFor(mastery, step, 'topics', t);
    if (m == null) return 1.0;                 // fresh / never attempted → highest priority
    return Math.max(0.06, (1 - m) * 0.9);      // weak drilled hard; mastered rarely repeats
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
};

export const buildPlan = ({ step, count, systems = [], specialties = [] }) => {
  const bp = BLUEPRINT[step];
  const mastery = loadMastery();
  const plan = [];
  for (let i = 0; i < count; i++) {
    plan.push({
      system: weightedPick(bp.systems, mastery, step, 'systems', systems),
      specialty: weightedPick(bp.specialties, mastery, step, 'specialties', specialties),
      task: weightedPick(bp.tasks, mastery, step, 'tasks', []),
    });
  }
  return plan;
};

// Re-plan the remaining tail of a session given live performance (called after a
// checkpoint). Keeps the already-served items, regenerates the rest from updated mastery.
export const replanTail = ({ step, remaining, systems, specialties }) =>
  buildPlan({ step, count: remaining, systems, specialties });
