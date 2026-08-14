import React from 'react';
import {
  FileText,
  GraduationCap,
  LibraryBig,
  Search,
  Stethoscope
} from 'lucide-react';
import AstraHeroMark from './brand/AstraHeroMark';
import './FirstPageExperience.css';

const HOME_ACTIONS = [
  {
    key: 'search',
    label: 'Research',
    prompt: 'Research early rhythm control in new AF.',
    Icon: Search
  },
  {
    key: 'reason',
    label: 'Reason',
    prompt: 'Reason through painless jaundice with weight loss.',
    Icon: Stethoscope
  },
  {
    key: 'write',
    label: 'Write',
    prompt: 'Write an A&P for decompensated HFrEF.',
    Icon: FileText
  },
  {
    key: 'qbank',
    label: 'QBank',
    prompt: 'Practice my weakest Step 2 CK areas.',
    Icon: GraduationCap
  }
];

const MODE_HEADLINES = {
  search: 'What do you need to know?',
  reason: 'Tell me about the patient.',
  differential: 'What are you considering?',
  'next-steps': 'What happens next?',
  dispo: 'Where should this patient go?',
  disposition: 'Where should this patient go?',
  'specialty-referral': 'Who needs to weigh in?',
  orders: 'What needs to be ordered?',
  write: 'What do you need to document?',
  'prior-auth-appeal': 'What needs approval?',
  'medical-necessity': 'What needs justification?',
  'disability-fmla': 'What needs certification?',
  dme: 'What equipment is needed?',
  'peer-to-peer': 'What decision needs review?'
};

const getModeHeadline = (mode) => {
  if (MODE_HEADLINES[mode]) return MODE_HEADLINES[mode];
  return 'What do you need to document?';
};

const FirstPageExperience = ({
  currentMode,
  onSampleTapped,
  onShowAbout,
  onShowSources,
  onOpenQbank,
  theme,
  inputBarSlot
}) => {
  const isDark = theme.backgroundPrimary === '#121417';
  const headline = getModeHeadline(currentMode);

  const handleAction = (action) => {
    if (action.key === 'qbank') {
      onOpenQbank?.();
      return;
    }

    onSampleTapped?.(action.prompt, action.key);
  };

  return (
    <main
      className="astra-first-page"
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        '--astra-home-bg': theme.backgroundPrimary,
        '--astra-home-surface': theme.backgroundSurface,
        '--astra-home-text': theme.textPrimary,
        '--astra-home-muted': theme.textSecondary,
        '--astra-home-accent': theme.accentSoftBlue,
        '--astra-home-border': `${theme.textSecondary}1C`,
        '--astra-home-border-strong': `${theme.textSecondary}30`,
        '--astra-home-accent-soft': `${theme.accentSoftBlue}0D`,
        '--astra-home-logo': isDark ? '#F9FAFB' : '#111111'
      }}
    >
      <div className="astra-first-page__shell">
        <section className="astra-first-page__workspace" aria-labelledby="astra-home-title">
          <header className="astra-first-page__intro">
            <AstraHeroMark variant="static" />
            <h2
              key={headline}
              id="astra-home-title"
              className="astra-first-page__title"
              aria-live="polite"
            >
              {headline}
            </h2>
          </header>

          {inputBarSlot && (
            <div className="astra-first-page__command">
              {inputBarSlot}
            </div>
          )}

          <div className="astra-first-page__actions" aria-label="Start with Astra">
            {HOME_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="astra-first-page__action"
                  onClick={() => handleAction(action)}
                  aria-label={`${action.label}: ${action.prompt}`}
                >
                  <strong>{action.prompt}</strong>
                  <span className="astra-first-page__action-meta">
                    <action.Icon size={14} strokeWidth={1.7} />
                    <small>{action.label}</small>
                  </span>
                </button>
            ))}
          </div>

          {onShowSources && (
            <button
              type="button"
              className="astra-first-page__sources-action"
              onClick={onShowSources}
            >
              <LibraryBig size={15} strokeWidth={1.8} />
              Sources List
            </button>
          )}
        </section>

        <footer className="astra-first-page__footer" aria-label="Astra information">
          <p>Astra can make mistakes. Check important clinical information.</p>
          <div className="astra-first-page__footer-links">
            {onShowAbout && (
              <button type="button" onClick={onShowAbout}>About Astra</button>
            )}
            <a href="/terms.html">Terms of Use</a>
            <a href="/privacy.html">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default FirstPageExperience;
