import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, BarChart3, RotateCcw, ChevronRight, ChevronLeft, ChevronDown, Loader2, Clock, Calculator, FlaskConical, CircleStop, Strikethrough, History as HistoryIcon, Trash2, Plus } from 'lucide-react';
import { LAB_SECTIONS } from '../qbank/labValues.js';
import { useTheme } from '../components/Themes+Styles.jsx';
import useIsMobile from '../hooks/useIsMobile.js';
import { STEPS, DIFFICULTIES, MODES, BLUEPRINT, labelFor } from '../qbank/blueprint.js';
import { buildPlan, pickTopic, recordResponse, loadMastery, masteryFor, resetProgress, summarizeByStep, predictStep } from '../qbank/mastery.js';
import { saveSession, loadSessions, deleteSession } from '../qbank/history.js';
import { generateQuestion, streamQuestion } from '../qbank/generateQuestion.js';

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const SERIF = 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';
const PREFETCH = 2; // generate this many questions ahead of the user

const pct = (n) => `${Math.round(n * 100)}%`;
const fmtDateTime = (ts) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};

// Axes shown in analytics: systems, tasks, and topics (`topics` is granular +
// generator-tagged). Specialties are still recorded for adaptivity but hidden here.
const DASH_AXES = ['systems', 'tasks', 'topics'];
const AXIS_FIELD = { systems: 'system', specialties: 'specialty', tasks: 'task', topics: 'topic' };
const AXIS_RESULT_TITLE = { systems: 'By system', specialties: 'By specialty', tasks: 'By task', topics: 'By topic' };
const AXIS_DASH_TITLE = { systems: 'Systems', specialties: 'Specialties', tasks: 'Physician tasks', topics: 'Topics' };
const axisLabel = (step, axis, key) => (axis === 'topics' ? key : labelFor(step, axis, key));
const stepName = (step) => (STEPS.find((s) => s.key === step)?.label || step);

export default function QBankPage() {
  const navigate = useNavigate();
  const { colors: theme } = useTheme();
  const [view, setView] = useState('setup'); // setup | session | results | dashboard | history

  // session config
  const [config, setConfig] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);
  const [reviewing, setReviewing] = useState(false); // viewing a past session (read-only)

  const startSession = (cfg) => { setConfig(cfg); setView('session'); };

  const handleFinish = (r) => {
    saveSession(r);
    setSessionResult(r);
    setReviewing(false);
    setView('results');
  };

  const openPast = (entry) => {
    setSessionResult({ step: entry.step, answers: entry.answers, startedAt: entry.startedAt });
    setReviewing(true);
    setView('results');
  };

  return (
    <div style={{ height: '100dvh', width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: theme.backgroundPrimary }}>
      <Header theme={theme} onBack={() => navigate('/')} view={view} onDashboard={() => setView('dashboard')} onSetup={() => setView('setup')} onHistory={() => setView('history')} />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 96px' }}>
        {view === 'setup' && <Setup theme={theme} onStart={startSession} />}
        {view === 'session' && config && (
          <Session theme={theme} config={config} onFinish={handleFinish} />
        )}
        {view === 'results' && sessionResult && (
          <Results theme={theme} result={sessionResult} reviewing={reviewing} onNew={() => setView('setup')} onDashboard={() => setView('dashboard')} onHistory={() => setView('history')} />
        )}
        {view === 'dashboard' && <Dashboard theme={theme} onNew={() => setView('setup')} />}
        {view === 'history' && <History theme={theme} onOpen={openPast} onNew={() => setView('setup')} />}
      </main>
    </div>
  );
}

/* ----------------------------- shared bits ----------------------------- */
const eyebrow = (theme) => ({ textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11, fontWeight: 600, color: `${theme.textSecondary}99`, fontFamily: SANS, margin: 0 });

