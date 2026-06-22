// Completed-session history. Persisted server-side through the auth-management
// edge function (service role) — the SAME pattern the app uses for chat history
// (user_chat_sessions) — so history follows the account across devices. The full
// per-question `answers` payload (item topic/specialty/system/task/difficulty +
// options + chosen + correct) is stored verbatim, so scores and every axis
// breakdown can be recomputed losslessly. localStorage is kept as an offline cache.

import authService from '../services/authService.js';

const KEY = 'astra_qbank_history_v1';
const CAP = 60;

const readLocal = () => {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};
const writeLocal = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

// DB row -> the entry shape the UI expects.
const rowToEntry = (r) => ({
  id: r.id,
  startedAt: r.started_at ? new Date(r.started_at).getTime() : (r.created_at ? new Date(r.created_at).getTime() : Date.now()),
  finishedAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  step: r.step,
  mode: r.mode,
  difficulty: r.difficulty,
  total: r.total ?? (Array.isArray(r.answers) ? r.answers.length : 0),
  correct: r.correct ?? 0,
  answers: r.answers || [],
});

// Load history for the signed-in user (or anonymous), via the edge function.
export async function loadSessions(supabaseUser) {
  try {
    const rows = await authService.getQbankSessions(supabaseUser, CAP);
    const entries = rows.map(rowToEntry);
    writeLocal(entries); // cache for fast/offline render
    return entries;
  } catch {
    return readLocal(); // network error -> show cached
  }
}

// record: { startedAt, step, mode, difficulty, answers:[{item, chosen, correct}] }
export async function saveSession(record, supabaseUser) {
  if (!record || !Array.isArray(record.answers) || !record.answers.length) return null;
  const total = record.answers.length;
  const correct = record.answers.filter((a) => a && a.correct).length;

  // Optimistic local cache entry so the UI is instant / works offline.
  const localEntry = {
    id: `s-${record.startedAt || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: record.startedAt || Date.now(),
    finishedAt: Date.now(),
    step: record.step, mode: record.mode, difficulty: record.difficulty,
    total, correct, answers: record.answers,
  };
  writeLocal([localEntry, ...readLocal()].slice(0, CAP));

  try {
    const row = await authService.saveQbankSession({
      startedAt: record.startedAt,
      step: record.step,
      mode: record.mode,
      difficulty: record.difficulty,
      answers: record.answers, // full per-question payload, stored verbatim
    }, supabaseUser);
    return row ? rowToEntry(row) : localEntry;
  } catch {
    return localEntry; // kept locally; reconciles on next load
  }
}

export async function deleteSession(id, supabaseUser) {
  writeLocal(readLocal().filter((s) => s.id !== id));
  try { await authService.deleteQbankSession(id, supabaseUser); } catch { /* ignore */ }
}
