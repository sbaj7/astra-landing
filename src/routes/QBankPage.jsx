import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, BarChart3, RotateCcw, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '../components/Themes+Styles.jsx';
import { STEPS, DIFFICULTIES, MODES, BLUEPRINT, labelFor } from '../qbank/blueprint.js';
import { buildPlan, recordResponse, loadMastery, masteryFor, resetProgress, summarizeByStep, predictStep } from '../qbank/mastery.js';
import { generateQuestion } from '../qbank/generateQuestion.js';

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const SERIF = 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';
const PREFETCH = 2; // generate this many questions ahead of the user

const pct = (n) => `${Math.round(n * 100)}%`;

// Axes tracked for strengths/gaps. `topics` is granular + generator-tagged.
const AXES = ['systems', 'specialties', 'tasks', 'topics'];
const AXIS_FIELD = { systems: 'system', specialties: 'specialty', tasks: 'task', topics: 'topic' };
const AXIS_RESULT_TITLE = { systems: 'By system', specialties: 'By specialty', tasks: 'By task', topics: 'By topic' };
const AXIS_DASH_TITLE = { systems: 'Systems', specialties: 'Specialties', tasks: 'Physician tasks', topics: 'Topics' };
const axisLabel = (step, axis, key) => (axis === 'topics' ? key : labelFor(step, axis, key));

export default function QBankPage() {
  const navigate = useNavigate();
  const { colors: theme } = useTheme();
  const [view, setView] = useState('setup'); // setup | session | results | dashboard

  // session config
  const [config, setConfig] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);

  const startSession = (cfg) => { setConfig(cfg); setView('session'); };

  return (
    <div style={{ height: '100dvh', width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: theme.backgroundPrimary }}>
      <Header theme={theme} onBack={() => navigate('/')} view={view} onDashboard={() => setView('dashboard')} onSetup={() => setView('setup')} />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 96px' }}>
        {view === 'setup' && <Setup theme={theme} onStart={startSession} />}
        {view === 'session' && config && (
          <Session theme={theme} config={config} onFinish={(r) => { setSessionResult(r); setView('results'); }} />
        )}
        {view === 'results' && sessionResult && (
          <Results theme={theme} result={sessionResult} onNew={() => setView('setup')} onDashboard={() => setView('dashboard')} />
        )}
        {view === 'dashboard' && <Dashboard theme={theme} onNew={() => setView('setup')} />}
      </main>
    </div>
  );
}

/* ----------------------------- shared bits ----------------------------- */
const eyebrow = (theme) => ({ textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11, fontWeight: 600, color: `${theme.textSecondary}99`, fontFamily: SANS, margin: 0 });

const Header = ({ theme, onBack, view, onDashboard, onSetup }) => (
  <header style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 24px', background: `${theme.backgroundPrimary}CC`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${theme.textSecondary}1A` }}>
    <button onClick={onBack} aria-label="Back to Astra" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 8px', margin: '-6px -8px', border: 'none', background: 'transparent', color: `${theme.textSecondary}C0`, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, fontFamily: SANS }}>
      <ArrowLeft size={16} /> Astra
    </button>
    <span style={{ fontFamily: SERIF, fontSize: 17, color: theme.textPrimary, letterSpacing: '-0.01em' }}>Q-Bank</span>
    <div style={{ display: 'flex', gap: 6 }}>
      <NavBtn theme={theme} active={view === 'setup'} onClick={onSetup}>New</NavBtn>
      <NavBtn theme={theme} active={view === 'dashboard'} onClick={onDashboard}><BarChart3 size={14} /> Progress</NavBtn>
    </div>
  </header>
);

const NavBtn = ({ theme, active, onClick, children }) => (
  <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, border: `1px solid ${active ? 'transparent' : `${theme.textSecondary}22`}`, background: active ? theme.accentSoftBlue : 'transparent', color: active ? '#fff' : `${theme.textSecondary}C0`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS }}>{children}</button>
);

