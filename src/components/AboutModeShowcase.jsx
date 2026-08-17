import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  Check,
  CornerDownRight,
  FileText,
  GraduationCap,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import DifferentialDiagnosisView from './DifferentialDiagnosisView.jsx';
import ClinicalSectionsView from './ClinicalSectionsView.jsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SERIF = 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

// Assistant answers render as markdown through Tailwind Typography, and citations
// render as source pills (favicon + journal name), not bare superscripts — so the
// sample reproduces that markup rather than inventing its own.
// Captured from a real Research answer and abridged. Citations, pill grouping and
// the callout/table structure are what the app actually produced.
const RESEARCH_CITATIONS = {
  1: { journal: 'ACC', host: 'jacc.org', url: 'https://www.jacc.org/doi/10.1016/j.jacc.2023.10.021',
       title: '2023 Atrial Fibrillation Guideline-at-a-Glance', year: '2023' },
  2: { journal: 'AHA Journals', host: 'ahajournals.org', url: 'https://www.ahajournals.org/doi/full/10.1161/CIR.0000000000001193',
       title: '2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation', year: '2023' },
};

const faviconFor = (host) => `https://www.google.com/s2/favicons?sz=128&domain=${host}`;

// The panel body scrolls and is masked, so an absolutely positioned card would be
// clipped by it. Portal the card to <body> and place it with fixed coordinates.
const CitePill = ({ nums, theme, isDark }) => {
  const list = nums.map((n) => RESEARCH_CITATIONS[n]).filter(Boolean);
  const ref = useRef(null);
  const hideTimer = useRef(null);
  const [rect, setRect] = useState(null);

  const show = useCallback(() => {
    clearTimeout(hideTimer.current);
    const r = ref.current?.getBoundingClientRect();
    if (r) setRect(r);
  }, []);

  // Delay the close so the pointer can cross the gap into the card without it
  // vanishing; the card itself cancels the timer on enter.
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRect(null), 160);
  }, []);

  if (list.length === 0) return null;

  const lead = list[0];
  const extra = list.length - 1;

  return (
    <span className="ams-cite-wrap" ref={ref} onMouseEnter={show} onMouseLeave={scheduleHide} onFocus={show} onBlur={scheduleHide}>
      <a className="cite-btn" href={lead.url} target="_blank" rel="noopener noreferrer">
        <img className="cite-btn-favicon" src={faviconFor(lead.host)} alt="" loading="lazy" />
        <span className="cite-btn-label">{lead.journal}</span>
        {extra > 0 && <span className="cite-btn-count">+{extra}</span>}
      </a>
      {rect && createPortal(
        <span
          className="ams-cite-card"
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          style={{
            left: Math.min(Math.max(rect.left + rect.width / 2, 170), window.innerWidth - 170),
            top: rect.top - 10,
            borderColor: `${theme?.textSecondary || '#5A6169'}2B`,
            background: theme?.backgroundSurface || '#fff',
            boxShadow: isDark ? '0 12px 34px rgba(0,0,0,.45)' : '0 12px 34px rgba(20,28,38,.14)',
          }}
        >
          {list.map((c) => (
            <a className="ams-cite-row" key={c.url} href={c.url} target="_blank" rel="noopener noreferrer">
              <img src={faviconFor(c.host)} alt="" />
              <span>
                <span className="ams-cite-card-journal" style={{ color: theme?.textSecondary }}>{c.journal} · {c.year}</span>
                <span className="ams-cite-card-title" style={{ color: theme?.textPrimary }}>{c.title}</span>
              </span>
            </a>
          ))}
        </span>,
        document.body,
      )}
    </span>
  );
};

const makeMdComponents = (theme, isDark) => {
  const pill = (text) =>
    String(text).split(/(\[[\d,\s]+\])/g).filter(Boolean).map((part, i) => {
      const m = part.match(/^\[([\d,\s]+)\]$/);
      if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
      const nums = m[1].split(',').map((x) => x.trim()).filter(Boolean);
      return <CitePill nums={nums} theme={theme} isDark={isDark} key={i} />;
    });

  const withPills = (children) =>
    React.Children.map(children, (child) => (typeof child === 'string' ? pill(child) : child));

  return {
    p: ({ children }) => <p>{withPills(children)}</p>,
    li: ({ children }) => <li>{withPills(children)}</li>,
    td: ({ children }) => <td>{withPills(children)}</td>,
  };
};

const RESEARCH_MARKDOWN = `**Guideline Recommendation**

**Yes.** The **2023 ACC/AHA/ACCP/HRS atrial fibrillation guideline** favors **early rhythm control** in
appropriately selected patients with **recently diagnosed AF — generally within 1 year** — rather than
defaulting to rate control alone [1,2].

> For patients diagnosed with AF within the preceding year, **early rhythm-control therapy can reduce
> cardiovascular hospitalization, stroke, and mortality** (**Class 2a recommendation**).

Rhythm control may involve **antiarrhythmic medication, electrical cardioversion, or catheter ablation**,
while rate-control therapy may still be used concurrently. **First-line catheter ablation carries a Class 1
recommendation** in selected, generally younger patients with symptomatic paroxysmal AF and few
comorbidities [1,2].

| Clinical point | ACC/AHA/ACCP/HRS position |
| --- | --- |
| Recently diagnosed AF, under 1 year | Early rhythm control is reasonable and preferred for outcome reduction |
| Selected symptomatic paroxysmal AF | First-line catheter ablation is recommended |
| Stroke prevention | Anticoagulation follows thromboembolic risk, not apparent maintenance of sinus rhythm |

This is a clear shift from the older rate-versus-rhythm equivalence paradigm toward earlier rhythm
intervention, while preserving shared decision-making based on symptoms, AF duration, and comorbidity
burden [1,2].
`;

