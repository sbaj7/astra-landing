// Completed-session history. Each finished set is saved (newest first) so the
// user can revisit past tests, titled by when they were started. localStorage for
// now — same seam to swap for Supabase as the mastery store.

const KEY = 'astra_qbank_history_v1';
const CAP = 60; // keep the most recent N sessions

const read = () => {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

export const loadSessions = () => read();

// record: { startedAt, step, mode, difficulty, answers:[{item, chosen, correct}] }
export const saveSession = (record) => {
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
  const next = [entry, ...read()].slice(0, CAP);
  write(next);
  return entry;
};

export const deleteSession = (id) => { write(read().filter((s) => s.id !== id)); };
export const clearHistory = () => write([]);
