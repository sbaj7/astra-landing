import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, LibraryBig } from 'lucide-react';
import AstraHeroMark from './brand/AstraHeroMark';
import AboutContent from './AboutContent.jsx';
import AboutModeShowcase from './AboutModeShowcase.jsx';
import './FirstPageExperience.css';


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

// The hero tabs and the input-bar mode selector are two views of one choice.
const APP_MODE_TO_SHOWCASE = (mode) => {
  if (['reason', 'differential', 'next-steps', 'dispo', 'disposition', 'specialty-referral', 'orders'].includes(mode)) return 'reason';
  if (mode === 'search') return 'research';
  return 'write';
};

const SHOWCASE_TO_APP_MODE = { research: 'search', reason: 'reason', write: 'write' };

const FirstPageExperience = ({
  currentMode,
  onModeChange,
  onSampleTapped,
  onShowAbout,
  onShowSources,
  onOpenQbank,
  theme,
  inputBarSlot
}) => {
  const isDark = theme.backgroundPrimary === '#121417';
  const headline = getModeHeadline(currentMode);
  const aboutRef = useRef(null);

  const scrollToAbout = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Master has no toolbar equivalent, so the tab is tracked locally and only
  // pushed to the toolbar when it maps to a real chat mode.
  const [showcaseKey, setShowcaseKey] = useState(() => APP_MODE_TO_SHOWCASE(currentMode));

  useEffect(() => {
    setShowcaseKey(APP_MODE_TO_SHOWCASE(currentMode));
  }, [currentMode]);

  const handleShowcaseKeyChange = useCallback((key) => {
    setShowcaseKey(key);
    const appMode = SHOWCASE_TO_APP_MODE[key];
    if (appMode && appMode !== currentMode) onModeChange?.(appMode);
  }, [currentMode, onModeChange]);

  const handlePromptSelect = (prompt, key) => {
    if (key === 'master') {
      onOpenQbank?.();
      return;
    }
    onSampleTapped?.(prompt, SHOWCASE_TO_APP_MODE[key] || 'search');
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

          <div className="astra-first-page__showcase" aria-label="What each Astra mode returns">
            <AboutModeShowcase
              compact
              theme={theme}
              isDark={isDark}
              activeKey={showcaseKey}
              onActiveKeyChange={handleShowcaseKeyChange}
              onPromptSelect={handlePromptSelect}
            />
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

        <button
          type="button"
          className="astra-first-page__scroll-cue"
          onClick={scrollToAbout}
          aria-label="Scroll to learn about Astra"
        >
          <span>Why Astra</span>
          <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <section className="astra-first-page__about" ref={aboutRef} aria-label="About Astra">
        <AboutContent embedded />
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
    </main>
  );
};

export default FirstPageExperience;
