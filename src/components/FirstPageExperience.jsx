import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, GraduationCap, LibraryBig } from 'lucide-react';
import AstraHeroMark from './brand/AstraHeroMark';
import AboutContent from './AboutContent.jsx';
import './FirstPageExperience.css';

const HOME_HEADLINES = {
  research: 'What should we investigate?',
  reason: 'What case are we working through?',
  write: 'What are we managing today?',
  master: 'What should we practice next?'
};

const HOME_MODES = [
  { key: 'research', label: 'Research' },
  { key: 'reason', label: 'Reason' },
  { key: 'write', label: 'Write' },
  { key: 'master', label: 'Master' }
];

const HOME_PROMPTS = {
  research: [
    'What is the best evidence for early rhythm control in newly diagnosed atrial fibrillation?',
    'When should SGLT2 inhibitors be held before surgery, and when can they be restarted?',
    'How long should uncomplicated gram-negative bacteremia be treated?',
    'When should anticoagulation be resumed after a gastrointestinal bleed?'
  ],
  reason: [
    'Severe aortic stenosis with new AF with RVR, pulmonary edema, MAP 58, and rising creatinine after diuresis.',
    'Postpartum day 5 with severe headache, BP 178/112, platelets 82k, elevated AST, and a focal seizure.',
    'Kidney transplant recipient with fever, progressive hypoxemia, diffuse ground-glass opacities, elevated LDH, and negative cultures.',
    'Cirrhosis with tense ascites, Na 121, creatinine rising from 0.9 to 2.4, bland sediment, and no response to albumin.'
  ],
  write: [
    'Decompensated HFrEF improving on IV diuresis, net negative 2 L today.',
    'Sepsis from community-acquired pneumonia, improving after initial antibiotics and fluids.',
    'NSTEMI day 1 after PCI, stable on telemetry and dual antiplatelet therapy.',
    'DKA resolving on insulin infusion, ready to transition to subcutaneous insulin.'
  ],
  master: [
    'Step 1 · my weakest systems',
    'Step 2 · diagnoses I keep missing',
    'Step 3 · management at my current difficulty',
    'Recent misses · pattern review'
  ]
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
  onShowSources,
  onOpenQbank,
  theme,
  inputBarSlot
}) => {
  const isDark = theme.backgroundPrimary === '#121417';
  const aboutRef = useRef(null);

  const scrollToAbout = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Master has no toolbar equivalent, so the tab is tracked locally and only
  // pushed to the toolbar when it maps to a real chat mode.
  const [showcaseKey, setShowcaseKey] = useState(() => APP_MODE_TO_SHOWCASE(currentMode));
  const headline = HOME_HEADLINES[showcaseKey] || HOME_HEADLINES.research;

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

  const activePrompts = HOME_PROMPTS[showcaseKey] || HOME_PROMPTS.research;

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

          <div className="astra-first-page__mode-picker" aria-label="Choose how Astra can help">
            {HOME_MODES.map((mode) => (
              <button
                type="button"
                key={mode.key}
                className="astra-first-page__mode"
                aria-pressed={showcaseKey === mode.key}
                onClick={() => handleShowcaseKeyChange(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="astra-first-page__examples" key={showcaseKey} aria-label={`${HOME_MODES.find((mode) => mode.key === showcaseKey)?.label || 'Astra'} example prompts`}>
            {activePrompts.map((prompt) => (
              <button
                type="button"
                className="astra-first-page__example"
                key={prompt}
                onClick={() => handlePromptSelect(prompt, showcaseKey)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {(onShowSources || onOpenQbank) && (
            <div className="astra-first-page__resource-actions">
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
              {onOpenQbank && (
                <button
                  type="button"
                  className="astra-first-page__sources-action"
                  onClick={onOpenQbank}
                >
                  <GraduationCap size={15} strokeWidth={1.8} />
                  QBank
                </button>
              )}
            </div>
          )}
        </section>

        <footer className="astra-first-page__footer" aria-label="Astra information">
          <button
            type="button"
            className="astra-first-page__scroll-cue"
            onClick={scrollToAbout}
            aria-label="Scroll to learn about Astra"
          >
            <span>Why Astra</span>
            <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="astra-first-page__footer-links">
            <a href="/terms.html">Terms of Use</a>
            <a href="/privacy.html">Privacy Policy</a>
          </div>
        </footer>
      </div>

      <section className="astra-first-page__about" ref={aboutRef} aria-label="About Astra">
        <AboutContent embedded />
      </section>
    </main>
  );
};

export default FirstPageExperience;
