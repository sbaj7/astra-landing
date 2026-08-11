import React, { useEffect, useId, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import './FirstPageExperience.css';

const JOURNEY_MODES = [
  { key: 'search', label: 'Research', Icon: Search },
  { key: 'reason', label: 'Reason', Icon: Stethoscope },
  { key: 'write', label: 'Write', Icon: FileText },
  { key: 'master', label: 'Master', Icon: GraduationCap }
];

const MODE_EXPERIENCES = {
  search: {
    label: 'Clinical evidence',
    promptLabel: 'Ask the question behind the decision',
    actionLabel: 'Synthesize the evidence',
    stages: [
      { label: 'Find', title: 'Best available evidence', detail: 'Guidelines, trials, reviews, and primary studies' },
      { label: 'Appraise', title: 'Clinical synthesis', detail: 'Effect sizes, limitations, and applicability' },
      { label: 'Verify', title: 'Claim-level sources', detail: 'Trace key conclusions back to the literature' }
    ]
  },
  reason: {
    label: 'Clinical reasoning',
    promptLabel: 'Present the case as you have it',
    actionLabel: 'Build the differential',
    stages: [
      { label: 'Frame', title: 'Problem representation', detail: 'Distill history, examination, labs, and imaging' },
      { label: 'Differentiate', title: 'Probability-ranked DDx', detail: 'Supporting and opposing findings for each diagnosis' },
      { label: 'Decide', title: 'Next clinical steps', detail: 'Workup, treatment, monitoring, and disposition' }
    ]
  },
  write: {
    label: 'Assessment & Plan',
    promptLabel: 'Enter the clinical picture',
    actionLabel: 'Draft the A&P',
    stages: [
      { label: 'Assess', title: 'Focused clinical summary', detail: 'Primary diagnosis and key secondary concerns' },
      { label: 'Plan', title: 'Problem-oriented A&P', detail: 'Prioritized actions, dosing, monitoring, and disposition' },
      { label: 'Complete', title: 'Documentation details', detail: 'ICD-10 codes, clinical scores, and relevant evidence' }
    ]
  },
  master: {
    label: 'Personalized QBank',
    promptLabel: 'Step 1 · Step 2 CK · Step 3',
    promptTitle: 'A question bank that adapts to you.',
    promptDetail: 'Astra learns your strengths and weaknesses across systems, specialties, tasks, and topics, then builds each set around what you need next.',
    actionLabel: 'Start a personalized set',
    stages: [
      { label: 'Choose', title: 'Step 1 · Step 2 CK · Step 3', detail: 'Set topic, difficulty, length, tutor or timed mode' },
      { label: 'Learn', title: 'Every option explained', detail: 'Review the best answer and why each distractor falls short' },
      { label: 'Adapt', title: 'Practice follows performance', detail: 'Future sets emphasize weaker systems, tasks, and topics' }
    ]
  }
};

const HOSPITALS = [
  { name: 'Johns Hopkins', logo: '/logos/johns-hopkins.png' },
  { name: 'Mass General', logo: '/logos/mass-general.png' },
  { name: 'Stanford Health', logo: '/logos/stanford-health.png' },
  { name: 'UCLA Health', logo: '/logos/ucla-health.png' },
  { name: 'UCSF', logo: '/logos/ucsf.png' },
  { name: 'Northwestern', logo: '/logos/northwestern.png' },
  { name: 'Mount Sinai', logo: '/logos/mount-sinai.png' },
  { name: 'Duke Health', logo: '/logos/duke-health.png' }
];

const APERTURE_CLIP_CLOSED = 'M.5 0L.58.36L1 .5L.58.64L.5 1L.42.64L0 .5L.42.36ZM.5.5L.5.5L.5.5L.5.5L.5.5L.5.5L.5.5L.5.5Z';
const APERTURE_CLIP_OPEN = 'M.5 0L.58.36L1 .5L.58.64L.5 1L.42.64L0 .5L.42.36ZM.5-.06L.5896.3432L1.06.5L.5896.6568L.5 1.06L.4104.6568L-.06.5L.4104.3432Z';

const getModeGroup = (mode) => {
  if (['reason', 'differential', 'next-steps', 'dispo', 'disposition', 'specialty-referral', 'orders'].includes(mode)) {
    return 'reason';
  }
  if (['write', 'prior-auth-appeal', 'medical-necessity', 'disability-fmla', 'dme', 'peer-to-peer'].includes(mode)) {
    return 'write';
  }
  return 'search';
};

const FirstPageExperience = ({
  currentMode,
  onSampleTapped,
  onModeChange,
  onShowAbout,
  onOpenQbank,
  theme,
  sampleQueries,
  inputBarSlot
}) => {
  const [activeJourney, setActiveJourney] = useState(getModeGroup(currentMode));
  const apertureId = useId().replace(/:/g, '');
  const apertureClipId = `astra-home-aperture-clip-${apertureId}`;
  const activeExperience = MODE_EXPERIENCES[activeJourney];
  const queries = activeJourney === 'master'
    ? []
    : (sampleQueries[activeJourney] || sampleQueries.search);
  const isDark = theme.backgroundPrimary === '#121417';
  const marqueeHospitals = [...HOSPITALS, ...HOSPITALS];

  useEffect(() => {
    setActiveJourney(getModeGroup(currentMode));
  }, [currentMode]);

  const selectJourney = (key) => {
    if (key === 'master') {
      setActiveJourney('master');
      return;
    }
    setActiveJourney(key);
    onModeChange?.(key);
  };

  return (
    <main
      className="astra-first-page"
      data-mode={activeJourney}
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        '--astra-home-bg': theme.backgroundPrimary,
        '--astra-home-surface': theme.backgroundSurface,
        '--astra-home-text': theme.textPrimary,
        '--astra-home-muted': theme.textSecondary,
        '--astra-home-accent': theme.accentSoftBlue,
        '--astra-home-border': `${theme.textSecondary}18`,
        '--astra-home-border-strong': `${theme.textSecondary}2B`,
        '--astra-home-accent-soft': `${theme.accentSoftBlue}12`,
        '--astra-home-glow': `${theme.accentSoftBlue}1A`,
        '--astra-home-logo': isDark ? '#F9FAFB' : '#111111'
      }}
    >
      <div className="astra-first-page__shell">
        <header className="astra-first-page__intro">
          <div className="astra-first-page__mark" aria-hidden="true">
            <svg className="astra-first-page__aperture-defs" focusable="false">
              <defs>
                <clipPath id={apertureClipId} clipPathUnits="objectBoundingBox">
                  <path d={APERTURE_CLIP_CLOSED} clipRule="evenodd" fillRule="evenodd">
                    <animate
                      attributeName="d"
                      begin="800ms"
                      calcMode="spline"
                      dur="620ms"
                      fill="freeze"
                      keySplines="0.16 1 0.3 1"
                      keyTimes="0;1"
                      values={`${APERTURE_CLIP_CLOSED};${APERTURE_CLIP_OPEN}`}
                    />
                  </path>
                </clipPath>
              </defs>
            </svg>
            <span className="astra-first-page__glyph" />
            <span className="astra-first-page__aperture-shell">
              <span
                className="astra-first-page__aperture-material"
                style={{
                  clipPath: `url(#${apertureClipId})`,
                  WebkitClipPath: `url(#${apertureClipId})`
                }}
              />
            </span>
          </div>

          <h2 className="astra-first-page__title">
            <span>Clinical reasoning,</span>
            <span>grounded in evidence.</span>
          </h2>

          <p className="astra-first-page__lede">
            Research the literature, reason through differentials and next steps, write complete clinical notes, and master medicine with QBank.
          </p>
        </header>

        {inputBarSlot && (
          <div className="astra-first-page__command">
            {inputBarSlot}
          </div>
        )}

        <nav
          className="astra-first-page__journey"
          aria-label="Astra clinical workflow"
        >
          {JOURNEY_MODES.map((mode) => {
            const isActive = mode.key === activeJourney;
            return (
              <button
                key={mode.key}
                type="button"
                className={`astra-first-page__journey-step${isActive ? ' is-active' : ''}`}
                onClick={() => selectJourney(mode.key)}
                aria-pressed={isActive}
              >
                <span className="astra-first-page__journey-icon">
                  {React.createElement(mode.Icon, { size: 16, strokeWidth: 1.8 })}
                </span>
                <strong>{mode.label}</strong>
              </button>
            );
          })}
        </nav>

        <section className="astra-first-page__thread" aria-label={`${activeExperience.label} preview`}>
          <div className="astra-first-page__thread-header">
            <strong>{activeExperience.label}</strong>
          </div>

          <div className="astra-first-page__thread-content" key={activeJourney}>
            {activeJourney === 'master' ? (
              <div className="astra-first-page__prompt astra-first-page__prompt--master">
                <span className="astra-first-page__prompt-label">{activeExperience.promptLabel}</span>
                <strong>{activeExperience.promptTitle}</strong>
                <span className="astra-first-page__master-detail">{activeExperience.promptDetail}</span>
                <button type="button" className="astra-first-page__master-action" onClick={onOpenQbank}>
                  {activeExperience.actionLabel}
                  <ArrowUp size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="astra-first-page__prompt"
                onClick={() => onSampleTapped?.(queries[0])}
              >
                <span className="astra-first-page__prompt-label">{activeExperience.promptLabel}</span>
                <strong>{queries[0]}</strong>
                <span className="astra-first-page__prompt-action">
                  {activeExperience.actionLabel}
                  <ArrowUp size={14} />
                </span>
              </button>
            )}

            <div className="astra-first-page__flow" aria-label={`${activeExperience.label} stages`}>
              {activeExperience.stages.map((stage) => (
                <div className="astra-first-page__flow-stage" key={stage.label}>
                  <span className="astra-first-page__flow-label">{stage.label}</span>
                  <strong>{stage.title}</strong>
                  <small>{stage.detail}</small>
                </div>
              ))}
            </div>
          </div>

          {activeJourney !== 'master' && (
            <div className="astra-first-page__alternate-prompts">
              <span>More clinical prompts</span>
              {queries.slice(1).map((query, index) => (
                <button key={`${activeJourney}-${index}`} type="button" onClick={() => onSampleTapped?.(query)}>
                  {query}
                  <ArrowUp size={12} />
                </button>
              ))}
            </div>
          )}

        </section>

        <section className="astra-first-page__proof" aria-label="Astra evidence and trust">
          <div className="astra-first-page__trust">
            <p>Trusted by clinicians at</p>
            <div className="astra-first-page__trust-window">
              <div className="astra-first-page__trust-track">
                {marqueeHospitals.map((hospital, index) => (
                  <span className="astra-first-page__hospital" key={`${hospital.name}-${index}`}>
                    <img src={hospital.logo} alt="" width="20" height="20" loading="lazy" />
                    {hospital.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="astra-first-page__evidence">
            <ShieldCheck size={23} strokeWidth={1.7} />
            <div>
              <strong>Evidence remains traceable. Clinical judgment remains yours.</strong>
              <span>Open the source, challenge the differential, and review every clinical draft before it reaches the chart or care plan.</span>
            </div>
          </div>

          <div className="astra-first-page__actions">
            {onShowAbout && (
              <button type="button" className="astra-first-page__secondary-action" onClick={onShowAbout}>
                <BookOpen size={16} />
                About Astra
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default FirstPageExperience;
