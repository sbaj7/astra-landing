import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search, Sparkles, FileText, ArrowUp } from 'lucide-react';
import { useSupabaseAuth } from './Auth/SupabaseAuthProvider.jsx';
import { useTheme } from './Themes+Styles.jsx';
import './LandingOverlay.css';

const LandingOverlay = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [selectedMode, setSelectedMode] = useState(null);
  const { user, signIn } = useSupabaseAuth();
  const { theme } = useTheme();
  const containerRef = useRef(null);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);

    const handleScroll = () => {
      if (containerRef.current) {
        setScrollY(containerRef.current.scrollTop);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 400);
  };

  const handleGetStarted = () => {
    if (!user) {
      signIn();
    }
    handleClose();
  };

  return (
    <div
      ref={containerRef}
      className={`landing-overlay ${isVisible ? 'landing-overlay--visible' : ''} ${isDark ? 'landing-overlay--dark' : ''}`}
    >
      {/* Close button */}
      <button onClick={handleClose} className="landing-close-btn">
        <X size={20} strokeWidth={2} />
      </button>

      {/* Hero Section */}
      <section className="landing-hero">
        <div
          className="landing-gradient-orb"
          style={{ opacity: Math.max(0, 1 - scrollY / 500) }}
        />

        <div className="landing-hero-content">

          {/* Main headline */}
          <h1 className={`landing-headline ${isVisible ? 'landing-headline--visible' : ''}`}>
            Astra is the clinical engine
            <br />
            for serious medicine
          </h1>

          {/* Subheadline */}
          <p className={`landing-subheadline ${isVisible ? 'landing-subheadline--visible' : ''}`}>
            A clinical engine built to handle the work that actually decides outcomes:
            finding the right evidence, thinking through messy cases, and turning judgment
            into clear, defensible documentation.
          </p>

          {/* CTA Button */}
          <div className={`landing-cta-buttons ${isVisible ? 'landing-cta-buttons--visible' : ''}`}>
            <button onClick={handleGetStarted} className="landing-btn landing-btn--primary">
              <span className="landing-btn-content">
                Start Using Astra
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="landing-btn-arrow">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>

            {/* Scroll indicator */}
            <div
              className={`landing-scroll-indicator ${isVisible ? 'landing-scroll-indicator--visible' : ''}`}
              style={{ opacity: Math.max(0, 1 - scrollY / 200) }}
            >
              <div className="landing-scroll-content">
                <span className="landing-scroll-text">Scroll to explore</span>
                <ChevronDown size={20} />
              </div>
            </div>

            {/* Hero Stats */}
            <div className={`landing-stats-inline ${isVisible ? 'landing-stats-inline--visible' : ''}`}>
              <div className="landing-stats-inline-item">
                <div className="landing-stats-inline-value">10,000+</div>
                <div className="landing-stats-inline-label">Healthcare Professionals</div>
              </div>
              <div className="landing-stats-inline-item">
                <div className="landing-stats-inline-value">1,000,000+</div>
                <div className="landing-stats-inline-label">Clinical Questions Answered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="landing-problem">
        <div className="landing-section-content">
          <div className="landing-prose">
            <p className="landing-lead">
              Most tools nibble at one edge of that problem. A search bar that throws you links.
              A chatbot that guesses. A note generator that fabricates citations. None of them are
              responsible for the full chain from question to chart.
            </p>
            <p className="landing-lead-emphasis">Astra is.</p>
          </div>

          {/* Demo Input Bar */}
          <div className={`landing-demo-input ${isVisible ? 'landing-demo-input--visible' : ''}`} style={{
            maxWidth: '48rem',
            margin: '3rem auto 0',
            paddingLeft: 16,
            paddingRight: 16,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(1rem)',
            transition: 'all 700ms cubic-bezier(0.4, 0, 0.2, 1) 350ms'
          }}>
            <div style={{
              position: 'relative',
              backgroundColor: isDark ? 'rgba(254, 254, 254, 0.03)' : 'rgba(254, 254, 254, 0.96)',
              borderRadius: 28,
              border: `1px solid ${isDark ? 'rgba(139, 139, 139, 0.15)' : 'rgba(139, 139, 139, 0.15)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'visible',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}>
              {/* Input Row */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 12px 6px 12px'
              }}>
                <textarea
                  readOnly
                  placeholder={
                    selectedMode === 'search' ? 'Ask anything' :
                    selectedMode === 'reason' ? 'Present your case' :
                    selectedMode === 'write' ? 'Outline your plan' :
                    'Ask anything'
                  }
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    resize: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: 17,
                    lineHeight: 1.4,
                    backgroundColor: 'transparent',
                    color: isDark ? '#F5F5F4' : '#2A2A2A',
                    height: '32px',
                    minHeight: 24,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                    boxSizing: 'border-box',
                    fontWeight: 400,
                    letterSpacing: '-0.011em',
                    cursor: 'default'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
                  <button
                    disabled
                    style={{
                      padding: 10,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: isDark ? '#8FA5B5' : '#4A6B7D',
                      cursor: 'not-allowed',
                      color: '#fff',
                      opacity: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <ArrowUp size={20} />
                  </button>
                </div>
              </div>

              {/* Mode Switcher Row - Bottom */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 0,
                paddingBottom: 14,
                paddingLeft: 16,
                paddingRight: 16,
                gap: 12
              }}>
                <div style={{ flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'nowrap', position: 'relative' }}>
                  {[
                    { key: 'search', title: 'Research', icon: Search },
                    { key: 'reason', title: 'DDx', icon: Sparkles },
                    { key: 'write', title: 'A&P', icon: FileText }
                  ].map(({ key, title, icon: Icon }) => {
                    const isSelected = selectedMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedMode(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          paddingTop: '6px',
                          paddingBottom: '6px',
                          paddingLeft: '10px',
                          paddingRight: '10px',
                          borderRadius: 50,
                          border: `1px solid ${isDark ? 'rgba(139, 139, 139, 0.31)' : 'rgba(139, 139, 139, 0.31)'}`,
                          backgroundColor: isSelected ? (isDark ? '#8FA5B5' : '#4A6B7D') : 'transparent',
                          color: isSelected ? '#fff' : (isDark ? '#F5F5F4' : '#2A2A2A'),
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all .2s ease',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                          opacity: 1
                        }}
                      >
                        <Icon size={10} />
                        <span>{title}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{
                  fontSize: 11,
                  color: isDark ? '#5A6169' : '#5A6169',
                  margin: 0,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                  fontWeight: 400,
                  opacity: 0.5,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  marginLeft: 'auto',
                  textAlign: 'right',
                  flexShrink: 0
                }}>
                  Astra can make mistakes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Modes Section */}
      <section className="landing-modes">
        <div className="landing-section-content">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              One system, three modes, all citation-backed
            </h2>
            <p className="landing-section-subtitle">
              You keep your clinical judgment, and Astra does the heavy lifting around it.
            </p>
          </div>

          <div className="landing-modes-grid">
            <ModeCard
              title="Research"
              description="Turn the firehose of medicine into something you can actually use. Curated high-impact sources with inline citations for every claim."
              isDark={isDark}
            />
            <ModeCard
              title="Differential Diagnosis"
              description="Clinical reasoning that explains itself. Ranked differentials with explicit for/against reasoning tied to case details."
              isDark={isDark}
            />
            <ModeCard
              title="Assessment and Plan"
              description="Documentation that reflects your judgment, backed by evidence. Problem-oriented notes with suggested ICD codes and inline references."
              isDark={isDark}
            />
          </div>
        </div>
      </section>

      {/* Why Astra Exists */}
      <section className="landing-why">
        <div className="landing-section-content">
          <h2 className="landing-section-title landing-section-title--centered">
            Why Astra exists
          </h2>

          <div className="landing-prose landing-prose--wide">
            <p>
              Modern medicine runs on contradictions.
            </p>
            <p>
              The literature explodes. Guidelines change quietly. Trials overturn habits. Yet every
              clinic and ward demands faster throughput, shorter notes, and cleaner billing. No
              individual can read, remember, and apply what the system demands, at the speed it demands it.
            </p>
            <p>
              That gap gets filled by shortcuts. Rules of thumb. Search results that favor SEO, not
              rigor. Documentation that is written for the EMR, not for the patient in front of you.
            </p>
            <p className="landing-prose-emphasis">
              Astra exists for clinicians who refuse that trade.
            </p>
            <p>
              It is built on a simple requirement: any answer, any differential, any plan should be
              tied back to visible, verifiable sources. You should be able to click a citation and
              see the trial, guideline, or review that shaped the recommendation.
            </p>
          </div>
        </div>
      </section>

      {/* Research Mode Detail */}
      <section className="landing-mode-detail">
        <div className="landing-section-content">
          <div className="landing-mode-detail-content">
            <div style={{ marginBottom: '1.5rem' }}>
              <Search size={32} color={isDark ? '#8FA5B5' : '#4A6B7D'} strokeWidth={1.5} />
            </div>
            <h2 className="landing-mode-detail-title">Research</h2>
            <p className="landing-mode-detail-subtitle">
              Turn the firehose of medicine into something you can actually use
            </p>

            <div className="landing-prose">
              <p>Research Mode is for the questions that matter:</p>
              <ul className="landing-examples-list">
                <li>"What is the current evidence for early rhythm control in new atrial fibrillation in a 65 year old with heart failure"</li>
                <li>"How strong is the data for GLP-1 agonists reducing cardiovascular events in non-diabetic obesity"</li>
                <li>"Which trials actually support extended VTE prophylaxis after cancer surgery and in which populations"</li>
              </ul>

              <p>You type the clinical question. Astra searches only from a curated set of high-impact journals and guidelines. It then builds a structured answer:</p>

              <ul className="landing-features-list">
                <li>A concise synthesis that focuses on outcomes, effect sizes, and populations, not vague summaries</li>
                <li>Inline citations for every key claim, pointing to trials, meta-analyses, or guidelines</li>
                <li>Clear separation of what is strongly supported, what is emerging, and what is speculation</li>
                <li>A traceable trail of sources, so you can drill down, verify, and quote accurately</li>
              </ul>

              <p className="landing-prose-emphasis">
                The value is not just speed. It is that your mental model of a topic stays aligned
                with what the best available evidence actually shows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Differential Diagnosis Mode Detail */}
      <section className="landing-mode-detail landing-mode-detail--alt">
        <div className="landing-section-content">
          <div className="landing-mode-detail-content">
            <div style={{ marginBottom: '1.5rem' }}>
              <Sparkles size={32} color={isDark ? '#8FA5B5' : '#4A6B7D'} strokeWidth={1.5} />
            </div>
            <h2 className="landing-mode-detail-title">Differential Diagnosis</h2>
            <p className="landing-mode-detail-subtitle">
              Clinical reasoning that explains itself
            </p>

            <div className="landing-prose">
              <p>
                Differential Diagnosis Mode is built for real cases, not perfect vignettes.
              </p>

              <p>
                You feed Astra the story: a rough HPI, exam findings, key labs, imaging impressions,
                and any relevant comorbidities. It returns a structured differential that behaves the
                way a senior resident or attending should:
              </p>

              <ul className="landing-features-list">
                <li>Ranked list of likely diagnoses, with a sentence or two of rationale for each</li>
                <li>Explicit "for" and "against" reasoning that ties back to the case details</li>
                <li>Suggestions for targeted tests or maneuvers that would discriminate between top options</li>
                <li>Context from guidelines or landmark trials when evidence meaningfully shifts the probability</li>
              </ul>

              <p>
                Crucially, it does not hallucinate citations. When evidence is referenced, there is a
                visible link back to a real source. When the reasoning is expert consensus rather than
                trial-backed, Astra labels it as such.
              </p>

              <p className="landing-prose-emphasis">
                This mode is not meant to replace thinking. It is meant to give your thinking a scaffold.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment and Plan Mode Detail */}
      <section className="landing-mode-detail">
        <div className="landing-section-content">
          <div className="landing-mode-detail-content">
            <div style={{ marginBottom: '1.5rem' }}>
              <FileText size={32} color={isDark ? '#8FA5B5' : '#4A6B7D'} strokeWidth={1.5} />
            </div>
            <h2 className="landing-mode-detail-title">Assessment and Plan</h2>
            <p className="landing-mode-detail-subtitle">
              Documentation that reflects your judgment, backed by evidence
            </p>

            <div className="landing-prose">
              <p>
                Once you know what you think, the work is not over. You still have to turn it into:
              </p>

              <ul className="landing-features-list">
                <li>A coherent assessment</li>
                <li>A concrete plan</li>
                <li>Clean documentation that satisfies billing, communication, and medicolegal expectations</li>
              </ul>

              <p>
                Assessment and Plan Mode takes the case context, your working diagnoses, and your
                decisions, and turns them into a structured note that you can review and edit:
              </p>

              <ul className="landing-features-list">
                <li>Problem-oriented assessments that make your reasoning explicit, not just your orders</li>
                <li>Plans broken down into diagnostics, therapeutics, monitoring, and follow-up</li>
                <li>Suggested ICD codes aligned with the documented problems and severity</li>
                <li>Inline references to key trials or guidelines where they actually belong in the plan</li>
              </ul>

              <p className="landing-prose-emphasis">
                The point is not to auto-generate a wall of text. The point is to give you a draft
                that is already aligned with how you think, already linked to the evidence, and already
                structured for the EMR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="landing-final-cta">
        <div className="landing-final-cta-card">
          <h2 className="landing-final-cta-title">
            One engine, continuous context
          </h2>
          <p className="landing-final-cta-subtitle">
            The real value of Astra is not that it has three modes. It is that those modes are
            part of a single engine. A question you explore in Research Mode can inform your
            differential. A nuance you uncover in a trial can shape your plan. The final plan
            can carry citations that trace back to the same sources you just reviewed.
          </p>
          <p className="landing-final-cta-subtitle">
            That is what a clinical engine should be: infrastructure for serious medicine,
            in the hands of the clinician, not above them.
          </p>

          <button onClick={handleGetStarted} className="landing-btn landing-btn--primary landing-btn--large">
            Start Using Astra
          </button>
        </div>
      </section>
    </div>
  );
};

const ModeCard = ({ title, description, isDark }) => (
  <div className="landing-mode-card">
    <h3 className="landing-mode-card-title">{title}</h3>
    <p className="landing-mode-card-description">{description}</p>
  </div>
);

export default LandingOverlay;
