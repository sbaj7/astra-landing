// Completed-session history. Persisted to Supabase (table: qbank_sessions) when
// the user is signed in, so history follows the account across devices; falls
// back to localStorage for anonymous users / offline, and uses it as a cache.

import { supabase } from '../services/supabaseClient.js';

const KEY = 'astra_qbank_history_v1';
const CAP = 60; // most recent N sessions

const readLocal = () => {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};
const writeLocal = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

// Supabase row -> the entry shape the UI expects.
const rowToEntry = (r) => ({
  id: r.id,
  startedAt: r.started_at ? new Date(r.started_at).getTime() : Date.now(),
  finishedAt: r.finished_at ? new Date(r.finished_at).getTime() : Date.now(),
  step: r.step,
  mode: r.mode,
  difficulty: r.difficulty,
  total: r.total ?? (Array.isArray(r.answers) ? r.answers.length : 0),
  correct: r.correct ?? 0,
  answers: r.answers || [],
});

// Load history. Signed-in -> Supabase (cached locally); anonymous -> localStorage.
export async function loadSessions(userId) {
  if (!userId) return readLocal();
  try {
    const { data, error } = await supabase
      .from('qbank_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(CAP);
    if (error) throw error;
    const entries = (data || []).map(rowToEntry);
    writeLocal(entries); // keep a local cache for fast/offline render
    return entries;
  } catch {
    return readLocal(); // network/RLS error -> fall back to cache
  }
}

// record: { startedAt, step, mode, difficulty, answers:[{item, chosen, correct}] }
export async function saveSession(record, userId) {
  if (!record || !Array.isArray(record.answers) || !record.answers.length) return null;
  const total = record.answers.length;
  const correct = record.answers.filter((a) => a.correct).length;
  const entry = {
    id: `s-${record.startedAt || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: record.startedAt || Date.now(),
    finishedAt: Date.now(),
    step: record.step,
    mode: record.mode,
    difficulty: record.difficulty,
    total,
    correct,
    answers: record.answers,
  };

  // Local cache first (instant, works offline / anonymous).
  writeLocal([entry, ...readLocal()].slice(0, CAP));

  if (userId) {
    try {
      const { data } = await supabase
        .from('qbank_sessions')
        .insert({
          user_id: userId,
          started_at: new Date(entry.startedAt).toISOString(),
          finished_at: new Date(entry.finishedAt).toISOString(),
          step: entry.step,
          mode: entry.mode,
          difficulty: entry.difficulty,
          total,
          correct,
          answers: entry.answers,
        })
        .select('id')
        .single();
      if (data?.id) entry.id = data.id; // adopt the server id
    } catch { /* keep local copy; will reconcile on next load */ }
  }
  return entry;
}

export async function deleteSession(id, userId) {
  writeLocal(readLocal().filter((s) => s.id !== id));
  if (userId) {
    try { await supabase.from('qbank_sessions').delete().eq('id', id).eq('user_id', userId); }
    catch { /* ignore */ }
  }
}
