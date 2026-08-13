import React, { useEffect, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  FileText,
  GraduationCap,
  LibraryBig,
  Search,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import AstraHeroMark from './brand/AstraHeroMark';
import './FirstPageExperience.css';

const JOURNEY_MODES = [
  { key: 'search', label: 'Research', Icon: Search },
  { key: 'reason', label: 'Reason', Icon: Stethoscope },
  { key: 'write', label: 'Write', Icon: FileText },
  { key: 'master', label: 'Master', Icon: GraduationCap }
];

const HERO_LEDE_SEGMENTS = [
  { lead: 'Research', rest: ' the literature,' },
  { lead: 'reason', rest: ' through differentials and next steps,' },
  { lead: 'write', rest: ' complete clinical notes,' },
  { prefix: 'and ', lead: 'master', rest: ' medicine with QBank.' }
];
const HERO_LEDE = HERO_LEDE_SEGMENTS
  .map(({ prefix = '', lead, rest }) => `${prefix}${lead}${rest}`)
  .join(' ');

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
  onShowSources,
  onOpenQbank,
  theme,
  sampleQueries,
  inputBarSlot
}) => {
  const [activeJourney, setActiveJourney] = useState(getModeGroup(currentMode));
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
          <AstraHeroMark variant="static" />

          <h2 className="astra-first-page__title">
            <span>Clinical reasoning,</span>
            <span>grounded in evidence.</span>
          </h2>

          <p className="astra-first-page__lede">
            <span className="astra-first-page__lede-copy" aria-hidden="true">
              {HERO_LEDE_SEGMENTS.map(({ prefix = '', lead, rest }, index) => (
                <React.Fragment key={lead}>
                  <span
                    className="astra-first-page__lede-phrase"
                    style={{ '--astra-phrase-index': index }}
                  >
                    {prefix}
                    <strong>{lead}</strong>
                    {rest}
                  </span>
                  {index < HERO_LEDE_SEGMENTS.length - 1 ? ' ' : null}
                </React.Fragment>
              ))}
            </span>
            <span className="astra-first-page__sr-only">{HERO_LEDE}</span>
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
            {onShowSources && (
              <button type="button" className="astra-first-page__secondary-action" onClick={onShowSources}>
                <LibraryBig size={16} />
                Sources List
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default FirstPageExperience;