const Chip = ({ theme, active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${active ? theme.accentSoftBlue : `${theme.textSecondary}22`}`, background: active ? `${theme.accentSoftBlue}14` : `${theme.backgroundSurface}E8`, color: active ? theme.accentSoftBlue : `${theme.textSecondary}D0`, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 450, fontFamily: SANS }}>{children}</button>
);

/* ------------------------------- setup -------------------------------- */
function Setup({ theme, onStart }) {
  const [step, setStep] = useState('step1');
  const [systems, setSystems] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [mode, setMode] = useState('tutor');

  const bp = BLUEPRINT[step];
  const toggle = (list, set, key) => set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  // reset topic picks when step changes
  useEffect(() => { setSystems([]); setSpecialties([]); }, [step]);

  return (
    <div style={{ paddingTop: 'clamp(36px, 7vw, 72px)', display: 'flex', flexDirection: 'column', gap: 'clamp(32px, 5vw, 48px)' }}>
      <div style={{ maxWidth: 640 }}>
        <p style={eyebrow(theme)}>New session</p>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.12, color: theme.textPrimary }}>
          Build a set, tuned to you.
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.7, color: `${theme.textSecondary}C0`, fontFamily: SANS }}>
          Questions are generated live and weighted toward your weak areas. Pick a Step, narrow by topic if you want, and choose how many.
        </p>
      </div>

      {/* Step */}
      <Section theme={theme} label="Exam">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {STEPS.map((s) => (
            <button key={s.key} onClick={() => setStep(s.key)} style={{ textAlign: 'left', padding: 18, borderRadius: 16, cursor: 'pointer', border: `1px solid ${step === s.key ? theme.accentSoftBlue : `${theme.textSecondary}18`}`, background: step === s.key ? `${theme.accentSoftBlue}10` : `${theme.backgroundSurface}E8`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary, fontFamily: SANS }}>{s.label}</span>
              <span style={{ fontSize: 12.5, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>{s.blurb}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Topic */}
      <Section theme={theme} label="Topic — systems" hint="Leave empty for the full blueprint">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bp.systems.map((s) => <Chip key={s.key} theme={theme} active={systems.includes(s.key)} onClick={() => toggle(systems, setSystems, s.key)}>{s.label}</Chip>)}
        </div>
      </Section>

      <Section theme={theme} label={`Topic — ${bp.specialtyLabel.toLowerCase()}`} hint="Optional">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bp.specialties.map((s) => <Chip key={s.key} theme={theme} active={specialties.includes(s.key)} onClick={() => toggle(specialties, setSpecialties, s.key)}>{s.label}</Chip>)}
        </div>
      </Section>

      {/* Count */}
      <Section theme={theme} label="Questions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <input type="range" min={1} max={40} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ flex: 1, accentColor: theme.accentSoftBlue }} />
          <span style={{ minWidth: 64, textAlign: 'right', fontSize: 28, fontWeight: 700, color: theme.accentSoftBlue, fontFamily: SANS, letterSpacing: '-0.02em' }}>{count}</span>
        </div>
      </Section>

      {/* Difficulty + Mode */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px, 4vw, 48px)' }}>
        <Section theme={theme} label="Difficulty">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DIFFICULTIES.map((d) => <Chip key={d.key} theme={theme} active={difficulty === d.key} onClick={() => setDifficulty(d.key)}>{d.label}</Chip>)}
          </div>
        </Section>
        <Section theme={theme} label="Mode">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODES.map((m) => <Chip key={m.key} theme={theme} active={mode === m.key} onClick={() => setMode(m.key)}>{m.label}</Chip>)}
          </div>
        </Section>
      </div>

      <button onClick={() => onStart({ step, systems, specialties, count, difficulty, mode })} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 999, border: 'none', background: theme.accentSoftBlue, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, fontFamily: SANS }}>
        Start {count} question{count > 1 ? 's' : ''} <ChevronRight size={18} />
      </button>
    </div>
  );
}

const Section = ({ theme, label, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <p style={eyebrow(theme)}>{label}</p>
      {hint && <span style={{ fontSize: 12, color: `${theme.textSecondary}80`, fontFamily: SANS }}>{hint}</span>}
    </div>
    {children}
  </div>
);

/* ------------------------------ session ------------------------------- */
function Session({ theme, config, onFinish }) {
  const { step, systems, specialties, count, difficulty, mode } = config;
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState([]); // items[i] = generated question | undefined
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const answers = useRef([]); // { item, chosen, correct }
  const cells = useRef([]); // lazily-chosen cell per index (reflects latest mastery)
  const startedAt = useRef(Date.now());
  const inflight = useRef(new Set());

  const cellFor = useCallback((i) => {
    if (cells.current[i]) return cells.current[i];
    const cell = buildPlan({ step, count: 1, systems, specialties })[0];
    cell.difficulty = difficulty === 'mixed' ? ['medium', 'hard', 'hard'][Math.floor(Math.random() * 3)] : difficulty;
    cell.step = step;
    cells.current[i] = cell;
    return cell;
  }, [step, systems, specialties, difficulty]);

  const ensure = useCallback((i) => {
    if (i >= count || inflight.current.has(i)) return;
    setItems((prev) => { if (prev[i]) return prev; return prev; });
    if (items[i]) return;
    inflight.current.add(i);
    generateQuestion(cellFor(i))
      .then((q) => setItems((prev) => { const next = [...prev]; next[i] = q; return next; }))
      .catch(() => {})
      .finally(() => inflight.current.delete(i));
  }, [count, items, cellFor]);

  // Load the current question first; only start prefetching the rest once the
  // current one has arrived, so Q1 isn't competing with later questions and
  // appears as fast as possible.
  useEffect(() => {
    ensure(index);
    if (items[index]) {
      for (let i = index + 1; i <= Math.min(count - 1, index + PREFETCH); i++) ensure(i);
    }
  }, [index, items, ensure, count]);

  const current = items[index];
  const onPick = (i) => { if (!submitted) setSelected(i); };

  const submit = () => {
    if (selected == null || submitted) return;
    const correct = current.options[selected].correct;
    recordResponse(current, correct, Date.now() - startedAt.current);
    answers.current.push({ item: current, chosen: selected, correct });
    setSubmitted(true);
    if (mode === 'timed') advance();
  };

  const advance = () => {
    startedAt.current = Date.now();
    if (index + 1 >= count) {
      onFinish({ step, answers: answers.current });
    } else {
      setSelected(null); setSubmitted(false); setIndex(index + 1);
    }
  };

  return (
    <div style={{ paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>
          <span>Question {index + 1} of {count}</span>
          <span>{STEPS.find((s) => s.key === step)?.label}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: `${theme.textSecondary}1A`, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct((index + (submitted ? 1 : 0)) / count), background: theme.accentSoftBlue, transition: 'width .3s ease' }} />
        </div>
      </div>

      {!current ? (
        <Loading theme={theme} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[labelFor(step, 'systems', current.system), labelFor(step, 'specialties', current.specialty), labelFor(step, 'tasks', current.task)].map((t, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: `${theme.accentSoftBlue}CC`, background: `${theme.accentSoftBlue}12`, padding: '4px 10px', borderRadius: 999, fontFamily: SANS }}>{t}</span>
            ))}
            {current.topic && submitted && (
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: `${theme.textSecondary}A0`, background: `${theme.textSecondary}12`, padding: '4px 10px', borderRadius: 999, fontFamily: SANS }}>{current.topic}</span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.7, color: theme.textPrimary, fontFamily: SANS }}>{current.vignette}</p>
          <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: theme.textPrimary, fontWeight: 600, fontFamily: SANS }}>{current.leadIn}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {current.options.map((opt, i) => {
              const isPicked = selected === i;
              const showCorrect = submitted && opt.correct;
              const showWrong = submitted && isPicked && !opt.correct;
              const border = showCorrect ? theme.successColor || '#16a34a' : showWrong ? '#dc2626' : isPicked ? theme.accentSoftBlue : `${theme.textSecondary}20`;
              const bg = showCorrect ? `${theme.successColor || '#16a34a'}12` : showWrong ? '#dc262610' : isPicked ? `${theme.accentSoftBlue}0E` : `${theme.backgroundSurface}E8`;
              return (
                <button key={i} onClick={() => onPick(i)} disabled={submitted} style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 14, border: `1px solid ${border}`, background: bg, cursor: submitted ? 'default' : 'pointer', fontFamily: SANS }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isPicked || showCorrect ? '#fff' : `${theme.textSecondary}A0`, background: showCorrect ? (theme.successColor || '#16a34a') : showWrong ? '#dc2626' : isPicked ? theme.accentSoftBlue : `${theme.textSecondary}1A` }}>
                    {showCorrect ? <Check size={14} /> : showWrong ? <X size={14} /> : String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 15, color: theme.textPrimary }}>{opt.text}</span>
                    {submitted && mode === 'tutor' && (opt.correct || isPicked) && (
                      <span style={{ fontSize: 13, lineHeight: 1.55, color: `${theme.textSecondary}C0` }}>{opt.rationale}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {submitted && mode === 'tutor' && (
            <div style={{ padding: 18, borderRadius: 16, background: `${theme.accentSoftBlue}0C`, border: `1px solid ${theme.accentSoftBlue}22` }}>
              <p style={{ ...eyebrow(theme), color: `${theme.accentSoftBlue}CC`, marginBottom: 8 }}>Teaching point</p>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: theme.textPrimary, fontFamily: SANS }}>{current.teachingPoint}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {!submitted ? (
              <PrimaryBtn theme={theme} disabled={selected == null} onClick={submit}>Submit</PrimaryBtn>
            ) : mode === 'tutor' ? (
              <PrimaryBtn theme={theme} onClick={advance}>{index + 1 >= count ? 'See results' : 'Next'} <ChevronRight size={18} /></PrimaryBtn>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

const PrimaryBtn = ({ theme, children, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, border: 'none', background: disabled ? `${theme.textSecondary}2A` : theme.accentSoftBlue, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14.5, fontWeight: 600, fontFamily: SANS }}>{children}</button>
);

const Loading = ({ theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '64px 0', color: `${theme.textSecondary}A0`, fontFamily: SANS }}>
    <Loader2 size={26} color={theme.accentSoftBlue} style={{ animation: 'spin 1s linear infinite' }} />
    <span style={{ fontSize: 14 }}>Generating your question…</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* ------------------------------ results ------------------------------- */
function Results({ theme, result, onNew, onDashboard }) {
  const { answers, step } = result;
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const byAxis = (axis) => {
    const map = {};
    answers.forEach((a) => {
      const key = a.item[AXIS_FIELD[axis]];
      if (!key) return;
      map[key] ??= { c: 0, n: 0 };
      map[key].n += 1; if (a.correct) map[key].c += 1;
    });
    return Object.entries(map).map(([key, v]) => ({ key, label: axisLabel(step, axis, key), ...v }));
  };

  return (
    <div style={{ paddingTop: 'clamp(36px, 7vw, 72px)', display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div>
        <p style={eyebrow(theme)}>Session complete</p>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 'clamp(34px, 6vw, 56px)', fontWeight: 400, letterSpacing: '-0.03em', color: theme.textPrimary }}>
          {correct}/{total} <span style={{ color: `${theme.textSecondary}80` }}>· {pct(correct / total)}</span>
        </h1>
      </div>

      {AXES.map((axis) => (
        <div key={axis} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={eyebrow(theme)}>{AXIS_RESULT_TITLE[axis]} (this session)</p>
          {byAxis(axis).map((row) => <AccuracyRow key={row.key} theme={theme} label={row.label} c={row.c} n={row.n} />)}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PrimaryBtn theme={theme} onClick={onNew}>New session</PrimaryBtn>
        <button onClick={onDashboard} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, border: `1px solid ${theme.textSecondary}22`, background: 'transparent', color: theme.textPrimary, cursor: 'pointer', fontSize: 14.5, fontWeight: 600, fontFamily: SANS }}><BarChart3 size={16} /> View progress</button>
      </div>
    </div>
  );
}

const AccuracyRow = ({ theme, label, c, n }) => {
  const acc = c / n;
  const color = acc >= 0.75 ? (theme.successColor || '#16a34a') : acc >= 0.5 ? theme.accentSoftBlue : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ flex: '0 0 200px', fontSize: 13.5, color: theme.textPrimary, fontFamily: SANS }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: `${theme.textSecondary}16`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct(acc), background: color, transition: 'width .4s ease' }} />
      </div>
      <span style={{ flex: '0 0 56px', textAlign: 'right', fontSize: 12.5, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>{c}/{n}</span>
    </div>
  );
};

// Slim, modern progress row: label, thin rounded bar, % value.
const DashRow = ({ theme, label, c, n }) => {
  const acc = n ? c / n : 0;
  const color = acc >= 0.75 ? (theme.successColor || '#16a34a') : acc >= 0.5 ? theme.accentSoftBlue : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '7px 0' }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: theme.textPrimary, fontFamily: SANS, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div style={{ width: 'clamp(110px, 30%, 180px)', height: 10, borderRadius: 6, background: `${theme.textSecondary}12`, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: pct(acc), background: color, borderRadius: 6, transition: 'width .5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ width: 44, textAlign: 'right', fontSize: 13, fontWeight: 600, color, fontFamily: SANS, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{pct(acc)}</span>
    </div>
  );
};

const PredPill = ({ theme, pred }) => {
  let text;
  if (pred.status === 'pending') text = `Score unlocks at ${pred.need}+`;
  else if (pred.status === 'score') text = `≈ ${pred.score} · ${pred.percentile}th pct`;
  else text = pred.band;
  const pending = pred.status === 'pending';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999,
      background: pending ? `${theme.textSecondary}12` : `${theme.accentSoftBlue}14`,
      color: pending ? `${theme.textSecondary}A0` : theme.accentSoftBlue,
      fontSize: 13, fontWeight: 600, fontFamily: SANS, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
};

/* ----------------------------- dashboard ------------------------------ */
function Dashboard({ theme, onNew }) {
  const mastery = useMemo(() => loadMastery(), []);
  const summary = useMemo(() => summarizeByStep(), []);
  const steps = Object.keys(mastery);
  const hasData = steps.length > 0;
  const [openTopics, setOpenTopics] = useState({}); // collapsed by default

  return (
    <div style={{ paddingTop: 'clamp(36px, 7vw, 72px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
        <div>
          <p style={eyebrow(theme)}>Progress</p>
          <h1 style={{ margin: '14px 0 0', fontFamily: SERIF, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, letterSpacing: '-0.03em', color: theme.textPrimary }}>Your strengths &amp; gaps</h1>
        </div>
        {hasData && (
          <button onClick={() => { resetProgress(); onNew(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999, border: `1px solid ${theme.textSecondary}1F`, background: 'transparent', color: `${theme.textSecondary}A0`, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: SANS }}><RotateCcw size={14} /> Reset</button>
        )}
      </div>

      {!hasData ? (
        <div style={{ padding: 48, borderRadius: 22, background: `${theme.backgroundSurface}E8`, border: `1px solid ${theme.textSecondary}12`, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: `${theme.textSecondary}B0`, fontFamily: SANS }}>No data yet. Finish a session and your strengths and gaps show up here.</p>
          <div style={{ marginTop: 20 }}><PrimaryBtn theme={theme} onClick={onNew}>Start a session</PrimaryBtn></div>
        </div>
      ) : (
        steps.map((step) => {
          const s = summary[step];
          const color = s ? (s.p >= 0.75 ? (theme.successColor || '#16a34a') : s.p >= 0.5 ? theme.accentSoftBlue : '#dc2626') : theme.textPrimary;
          return (
            <section key={step} style={{ borderRadius: 26, background: `${theme.backgroundSurface}F0`, border: `1px solid ${theme.textSecondary}10`, boxShadow: '0 4px 24px rgba(15,23,42,0.05)', padding: 'clamp(24px, 3.5vw, 34px)', display: 'flex', flexDirection: 'column', gap: 26 }}>
              {/* headline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontFamily: SANS, fontSize: 'clamp(20px, 2.8vw, 25px)', fontWeight: 700, letterSpacing: '-0.025em', color: theme.textPrimary }}>{STEPS.find((x) => x.key === step)?.label}</span>
                  {s && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 14 }}>
                        <span style={{ fontSize: 48, fontWeight: 700, color, fontFamily: SANS, letterSpacing: '-0.035em', lineHeight: 1 }}>{pct(s.p)}</span>
                        <span style={{ fontSize: 14, color: `${theme.textSecondary}70`, fontFamily: SANS, fontVariantNumeric: 'tabular-nums' }}>± {pct((s.high - s.low) / 2)}</span>
                      </div>
                      <span style={{ display: 'block', marginTop: 9, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${theme.textSecondary}85`, fontFamily: SANS }}>{s.correct} of {s.n} correct</span>
                    </>
                  )}
                </div>
                {s && <PredPill theme={theme} pred={predictStep(step, s.p, s.n)} />}
              </div>

              {/* axes */}
              {AXES.map((axis) => {
                const data = mastery[step]?.[axis];
                if (!data) return null;
                const rows = Object.entries(data)
                  .map(([key, rec]) => ({ key, label: axisLabel(step, axis, key), m: masteryFor(mastery, step, axis, key), n: rec.attempts }))
                  .sort((a, b) => a.m - b.m);
                const collapsible = axis === 'topics';
                const open = !collapsible || !!openTopics[step];
                return (
                  <div key={axis} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 22, borderTop: `1px solid ${theme.textSecondary}0D` }}>
                    {collapsible ? (
                      <button onClick={() => setOpenTopics((p) => ({ ...p, [step]: !p[step] }))} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', alignSelf: 'flex-start' }}>
                        {open ? <ChevronDown size={14} color={`${theme.textSecondary}90`} /> : <ChevronRight size={14} color={`${theme.textSecondary}90`} />}
                        <span style={eyebrow(theme)}>{AXIS_DASH_TITLE[axis]} · {rows.length}</span>
                      </button>
                    ) : (
                      <p style={{ ...eyebrow(theme), marginBottom: 4 }}>{AXIS_DASH_TITLE[axis]}</p>
                    )}
                    {open && rows.map((r) => <DashRow key={r.key} theme={theme} label={r.label} c={Math.round(r.m * r.n)} n={r.n} />)}
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