const Header = ({ theme, onBack, view, onDashboard, onSetup, onHistory }) => {
  const isMobile = useIsMobile(560); // collapse labels to icons on small screens
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '12px 14px' : '14px 24px', background: `${theme.backgroundPrimary}CC`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${theme.textSecondary}1A` }}>
      {/* left section (flex:1 so the title stays exactly centered) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start' }}>
        <button onClick={onBack} aria-label="Back to Astra" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 8px', margin: '-6px -8px', border: 'none', background: 'transparent', color: `${theme.textSecondary}C0`, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, fontFamily: SANS }}>
          <ArrowLeft size={16} />{!isMobile && ' Astra'}
        </button>
      </div>
      <span style={{ flex: '0 0 auto', fontFamily: SERIF, fontSize: 17, color: theme.textPrimary, letterSpacing: '-0.01em' }}>QBank</span>
      {/* right section (flex:1, mirrors the left) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <NavBtn theme={theme} active={view === 'setup'} onClick={onSetup} icon={<Plus size={14} />} label="New" compact={isMobile} />
        <NavBtn theme={theme} active={view === 'history'} onClick={onHistory} icon={<HistoryIcon size={14} />} label="History" compact={isMobile} />
        <NavBtn theme={theme} active={view === 'dashboard'} onClick={onDashboard} icon={<BarChart3 size={14} />} label="Progress" compact={isMobile} />
      </div>
    </header>
  );
};

const NavBtn = ({ theme, active, onClick, icon, label, compact }) => (
  <button onClick={onClick} aria-label={label} title={label} style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 0 : 6, padding: compact ? '8px' : '7px 13px', borderRadius: 999, border: `1px solid ${active ? 'transparent' : `${theme.textSecondary}22`}`, background: active ? theme.accentSoftBlue : 'transparent', color: active ? '#fff' : `${theme.textSecondary}C0`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS, lineHeight: 0 }}>
    {icon}{!compact && <span style={{ lineHeight: 1 }}>{label}</span>}
  </button>
);

const Chip = ({ theme, active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`qbank-chip${active ? ' qbank-chip--active' : ''}`}
    style={{
      '--accent': theme.accentSoftBlue,
      padding: '9px 16px', borderRadius: 999,
      border: `1.5px solid ${active ? theme.accentSoftBlue : `${theme.textSecondary}24`}`,
      background: active ? theme.accentSoftBlue : `${theme.backgroundSurface}E8`,
      color: active ? '#fff' : `${theme.textSecondary}D0`,
      cursor: 'pointer', fontSize: 13.5, fontWeight: active ? 650 : 500, fontFamily: SANS,
      transition: 'border-color .15s ease, color .15s ease, background .15s ease',
    }}
  >{children}</button>
);

/* Custom slider — full control over look (native range inputs are unstylable). */
function Slider({ theme, value, min = 1, max = 40, onChange }) {
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const fill = ((value - min) / (max - min)) * 100;

  const setFromX = (clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onChange(Math.round(min + ratio * (max - min)));
  };
  const down = (e) => { setDrag(true); e.currentTarget.setPointerCapture?.(e.pointerId); setFromX(e.clientX); };
  const move = (e) => { if (drag) setFromX(e.clientX); };
  const up = (e) => { setDrag(false); try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ } };

  return (
    <div
      ref={trackRef}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ position: 'relative', height: 30, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 999, background: `${theme.textSecondary}1F` }} />
      <div style={{ position: 'absolute', left: 0, width: `${fill}%`, height: 6, borderRadius: 999, background: theme.accentSoftBlue }} />
      <div style={{ position: 'absolute', left: `${fill}%`, transform: 'translateX(-50%)', width: drag ? 24 : 20, height: drag ? 24 : 20, borderRadius: '50%', background: theme.accentSoftBlue, border: '4px solid #fff', boxShadow: `0 0 0 1px ${theme.accentSoftBlue}55, 0 2px 6px rgba(15,23,42,0.22)`, transition: 'width .1s ease, height .1s ease' }} />
    </div>
  );
}

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
    <div className="qbank-setup" style={{ paddingTop: 'clamp(36px, 7vw, 72px)', display: 'flex', flexDirection: 'column', gap: 'clamp(32px, 5vw, 48px)' }}>
      <style>{`
        .qbank-setup button { -webkit-tap-highlight-color: transparent; outline: none; }
        .qbank-setup button:focus, .qbank-setup button:focus-visible { outline: none; box-shadow: none; }
        .qbank-chip:not(.qbank-chip--active):hover { border-color: var(--accent); }
      `}</style>
      <div style={{ maxWidth: 640 }}>
        <p style={eyebrow(theme)}>New session</p>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.12, color: theme.textPrimary }}>
          Build a set, tuned to you.
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.7, color: `${theme.textSecondary}C0`, fontFamily: SANS }}>
          Questions are generated live and weighted toward your weak areas. Pick a test, narrow by topic if you want, and choose how many.
        </p>
      </div>

      {/* Step */}
      <Section theme={theme} label="Exam">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {STEPS.map((s) => {
            const sel = step === s.key;
            return (
              <button key={s.key} onClick={() => setStep(s.key)} style={{ textAlign: 'left', padding: 18, borderRadius: 16, cursor: 'pointer', border: `1.5px solid ${sel ? theme.accentSoftBlue : `${theme.textSecondary}22`}`, background: sel ? theme.accentSoftBlue : `${theme.backgroundSurface}E8`, display: 'flex', flexDirection: 'column', gap: 6, transition: 'border-color .15s ease, background .15s ease' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: sel ? '#fff' : theme.textPrimary, fontFamily: SANS }}>{s.label}</span>
                <span style={{ fontSize: 12.5, color: sel ? 'rgba(255,255,255,0.82)' : `${theme.textSecondary}A0`, fontFamily: SANS }}>{s.blurb}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Topic */}
      <Section theme={theme} label="Topics" hint={systems.length ? `${systems.length} selected` : 'Leave empty for the full blueprint'}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bp.systems.map((s) => <Chip key={s.key} theme={theme} active={systems.includes(s.key)} onClick={() => toggle(systems, setSystems, s.key)}>{s.label}</Chip>)}
        </div>
      </Section>

      {/* Count */}
      <Section theme={theme} label="Questions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 38, fontWeight: 700, color: theme.accentSoftBlue, fontFamily: SANS, letterSpacing: '-0.02em', lineHeight: 1 }}>{count}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[5, 10, 20, 40].map((n) => <Chip key={n} theme={theme} active={count === n} onClick={() => setCount(n)}>{n}</Chip>)}
            </div>
          </div>
          <Slider theme={theme} value={count} min={1} max={40} onChange={setCount} />
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
const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(h ? m : m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

function Session({ theme, config, onFinish }) {
  const { step, systems, specialties, count, difficulty, mode } = config;
  const timed = mode === 'timed';
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [live, setLive] = useState(null);
  const [picks, setPicks] = useState([]);       // picks[i] = chosen option index | undefined
  const [revealed, setRevealed] = useState([]); // revealed[i] = explanation shown (tutor)
  const [struck, setStruck] = useState(() => new Set()); // crossed-out options, keyed "qIdx-optIdx"
  const [elapsed, setElapsed] = useState(0);
  const [showLabs, setShowLabs] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const cells = useRef([]);
  const usedTopics = useRef([]);
  const recorded = useRef(new Set());
  const qStart = useRef(Date.now());
  const startedAt = useRef(Date.now()); // when this set began (for history title)
  const inflight = useRef(new Set());
  const indexRef = useRef(0);

  // timer: counts up (tutor) or down from ~90s/question (timed)
  const budget = count * 90;
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = budget - elapsed;

  const cellFor = useCallback((i) => {
    if (cells.current[i]) return cells.current[i];
    const cell = buildPlan({ step, count: 1, systems, specialties })[0];
    cell.difficulty = difficulty === 'mixed' ? ['medium', 'hard', 'hard'][Math.floor(Math.random() * 3)] : difficulty;
    cell.step = step;
    cell.topic = pickTopic(step, cell.system, usedTopics.current);
    usedTopics.current.push(cell.topic);
    cells.current[i] = cell;
    return cell;
  }, [step, systems, specialties, difficulty]);

  const ensure = useCallback((i, isCurrent = false) => {
    if (i >= count || inflight.current.has(i) || items[i]) return;
    inflight.current.add(i);
    const cell = cellFor(i);
    const store = (q) => setItems((prev) => { if (prev[i]) return prev; const next = [...prev]; next[i] = q; return next; });
    const clearLive = () => { if (isCurrent) setLive((cur) => (i === indexRef.current ? null : cur)); };
    const onPartial = isCurrent ? (p) => { if (i === indexRef.current) setLive(p); } : undefined;
    streamQuestion(cell, { onPartial })
      .then((q) => { store(q); clearLive(); })
      .catch(() => generateQuestion(cell).then(store).catch(() => {}).finally(clearLive))
      .finally(() => inflight.current.delete(i));
  }, [count, items, cellFor]);

  useEffect(() => {
    indexRef.current = index;
    qStart.current = Date.now();
    if (!items[index]) ensure(index, true);
    for (let i = index + 1; i <= Math.min(count - 1, index + PREFETCH); i++) ensure(i, false);
  }, [index, items, ensure, count]);

  const final = items[index];
  const current = final || live;
  const interactive = !!final;
  const pick = picks[index];
  const isRevealed = !!revealed[index];

  const setPick = (optIdx) => {
    if (!interactive || isRevealed) return;
    setPicks((p) => { const n = [...p]; n[index] = optIdx; return n; });
  };

  const isStruck = (optIdx) => struck.has(`${index}-${optIdx}`);
  const toggleStrike = (optIdx) => {
    if (!interactive || isRevealed) return;
    const key = `${index}-${optIdx}`;
    setStruck((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
    if (pick === optIdx) setPicks((p) => { const n = [...p]; n[index] = undefined; return n; }); // crossing out clears a selection
  };

  const gradeIndex = (i) => {
    if (recorded.current.has(i) || picks[i] == null || !items[i]) return;
    recorded.current.add(i);
    const correct = items[i].options[picks[i]].correct;
    recordResponse(items[i], correct, Date.now() - qStart.current);
  };

  const submit = () => { // tutor: grade & reveal this question
    if (pick == null || !final || isRevealed) return;
    gradeIndex(index);
    setRevealed((r) => { const n = [...r]; n[index] = true; return n; });
  };

  const finish = useCallback(() => {
    const answers = [];
    for (let i = 0; i < count; i++) {
      if (items[i] && picks[i] != null) {
        gradeIndex(i);
        answers.push({ item: items[i], chosen: picks[i], correct: items[i].options[picks[i]].correct });
      }
    }
    onFinish({ step, answers, startedAt: startedAt.current, mode, difficulty });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, items, picks, step, onFinish]);

  // timed mode: auto-finish when the clock runs out
  useEffect(() => { if (timed && remaining <= 0) finish(); }, [timed, remaining, finish]);

  const goPrev = () => { if (index > 0) setIndex(index - 1); };
  const goNext = () => { if (index < count - 1) { setLive(null); setIndex(index + 1); } };
  const onLast = index >= count - 1;

  return (
    <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* toolbar */}
      <div style={{ position: 'sticky', top: 56, zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 14, background: `${theme.backgroundSurface}F4`, border: `1px solid ${theme.textSecondary}12`, boxShadow: '0 4px 18px rgba(15,23,42,0.05)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: SANS, color: timed && remaining < 60 ? '#dc2626' : theme.textPrimary }}>
          <Clock size={15} color={timed && remaining < 60 ? '#dc2626' : `${theme.textSecondary}A0`} />
          {fmtTime(timed ? remaining : elapsed)}
        </span>
        <span style={{ fontSize: 13, color: `${theme.textSecondary}A0`, fontFamily: SANS, fontWeight: 500 }}>{index + 1} <span style={{ opacity: 0.5 }}>/ {count}</span></span>
        <div style={{ display: 'flex', gap: 6 }}>
          <ToolBtn theme={theme} onClick={() => setShowLabs(true)} title="Lab values"><FlaskConical size={15} /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => setShowCalc(true)} title="Calculator"><Calculator size={15} /></ToolBtn>
          <ToolBtn theme={theme} onClick={finish} title="End set"><CircleStop size={15} /></ToolBtn>
        </div>
      </div>

      {/* progress */}
      <div style={{ height: 4, borderRadius: 2, background: `${theme.textSecondary}14`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct((index + (isRevealed || timed ? 1 : 0)) / count), background: theme.accentSoftBlue, transition: 'width .3s ease' }} />
      </div>

      {!current || !current.vignette ? (
        <Loading theme={theme} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 'clamp(20px, 3vw, 30px)', borderRadius: 22, background: `${theme.backgroundSurface}F2`, border: `1px solid ${theme.textSecondary}10`, boxShadow: '0 6px 26px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[labelFor(step, 'systems', current.system), labelFor(step, 'specialties', current.specialty), labelFor(step, 'tasks', current.task)].map((t, i) => (
              <span key={i} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: `${theme.accentSoftBlue}CC`, background: `${theme.accentSoftBlue}12`, padding: '4px 10px', borderRadius: 999, fontFamily: SANS }}>{t}</span>
            ))}
            {current.topic && isRevealed && (
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: `${theme.textSecondary}A0`, background: `${theme.textSecondary}12`, padding: '4px 10px', borderRadius: 999, fontFamily: SANS }}>{current.topic}</span>
            )}
            {!interactive && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: `${theme.textSecondary}90`, fontFamily: SANS }}>
                <Loader2 size={12} color={theme.accentSoftBlue} style={{ animation: 'spin 1s linear infinite' }} /> generating
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.75, color: theme.textPrimary, fontFamily: SANS, whiteSpace: 'pre-wrap' }}>{current.vignette}</p>
          {current.leadIn && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: theme.textPrimary, fontWeight: 600, fontFamily: SANS }}>{current.leadIn}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {current.options.map((opt, i) => {
              const isPicked = pick === i;
              const showCorrect = isRevealed && opt.correct;
              const showWrong = isRevealed && isPicked && !opt.correct;
              const accent = showCorrect ? (theme.successColor || '#16a34a') : showWrong ? '#dc2626' : theme.accentSoftBlue;
              const border = showCorrect || showWrong ? accent : isPicked ? theme.accentSoftBlue : `${theme.textSecondary}1A`;
              const bg = showCorrect ? `${accent}10` : showWrong ? '#dc262610' : isPicked ? `${theme.accentSoftBlue}0E` : `${theme.backgroundPrimary}`;
              const locked = isRevealed || !interactive;
              const crossed = isStruck(i) && !isRevealed;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 14, border: `1.5px solid ${border}`, background: bg, overflow: 'hidden', opacity: !interactive ? 0.85 : 1, transition: 'border-color .15s ease, background .15s ease' }}>
                  <button onClick={() => { if (!crossed) setPick(i); }} disabled={locked || crossed} style={{ flex: 1, textAlign: 'left', display: 'flex', gap: 13, alignItems: 'flex-start', padding: '15px 17px', border: 'none', background: 'transparent', cursor: locked || crossed ? 'default' : 'pointer', fontFamily: SANS }}>
                    <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, color: isPicked || showCorrect ? '#fff' : `${theme.textSecondary}A0`, background: showCorrect ? accent : showWrong ? '#dc2626' : isPicked ? theme.accentSoftBlue : `${theme.textSecondary}14`, opacity: crossed ? 0.4 : 1 }}>
                      {showCorrect ? <Check size={15} /> : showWrong ? <X size={15} /> : String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                      <span style={{ fontSize: 15.5, lineHeight: 1.45, color: theme.textPrimary, textDecoration: crossed ? 'line-through' : 'none', opacity: crossed ? 0.5 : 1 }}>{opt.text}</span>
                      {isRevealed && mode === 'tutor' && opt.rationale && (
                        <span style={{ fontSize: 13.5, lineHeight: 1.6, color: opt.correct ? `${theme.successColor || '#16a34a'}` : `${theme.textSecondary}B0`, fontWeight: opt.correct ? 600 : 400 }}>{opt.rationale}</span>
                      )}
                    </span>
                  </button>
                  {!locked && (
                    <button onClick={() => toggleStrike(i)} title={crossed ? 'Restore option' : 'Cross out option'} style={{ flexShrink: 0, width: 42, border: 'none', borderLeft: `1px solid ${theme.textSecondary}12`, background: 'transparent', cursor: 'pointer', color: crossed ? theme.accentSoftBlue : `${theme.textSecondary}70`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Strikethrough size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isRevealed && mode === 'tutor' && current.teachingPoint && (
            <div style={{ padding: 18, borderRadius: 16, background: `${theme.accentSoftBlue}0C`, border: `1px solid ${theme.accentSoftBlue}22` }}>
              <p style={{ ...eyebrow(theme), color: `${theme.accentSoftBlue}CC`, marginBottom: 8 }}>Explanation</p>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: theme.textPrimary, fontFamily: SANS }}>{current.teachingPoint}</p>
            </div>
          )}
        </div>
      )}

      {/* nav bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button onClick={goPrev} disabled={index === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 999, border: `1px solid ${theme.textSecondary}1F`, background: 'transparent', color: index === 0 ? `${theme.textSecondary}50` : theme.textPrimary, cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: SANS }}>
          <ChevronLeft size={17} /> Prev
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {!timed && !isRevealed && (
            <PrimaryBtn theme={theme} disabled={pick == null || !interactive} onClick={submit}>Submit</PrimaryBtn>
          )}
          {onLast ? (
            <PrimaryBtn theme={theme} onClick={finish}>End set <CircleStop size={15} /></PrimaryBtn>
          ) : (
            <button onClick={goNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 999, border: 'none', background: (!timed && !isRevealed) ? `${theme.textSecondary}16` : theme.accentSoftBlue, color: (!timed && !isRevealed) ? theme.textPrimary : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: SANS }}>
              Next <ChevronRight size={17} />
            </button>
          )}
        </div>
      </div>

      {showLabs && <LabValuesModal theme={theme} onClose={() => setShowLabs(false)} />}
      {showCalc && <CalculatorModal theme={theme} onClose={() => setShowCalc(false)} />}
    </div>
  );
}

const ToolBtn = ({ theme, onClick, title, children }) => (
  <button onClick={onClick} title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.textSecondary}18`, background: `${theme.backgroundPrimary}`, color: theme.textSecondary, cursor: 'pointer' }}>{children}</button>
);

