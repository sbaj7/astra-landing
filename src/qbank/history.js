// Completed-session history — fully account-based, NO localStorage. Reads/writes
// go through the auth-management edge function (service role), the same pattern the
// app uses for chat history. The full per-question `answers` payload is stored
// verbatim so scores and every axis breakdown recompute losslessly on any device.

import authService from '../services/authService.js';

const CAP = 60;

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

// Load history for the current account (or anonymous id) via the edge function.
// `limit` lets the mastery rebuild pull more sessions than the History list shows.
export async function loadSessions(supabaseUser, limit = CAP) {
  try {
    const rows = await authService.getQbankSessions(supabaseUser, limit);
    return rows.map(rowToEntry);
  } catch {
    return [];
  }
}

// Wipe ALL of the account's QBank history (used by Reset progress).
export async function clearAllSessions(supabaseUser) {
  try { await authService.clearQbankSessions(supabaseUser); return true; }
  catch { return false; }
}

// record: { startedAt, step, mode, difficulty, answers:[{item, chosen, correct}] }
export async function saveSession(record, supabaseUser) {
  if (!record || !Array.isArray(record.answers) || !record.answers.length) return null;
  try {
    const row = await authService.saveQbankSession({
      startedAt: record.startedAt,
      step: record.step,
      mode: record.mode,
      difficulty: record.difficulty,
      answers: record.answers, // full per-question payload, stored verbatim
    }, supabaseUser);
    return row ? rowToEntry(row) : null;
  } catch {
    return null;
  }
}

export async function deleteSession(id, supabaseUser) {
  try { await authService.deleteQbankSession(id, supabaseUser); } catch { /* ignore */ }
}
