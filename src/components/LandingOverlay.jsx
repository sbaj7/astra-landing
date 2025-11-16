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

          {/* Logo */}
          <div className={`landing-logo ${isVisible ? 'landing-logo--visible' : ''}`}>
            <img
              src="/Untitled design-3.png"
              alt="Astra"
              style={{
                width: '100px',
                height: 'auto',
                display: 'block',
                margin: '0 auto 1rem'
              }}
            />
          </div>

          {/* Main headline */}
          <h1 className={`landing-headline ${isVisible ? 'landing-headline--visible' : ''}`}>
            The clinical engine that unifies evidence, reasoning, and documentation.
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
                  <div className="landing-stats-inline-value">1,000+</div>
                  <div className="landing-stats-inline-label">Healthcare Professionals</div>
                </div>
                <div className="landing-stats-inline-item">
                  <div className="landing-stats-inline-value">100,000+</div>
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
                          gap: 5,
                          paddingTop: '7px',
                          paddingBottom: '7px',
                          paddingLeft: '11px',
                          paddingRight: '11px',
                          borderRadius: 6,
                          border: 'none',
                          background: isSelected
                            ? (isDark
                                ? 'linear-gradient(180deg, rgba(143, 165, 181, 0.95) 0%, rgba(143, 165, 181, 0.9) 100%)'
                                : 'linear-gradient(180deg, rgba(74, 107, 125, 0.95) 0%, rgba(74, 107, 125, 0.9) 100%)')
                            : (isDark
                                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)'
                                : 'linear-gradient(180deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.02) 100%)'),
                          color: isSelected ? '#fff' : (isDark ? 'rgba(245, 245, 244, 0.85)' : 'rgba(42, 42, 42, 0.85)'),
                          fontSize: 12.5,
                          fontWeight: 590,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                          letterSpacing: '-0.01em',
                          boxShadow: isSelected
                            ? (isDark
                                ? '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                                : '0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)')
                            : (isDark
                                ? '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 0.5px 0 rgba(255, 255, 255, 0.05)'
                                : '0 1px 2px rgba(0, 0, 0, 0.05), inset 0 0.5px 0 rgba(255, 255, 255, 0.4)'),
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          WebkitFontSmoothing: 'antialiased'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = isDark
                              ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%)'
                              : 'linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.04) 100%)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = isDark
                              ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)'
                              : 'linear-gradient(180deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.02) 100%)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        <Icon size={11} strokeWidth={2.2} />
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

        {/* Case Walkthrough (under mode pills) */}
        <section className="landing-case">
          <div className="landing-section-content">
            <div className="landing-case-hero">
              <h2 className="landing-case-title">
                Walk through a case
              </h2>
              <p className="landing-case-text landing-case-text--center landing-case-text--muted">
                72-year-old man, post-op day 3 after right hemicolectomy for colon cancer. History of diabetes, coronary artery disease
                with prior stent, chronic kidney disease, and recent chemotherapy. Overnight he becomes tachypneic and tachycardic,
                with oxygen saturation 88 percent on 4 liters. CT angiogram shows a segmental pulmonary embolism with right ventricular
                strain and free air near the anastomosis concerning for a small leak. His hemoglobin has fallen from 11 to 8, platelets
                are 60 thousand, and creatinine has risen from 1.4 to 2.2.
              </p>
            </div>

            <div className="landing-case-grid landing-case-grid--three">
              <div className="landing-case-card">
                <div style={{
                  textAlign: 'center',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  background: isDark ? '#8FA5B5' : '#4A6B7D',
                  borderRadius: '12px 12px 0 0',
                  margin: '-1.25rem -1.25rem 1.5rem -1.25rem'
                }}>
                  <h3 style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: '0.35rem',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em'
                  }}>Research</h3>
                  <p style={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.85)',
                    margin: 0,
                    fontWeight: 400
                  }}>Evidence scan & synthesis</p>
                </div>
                <div className="landing-case-snippet markdown-body">
                  <p><strong>Summary</strong></p>
                  <p>Evidence is largely extrapolated from <strong>cancer‑associated VTE</strong> and <strong>perioperative anticoagulation</strong> guidance rather than trials specific to post‑abdominal surgery PE in cancer. Still, there is reasonably consistent expert consensus on <strong>platelet thresholds</strong> and <strong>postoperative timing</strong>.</p>
                  <hr />
                  <p><strong>1. Platelet Count Thresholds for Full‑Dose Anticoagulation in Cancer‑Associated PE</strong></p>
                  <table>
                    <thead>
                      <tr>
                        <th>Platelet count (×10⁹/L)</th>
                        <th>Suggested anticoagulation strategy in cancer‑associated VTE/PE</th>
                        <th>Key evidence / rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>&gt; 50</strong></td>
                        <td><strong>Full‑dose therapeutic anticoagulation generally acceptable</strong> if bleeding risk manageable</td>
                        <td><strong>Falanga 2023</strong>: “In patients with platelet count &gt;50 000/µL, full therapeutic dose anticoagulation should be considered.” <sup className="md-citation">[1]</sup></td>
                      </tr>
                      <tr>
                        <td><strong>50–70</strong></td>
                        <td>Most reviews advise <strong>avoiding or individualizing full‑dose AC</strong> if high bleeding risk; may use reduced dose or transfusion support</td>
                        <td><strong>Mosarla 2019</strong>: anticoagulation should be <strong>avoided when platelets &lt;50–70 000/µL</strong>, depending on thrombotic risk <sup className="md-citation">[2]</sup></td>
                      </tr>
                      <tr>
                        <td><strong>25–50</strong></td>
                        <td>Often <strong>dose‑reduced LMWH/DOAC</strong> or full‑dose with <strong>platelet transfusion support</strong> in the very acute phase if thrombosis risk is extreme</td>
                        <td><strong>Blood Advances expert review</strong>: “Limited duration of <strong>full‑dose anticoagulation with platelet transfusion support for the first 4 weeks</strong> is often used…” <sup className="md-citation">[3]</sup></td>
                      </tr>
                      <tr>
                        <td><strong>&lt; 25</strong></td>
                        <td>Usually <strong>hold therapeutic anticoagulation</strong>; consider mechanical prophylaxis, IVC filter only if absolutely necessary</td>
                        <td>Consistent with thrombocytopenia guidance and transfusion thresholds for bleeding risk <sup className="md-citation">[3]</sup><sup className="md-citation">[4]</sup></td>
                      </tr>
                    </tbody>
                  </table>
                  <p>Key points specific to cancer‑associated PE:</p>
                  <ul>
                    <li><strong>Active cancer with acute PE is high‑thrombotic‑risk</strong>, and many experts tolerate full‑dose anticoagulation down to <strong>50×10⁹/L</strong> with careful monitoring <sup className="md-citation">[1]</sup><sup className="md-citation">[2]</sup><sup className="md-citation">[3]</sup>.</li>
                    <li>When platelets are <strong>&lt;50×10⁹/L</strong>, options include <strong>(a)</strong> holding anticoagulation, <strong>(b)</strong> using reduced‑intensity anticoagulation, or <strong>(c)</strong> maintaining full dose with <strong>platelet transfusion support</strong>, particularly in the <strong>first 4 weeks</strong> when recurrence risk is highest <sup className="md-citation">[3]</sup>.</li>
                    <li>Transfusion literature supports platelet transfusion in patients with <strong>thrombocytopenia and active bleeding or high‑risk procedures</strong>, with common thresholds at <strong>≤10–20×10⁹/L</strong> without anticoagulation, but higher pragmatic thresholds (≈40–50×10⁹/L) when full‑dose AC is needed <sup className="md-citation">[3]</sup><sup className="md-citation">[4]</sup>.</li>
                  </ul>
                  <blockquote>
                    <p><strong>Practical synthesis</strong>: For a cancer patient with postoperative PE, <strong>platelets ≥50×10⁹/L</strong> is the most commonly cited threshold to <strong>allow full‑dose anticoagulation</strong>, while <strong>&lt;50×10⁹/L</strong> generally prompts <strong>dose reduction, transfusion‑supported therapy, or temporary holding</strong> depending on thrombotic versus bleeding risk <sup className="md-citation">[1]</sup><sup className="md-citation">[2]</sup><sup className="md-citation">[3]</sup>.</p>
                  </blockquote>
                  <hr />
                  <p><strong>2. Timing After Abdominal Cancer Surgery for (Re)Starting Anticoagulation</strong></p>
                  <p>The literature differentiates <strong>VTE prophylaxis after surgery</strong> from <strong>treatment‑dose anticoagulation</strong>, but prophylaxis data help anchor <strong>earliest safe timing</strong>.</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Context</th>
                        <th>Suggested timing after abdominal surgery</th>
                        <th>Supporting evidence / comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Prophylactic anticoagulation (not PE treatment)</strong> after major abdomino‑pelvic cancer surgery</td>
                        <td>Typically <strong>6–24 h post‑op</strong> once hemostasis secured</td>
                        <td>CHEST guidance for postoperative anticoagulation: treatment (warfarin/anticoagulation) <strong>started between 6 and 10 h after surgery</strong> in major orthopedic surgery <sup className="md-citation">[5]</sup>; <strong>EMA apixaban label</strong> for postoperative prophylaxis: initial dose <strong>12–24 h after surgery</strong> when hemostasis achieved <sup className="md-citation">[6]</sup>. In abdomino‑pelvic cancer surgery, LMWH prophylaxis such as <strong>bemiparine</strong> started early post‑op reduced major VTE without increasing hemorrhage <sup className="md-citation">[7]</sup>.</td>
                      </tr>
                      <tr>
                        <td><strong>Therapeutic anticoagulation in cancer‑associated VTE</strong> after procedures</td>
                        <td>Typically <strong>24–72 h</strong> after high‑bleeding‑risk surgery, individualized</td>
                        <td><strong>ASH “How I treat” perioperative review</strong> stresses waiting until <strong>adequate hemostasis</strong> is documented, with delay toward <strong>48–72 h</strong> for high‑bleeding‑risk surgery and full‑dose therapy <sup className="md-citation">[8]</sup>. Abdominal oncologic surgery is generally categorized as <strong>high bleeding risk</strong>.</td>
                      </tr>
                      <tr>
                        <td><strong>Periprocedural interruption in cancer‑associated VTE</strong></td>
                        <td>High postoperative VTE and major bleeding rates when AC interrupted; highlights need for timely restart</td>
                        <td>In a self‑controlled series of cancer‑associated VTE with perioperative AC interruption, <strong>postoperative VTE and major bleeding rates were both high</strong> <sup className="md-citation">[9]</sup>, underscoring that <strong>prolonged withholding</strong> of AC is hazardous and restart should not be excessively delayed once hemostasis is secure.</td>
                      </tr>
                    </tbody>
                  </table>
                  <p>Clinical synthesis for <strong>post‑abdominal surgery cancer patients with PE</strong>:</p>
                  <ul>
                    <li>Abdominal oncologic surgery is <strong>high bleeding risk</strong>, so <strong>full‑dose anticoagulation is rarely started earlier than 24 h</strong>, and more often <strong>48–72 h post‑op</strong>, assuming:
                      <ul>
                        <li>No active bleeding or uncontrolled surgical site oozing.</li>
                        <li>Stable hemoglobin and hemodynamics.</li>
                        <li><strong>Platelets ≥50×10⁹/L</strong> (or transfusion support if lower and thrombosis risk extreme).</li>
                      </ul>
                    </li>
                    <li>For patients who develop <strong>acute PE very early post‑op</strong>, many experts use:
                      <ul>
                        <li><strong>Prophylactic or intermediate‑dose LMWH</strong> in the first <strong>24–48 h</strong>, escalating to full dose as soon as bleeding risk diminishes and platelets are adequate.</li>
                        <li><strong>Mechanical prophylaxis</strong> (IPC devices) while anticoagulation is held or minimized.</li>
                      </ul>
                    </li>
                    <li>The self‑controlled series in cancer‑associated VTE patients with periprocedural interruption <sup className="md-citation">[9]</sup> emphasizes that <strong>excessive delay in resuming AC increases VTE risk</strong>, reinforcing the need to move to <strong>full‑dose therapy as soon as hemostasis and platelet thresholds are acceptable</strong>.</li>
                  </ul>
                  <hr />
                  <p><strong>Integrated Answer for the Research Question</strong></p>
                  <ul>
                    <li><strong>Platelet thresholds</strong> supported by current evidence and expert consensus for <strong>full‑dose treatment of cancer‑associated PE after abdominal surgery</strong>:
                      <ul>
                        <li><strong>≥50×10⁹/L</strong>: full‑dose anticoagulation is generally supported if surgical hemostasis is secure and bleeding risk acceptable <sup className="md-citation">[1]</sup><sup className="md-citation">[2]</sup><sup className="md-citation">[3]</sup>.</li>
                        <li><strong>25–50×10⁹/L</strong>: consider reduced‑dose anticoagulation or full dose with <strong>platelet transfusion support</strong>, especially in the first <strong>4 weeks</strong> of acute PE/VTE <sup className="md-citation">[3]</sup>.</li>
                        <li><strong>&lt;25×10⁹/L</strong>: typically hold therapeutic anticoagulation; rely on mechanical measures, consider IVC filter only in exceptional situations <sup className="md-citation">[3]</sup><sup className="md-citation">[4]</sup>.</li>
                      </ul>
                    </li>
                    <li><strong>Timing after abdominal cancer surgery</strong>:
                      <ul>
                        <li>Prophylactic dosing can safely begin <strong>6–24 h</strong> post‑op once hemostasis is achieved <sup className="md-citation">[5]</sup><sup className="md-citation">[6]</sup><sup className="md-citation">[7]</sup>.</li>
                        <li>For <strong>therapeutic dosing for PE</strong>, evidence and expert practice support starting <strong>full‑dose anticoagulation around 24–72 h post‑op</strong>, typically closer to <strong>48–72 h</strong> after high‑risk abdominal cancer surgery, contingent on:
                          <ul>
                            <li><strong>Stable hemostasis</strong>,</li>
                            <li><strong>Platelets ≥50×10⁹/L</strong> (or transfusion‑supported strategy if thrombotic risk is critical),</li>
                            <li>No ongoing bleeding or significant surgical concerns <sup className="md-citation">[3]</sup><sup className="md-citation">[8]</sup><sup className="md-citation">[9]</sup>.</li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <p>These thresholds and timings should be individualized in a <strong>multidisciplinary discussion</strong> (surgery, oncology, hematology) because evidence remains largely observational and expert‑opinion–based rather than derived from randomized trials in this specific setting.</p>
                </div>
              </div>

              <div className="landing-case-card">
                <div style={{
                  textAlign: 'center',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  background: isDark ? '#8FA5B5' : '#4A6B7D',
                  borderRadius: '12px 12px 0 0',
                  margin: '-1.25rem -1.25rem 1.5rem -1.25rem'
                }}>
                  <h3 style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: '0.35rem',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em'
                  }}>DDx</h3>
                  <p style={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.85)',
                    margin: 0,
                    fontWeight: 400
                  }}>Structured reasoning</p>
                </div>
                <div className="landing-case-snippet markdown-body" style={{ marginTop: 16 }}>
                  {/* Header */}
                  <div style={{
                    marginBottom: 18,
                    paddingBottom: 12,
                    borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`
                  }}>
                    <h2 style={{
                      fontSize: 18,
                      fontWeight: 600,
                      margin: 0,
                      color: isDark ? '#f5f5f5' : '#0f172a',
                      letterSpacing: '-0.02em',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                    }}>
                      Differential Diagnosis
                    </h2>
                  </div>

                  {/* Differential Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      {
                        condition: 'Submassive (intermediate‑risk) pulmonary embolism with RV strain',
                        likelihood: '~65–75%',
                        supporting: [
                          'Confirmed segmental PE on CT angiogram',
                          'Objective right‑ventricular strain on imaging',
                          'Acute tachypnea, tachycardia, hypoxemia despite 4 L O₂',
                          'Recent major cancer surgery and chemotherapy = very high VTE risk'
                        ],
                        against: ['No reported hypotension yet (so not massive PE)']
                      },
                      {
                        condition: 'Early anastomotic leak with evolving intra‑abdominal sepsis',
                        likelihood: '~40–50% (can coexist with PE)',
                        supporting: [
                          'Free air near anastomosis on CT concerning for leak',
                          'POD#3 after right hemicolectomy (classic window for early leak)',
                          'Rising creatinine and drop in hemoglobin could reflect third‑spacing, inflammation, or concealed intra‑abdominal bleeding/infection'
                        ],
                        against: ['No explicit report of fever, peritonitis, or hypotension yet (but may be early or under‑recognized)']
                      },
                      {
                        condition: 'Post‑operative intra‑abdominal or anastomotic hemorrhage',
                        likelihood: '~30–40%',
                        supporting: [
                          'Hemoglobin fall from 11 → 8 g/dL over short interval',
                          'Major abdominal surgery with free air near anastomosis (could be leak or bleeding site)',
                          'Thrombocytopenia (60k) and recent chemotherapy → impaired hemostasis'
                        ],
                        against: [
                          'No mention of hemodynamic collapse or obvious external bleeding',
                          'No explicit description of large intra‑abdominal collection on CT (but this may not have been fully characterized)'
                        ]
                      },
                      {
                        condition: 'Acute kidney injury (multifactorial: contrast, sepsis, low effective volume, nephrotoxic meds)',
                        likelihood: '~70–80% (already present)',
                        supporting: [
                          'Creatinine 1.4 → 2.2 mg/dL',
                          'Recent contrast from CT angiogram',
                          'Potential sepsis/low perfusion from PE and/or leak'
                        ],
                        against: ['None; AKI is established, question is etiology mix']
                      },
                      {
                        condition: 'Type 2 myocardial infarction / demand ischemia (plus possible underlying CAD event)',
                        likelihood: '~20–30%',
                        supporting: [
                          'Known coronary artery disease with prior stent',
                          'Acute hypoxemia, tachycardia, anemia, and possible sepsis → high myocardial oxygen demand/low supply'
                        ],
                        against: ['No chest pain or ischemic ECG changes reported (but patient may be sedated, elderly, or atypical)']
                      },
                      {
                        condition: 'Hospital‑acquired pneumonia / atelectasis contributing to hypoxemia',
                        likelihood: '~15–25%',
                        supporting: [
                          'POD#3 with tachypnea and new hypoxemia',
                          'Immobilization, abdominal pain, shallow breathing → atelectasis risk'
                        ],
                        against: [
                          'CT angiogram often gives some view of lung parenchyma—no pneumonia mentioned',
                          'Timing and severity better explained by proven PE'
                        ]
                      },
                      {
                        condition: 'Thrombocytopenia due to perioperative consumption / sepsis / chemotherapy‑related marrow suppression (vs. HIT)',
                        likelihood: '~60–70% for non‑HIT; ~10–15% for HIT',
                        supporting: [
                          'Recent major surgery and chemotherapy',
                          'Platelets 60k without specific HIT timing given'
                        ],
                        against: ['No clear history of recent heparin exposure or biphasic platelet fall provided']
                      }
                    ].map((diff, index) => (
                      <div key={index} style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                        borderRadius: 14,
                        padding: 16,
                        boxShadow: isDark
                          ? '0 4px 16px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.3)'
                          : '0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          marginBottom: 16
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <div style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: '#4A6B7D15',
                              border: '1.5px solid #4A6B7D30',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#4A6B7D' }}>{index + 1}</span>
                            </div>
                            <h3 style={{
                              fontSize: 17,
                              fontWeight: 600,
                              margin: 0,
                              color: isDark ? '#f5f5f5' : '#0f172a',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                              letterSpacing: '-0.012em'
                            }}>
                              {diff.condition}
                            </h3>
                          </div>
                          <div style={{
                            background: '#4A6B7D12',
                            borderRadius: 100,
                            padding: '6px 14px'
                          }}>
                            <span style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#4A6B7D',
                              whiteSpace: 'nowrap'
                            }}>{diff.likelihood}</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          <div>
                            <h4 style={{
                              fontSize: 14,
                              fontWeight: 650,
                              margin: '0 0 10px 0',
                              color: '#12B76A',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em'
                            }}>Supporting</h4>
                            <div>
                              {diff.supporting.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#12B76A40', marginTop: 8, flexShrink: 0 }} />
                                  <span style={{ fontSize: 16, lineHeight: 1.7, color: isDark ? '#f5f5f5' : '#0f172a' }}>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 style={{
                              fontSize: 14,
                              fontWeight: 650,
                              margin: '0 0 10px 0',
                              color: '#D92D20',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em'
                            }}>Against</h4>
                            <div>
                              {diff.against.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#D92D2040', marginTop: 8, flexShrink: 0 }} />
                                  <span style={{ fontSize: 16, lineHeight: 1.7, color: isDark ? '#f5f5f5' : '#0f172a' }}>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Next Diagnostic Steps */}
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}` }}>
                    <h2 style={{
                      fontSize: 18,
                      fontWeight: 600,
                      margin: '0 0 16px 0',
                      color: isDark ? '#f5f5f5' : '#0f172a',
                      letterSpacing: '-0.02em',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                    }}>
                      Next Diagnostic Steps
                    </h2>
                    <div style={{ fontSize: 17, lineHeight: 1.75, color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#2a2a2a' }}>
                      <p style={{ marginBottom: 12 }}>– <strong>Urgent bedside transthoracic echocardiogram (TTE)</strong> — To quantify RV dysfunction, estimate pulmonary pressures, and evaluate LV function and overall hemodynamics; helps risk‑stratify the PE and guide need for escalation (e.g., thrombolysis or thrombectomy versus anticoagulation alone).</p>
                      <p style={{ marginBottom: 12 }}>– <strong>CT abdomen/pelvis with IV contrast interpreted specifically for leak/hemorrhage, or repeat focused imaging (e.g., contrast CT or IR‑directed CT)</strong> — To better characterize the suspected anastomotic leak and look for intra‑abdominal fluid, collections, or active contrast extravasation indicating ongoing bleeding.</p>
                      <p style={{ marginBottom: 12 }}>– <strong>Full sepsis and bleeding workup</strong><br />
                      – Blood cultures, lactate, CRP, procalcitonin (if used locally) — to assess for intra‑abdominal sepsis.<br />
                      – Serial CBC, coagulation panel (PT/INR, aPTT, fibrinogen), type & screen — to track bleeding and coagulopathy.<br />
                      – Peripheral smear, repeat platelet count, review medication and heparin exposure; calculate 4T score if HIT is a concern.</p>
                      <p style={{ marginBottom: 0 }}>Additional useful tests (secondary priority):<br />
                      – Troponin and ECG — to distinguish primary MI vs. demand ischemia.<br />
                      – Arterial blood gas — to quantify oxygenation/ventilation abnormalities.<br />
                      – Bilateral lower‑extremity duplex ultrasound — to assess clot burden if PE management strategy (e.g., IVC filter) is being considered.</p>
                    </div>
                  </div>

                  {/* Management Considerations */}
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}` }}>
                    <h2 style={{
                      fontSize: 18,
                      fontWeight: 600,
                      margin: '0 0 12px 0',
                      color: isDark ? '#f5f5f5' : '#0f172a',
                      letterSpacing: '-0.02em',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                    }}>
                      Management Considerations
                    </h2>
                    <div style={{ fontSize: 17, lineHeight: 1.75, color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#2a2a2a' }}>
                      <p style={{ marginBottom: 14, fontStyle: 'italic' }}>This patient is critically ill with <em>competing</em> life‑threatening problems: submassive PE with RV strain and very high bleeding risk (fresh abdominal surgery, suspected leak, thrombocytopenia, falling Hb, AKI).</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>1. Level of Care and Initial Stabilization</h3>
                      <p style={{ marginBottom: 8 }}>- <strong>ICU admission</strong> with continuous cardiac, oxygen saturation, and blood pressure monitoring.</p>
                      <p style={{ marginBottom: 8 }}>- <strong>Oxygen strategy</strong><br />
                      &nbsp;&nbsp;- Target SpO₂ ≈ 92–96%; avoid unnecessary high‑flow oxygen in a non‑hypoxic patient.<br />
                      &nbsp;&nbsp;- Trials like <strong>AVOID</strong> and <strong>DETO2X‑AMI</strong> suggest that liberal oxygen in non‑hypoxic MI may worsen outcomes; by analogy, titrate oxygen to need rather than default high‑dose.</p>
                      <p style={{ marginBottom: 12 }}>- <strong>Hemodynamic support</strong><br />
                      &nbsp;&nbsp;- Maintain MAP ≥65 mmHg with fluids and vasopressors if needed, avoiding fluid overload that can worsen RV failure.<br />
                      &nbsp;&nbsp;- Norepinephrine is preferred vasopressor if hypotension develops.</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>2. Pulmonary Embolism Management</h3>
                      <p style={{ marginBottom: 8 }}><strong>Risk category:</strong><br />- Hemodynamically stable but with RV strain → <em>intermediate‑high‑risk (submassive)</em> PE.</p>

                      <p style={{ marginBottom: 8 }}><strong>Anticoagulation vs. bleeding risk</strong></p>
                      <p style={{ marginBottom: 8 }}>- Standard care for submassive PE is <strong>systemic anticoagulation</strong> (usually heparin) without routine thrombolysis.<br />
                      - However, this patient has:<br />
                      &nbsp;&nbsp;- POD#3 major abdominal surgery with suspected <em>anastomotic leak</em><br />
                      &nbsp;&nbsp;- Hb drop 11 → 8 g/dL<br />
                      &nbsp;&nbsp;- Platelets 60k<br />
                      &nbsp;&nbsp;- Rising creatinine<br />
                      &nbsp;&nbsp;→ extremely high risk of catastrophic bleeding.</p>

                      <p style={{ marginBottom: 8 }}><strong>Thrombolysis?</strong></p>
                      <p style={{ marginBottom: 8 }}>- <strong>PEITHO</strong> showed that tenecteplase in submassive PE reduced the composite of death or hemodynamic decompensation (driven by fewer decompensations) but <em>significantly increased</em> major extracranial bleeding and stroke.<br />
                      - In a fresh post‑op patient with suspected anastomotic leak and platelets 60k, systemic thrombolysis is <strong>contraindicated</strong> unless he becomes profoundly unstable and no other options exist.</p>

                      <p style={{ marginBottom: 8 }}><strong>Proposed approach:</strong></p>
                      <p style={{ marginBottom: 12 }}>1. <strong>Immediate multidisciplinary discussion</strong> (ICU, surgery, hematology, interventional radiology/cardiology, and potentially PE response team if available).<br />
                      2. <strong>Assess if any anticoagulation is possible</strong>:<br />
                      &nbsp;&nbsp;- If surgical team believes bleeding/leak is small and controllable and there is no expanding hematoma, consider <strong>carefully monitored IV unfractionated heparin</strong> (UFH), because:<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;- Short half‑life and fully reversible with protamine.<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;- Dose can be titrated and temporarily stopped around procedures.<br />
                      &nbsp;&nbsp;- Given platelets 60k, standard therapeutic anticoagulation is high‑risk; many centers avoid full‑dose anticoagulation when platelets &lt;50k and are cautious 50–100k.<br />
                      3. <strong>If anticoagulation is deemed unsafe or only very low dose is possible:</strong><br />
                      &nbsp;&nbsp;- <strong>Place a temporary IVC filter</strong> as soon as feasible to prevent further emboli from reaching the lungs while bleeding and leak are addressed.<br />
                      &nbsp;&nbsp;- This is not ideal but is reasonable in a <em>cancer</em> patient with high VTE risk and <em>absolute or near‑absolute contraindication</em> to anticoagulation.<br />
                      &nbsp;&nbsp;- Begin full‑dose anticoagulation as soon as bleeding risk becomes acceptable, and then plan for filter retrieval.<br />
                      4. <strong>Catheter‑directed therapy</strong> (e.g., catheter‑directed thrombolysis or mechanical thrombectomy) could be considered if hemodynamics worsen, in a center with expertise:<br />
                      &nbsp;&nbsp;- Potentially uses lower doses of lytics, but data are limited; bleeding risk remains substantial, especially with recent abdominal surgery and thrombocytopenia.</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>3. Management of Suspected Anastomotic Leak and Bleeding</h3>
                      <p style={{ marginBottom: 8 }}>- <strong>Urgent surgical consult</strong> (if not already involved) — this is co‑primary problem with the PE.<br />
                      - Evaluate need for:<br />
                      &nbsp;&nbsp;- <strong>Re‑exploration / laparoscopy</strong>, or<br />
                      &nbsp;&nbsp;- <strong>Percutaneous drainage</strong> of collection, or<br />
                      &nbsp;&nbsp;- Close observation if imaging suggests only minimal local free air without fluid and the patient is hemodynamically stable.<br />
                      - <strong>Broad‑spectrum IV antibiotics</strong> empirically, covering gram‑negative, anaerobic, and potentially enterococcal organisms (e.g., piperacillin‑tazobactam; local protocols vary).<br />
                      - <strong>Source control principles:</strong> early identification and drainage or repair if leak is clinically significant.<br />
                      - <strong>Bleeding management</strong><br />
                      &nbsp;&nbsp;- Serial Hb and hemodynamics.<br />
                      &nbsp;&nbsp;- If ongoing fall in Hb or hemodynamic instability → urgent surgical/IR evaluation for active bleed.</p>

                      <p style={{ marginBottom: 8 }}><strong>Transfusion strategy</strong></p>
                      <p style={{ marginBottom: 12 }}>- Multiple trials (TRICC, TRISS, <strong>FOCUS</strong>, <strong>REALITY</strong>, <strong>TRICS III</strong>, UGIB trial) support <strong>restrictive transfusion thresholds</strong> in most settings.<br />
                      - However, in active postoperative bleeding with coronary disease and current Hb 8 g/dL, it is reasonable to:<br />
                      &nbsp;&nbsp;- Transfuse if Hb &lt;7 g/dL, <strong>or</strong><br />
                      &nbsp;&nbsp;- Transfuse earlier (e.g., Hb 7–8 g/dL) if there are signs of myocardial ischemia, ongoing bleeding, hypotension, or significant hypoxemia.<br />
                      &nbsp;&nbsp;- <strong>FOCUS</strong> and <strong>REALITY</strong> suggest that liberal transfusion (&gt;10 g/dL) confers no advantage for stable cardiac patients or MI patients, respectively.<br />
                      - Platelets: with count <strong>60k</strong>, consider platelet transfusion if:<br />
                      &nbsp;&nbsp;- There is active bleeding or<br />
                      &nbsp;&nbsp;- Invasive procedure/re‑operation is planned (surgeons often prefer ≥75–100k for major abdominal surgery).</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>4. Thrombocytopenia and Coagulation</h3>
                      <p style={{ marginBottom: 12 }}>- Review meds and heparin exposures; calculate 4T score for HIT if appropriate.<br />
                      - If HIT risk moderate–high:<br />
                      &nbsp;&nbsp;- Stop all heparin, send HIT antibody testing, and use a non‑heparin anticoagulant <em>only if</em> bleeding risk allows.<br />
                      - If thrombocytopenia is likely due to sepsis, perioperative consumption, or chemotherapy:<br />
                      &nbsp;&nbsp;- Treat underlying processes (source control, supportive care).<br />
                      &nbsp;&nbsp;- Transfuse platelets around procedures or if platelets &lt;50k with active bleeding.</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>5. Acute Kidney Injury Management</h3>
                      <p style={{ marginBottom: 12 }}>- Likely multifactorial: contrast, sepsis or low flow, nephrotoxic agents, and possibly high intra‑abdominal pressure.<br />
                      - Management:<br />
                      &nbsp;&nbsp;- Optimize hemodynamics (avoid both hypotension and fluid overload).<br />
                      &nbsp;&nbsp;- Review and discontinue nephrotoxins (e.g., NSAIDs, ACEi/ARB, possibly adjust diuretics, hold metformin).<br />
                      &nbsp;&nbsp;- Adjust doses of all renally‑cleared medications, especially anticoagulants.<br />
                      &nbsp;&nbsp;- Monitor urine output and daily weights; consult nephrology early if oliguria, rising Cr, or electrolyte derangements progress.</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>6. Cardiovascular and Metabolic Care</h3>
                      <p style={{ marginBottom: 12 }}>- <strong>CAD/demand ischemia</strong><br />
                      &nbsp;&nbsp;- Trend troponins and ECGs.<br />
                      &nbsp;&nbsp;- Continue beta‑blocker and statin if not contraindicated; adjust aspirin depending on bleeding risk and coordination with surgery and any planned procedures.<br />
                      - <strong>Glycemic control in the ICU</strong><br />
                      &nbsp;&nbsp;- Use insulin to target glucose ~140–180 mg/dL.<br />
                      &nbsp;&nbsp;- <strong>Leuven Surgical Trial</strong> suggested benefit from very tight control (80–110), but the large <strong>NICE‑SUGAR</strong> trial later showed increased mortality with intensive control; current standards endorse moderate targets.</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>7. Respiratory Support</h3>
                      <p style={{ marginBottom: 12 }}>- Escalate as needed: nasal cannula → high‑flow nasal cannula → non‑invasive ventilation → intubation if worsening work of breathing, altered mental status, or refractory hypoxemia.<br />
                      - Encourage upright positioning, incentive spirometry as tolerated; treat pain adequately to permit deep breathing and coughing.</p>

                      <h3 style={{ fontSize: 17, fontWeight: 650, margin: '16px 0 10px 0', color: isDark ? '#f5f5f5' : '#0f172a' }}>8. Cancer and Long‑Term VTE Strategy</h3>
                      <p style={{ marginBottom: 0 }}>- Once the acute bleeding and leak issues are controlled and platelets improve, he will likely need <strong>extended anticoagulation</strong> (at least 3–6+ months) for cancer‑associated thrombosis, often with LMWH or DOAC (depending on GI bleeding risk, renal function, and drug interactions).<br />
                      - Evaluate adjuvant oncologic plan with oncology once stabilized.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-case-card landing-case-card--highlight" style={{ alignSelf: 'center' }}>
                <div style={{
                  textAlign: 'center',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  background: isDark ? '#8FA5B5' : '#4A6B7D',
                  borderRadius: '12px 12px 0 0',
                  margin: '-1.25rem -1.25rem 1.5rem -1.25rem'
                }}>
                  <h3 style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: '0.35rem',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em'
                  }}>A&P</h3>
                  <p style={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.85)',
                    margin: 0,
                  fontWeight: 400
                }}>Documentation ready</p>
              </div>
                <div className="landing-case-snippet markdown-body" style={{ marginTop: 0 }}>
                  <h3>Assessment</h3>
                  <p>72-year-old man, post-op day 3 from right hemicolectomy, with segmental PE and RV strain; AKI stage with creatinine 2.2; thrombocytopenia 60k; suspected anastomotic leak near ileocolic junction.</p>

                  <h3>Plan</h3>
                  <p><strong>Acute pulmonary embolism with RV strain (I26.9)</strong> – treat with therapeutic anticoagulation; assess bleeding risk given recent surgery and platelets 60k; consider alternative if contraindicated; monitor closely for hemodynamics and oxygenation (PEITHO, ongoing data).</p>
                  <ul>
                    <li>Begin therapeutic IV heparin infusion with frequent aPTT checks; adjust to target 1.5–2.5x control</li>
                    <li>Hold advancement of any invasive procedures unless bleeding controlled; consider IVC filter only if contraindication to anticoagulation persists (clinical judgment)</li>
                    <li>Daily chest imaging and pulse oximetry; ensure supplemental oxygen to maintain SpO2 &gt;92%</li>
                    <li>Platelets and hemoglobin monitored q12–24h; transfuse platelets if bleeding or invasive procedure required and platelets &lt;50k</li>
                  </ul>

                  <p><strong>Postoperative complication: possible anastomotic leak (K91.83)</strong> – manage with NPO, GI surgery consult, imaging as indicated; monitor for fever, leukocytosis, increasing drain output</p>
                  <ul>
                    <li>GI surgery consult; obtain consult recommendations</li>
                    <li>NPO; IV fluids; consider broad-spectrum antibiotics if infection suspected</li>
                    <li>Monitor abdominal exam, drain output, abdominal girth, and lactate</li>
                  </ul>

                  <p><strong>Acute kidney injury (N17.9)</strong> – optimize perfusion; avoid nephrotoxins; adjust meds</p>
                  <ul>
                    <li>Ensure euvolemia; avoid contrast if possible; use isotonic fluids judiciously</li>
                    <li>Check BMP, urine output hourly; adjust nephrotoxic meds</li>
                  </ul>

                  <p><strong>Diabetes and CAD history</strong> – continue chronic disease management with attention to perioperative risk</p>
                  <ul>
                    <li>Maintain glucose control per protocol; continue statin/ACEi as clinically appropriate</li>
                    <li>Cardiology and nephrology consult as needed given CKD and prior stent</li>
                  </ul>

                  <p><strong>DVT prophylaxis (General)</strong> – inpatient with high thrombotic risk</p>
                  <ul>
                    <li>Mechanical compression devices; reassess need for pharmacologic DVT ppx once bleeding risk permits</li>
                  </ul>

                  <p><strong>General</strong></p>
                  <ul>
                    <li>DVT ppx: SQ heparin</li>
                    <li>Diet: NPO advancing as leak risk permits; monitor caloric intake</li>
                    <li>Dispo: inpatient observation; surgical and interventional radiology follow-up for leak and PE management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
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
