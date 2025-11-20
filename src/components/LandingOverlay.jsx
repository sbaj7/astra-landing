import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search, Sparkles, FileText, ArrowRight, Activity, BookOpen, Stethoscope, ArrowUp } from 'lucide-react';
import { useTheme } from './Themes+Styles.jsx';
import GrowingTextView from './GrowingTextView.jsx';
import './LandingOverlay.css';

const ModeSwitcher = ({ currentMode, onModeChange, theme, isMobile }) => {
  const modes = [
    { key: 'search', title: 'Research', icon: Search },
    { key: 'reason', title: 'DDx', icon: Sparkles },
    { key: 'write', title: 'A&P', icon: FileText }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? 4 : 6,
      flexWrap: 'nowrap'
    }}>
      {modes.map(({ key, title, icon: Icon }) => {
        const isSelected = currentMode === key;
        return (
          <div key={key} style={{ position: 'relative', display: 'flex' }}>
            <button
              onClick={() => onModeChange(key)}
              aria-pressed={isSelected}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingTop: isMobile ? '5px' : '6px',
                paddingBottom: isMobile ? '5px' : '6px',
                paddingLeft: isMobile ? '10px' : '10px',
                paddingRight: isMobile ? '10px' : '10px',
                borderRadius: 50,
                border: `1px solid ${theme.textSecondary}50`,
                backgroundColor: isSelected ? theme.accentSoftBlue : 'transparent',
                color: isSelected ? '#fff' : theme.textPrimary,
                fontSize: isMobile ? 11 : 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all .2s ease'
              }}
            >
              <Icon size={10} />
              <span>{title}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

const LandingOverlay = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState('reason');
  const [demoText, setDemoText] = useState('');
  const [demoHeight, setDemoHeight] = useState(44);
  const { isDark, colors: theme } = useTheme();
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll Animation Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [isVisible]); // Re-run when visible to ensure elements exist

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 600); // Match CSS transition duration
  };

  const scrollToDemo = () => {
    const demoSection = document.getElementById('landing-demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`landing-overlay ${isVisible ? 'landing-overlay--visible' : ''}`}
    >
      {/* Close button */}
      <button onClick={handleClose} className="landing-close-btn" aria-label="Close">
        <X size={24} strokeWidth={2} />
      </button>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-gradient-orb" />

        <div className="landing-logo-container">
          <img
            src="/Untitled design-3.png"
            alt="Astra Logo"
            className="landing-logo-img"
          />
        </div>

        <h1 className="landing-title">
          The clinical engine that unifies evidence, reasoning, and documentation.
        </h1>

        <p className="landing-subtitle">
          A clinical engine built to handle the work that actually decides outcomes:
          finding the right evidence, thinking through messy cases, and turning judgment
          into clear, defensible documentation.
        </p>

        <div className="landing-cta-wrapper">
          <button onClick={handleClose} className="landing-cta-btn">
            <span>Start Using Astra</span>
            <ArrowRight size={20} className="landing-cta-arrow" />
          </button>
        </div>

        <div className="landing-stats">
          <div className="landing-stat-item">
            <span className="landing-stat-val">1,000+</span>
            <span className="landing-stat-label">Healthcare Pros</span>
          </div>
          <div className="landing-stat-item">
            <span className="landing-stat-val">100k+</span>
            <span className="landing-stat-label">Questions Answered</span>
          </div>
        </div>

        <div className="landing-scroll-hint" onClick={scrollToDemo} style={{ cursor: 'pointer' }}>
          <span>Scroll to explore</span>
          <ChevronDown size={20} className="landing-scroll-icon" />
        </div>
      </section>

      {/* Demo / Problem Section */}
      <section id="landing-demo" className="landing-section reveal-on-scroll">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Built for the full clinical chain.</h2>
          <p className="landing-section-desc">
            Most tools nibble at the edge of the problem. Astra takes responsibility for the whole process.
          </p>
        </div>

        <div className="landing-demo-container" style={{
          overflow: 'visible'
        }}>
          <div style={{
            maxWidth: isMobile ? 'calc(100vw - 24px)' : '48rem',
            margin: '0 auto',
            width: '100%',
            padding: isMobile ? '0 12px' : '0',
            overflow: 'visible'
          }}>
            <div style={{
              position: 'relative',
              backgroundColor: `${theme.backgroundSurface}F5`,
              borderRadius: isMobile ? 22 : 28,
              border: `1px solid ${theme.textSecondary}25`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)`,
              overflow: 'visible',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* Input Row */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 8 : 10,
                padding: isMobile ? '10px 10px 4px 10px' : '12px 12px 6px 12px'
              }}>
                <div style={{
                  flex: 1,
                  padding: '8px 10px',
                  fontSize: isMobile ? 16 : 17,
                  lineHeight: 1.4,
                  color: theme.textPrimary,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                  fontWeight: 400,
                  letterSpacing: '-0.011em',
                  minHeight: 24,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {selectedMode === 'search' ? 'What are the platelet thresholds for anticoagulation in cancer-associated PE?' :
                    selectedMode === 'reason' ? '72M post-op day 3 right hemicolectomy, new hypoxia and tachycardia...' :
                      'Draft an admission note for this patient focusing on the PE management plan.'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, paddingBottom: 2 }}>
                  <button
                    disabled
                    aria-label="Send"
                    style={{
                      padding: isMobile ? 8 : 10,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: `${theme.textSecondary}20`,
                      cursor: 'not-allowed',
                      color: '#fff',
                      opacity: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <ArrowUp size={isMobile ? 18 : 20} />
                  </button>
                </div>
              </div>

              {/* Mode Switcher Row - Bottom */}
              <div style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 0,
                paddingBottom: isMobile ? 10 : 14,
                paddingLeft: isMobile ? 12 : 16,
                paddingRight: isMobile ? 12 : 16,
                gap: isMobile ? 8 : 12
              }}>
                <div style={{ flexShrink: 0 }}>
                  <ModeSwitcher
                    currentMode={selectedMode}
                    onModeChange={setSelectedMode}
                    theme={theme}
                    isMobile={isMobile}
                  />
                </div>
                <p style={{
                  fontSize: isMobile ? 10 : 11,
                  color: theme.textSecondary,
                  margin: 0,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                  fontWeight: 400,
                  opacity: 0.5,
                  lineHeight: 1.3,
                  whiteSpace: isMobile ? 'normal' : 'nowrap',
                  marginLeft: 'auto',
                  textAlign: 'right',
                  maxWidth: isMobile ? '90px' : 'none',
                  flexShrink: 1
                }}>
                  Astra can make mistakes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Walkthrough Section */}
      <section className="landing-section">
        <div className="landing-section-header reveal-on-scroll">
          <h2 className="landing-section-title">Walk through a case</h2>
          <p className="landing-section-desc">
            72-year-old man, post-op day 3 after right hemicolectomy for colon cancer. History of diabetes, CAD, CKD.
            Overnight becomes tachypneic and tachycardic (SpO2 88%). CT angiogram shows segmental PE with RV strain
            and free air near anastomosis. Hb 11 → 8, Plt 60k, Cr 1.4 → 2.2.
          </p>
        </div>

        <div className="landing-case-grid">

          {/* Research Card (Full Width) */}
          <div className="landing-glass-card landing-case-item-research reveal-on-scroll delay-100">
            <div className="landing-card-header">
              <div className="landing-card-icon">
                <BookOpen size={20} />
              </div>
              <h3 className="landing-card-title">Evidence Synthesis</h3>
            </div>
            <div className="landing-md-content">
              <p><strong>Summary</strong></p>
              <p>Evidence is largely extrapolated from <strong>cancer‑associated VTE</strong> and <strong>perioperative anticoagulation</strong> guidance rather than trials specific to post‑abdominal surgery PE in cancer. Still, there is reasonably consistent expert consensus on <strong>platelet thresholds</strong> and <strong>postoperative timing</strong>.</p>
              <hr />
              <p><strong>1. Platelet Count Thresholds for Full‑Dose Anticoagulation in Cancer‑Associated PE</strong></p>
              <table>
                <thead>
                  <tr>
                    <th>Platelet count (×10⁹/L)</th>
                    <th>Suggested strategy</th>
                    <th>Key evidence / rationale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>&gt; 50</strong></td>
                    <td><strong>Full‑dose acceptable</strong> if bleeding risk manageable</td>
                    <td><strong>Falanga 2023</strong>: “In patients with platelet count &gt;50 000/µL, full therapeutic dose anticoagulation should be considered.”</td>
                  </tr>
                  <tr>
                    <td><strong>50–70</strong></td>
                    <td><strong>Avoid or individualize</strong> full‑dose AC</td>
                    <td><strong>Mosarla 2019</strong>: anticoagulation should be avoided when platelets &lt;50–70 000/µL, depending on thrombotic risk.</td>
                  </tr>
                  <tr>
                    <td><strong>25–50</strong></td>
                    <td><strong>Dose‑reduced LMWH</strong> or transfusion support</td>
                    <td><strong>Blood Advances</strong>: “Limited duration of full‑dose anticoagulation with platelet transfusion support for the first 4 weeks...”</td>
                  </tr>
                  <tr>
                    <td><strong>&lt; 25</strong></td>
                    <td><strong>Hold anticoagulation</strong></td>
                    <td>Consider mechanical prophylaxis, IVC filter only if absolutely necessary.</td>
                  </tr>
                </tbody>
              </table>

              <blockquote>
                <p><strong>Practical synthesis</strong>: For a cancer patient with postoperative PE, <strong>platelets ≥50×10⁹/L</strong> is the most commonly cited threshold to allow full‑dose anticoagulation.</p>
              </blockquote>

              <p><strong>2. Timing After Abdominal Cancer Surgery</strong></p>
              <p>Abdominal oncologic surgery is <strong>high bleeding risk</strong>, so full‑dose anticoagulation is rarely started earlier than <strong>24h</strong>, and more often <strong>48–72h post‑op</strong>, assuming stable hemostasis.</p>
            </div>
          </div>

          {/* DDx Card (Half Width) */}
          <div className="landing-glass-card landing-case-item-ddx reveal-on-scroll delay-200">
            <div className="landing-card-header">
              <div className="landing-card-icon">
                <Stethoscope size={20} />
              </div>
              <h3 className="landing-card-title">Differential Diagnosis</h3>
            </div>
            <div className="landing-md-content">
              {[
                {
                  name: 'Submassive PE with RV strain',
                  prob: '~65–75%',
                  supporting: ['Confirmed segmental PE on CT', 'Objective RV strain', 'Acute tachypnea/hypoxia', 'High VTE risk (cancer/surgery)'],
                  against: ['No hypotension yet']
                },
                {
                  name: 'Anastomotic leak',
                  prob: '~40–50%',
                  supporting: ['Free air near anastomosis', 'POD#3 timing', 'Rising Cr, falling Hb'],
                  against: ['No explicit peritonitis reported yet']
                },
                {
                  name: 'Post-op hemorrhage',
                  prob: '~30–40%',
                  supporting: ['Hb 11 → 8', 'Thrombocytopenia (60k)', 'Major surgery'],
                  against: ['No hemodynamic collapse yet']
                },
                {
                  name: 'Acute Kidney Injury',
                  prob: '~70–80%',
                  supporting: ['Cr 1.4 → 2.2', 'Contrast exposure', 'Sepsis risk'],
                  against: ['None (established diagnosis)']
                },
                {
                  name: 'Type 2 MI',
                  prob: '~20–30%',
                  supporting: ['Known CAD', 'Demand ischemia (hypoxia/tachycardia)'],
                  against: ['No chest pain reported']
                },
                {
                  name: 'HAP / Atelectasis',
                  prob: '~15–25%',
                  supporting: ['New hypoxemia', 'Immobilization'],
                  against: ['CT shows PE, not pneumonia']
                },
                {
                  name: 'Thrombocytopenia (Non-HIT)',
                  prob: '~60–70%',
                  supporting: ['Recent chemo', 'Consumption'],
                  against: ['No clear heparin exposure history for HIT']
                }
              ].map((item, i) => (
                <div key={i} className="landing-ddx-item">
                  <div className="landing-ddx-header">
                    <span className="landing-ddx-name">{item.name}</span>
                    <span className="landing-ddx-prob">{item.prob}</span>
                  </div>
                  <div className="landing-ddx-grid">
                    <div>
                      <div className="landing-ddx-col-title supporting">Supporting</div>
                      <ul className="landing-ddx-list">
                        {item.supporting.map((s, j) => <li key={j}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="landing-ddx-col-title against">Against</div>
                      <ul className="landing-ddx-list">
                        {item.against.map((a, j) => <li key={j}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Management Card (Half Width) */}
          <div className="landing-glass-card landing-case-item-management reveal-on-scroll delay-200">
            <div className="landing-card-header">
              <div className="landing-card-icon">
                <Activity size={20} />
              </div>
              <h3 className="landing-card-title">Management Plan</h3>
            </div>
            <div className="landing-md-content">
              <p style={{ fontStyle: 'italic', marginBottom: 24 }}>
                This patient is critically ill with <strong>competing</strong> life‑threatening problems: submassive PE with RV strain and very high bleeding risk.
              </p>

              <h4>1. Level of Care & Stabilization</h4>
              <ul>
                <li><strong>ICU admission</strong> with continuous monitoring.</li>
                <li><strong>Oxygen:</strong> Target SpO₂ 92–96%. Avoid unnecessary high-flow.</li>
                <li><strong>Hemodynamics:</strong> Maintain MAP ≥65 mmHg. Norepinephrine if needed.</li>
              </ul>

              <h4>2. PE Management</h4>
              <ul>
                <li><strong>Risk:</strong> Intermediate-high (submassive).</li>
                <li><strong>Anticoagulation:</strong> Currently <strong>contraindicated</strong> due to suspected leak, falling Hb, and platelets 60k.</li>
                <li><strong>Thrombolysis:</strong> Contraindicated (bleeding risk).</li>
                <li><strong>Plan:</strong>
                  <ul>
                    <li><strong>Place temporary IVC filter</strong> immediately.</li>
                    <li>Consider carefully monitored IV UFH <em>only</em> if surgical team confirms leak is minor/controlled.</li>
                  </ul>
                </li>
              </ul>

              <h4>3. Leak & Bleeding Management</h4>
              <ul>
                <li><strong>Urgent Surgical Consult:</strong> Evaluate for re-exploration vs. drainage.</li>
                <li><strong>Antibiotics:</strong> Broad-spectrum (e.g., Zosyn).</li>
                <li><strong>Transfusion:</strong>
                  <ul>
                    <li>RBCs: Transfuse if Hb &lt;7 or ischemic signs (current Hb 8).</li>
                    <li>Platelets: Consider transfusion if active bleeding or before invasive procedures (target &gt;50k).</li>
                  </ul>
                </li>
              </ul>

              <h4>4. Next Diagnostic Steps</h4>
              <ul>
                <li><strong>TTE:</strong> Quantify RV dysfunction.</li>
                <li><strong>CT Abdomen/Pelvis:</strong> Characterize leak/bleed.</li>
                <li><strong>Labs:</strong> Serial CBC, Coags, Lactate, Blood Cx.</li>
              </ul>
            </div>
          </div>

          {/* Assessment & Plan Card (Full Width) */}
          <div className="landing-glass-card landing-case-item-research reveal-on-scroll delay-300">
            <div className="landing-card-header">
              <div className="landing-card-icon">
                <FileText size={20} />
              </div>
              <h3 className="landing-card-title">Assessment & Plan</h3>
            </div>
            <div className="landing-md-content landing-ap-note">
              <div className="landing-ap-section">
                <div className="landing-ap-section-title">Assessment</div>
                <p>
                  72-year-old male POD#3 right hemicolectomy, presenting with acute hypoxic respiratory failure and tachycardia.
                  CT angiogram confirms segmental pulmonary embolism with right ventricular strain. Concurrently, there is concern for anastomotic leak (free air) and active hemorrhage (Hb 8, Plt 60k).
                  Anticoagulation is currently contraindicated due to high bleeding risk.
                </p>
              </div>

              <div className="landing-ap-section">
                <div className="landing-ap-section-title">Diagnoses</div>
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                  <li>
                    <strong>Acute pulmonary embolism with acute cor pulmonale</strong>
                    <span className="landing-icd-tag">I26.09</span>
                  </li>
                  <li>
                    <strong>Postprocedural hemorrhage of a digestive system organ</strong>
                    <span className="landing-icd-tag">K91.840</span>
                  </li>
                  <li>
                    <strong>Acute kidney injury, unspecified</strong>
                    <span className="landing-icd-tag">N17.9</span>
                  </li>
                  <li>
                    <strong>Thrombocytopenia, unspecified</strong>
                    <span className="landing-icd-tag">D69.6</span>
                  </li>
                </ul>
              </div>

              <div className="landing-ap-section">
                <div className="landing-ap-section-title">Plan</div>
                <p><strong>Pulmonary Embolism</strong></p>
                <ul>
                  <li>Place temporary IVC filter (Greenfield or similar) via IJ access due to absolute contraindication to anticoagulation (active bleed + thrombocytopenia).</li>
                  <li>Monitor RV function with serial TTE.</li>
                  <li>Avoid volume overload; use norepinephrine if MAP &lt; 65.</li>
                </ul>
                <p><strong>Anastomotic Leak / Hemorrhage</strong></p>
                <ul>
                  <li>Consult General Surgery for urgent evaluation (re-exploration vs. IR drainage).</li>
                  <li>Start Piperacillin-Tazobactam 3.375g IV q6h (renally adjusted).</li>
                  <li>Transfuse 1 unit pRBCs (Hb &lt; 8 with active cardiac demand).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-section reveal-on-scroll" style={{ textAlign: 'center', paddingBottom: 120 }}>
        <h2 className="landing-section-title">Ready to upgrade your practice?</h2>
        <div className="landing-cta-wrapper" style={{ animationDelay: '0s', opacity: 1, transform: 'none', marginTop: 40 }}>
          <button onClick={handleClose} className="landing-cta-btn">
            <span>Start Using Astra</span>
            <ArrowRight size={20} className="landing-cta-arrow" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingOverlay;