/* ----------------------- lab values + calculator ---------------------- */
function LabValuesModal({ theme, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '86vh', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: theme.backgroundPrimary, border: `1px solid ${theme.textSecondary}14`, boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.textSecondary}12` }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: theme.textPrimary, fontFamily: SANS }}><FlaskConical size={17} color={theme.accentSoftBlue} /> Lab Values</span>
          <CloseBtn theme={theme} onClose={onClose} />
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 20px 20px' }}>
          {LAB_SECTIONS.map((g) => (
            <div key={g.group} style={{ marginTop: 16 }}>
              <p style={{ ...eyebrow(theme), color: `${theme.accentSoftBlue}CC`, margin: '0 0 8px' }}>{g.group}</p>
              {g.subs.map((sub, si) => (
                <div key={si} style={{ marginBottom: 10 }}>
                  {sub.title && <p style={{ margin: '6px 0 4px', fontSize: 12, fontWeight: 600, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>{sub.title}</p>}
                  {sub.rows.map(([name, val], ri) => (
                    <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '5px 0', borderBottom: `1px solid ${theme.textSecondary}0A` }}>
                      <span style={{ fontSize: 13.5, color: theme.textPrimary, fontFamily: SANS }}>{name}</span>
                      <span style={{ fontSize: 13, color: `${theme.textSecondary}C0`, fontFamily: SANS, fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>{val}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

function CalculatorModal({ theme, onClose }) {
  const [expr, setExpr] = useState('');
  const [out, setOut] = useState('0');
  const press = (k) => {
    if (k === 'C') { setExpr(''); setOut('0'); return; }
    if (k === '⌫') { setExpr((e) => e.slice(0, -1)); return; }
    if (k === '=') {
      try {
        const safe = expr.replace(/[^0-9+\-*/().%\s]/g, '');
        // eslint-disable-next-line no-new-func
        const r = Function(`"use strict";return (${safe.replace(/%/g, '/100')})`)();
        setOut(Number.isFinite(r) ? String(+parseFloat(r.toFixed(8))) : 'Error');
      } catch { setOut('Error'); }
      return;
    }
    setExpr((e) => e + k);
  };
  const keys = ['C', '(', ')', '⌫', '7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+'];
  return (
    <Overlay onClose={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 300, borderRadius: 22, overflow: 'hidden', background: theme.backgroundPrimary, border: `1px solid ${theme.textSecondary}14`, boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${theme.textSecondary}12` }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: theme.textPrimary, fontFamily: SANS }}><Calculator size={16} color={theme.accentSoftBlue} /> Calculator</span>
          <CloseBtn theme={theme} onClose={onClose} />
        </div>
        <div style={{ padding: '14px 16px', textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: `${theme.textSecondary}90`, fontFamily: SANS, minHeight: 18, wordBreak: 'break-all' }}>{expr || ' '}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: theme.textPrimary, fontFamily: SANS, fontVariantNumeric: 'tabular-nums' }}>{out}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 16px 18px' }}>
          {keys.map((k) => {
            const op = ['/', '*', '-', '+', '=', '%'].includes(k);
            const act = ['C', '⌫'].includes(k);
            return (
              <button key={k} onClick={() => press(k)} style={{ padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 17, fontWeight: 600, fontFamily: SANS, color: op ? '#fff' : act ? '#dc2626' : theme.textPrimary, background: op ? theme.accentSoftBlue : `${theme.textSecondary}12` }}>{k}</button>
            );
          })}
          <button onClick={() => press('=')} style={{ gridColumn: '1 / -1', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 17, fontWeight: 700, fontFamily: SANS, color: '#fff', background: theme.accentSoftBlue }}>=</button>
        </div>
      </div>
    </Overlay>
  );
}

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(11,15,21,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</div>
);
const CloseBtn = ({ theme, onClose }) => (
  <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: `${theme.textSecondary}16`, color: theme.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
);

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
function Results({ theme, result, onNew, onDashboard, onHistory, reviewing }) {
  const { answers, step } = result;
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const [showReview, setShowReview] = useState(!!reviewing);

  if (total === 0) {
    return (
      <div style={{ paddingTop: 'clamp(36px, 7vw, 72px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p style={eyebrow(theme)}>Session ended</p>
          <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 400, letterSpacing: '-0.03em', color: theme.textPrimary }}>No questions answered</h1>
          <p style={{ margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.6, color: `${theme.textSecondary}C0`, fontFamily: SANS, maxWidth: 520 }}>You ended this set before answering anything, so there's nothing to score. Start a fresh set whenever you're ready.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PrimaryBtn theme={theme} onClick={onNew}>New session</PrimaryBtn>
          <button onClick={onDashboard} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, border: `1px solid ${theme.textSecondary}22`, background: 'transparent', color: theme.textPrimary, cursor: 'pointer', fontSize: 14.5, fontWeight: 600, fontFamily: SANS }}><BarChart3 size={16} /> View progress</button>
        </div>
      </div>
    );
  }

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
        <p style={eyebrow(theme)}>{reviewing ? `${stepName(step)} · ${fmtDateTime(result.startedAt)}` : 'Session complete'}</p>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 'clamp(34px, 6vw, 56px)', fontWeight: 400, letterSpacing: '-0.03em', color: theme.textPrimary }}>
          {correct}/{total} <span style={{ color: `${theme.textSecondary}80` }}>· {pct(correct / total)}</span>
        </h1>
      </div>

      {DASH_AXES.map((axis) => (
        <div key={axis} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={eyebrow(theme)}>{AXIS_RESULT_TITLE[axis]} (this session)</p>
          {byAxis(axis).map((row) => <AccuracyRow key={row.key} theme={theme} label={row.label} c={row.c} n={row.n} />)}
        </div>
      ))}

      {/* per-question review: vignette, your answer, the key, explanations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={() => setShowReview((v) => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: SANS }}>
          <p style={eyebrow(theme)}>Review questions ({total})</p>
          <ChevronDown size={18} color={`${theme.textSecondary}90`} style={{ transform: showReview ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
        </button>
        {showReview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {answers.map((a, i) => <ReviewQuestion key={i} theme={theme} n={i + 1} step={step} item={a.item} chosen={a.chosen} />)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PrimaryBtn theme={theme} onClick={onNew}>New session</PrimaryBtn>
        {reviewing && onHistory && (
          <button onClick={onHistory} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, border: `1px solid ${theme.textSecondary}22`, background: 'transparent', color: theme.textPrimary, cursor: 'pointer', fontSize: 14.5, fontWeight: 600, fontFamily: SANS }}><HistoryIcon size={16} /> Back to history</button>
        )}
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

/* --------------------- read-only question review ---------------------- */
const ReviewQuestion = ({ theme, n, step, item, chosen }) => {
  const answered = chosen != null;
  const gotIt = answered && item.options[chosen]?.correct;
  const tags = [labelFor(step, 'systems', item.system), labelFor(step, 'specialties', item.specialty), labelFor(step, 'tasks', item.task)];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'clamp(18px, 3vw, 26px)', borderRadius: 20, background: `${theme.backgroundSurface}F2`, border: `1px solid ${theme.textSecondary}10` }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, fontFamily: SANS }}>Q{n}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: !answered ? `${theme.textSecondary}90` : gotIt ? (theme.successColor || '#16a34a') : '#dc2626', background: !answered ? `${theme.textSecondary}12` : gotIt ? `${theme.successColor || '#16a34a'}16` : '#dc262616', padding: '3px 9px', borderRadius: 999, fontFamily: SANS }}>
          {!answered ? 'Skipped' : gotIt ? <><Check size={11} /> Correct</> : <><X size={11} /> Incorrect</>}
        </span>
        {tags.map((t, i) => <span key={i} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: `${theme.accentSoftBlue}CC`, background: `${theme.accentSoftBlue}12`, padding: '4px 10px', borderRadius: 999, fontFamily: SANS }}>{t}</span>)}
        {item.topic && <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: `${theme.textSecondary}A0`, background: `${theme.textSecondary}12`, padding: '4px 10px', borderRadius: 999, fontFamily: SANS }}>{item.topic}</span>}
      </div>

      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: theme.textPrimary, fontFamily: SANS, whiteSpace: 'pre-wrap' }}>{item.vignette}</p>
      {item.leadIn && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: theme.textPrimary, fontWeight: 600, fontFamily: SANS }}>{item.leadIn}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {item.options.map((opt, i) => {
          const isPicked = chosen === i;
          const showCorrect = opt.correct;
          const showWrong = isPicked && !opt.correct;
          const accent = showCorrect ? (theme.successColor || '#16a34a') : showWrong ? '#dc2626' : theme.accentSoftBlue;
          const border = showCorrect || showWrong ? accent : `${theme.textSecondary}1A`;
          const bg = showCorrect ? `${accent}10` : showWrong ? '#dc262610' : theme.backgroundPrimary;
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 15px', borderRadius: 13, border: `1.5px solid ${border}`, background: bg, fontFamily: SANS }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: showCorrect || isPicked ? '#fff' : `${theme.textSecondary}A0`, background: showCorrect ? accent : showWrong ? '#dc2626' : `${theme.textSecondary}14` }}>
                {showCorrect ? <Check size={14} /> : showWrong ? <X size={14} /> : String.fromCharCode(65 + i)}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 1 }}>
                <span style={{ fontSize: 15, lineHeight: 1.45, color: theme.textPrimary }}>{opt.text}{isPicked && <span style={{ color: `${theme.textSecondary}90`, fontSize: 12.5, fontWeight: 600 }}> · your answer</span>}</span>
                {opt.rationale && <span style={{ fontSize: 13, lineHeight: 1.6, color: opt.correct ? (theme.successColor || '#16a34a') : `${theme.textSecondary}B0`, fontWeight: opt.correct ? 600 : 400 }}>{opt.rationale}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {item.teachingPoint && (
        <div style={{ padding: 16, borderRadius: 14, background: `${theme.accentSoftBlue}0C`, border: `1px solid ${theme.accentSoftBlue}22` }}>
          <p style={{ ...eyebrow(theme), color: `${theme.accentSoftBlue}CC`, marginBottom: 7 }}>Explanation</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: theme.textPrimary, fontFamily: SANS }}>{item.teachingPoint}</p>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ history ------------------------------- */
function History({ theme, onOpen, onNew }) {
  const [sessions, setSessions] = useState(() => loadSessions());
  const remove = (id, e) => { e.stopPropagation(); deleteSession(id); setSessions(loadSessions()); };

  return (
    <div style={{ paddingTop: 'clamp(36px, 7vw, 72px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <p style={eyebrow(theme)}>History</p>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 400, letterSpacing: '-0.03em', color: theme.textPrimary }}>Past sets</h1>
      </div>

      {!sessions.length ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: `${theme.textSecondary}A0`, fontFamily: SANS, fontSize: 15 }}>
          <p style={{ margin: '0 0 18px' }}>No completed sets yet. Finish a session and it’ll show up here.</p>
          <PrimaryBtn theme={theme} onClick={onNew}>Start a set</PrimaryBtn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map((s) => {
            const acc = s.total ? s.correct / s.total : 0;
            const color = acc >= 0.75 ? (theme.successColor || '#16a34a') : acc >= 0.5 ? theme.accentSoftBlue : '#dc2626';
            return (
              <button key={s.id} onClick={() => onOpen(s)} style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', padding: '16px 18px', borderRadius: 16, border: `1px solid ${theme.textSecondary}16`, background: `${theme.backgroundSurface}E8`, cursor: 'pointer', fontFamily: SANS, transition: 'border-color .15s ease' }}>
                <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${color}14`, color }}>
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct(acc)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600, color: theme.textPrimary }}>{fmtDateTime(s.startedAt)}</div>
                  <div style={{ fontSize: 12.5, color: `${theme.textSecondary}A0`, marginTop: 3 }}>
                    {stepName(s.step)} · {s.correct}/{s.total} correct{s.mode ? ` · ${s.mode}` : ''}
                  </div>
                </div>
                <span onClick={(e) => remove(s.id, e)} title="Delete" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, color: `${theme.textSecondary}70` }}>
                  <Trash2 size={15} />
                </span>
                <ChevronRight size={18} color={`${theme.textSecondary}60`} style={{ flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
              {DASH_AXES.map((axis) => {
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