const ResearchSample = ({ theme, isDark }) => {
  const components = useMemo(() => makeMdComponents(theme, isDark), [theme, isDark]);
  return (
    <div className={`ams-md markdown-body prose max-w-none ${isDark ? 'prose-invert' : 'prose-neutral'}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {RESEARCH_MARKDOWN}
      </ReactMarkdown>
    </div>
  );
};

/* ------------------------------------------------------------------ Reason */

// The app renders differentials with DifferentialDiagnosisView, so the sample
// feeds that same component rather than imitating it.
const REASON_DIFFERENTIAL = `
1. **Pancreatic head adenocarcinoma** — *Likelihood 55–70%*
   **Supporting**
   – Painless, progressive jaundice with dark urine and acholic stools
   – Unintentional 10-lb weight loss over six weeks
   – Palpable, non-tender distended gallbladder (Courvoisier's sign)
   **Against**
   – No new-onset diabetes or steatorrhea reported
   **Discriminator** — Pancreas-protocol CT showing a hypodense head mass with the double-duct sign.
   **Reasoning** — Courvoisier's sign carries a high positive likelihood ratio for malignant distal biliary
   obstruction, because a chronically scarred gallbladder rarely distends. Combined with painless progressive
   jaundice and constitutional weight loss at 68, pretest probability is high before any imaging.

2. **Distal cholangiocarcinoma** — *Likelihood 10–18%*
   **Supporting**
   – Obstructive LFT pattern with disproportionate alkaline phosphatase
   – Same demographic and presentation as pancreatic head lesions
   **Against**
   – No known PSC or choledochal cyst
   **Discriminator** — MRCP defines stricture level and length; brush cytology at ERCP.
   **Reasoning** — Clinically indistinguishable at the bedside; separation is radiographic and histologic.

3. **Ampullary carcinoma** — *Likelihood 8–12%*
   **Supporting**
   – Presents with painless obstructive jaundice
   – Often intermittent jaundice with occult GI bleeding
   **Against**
   – No melena or iron-deficiency anemia
   **Reasoning** — Materially better resectability than pancreatic head lesions, so worth explicit exclusion.

4. **IgG4-related sclerosing cholangitis** — *Likelihood 3–6%*
   **Supporting**
   – Mimics malignant stricture radiographically
   **Against**
   – No other organ involvement or prior autoimmune disease
   **Discriminator** — Serum IgG4 with characteristic imaging; steroid responsiveness.
   **Reasoning** — Low probability, high consequence: the one entity here treated medically, not resected.

5. **Choledocholithiasis** — *Likelihood 2–5%*
   **Supporting**
   – Common cause of obstructive jaundice overall
   **Against**
   – No biliary colic, RUQ tenderness, fever, or leukocytosis
   – Progressive rather than fluctuating course
   **Reasoning** — Base rates favor stones in unselected jaundice, but the painless course argues against it.
`;

const REASON_STEPS = `## Next Steps
– **Pancreas-protocol CT, abdomen and pelvis** — expect a hypodense head mass with the double-duct sign; also
  stages the disease and defines vascular involvement before any stent is placed.
– **Fractionated bilirubin, ALP, GGT** — confirms a cholestatic rather than hepatocellular pattern and sets a
  baseline to judge response against.
– **CA 19-9 with concurrent bilirubin** — only interpretable once obstruction is relieved; elevated levels in
  cholestasis alone are common.
– **EUS with FNA** — tissue diagnosis if CT shows a mass, and the highest-yield modality under 2 cm.
`;

const ReasonSample = ({ theme, isDark }) => (
  <>
    <p className="ams-answer">
      Painless obstructive jaundice with weight loss and a palpable, non-tender gallbladder is
      <strong> malignant distal biliary obstruction until proven otherwise</strong>.
    </p>
    <div className="ams-live">
      <DifferentialDiagnosisView
        content={REASON_DIFFERENTIAL}
        theme={theme}
        isDark={isDark}
        isStreaming={false}
        citations={[]}
        isMobile={false}
      />
      <div style={{ marginTop: 22 }}>
        <ClinicalSectionsView
          markdown={REASON_STEPS}
          theme={theme}
          isDark={isDark}
          citations={[]}
          isMobile={false}
          renderMarkdown={(body) => <p className="ams-answer">{body}</p>}
        />
      </div>
    </div>
  </>
);

/* ------------------------------------------------------------------- Write */

// Mirrors the real A&P the app emits: ICD-10 on every problem title, en-dash
// action lines, landmark trials in parentheses, General block last.
const NOTE_PROBLEMS = [
  {
    title: 'HFrEF (I50.23)',
    qualifier: 'volume overload',
    actions: [
      'Furosemide 80 mg IV now, then 40 mg IV q8h; strict I/O, daily weights',
      'Start sacubitril/valsartan low dose if BP allows (PARADIGM-HF)',
      'Add dapagliflozin 10 mg daily if renal function permits (DAPA-HF, EMPEROR-Reduced)',
      'Consider spironolactone 12.5–25 mg daily if K⁺ ≤5.0 and eGFR ≥30 (RALES)',
      'TTE to reassess EF/valves/RV; cardiology consult',
    ],
  },
  {
    title: 'AF with RVR (I48.91)',
    qualifier: 'stable',
    actions: [
      'Metoprolol tartrate 5 mg IV q5–10 min ×3 PRN HR >110, then PO transition',
      'Anticoagulate with apixaban unless contraindicated (ARISTOTLE)',
      'Rate control strategy favored given HFrEF and stability (AFFIRM)',
      'CHA₂DS₂-VASc 5 (CHF, HTN, age 65–74, DM)',
    ],
  },
  {
    title: 'CKD3 (N18.30)',
    qualifier: 'avoid AKI',
    actions: [
      'Avoid nephrotoxins; renally dose meds',
      'BMP q12–24 h while diuresing',
    ],
  },
  {
    title: 'General',
    qualifier: '',
    actions: [
      'DVT ppx: SQ heparin',
      'Diet: 2 g Na; fluid restrict 1.5 L/day',
      'Dispo: telemetry; HF disease management referral on discharge',
    ],
  },
];

const WriteSample = () => (
  <div className="ams-note">
    <div className="ams-note-block">
      <span className="ams-note-head">Assessment</span>
      <p>68M with acute decompensated HFrEF (EF 25%) and AF with RVR; comorbid T2DM and CKD3.</p>
    </div>

    <div className="ams-note-block">
      <span className="ams-note-head">Plan</span>
      <div className="ams-problems">
        {NOTE_PROBLEMS.map((problem) => (
          <div className="ams-problem" key={problem.title}>
            <p className="ams-problem-title">
              <strong>{problem.title}</strong>
              {problem.qualifier && <span> – {problem.qualifier}</span>}
            </p>
            <ul className="ams-problem-actions">
              {problem.actions.map((action) => <li key={action}>{action}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>

    <div className="ams-note-foot">
      <span>ICD-10 coded · problem-linked orders · landmark trials cited</span>
    </div>
  </div>
);

/* ------------------------------------------------------------------ Master */

const QUESTION = {
  stem: 'A 58-year-old man is admitted with community-acquired pneumonia and started on ceftriaxone and azithromycin. On hospital day 3 he develops watery diarrhea, 8 stools per day. Temperature 38.4 °C, WBC 18,400/mm³, creatinine 1.1 mg/dL (baseline 1.0). Stool testing is positive for Clostridioides difficile toxin B by NAAT and toxin EIA.',
  lead: 'Which of the following is the most appropriate next step in management?',
  options: [
    { key: 'A', text: 'Oral vancomycin 125 mg four times daily for 10 days' },
    { key: 'B', text: 'Oral metronidazole 500 mg three times daily for 10 days' },
    { key: 'C', text: 'Intravenous vancomycin 1 g every 12 hours for 10 days' },
    { key: 'D', text: 'Loperamide with continued observation' },
    { key: 'E', text: 'Fecal microbiota transplantation' },
  ],
  answer: 'A',
  explanation: 'This is a first episode of non-fulminant C. difficile infection. Current IDSA/SHEA guidance recommends oral vancomycin or fidaxomicin as first-line therapy; metronidazole is reserved for when neither is available, because it has higher failure rates. Intravenous vancomycin does not reach the colonic lumen and is ineffective. Antimotility agents risk ileus and toxic megacolon. Fecal microbiota transplantation is for recurrent, not initial, disease.',
  distractors: {
    B: 'Metronidazole is now second-line; it underperformed vancomycin in head-to-head trials.',
    C: 'IV vancomycin is not excreted into the colonic lumen in therapeutic amounts.',
    D: 'Antimotility agents alone risk ileus and toxic megacolon in active infection.',
    E: 'FMT is indicated for recurrent disease, not a first episode.',
  },
};

const MASTERY = [
  { area: 'Infectious disease', value: 84 },
  { area: 'Antimicrobial selection', value: 61 },
  { area: 'GI · nosocomial', value: 47 },
];

const MasterSample = () => {
  const [picked, setPicked] = useState(null);
  const answered = picked !== null;

  return (
    <>
      <p className="ams-stem">{QUESTION.stem}</p>
      <p className="ams-lead">{QUESTION.lead}</p>

      <div className="ams-options" role="group" aria-label="Answer choices">
        {QUESTION.options.map((option) => {
          const isAnswer = option.key === QUESTION.answer;
          const isPicked = picked === option.key;
          const state = !answered ? '' : isAnswer ? ' is-correct' : isPicked ? ' is-wrong' : ' is-muted';

          return (
            <button
              type="button"
              className={`ams-option${state}`}
              key={option.key}
              onClick={() => setPicked(option.key)}
              aria-pressed={isPicked}
            >
              <span className="ams-option-key">
                {answered && isAnswer && <Check size={12} strokeWidth={2.6} aria-hidden="true" />}
                {answered && isPicked && !isAnswer && <X size={12} strokeWidth={2.6} aria-hidden="true" />}
                {(!answered || (!isAnswer && !isPicked)) && option.key}
              </span>
              <span className="ams-option-text">
                {option.text}
                {answered && !isAnswer && QUESTION.distractors[option.key] && (
                  <small>{QUESTION.distractors[option.key]}</small>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="ams-explain" role="status">
          <span className="ams-micro-label">
            {picked === QUESTION.answer ? 'Correct' : `Correct answer: ${QUESTION.answer}`}
          </span>
          <p>{QUESTION.explanation}</p>
          <div className="ams-mastery">
            {MASTERY.map((item) => (
              <div className="ams-mastery-row" key={item.area}>
                <span>{item.area}</span>
                <span className="ams-mastery-track">
                  <span className="ams-mastery-fill" style={{ width: `${item.value}%` }} />
                </span>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
          <p className="ams-caveat">
            Mastery updates after every answer, and the next question is drawn from the weakest area.
          </p>
        </div>
      ) : (
        <p className="ams-hint">Choose an answer to see Astra’s explanation.</p>
      )}
    </>
  );
};

/* ------------------------------------------------------------------- Shell */

const MODES = [
  {
    key: 'research',
    label: 'Research',
    Icon: Search,
    prompt: 'Per the ACC/AHA/ACCP/HRS guideline, is early rhythm control preferred over rate control in recently diagnosed AF?',
    meta: 'Research · 2 citations',
    Body: ResearchSample,
  },
  {
    key: 'reason',
    label: 'Reason',
    Icon: Stethoscope,
    prompt: '68-year-old woman, two weeks of painless jaundice, 10-lb weight loss, palpable gallbladder.',
    meta: 'Reason · ranked differential',
    Body: ReasonSample,
  },
  {
    key: 'write',
    label: 'Write',
    Icon: FileText,
    prompt: 'Write an A&P for decompensated HFrEF admitted overnight.',
    meta: 'Write · assessment and plan',
    Body: WriteSample,
  },
  {
    key: 'master',
    label: 'Master',
    Icon: GraduationCap,
    prompt: 'Practice my weakest Step 2 CK areas.',
    meta: 'Master · adaptive QBank',
    Body: MasterSample,
  },
];

// Inside AboutContent the --about-* variables are inherited from .about-page.
// Used standalone (home page) there is no such ancestor, so accept a theme and
// define them locally.
const themeVars = (theme, isDark) => (theme ? {
  '--about-bg': theme.backgroundPrimary,
  '--about-surface': theme.backgroundSurface,
  '--about-text': theme.textPrimary,
  '--about-muted': theme.textSecondary,
  '--about-accent': theme.accentSoftBlue,
  '--about-line': `${theme.textSecondary}1A`,
  '--about-line-strong': `${theme.textSecondary}2B`,
  '--about-soft': isDark ? 'rgba(255,255,255,0.035)' : 'rgba(20,28,38,0.025)',
  '--about-soft-strong': isDark ? 'rgba(255,255,255,0.065)' : 'rgba(20,28,38,0.055)',
  '--about-shadow': isDark ? '0 18px 60px rgba(0,0,0,0.18)' : '0 18px 60px rgba(28,35,45,0.07)',
} : undefined);

const AboutModeShowcase = ({
  compact = false,
  onPromptSelect,
  theme,
  isDark = false,
  activeKey: controlledKey,
  onActiveKeyChange,
}) => {
  const [internalKey, setInternalKey] = useState(MODES[0].key);
  const activeKey = controlledKey ?? internalKey;
  const setActiveKey = useCallback((key) => {
    if (onActiveKeyChange) onActiveKeyChange(key);
    else setInternalKey(key);
  }, [onActiveKeyChange]);
  const tabsRef = useRef(null);
  const active = MODES.find((mode) => mode.key === activeKey) ?? MODES[0];
  const ActiveBody = active.Body;

  const handleTabKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = MODES.findIndex((mode) => mode.key === activeKey);
    const next = (index + (event.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length;
    setActiveKey(MODES[next].key);
    tabsRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  }, [activeKey, setActiveKey]);

  return (
    <div className={`ams${compact ? ' ams--compact' : ''}`} style={themeVars(theme, isDark)} data-reveal>
      <style>{`
        @keyframes ams-body-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }

        .ams {
          --ams-correct: #2f9c6b;
          --ams-wrong: #c4574c;
          margin-top: 46px;
          border: 1px solid var(--about-line-strong);
          border-radius: 24px;
          background: linear-gradient(145deg, var(--about-soft), transparent 66%);
          box-shadow: var(--about-shadow);
          overflow: hidden;
        }

        .ams-tablist {
          display: flex;
          gap: 4px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--about-line);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .ams-tablist::-webkit-scrollbar { display: none; }

        .ams-tab {
          display: inline-flex;
          flex: none;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          border: 1px solid transparent;
          border-radius: 10px;
          color: color-mix(in srgb, var(--about-muted) 76%, transparent);
          background: transparent;
          cursor: pointer;
          font: 600 12.5px/1 ${SANS};
          letter-spacing: -.005em;
          transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease;
        }

        .ams-tab:hover { color: var(--about-text); }

        .ams-tab[aria-selected="true"] {
          color: var(--about-text);
          border-color: var(--about-line-strong);
          background: color-mix(in srgb, var(--about-text) 4%, transparent);
        }

        .ams-tab:focus-visible,
        .ams-option:focus-visible,
        .ams-source:focus-visible {
          outline: 2px solid var(--about-accent);
          outline-offset: 3px;
        }

        .ams-prompt {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: clamp(20px, 3vw, 26px) clamp(20px, 4vw, 34px);
          border-bottom: 1px solid var(--about-line);
        }

        .ams-prompt svg {
          flex: none;
          margin-top: 5px;
          color: color-mix(in srgb, var(--about-muted) 52%, transparent);
        }

        .ams-prompt p {
          margin: 0;
          color: var(--about-text);
          font: 400 clamp(17px, 2.2vw, 20px)/1.4 ${SERIF};
          letter-spacing: -.015em;
          text-wrap: pretty;
        }

        .ams-body {
          padding: clamp(22px, 4vw, 34px);
          animation: ams-body-in 340ms cubic-bezier(.22, 1, .36, 1) both;
        }

        .ams-answer {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 92%, transparent);
          font: 400 15px/1.75 ${SANS};
          text-wrap: pretty;
        }

        .ams-answer strong { color: var(--about-text); font-weight: 620; }

        .ams-cite {
          display: inline-block;
          min-width: 15px;
          margin-left: 2px;
          padding: 1px 4px;
          border-radius: 5px;
          color: var(--about-accent);
          background: color-mix(in srgb, var(--about-accent) 12%, transparent);
          font: 650 9.5px/1.4 ${SANS};
          text-align: center;
          vertical-align: super;
        }

        .ams-findings {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 24px;
        }

        .ams-finding {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 6px;
          padding: 15px;
          border: 1px solid var(--about-line);
          border-radius: 14px;
          background: var(--about-soft);
        }

        .ams-finding-label {
          color: color-mix(in srgb, var(--about-muted) 62%, transparent);
          font: 650 9.5px/1.2 ${SANS};
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .ams-finding-value {
          color: var(--about-text);
          font: 400 25px/1 ${SERIF};
          letter-spacing: -.03em;
        }

        .ams-finding-note {
          color: color-mix(in srgb, var(--about-muted) 70%, transparent);
          font: 400 11.5px/1.55 ${SANS};
        }

        .ams-caveat {
          margin: 22px 0 0;
          color: color-mix(in srgb, var(--about-muted) 66%, transparent);
          font: 400 12.5px/1.65 ${SANS};
        }

        .ams-sources {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid var(--about-line);
        }

        .ams-source {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 12px;
          border: 1px solid var(--about-line);
          border-radius: 12px;
          color: inherit;
          text-decoration: none;
          transition: border-color 160ms ease;
        }

        .ams-source:hover { border-color: var(--about-line-strong); }

        .ams-source-n {
          display: grid;
          width: 17px;
          height: 17px;
          flex: none;
          place-items: center;
          border-radius: 5px;
          color: var(--about-accent);
          background: color-mix(in srgb, var(--about-accent) 12%, transparent);
          font: 650 9.5px/1 ${SANS};
        }

        .ams-source-body { display: flex; min-width: 0; flex-direction: column; gap: 3px; }

        .ams-source-body strong {
          color: var(--about-text);
          font: 560 12px/1.35 ${SANS};
          letter-spacing: -.008em;
        }

        .ams-source-body small {
          color: color-mix(in srgb, var(--about-muted) 62%, transparent);
          font: 400 10.5px/1.3 ${SANS};
        }

        .ams-source svg { flex: none; margin: 2px 0 0 auto; color: color-mix(in srgb, var(--about-muted) 52%, transparent); }

        .ams-ddx { display: flex; flex-direction: column; gap: 11px; margin-top: 24px; }

        .ams-ddx-row {
          display: grid;
          grid-template-columns: minmax(0, 250px) minmax(0, 1fr) 88px;
          gap: 14px;
          align-items: center;
        }

        .ams-ddx-name {
          color: var(--about-text);
          font: 520 13px/1.35 ${SANS};
          letter-spacing: -.01em;
        }

        .ams-ddx-track {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--about-soft-strong);
        }

        .ams-ddx-fill {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--about-accent);
        }

        .ams-ddx-row:nth-child(n + 3) .ams-ddx-fill {
          background: color-mix(in srgb, var(--about-accent) 52%, transparent);
        }

        .ams-ddx-row:nth-child(n + 4) .ams-ddx-fill {
          background: color-mix(in srgb, var(--about-muted) 34%, transparent);
        }

        .ams-ddx-band {
          color: color-mix(in srgb, var(--about-muted) 66%, transparent);
          font: 600 10px/1.2 ${SANS};
          letter-spacing: .08em;
          text-align: right;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .ams-micro-label {
          display: block;
          color: color-mix(in srgb, var(--about-muted) 60%, transparent);
          font: 650 9.5px/1.2 ${SANS};
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .ams-split {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 26px;
          padding-top: 22px;
          border-top: 1px solid var(--about-line);
        }

        .ams-split-col ul {
          margin: 12px 0 0;
          padding-left: 16px;
          color: color-mix(in srgb, var(--about-muted) 84%, transparent);
          font: 400 13px/1.7 ${SANS};
        }

        .ams-split-col li { margin-top: 2px; }

        .ams-steps { margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--about-line); }

        .ams-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }

        .ams-chip {
          padding: 7px 11px;
          border: 1px solid var(--about-line);
          border-radius: 8px;
          color: color-mix(in srgb, var(--about-muted) 88%, transparent);
          background: var(--about-soft);
          font: 520 11.5px/1.2 ${SANS};
        }

        .ams-chip--flag {
          color: var(--about-accent);
          border-color: color-mix(in srgb, var(--about-accent) 30%, transparent);
          background: color-mix(in srgb, var(--about-accent) 8%, transparent);
        }

        .ams-prompt--action {
          width: 100%;
          border-left: 0;
          border-right: 0;
          border-top: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font: inherit;
          text-align: left;
          transition: background-color 160ms ease;
        }

        .ams-prompt--action:hover { background: color-mix(in srgb, var(--about-text) 3%, transparent); }
        .ams-prompt--action:focus-visible { outline: 2px solid var(--about-accent); outline-offset: -2px; }

        .ams-prompt--action p { flex: 1; min-width: 0; }

        .ams-problems { display: flex; flex-direction: column; gap: 16px; }

        .ams-problem-title {
          margin: 0 0 6px;
          color: var(--about-text);
          font: 400 13.5px/1.4 ${SANS};
        }

        .ams-problem-title strong { font-weight: 660; }

        .ams-problem-title span { color: color-mix(in srgb, var(--about-muted) 78%, transparent); }

        .ams-problem-actions {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ams-problem-actions li {
          position: relative;
          padding-left: 15px;
          color: color-mix(in srgb, var(--about-muted) 90%, transparent);
          font: 400 13px/1.6 ${SANS};
        }

        .ams-problem-actions li::before {
          content: '–';
          position: absolute;
          left: 0;
          color: color-mix(in srgb, var(--about-muted) 55%, transparent);
        }

        /* Compact: embedded on the home page under the input bar */
        .ams--compact { margin-top: 0; border-radius: 16px; }
        .ams--compact .ams-tablist { padding: 7px 8px; }
        .ams--compact .ams-tab { padding: 7px 11px; font-size: 11.5px; gap: 6px; }
        .ams--compact .ams-prompt { padding: 13px 16px; gap: 9px; }
        .ams--compact .ams-prompt p { font-size: 15px; }
        .ams--compact .ams-prompt svg { margin-top: 3px; }
        .ams--compact .ams-body {
          padding: 16px;
          max-height: 320px;
          overflow-y: auto;
          scrollbar-width: thin;
          -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 26px), transparent);
          mask-image: linear-gradient(to bottom, black calc(100% - 26px), transparent);
        }
        .ams--compact .ams-answer, .ams--compact .ams-stem { font-size: 13px; line-height: 1.65; }
        .ams--compact .ams-finding-value { font-size: 21px; }
        .ams--compact .ams-findings, .ams--compact .ams-sources { gap: 8px; margin-top: 16px; }
        .ams--compact .ams-finding { padding: 11px; }
        .ams--compact .ams-note { gap: 16px; }
        .ams--compact .ams-problems { gap: 12px; }
        .ams--compact .ams-foot { padding: 10px 16px; font-size: 9.5px; }
        .ams--compact .ams-ddx { margin-top: 16px; gap: 8px; }
        .ams--compact .ams-split, .ams--compact .ams-steps { margin-top: 18px; padding-top: 16px; }
        .ams--compact .ams-options { gap: 5px; margin-top: 14px; }
        .ams--compact .ams-option { padding: 10px 12px; }

        /* Markdown answer: match the panel's type scale, and keep tables readable
           inside the narrow compact body. */
        .ams .ams-md { color: var(--about-text); font-size: 13.5px; line-height: 1.68; }
        .ams .ams-md > :first-child { margin-top: 0; }
        .ams .ams-md h2 {
          margin: 22px 0 8px;
          color: var(--about-text);
          font: 600 15px/1.35 ${SANS};
          letter-spacing: -.012em;
        }
        .ams .ams-md h2:first-child { margin-top: 0; }
        .ams .ams-md p, .ams-md li {
          color: color-mix(in srgb, var(--about-muted) 92%, transparent);
          font-size: 13.5px;
          line-height: 1.68;
        }
        .ams .ams-md p { margin: 0 0 10px; }
        .ams .ams-md ul { margin: 0 0 10px; padding-left: 16px; }
        .ams .ams-md li { margin: 0 0 5px; }
        .ams .ams-md strong { color: var(--about-text); font-weight: 640; }

        /* Table + callout copied from the values the app actually computes, so the
           sample matches a real answer on the About page too (where the app's own
           markdown styles are not mounted). */
        .ams .ams-md table {
          display: table;
          width: 100%;
          margin: 14px 0 16px;
          border: 1px solid var(--about-line);
          border-radius: 10px;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
          font-size: 12.5px;
        }
        .ams .ams-md thead th {
          padding: 10px 14px;
          border-bottom: 1px solid var(--about-line);
          background: color-mix(in srgb, var(--about-accent) 8%, transparent);
          color: color-mix(in srgb, var(--about-muted) 82%, transparent);
          font: 600 10px/1.3 ${SANS};
          letter-spacing: .1em;
          text-align: left;
          text-transform: uppercase;
        }
        .ams .ams-md tbody td {
          padding: 10px 14px;
          border-top: 1px solid var(--about-line);
          color: color-mix(in srgb, var(--about-muted) 90%, transparent);
          vertical-align: top;
          line-height: 1.55;
        }
        .ams .ams-md tbody tr:first-child td { border-top: 0; }
        .ams .ams-md tbody td:first-child { width: 38%; color: var(--about-text); font-weight: 550; }

        .ams .ams-md blockquote {
          margin: 14px 0;
          padding: 14px 18px;
          border-left: 3px solid var(--about-accent);
          border-radius: 12px;
          background: var(--about-soft);
          quotes: none;
        }
        .ams .ams-md blockquote p { margin: 0; }
        .ams .ams-md blockquote p::before, .ams .ams-md blockquote p::after { content: none; }

        /* Citation pill — same shape as the app's, with a hover card. */
        .ams-cite-wrap { position: relative; display: inline-block; }
        .ams .ams-md .cite-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin: 0 2px;
          padding: 2px 8px 2px 4px;
          border: 1px solid color-mix(in srgb, var(--about-accent) 30%, transparent);
          border-radius: 20px;
          background: color-mix(in srgb, var(--about-accent) 9%, transparent);
          color: var(--about-accent);
          font: 550 11px/1 ${SANS};
          text-decoration: none;
          vertical-align: middle;
          white-space: nowrap;
          transition: background-color .15s ease, border-color .15s ease;
        }
        .ams .ams-md .cite-btn:hover {
          background: color-mix(in srgb, var(--about-accent) 16%, transparent);
          border-color: color-mix(in srgb, var(--about-accent) 48%, transparent);
        }
        .ams .ams-md .cite-btn-favicon { width: 12px; height: 12px; border-radius: 3px; }
        .ams .ams-md .cite-btn-count {
          padding: 1px 5px;
          border-radius: 20px;
          background: color-mix(in srgb, var(--about-accent) 18%, transparent);
          font-size: 10px;
          font-weight: 650;
        }

        .ams-cite-card {
          position: fixed;
          z-index: 2147483000;
          display: flex;
          width: max-content;
          max-width: 300px;
          flex-direction: column;
          gap: 3px;
          padding: 10px 12px;
          border: 1px solid;
          border-radius: 10px;
          pointer-events: auto;
          transform: translate(-50%, -100%);
          animation: ams-cite-in 140ms ease both;
        }

        @keyframes ams-cite-in {
          from { opacity: 0; transform: translate(-50%, calc(-100% + 4px)); }
          to { opacity: 1; transform: translate(-50%, -100%); }
        }

        .ams-cite-card-journal {
          color: color-mix(in srgb, var(--about-muted) 66%, transparent);
          font: 650 9px/1.2 ${SANS};
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .ams-cite-card-title { display: block; font: 560 12px/1.4 ${SANS}; }
        /* Invisible bridge over the gap between pill and card. */
        .ams-cite-card::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          height: 12px;
        }
        .ams-cite-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          padding: 2px;
          border-radius: 6px;
          text-decoration: none;
        }
        .ams-cite-row:hover { background: rgba(128,128,128,.12); }
        .ams-cite-row + .ams-cite-row { margin-top: 9px; padding-top: 9px; border-top: 1px solid rgba(128,128,128,.18); }
        .ams-cite-row > img { width: 13px; height: 13px; margin-top: 2px; border-radius: 3px; flex: none; }
        .ams-cite-card-journal { display: block; margin-bottom: 2px; }
        .ams-cite-card-snippet {
          color: color-mix(in srgb, var(--about-muted) 78%, transparent);
          font: 400 11px/1.5 ${SANS};
        }

        .ams-live { margin-top: 20px; }

        .ams-note { display: flex; flex-direction: column; gap: 24px; }

        .ams-note-head {
          display: block;
          margin-bottom: 10px;
          color: color-mix(in srgb, var(--about-muted) 60%, transparent);
          font: 650 9.5px/1.2 ${MONO};
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .ams-note-block p {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 90%, transparent);
          font: 400 14px/1.75 ${SANS};
          text-wrap: pretty;
        }

        .ams-note-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
          margin: 0;
          padding-left: 19px;
          color: color-mix(in srgb, var(--about-muted) 88%, transparent);
          font: 400 13.5px/1.7 ${SANS};
        }

        .ams-note-list strong { color: var(--about-text); font-weight: 620; }

        .ams-note-foot {
          padding-top: 18px;
          border-top: 1px solid var(--about-line);
          color: color-mix(in srgb, var(--about-muted) 60%, transparent);
          font: 400 11.5px/1.5 ${SANS};
        }

        .ams-stem {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 92%, transparent);
          font: 400 14px/1.75 ${SANS};
          text-wrap: pretty;
        }

        .ams-lead {
          margin: 16px 0 0;
          color: var(--about-text);
          font: 560 14px/1.6 ${SANS};
        }

        .ams-options { display: flex; flex-direction: column; gap: 7px; margin-top: 18px; }

        .ams-option {
          display: flex;
          width: 100%;
          align-items: flex-start;
          gap: 11px;
          padding: 12px 14px;
          border: 1px solid var(--about-line);
          border-radius: 12px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          text-align: left;
          transition: border-color 160ms ease, background-color 160ms ease, opacity 160ms ease;
        }

        .ams-option:hover { border-color: var(--about-line-strong); background: var(--about-soft); }

        .ams-option-key {
          display: grid;
          width: 20px;
          height: 20px;
          flex: none;
          place-items: center;
          border: 1px solid var(--about-line-strong);
          border-radius: 6px;
          color: color-mix(in srgb, var(--about-muted) 78%, transparent);
          font: 650 10.5px/1 ${SANS};
        }

        .ams-option-text {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: color-mix(in srgb, var(--about-muted) 92%, transparent);
          font: 400 13px/1.55 ${SANS};
        }

        .ams-option-text small {
          color: color-mix(in srgb, var(--about-muted) 62%, transparent);
          font: 400 11.5px/1.5 ${SANS};
        }

        .ams-option.is-correct {
          border-color: color-mix(in srgb, var(--ams-correct) 46%, transparent);
          background: color-mix(in srgb, var(--ams-correct) 9%, transparent);
        }

        .ams-option.is-correct .ams-option-key {
          color: #fff;
          border-color: transparent;
          background: var(--ams-correct);
        }

        .ams-option.is-correct .ams-option-text { color: var(--about-text); }

        .ams-option.is-wrong {
          border-color: color-mix(in srgb, var(--ams-wrong) 44%, transparent);
          background: color-mix(in srgb, var(--ams-wrong) 8%, transparent);
        }

        .ams-option.is-wrong .ams-option-key {
          color: #fff;
          border-color: transparent;
          background: var(--ams-wrong);
        }

        .ams-option.is-muted { opacity: .62; }

        .ams-hint {
          margin: 16px 0 0;
          color: color-mix(in srgb, var(--about-muted) 58%, transparent);
          font: 400 12px/1.5 ${SANS};
        }

        .ams-explain {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--about-line);
        }

        .ams-explain > p {
          margin: 11px 0 0;
          color: color-mix(in srgb, var(--about-muted) 90%, transparent);
          font: 400 13.5px/1.72 ${SANS};
          text-wrap: pretty;
        }

        .ams-mastery { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }

        .ams-mastery-row {
          display: grid;
          grid-template-columns: minmax(0, 190px) minmax(0, 1fr) 38px;
          gap: 12px;
          align-items: center;
          color: color-mix(in srgb, var(--about-muted) 72%, transparent);
          font: 500 11px/1.2 ${SANS};
        }

        .ams-mastery-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--about-soft-strong);
        }

        .ams-mastery-fill { display: block; height: 100%; border-radius: inherit; background: var(--about-accent); }

        .ams-mastery-row strong { color: var(--about-text); font: 650 11px/1 ${SANS}; text-align: right; }

        .ams-foot {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px clamp(20px, 4vw, 34px);
          border-top: 1px solid var(--about-line);
          color: color-mix(in srgb, var(--about-muted) 58%, transparent);
          font: 500 10.5px/1.4 ${SANS};
        }

        @media (max-width: 820px) {
          .ams-findings, .ams-sources { grid-template-columns: 1fr; }
          .ams-ddx-row { grid-template-columns: minmax(0, 1fr) 76px; }
          .ams-ddx-track { grid-column: 1 / -1; grid-row: 2; }
          .ams-split { grid-template-columns: 1fr; gap: 20px; }
          .ams-mastery-row { grid-template-columns: minmax(0, 1fr) 38px; }
          .ams-mastery-track { grid-column: 1 / -1; grid-row: 2; }
        }

        @media (max-width: 680px) {
          .ams { margin-top: 34px; border-radius: 18px; }
          .ams--compact { margin-top: 0; }
          .ams--compact .ams-tablist { padding: 5px 6px; gap: 2px; }
          .ams--compact .ams-tab { padding: 7px 9px; font-size: 11px; gap: 5px; }
          .ams--compact .ams-prompt { padding: 11px 13px; gap: 8px; }
          .ams--compact .ams-prompt p { font-size: 14px; }
          .ams--compact .ams-body { padding: 13px; max-height: 260px; }
          .ams--compact .ams-foot { padding: 9px 13px; }
          .ams-tablist { padding: 8px; }
          .ams-tab { padding: 8px 11px; font-size: 12px; }
          .ams-prompt { gap: 9px; }
          .ams-answer, .ams-stem { font-size: 13.5px; }
          .ams-foot { font-size: 10px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ams-body { animation: none; }
        }
      `}</style>

      <div className="ams-tablist" role="tablist" aria-label="Astra modes" ref={tabsRef} onKeyDown={handleTabKeyDown}>
        {MODES.map((mode) => (
          <button
            type="button"
            role="tab"
            key={mode.key}
            id={`ams-tab-${mode.key}`}
            className="ams-tab"
            aria-selected={mode.key === activeKey}
            aria-controls={`ams-panel-${mode.key}`}
            tabIndex={mode.key === activeKey ? 0 : -1}
            onClick={() => setActiveKey(mode.key)}
          >
            <mode.Icon size={14} strokeWidth={1.8} aria-hidden="true" />
            {mode.label}
          </button>
        ))}
      </div>

      {onPromptSelect ? (
        <button
          type="button"
          className="ams-prompt ams-prompt--action"
          onClick={() => onPromptSelect(active.prompt, active.key)}
        >
          <CornerDownRight size={16} aria-hidden="true" />
          <p>{active.prompt}</p>
        </button>
      ) : (
        <div className="ams-prompt">
          <CornerDownRight size={16} aria-hidden="true" />
          <p>{active.prompt}</p>
        </div>
      )}

      <div
        className="ams-body"
        key={activeKey}
        role="tabpanel"
        id={`ams-panel-${activeKey}`}
        aria-labelledby={`ams-tab-${activeKey}`}
        tabIndex={0}
      >
        <ActiveBody theme={theme} isDark={isDark} />
      </div>

      <div className="ams-foot">
        <span>{active.meta}</span>
        <span>Illustrative sample output, abridged for length</span>
      </div>
    </div>
  );
};

export default AboutModeShowcase;
