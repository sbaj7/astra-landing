import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search, Sparkles, FileText, ArrowRight, Activity, BookOpen, Stethoscope, ArrowUp, TrendingUp, Zap, Brain, BarChart3, Mic, Volume2, Clock, CheckCircle } from 'lucide-react';
import { useTheme } from './Themes+Styles.jsx';
import './LandingOverlay.css';

// ============================================
// PERFORMANCE FIGURES COMPONENT
// ============================================
const PerformanceFigures = ({ theme, isMobile }) => {
  const [activeTab, setActiveTab] = useState('speed');
  const [animatedValues, setAnimatedValues] = useState({});
  const figuresRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (figuresRef.current) {
      observer.observe(figuresRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animate numbers when visible
  useEffect(() => {
    if (!isVisible) return;

    const targets = {
      speed: 18.9,
      compression: 81,
      accuracy: 94,
      sources: 31
    };

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedValues({
        speed: (targets.speed * eased).toFixed(1),
        compression: Math.round(targets.compression * eased),
        accuracy: Math.round(targets.accuracy * eased),
        sources: Math.round(targets.sources * eased)
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible]);

  const tabs = [
    { key: 'speed', label: 'Retrieval Speed', icon: Zap },
    { key: 'compression', label: 'DDx Compression', icon: Brain },
    { key: 'heatmap', label: 'Query Distribution', icon: BarChart3 },
    { key: 'bayesian', label: 'Bayesian Update', icon: TrendingUp },
    { key: 'pipeline', label: 'Reasoning Flow', icon: ArrowRight }
  ];

  // Heatmap data
  const heatmapData = {
    categories: ['Cardiology', 'Pulmonology', 'Nephrology', 'Neurology', 'ID', 'Endocrine', 'GI', 'Heme/Onc'],
    queryTypes: ['DDx', 'Guidelines', 'Pharmacology', 'Management', 'Evidence'],
    values: [
      [92, 88, 76, 85, 71],
      [78, 82, 45, 68, 65],
      [65, 71, 82, 74, 58],
      [84, 69, 52, 91, 73],
      [71, 94, 68, 42, 89],
      [58, 85, 71, 78, 62],
      [69, 74, 55, 61, 67],
      [62, 68, 88, 72, 81],
    ]
  };

  const getHeatColor = (value, isDark = false) => {
    // Create a gradient from light to dark blue
    const intensity = value / 100;
    if (isDark) {
      // Dark mode: from muted to bright
      const r = Math.round(58 + intensity * (143 - 58));
      const g = Math.round(74 + intensity * (165 - 74));
      const b = Math.round(88 + intensity * (181 - 88));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light mode: from very light blue-gray to deep blue
      const r = Math.round(220 - intensity * 175);
      const g = Math.round(225 - intensity * 135);
      const b = Math.round(230 - intensity * 105);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const isDarkMode = theme.backgroundPrimary === "#121417";

  // Speed comparison data
  const speedData = [
    { name: 'PubMed', time: 342, color: theme.textSecondary + '60' },
    { name: 'Google Scholar', time: 245, color: theme.textSecondary + '60' },
    { name: 'UpToDate', time: 156, color: theme.textSecondary + '60' },
    { name: 'DynaMed', time: 128, color: theme.textSecondary + '60' },
    { name: 'Astra', time: 18, color: theme.accentSoftBlue }
  ];

  // Compression data
  const compressionData = [
    { condition: 'Chest Pain', before: 47, after: 8 },
    { condition: 'Dyspnea', before: 52, after: 11 },
    { condition: 'AKI', before: 38, after: 7 },
    { condition: 'AMS', before: 61, after: 12 },
    { condition: 'Fever + Rash', before: 44, after: 9 },
    { condition: 'Syncope', before: 35, after: 6 }
  ];

  // Bayesian update data
  const bayesianData = [
    { feature: 'Base Rate', probability: 0.05 },
    { feature: '+ Chest Pain (atypical)', probability: 0.12 },
    { feature: '+ Age > 65', probability: 0.18 },
    { feature: '+ HTN + DM', probability: 0.31 },
    { feature: '+ Dynamic ST Depression', probability: 0.65 },
    { feature: '+ Positive Troponin', probability: 0.98 }
  ];

  // Pipeline stages
  const pipelineStages = [
    { name: 'Input', items: ['Chief Complaint', 'Vitals', 'Labs', 'History', 'Exam'] },
    { name: 'Processing', items: ['Feature Extraction', 'Pattern Recognition', 'Evidence Retrieval'] },
    { name: 'Reasoning', items: ['Differential Generation', 'Bayesian Weighting', 'Risk Stratification'] },
    { name: 'Output', items: ['Ranked Differential', 'Guideline-Aligned Plan', 'Cited Evidence'] }
  ];

  return (
    <div ref={figuresRef} className="performance-figures-container">
      {/* Stat Cards Row */}
      <div className="perf-stats-row">
        <div className={`perf-stat-card ${isVisible ? 'animate-in' : ''}`} style={{ animationDelay: '0.1s' }}>
          <div className="perf-stat-value" style={{ color: theme.accentSoftBlue }}>
            {animatedValues.speed || '0.0'}×
          </div>
          <div className="perf-stat-label">Faster than PubMed</div>
        </div>
        <div className={`perf-stat-card ${isVisible ? 'animate-in' : ''}`} style={{ animationDelay: '0.2s' }}>
          <div className="perf-stat-value" style={{ color: theme.accentSoftBlue }}>
            {animatedValues.compression || '0'}%
          </div>
          <div className="perf-stat-label">DDx Compression</div>
        </div>
        <div className={`perf-stat-card ${isVisible ? 'animate-in' : ''}`} style={{ animationDelay: '0.3s' }}>
          <div className="perf-stat-value" style={{ color: theme.accentSoftBlue }}>
            {animatedValues.accuracy || '0'}%
          </div>
          <div className="perf-stat-label">Citation Accuracy</div>
        </div>
        <div className={`perf-stat-card ${isVisible ? 'animate-in' : ''}`} style={{ animationDelay: '0.4s' }}>
          <div className="perf-stat-value" style={{ color: theme.accentSoftBlue }}>
            {animatedValues.sources || '0'}M+
          </div>
          <div className="perf-stat-label">Sources Indexed</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="perf-tabs">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`perf-tab ${activeTab === key ? 'active' : ''}`}
            style={{
              background: activeTab === key ? theme.accentSoftBlue : 'transparent',
              color: activeTab === key ? '#fff' : theme.textSecondary,
              borderColor: activeTab === key ? 'transparent' : theme.textSecondary + '30'
            }}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="perf-content">
        {/* Speed Chart */}
        {activeTab === 'speed' && (
          <div className="perf-chart-container speed-chart">
            <div className="chart-title">Time to First Relevant Citation (seconds)</div>
            <div className="speed-bars">
              {speedData.map((item, idx) => (
                <div key={item.name} className="speed-bar-row" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="speed-bar-label">{item.name}</div>
                  <div className="speed-bar-track">
                    <div
                      className={`speed-bar-fill ${isVisible ? 'animate' : ''}`}
                      style={{
                        '--target-width': `${(item.time / 350) * 100}%`,
                        background: item.color,
                        animationDelay: `${0.5 + idx * 0.1}s`
                      }}
                    />
                  </div>
                  <div className="speed-bar-value" style={{ color: item.name === 'Astra' ? theme.accentSoftBlue : theme.textSecondary }}>
                    {item.time}s
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-annotation">
              <span className="annotation-highlight" style={{ color: theme.accentSoftBlue }}>18.9× faster</span>
              <span className="annotation-text">than traditional PubMed searches</span>
            </div>
          </div>
        )}

        {/* Compression Chart */}
        {activeTab === 'compression' && (
          <div className="perf-chart-container compression-chart">
            <div className="chart-title">Differential Diagnosis Count: Before vs After</div>
            <div className="compression-grid">
              {compressionData.map((item, idx) => (
                <div key={item.condition} className="compression-row" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <div className="compression-label">{item.condition}</div>
                  <div className="compression-bars">
                    <div className="compression-bar-group">
                      <div
                        className={`compression-bar before ${isVisible ? 'animate' : ''}`}
                        style={{
                          '--target-width': `${(item.before / 65) * 100}%`,
                          background: theme.textSecondary + '40',
                          animationDelay: `${0.3 + idx * 0.08}s`
                        }}
                      >
                        <span className="bar-value">{item.before}</span>
                      </div>
                      <div
                        className={`compression-bar after ${isVisible ? 'animate' : ''}`}
                        style={{
                          '--target-width': `${(item.after / 65) * 100}%`,
                          background: theme.accentSoftBlue,
                          animationDelay: `${0.5 + idx * 0.08}s`
                        }}
                      >
                        <span className="bar-value">{item.after}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="compression-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: theme.textSecondary + '40' }} />
                <span>Traditional Search</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: theme.accentSoftBlue }} />
                <span>Astra Output</span>
              </div>
            </div>
          </div>
        )}

        {/* Heatmap */}
        {activeTab === 'heatmap' && (
          <div className="perf-chart-container heatmap-chart">
            <div className="chart-title">Clinical Query Distribution (queries/100 sessions)</div>
            <div className="heatmap-container">
              {/* Column Headers */}
              <div className="heatmap-grid-header">
                <div className="heatmap-corner-cell" />
                {heatmapData.queryTypes.map((type, i) => (
                  <div key={i} className="heatmap-col-header">{type}</div>
                ))}
              </div>
              {/* Data Rows */}
              {heatmapData.categories.map((category, rowIdx) => (
                <div key={rowIdx} className="heatmap-grid-row">
                  <div className="heatmap-row-header">{category}</div>
                  {heatmapData.values[rowIdx].map((value, colIdx) => (
                    <div
                      key={colIdx}
                      className={`heatmap-data-cell ${isVisible ? 'animate' : ''}`}
                      style={{
                        background: getHeatColor(value, isDarkMode),
                        animationDelay: `${(rowIdx * 5 + colIdx) * 0.03}s`
                      }}
                    >
                      <span className="heatmap-cell-value">{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="heatmap-legend-bar">
              <span>Low</span>
              <div className="heatmap-gradient-bar" />
              <span>High</span>
              <span className="heatmap-unit">(queries/100 sessions)</span>
            </div>
          </div>
        )}

        {/* Bayesian Update Chart */}
        {activeTab === 'bayesian' && (
          <div className="perf-chart-container bayesian-chart">
            <div className="chart-title">Sequential Bayesian Probability Update for NSTEMI Diagnosis</div>
            <div className="bayesian-scenario">
              <strong>Clinical Scenario:</strong> Posterior probability of NSTEMI with sequential evidence integration
            </div>
            <div className="bayesian-chart-area">
              {/* Y-axis labels */}
              <div className="bayesian-y-axis">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="landing-logo-container">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.03))' }}>
                  <path d="M60 5C29.6243 5 5 29.6243 5 60C5 90.3757 29.6243 115 60 115C90.3757 115 115 90.3757 115 60C115 29.6243 90.3757 5 60 5ZM60 105C35.1472 105 15 84.8528 15 60C15 35.1472 35.1472 15 60 15C84.8528 15 105 35.1472 105 60C105 84.8528 84.8528 105 60 105Z" fill="url(#paint0_linear)" />
                  <path d="M60 25C40.67 25 25 40.67 25 60C25 79.33 40.67 95 60 95C79.33 95 95 79.33 95 60C95 40.67 79.33 25 60 25ZM60 85C46.1929 85 35 73.8071 35 60C35 46.1929 46.1929 35 60 35C73.8071 35 85 46.1929 85 60C85 73.8071 73.8071 85 60 85Z" fill="url(#paint1_linear)" />
                  <defs>
                    <linearGradient id="paint0_linear" x1="60" y1="5" x2="60" y2="115" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4A6B7D" />
                      <stop offset="1" stopColor="#2D3843" />
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="60" y1="25" x2="60" y2="95" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8FA5B5" />
                      <stop offset="1" stopColor="#4A6B7D" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* Chart area */}
              <div className="bayesian-plot">
                {/* Decision threshold line */}
                <div className="bayesian-threshold" style={{ bottom: '50%' }}>
                  <span className="threshold-label">Decision Threshold</span>
                </div>
                {/* Area fill */}
                <svg className="bayesian-svg" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="bayesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accentSoftBlue} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={theme.accentSoftBlue} stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    className={`bayesian-area ${isVisible ? 'animate' : ''}`}
                    d={`M 0 ${200 - bayesianData[0].probability * 200} 
                        L 0 ${200 - bayesianData[0].probability * 200}
                        L 100 ${200 - bayesianData[0].probability * 200}
                        L 100 ${200 - bayesianData[1].probability * 200}
                        L 200 ${200 - bayesianData[1].probability * 200}
                        L 200 ${200 - bayesianData[2].probability * 200}
                        L 300 ${200 - bayesianData[2].probability * 200}
                        L 300 ${200 - bayesianData[3].probability * 200}
                        L 400 ${200 - bayesianData[3].probability * 200}
                        L 400 ${200 - bayesianData[4].probability * 200}
                        L 500 ${200 - bayesianData[4].probability * 200}
                        L 500 ${200 - bayesianData[5].probability * 200}
                        L 600 ${200 - bayesianData[5].probability * 200}
                        L 600 200
                        L 0 200 Z`}
                    fill="url(#bayesGradient)"
                  />
                  <path
                    className={`bayesian-line ${isVisible ? 'animate' : ''}`}
                    d={`M 0 ${200 - bayesianData[0].probability * 200} 
                        L 100 ${200 - bayesianData[0].probability * 200}
                        L 100 ${200 - bayesianData[1].probability * 200}
                        L 200 ${200 - bayesianData[1].probability * 200}
                        L 200 ${200 - bayesianData[2].probability * 200}
                        L 300 ${200 - bayesianData[2].probability * 200}
                        L 300 ${200 - bayesianData[3].probability * 200}
                        L 400 ${200 - bayesianData[3].probability * 200}
                        L 400 ${200 - bayesianData[4].probability * 200}
                        L 500 ${200 - bayesianData[4].probability * 200}
                        L 500 ${200 - bayesianData[5].probability * 200}
                        L 600 ${200 - bayesianData[5].probability * 200}`}
                    fill="none"
                    stroke={theme.accentSoftBlue}
                    strokeWidth="3"
                  />
                  {/* Data points */}
                  {bayesianData.map((d, i) => (
                    <circle
                      key={i}
                      className={`bayesian-dot ${isVisible ? 'animate' : ''}`}
                      cx={i * 100 + 50}
                      cy={200 - d.probability * 200}
                      r="6"
                      fill={theme.accentSoftBlue}
                      stroke="#fff"
                      strokeWidth="2"
                      style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                    />
                  ))}
                </svg>
                {/* X-axis labels */}
                <div className="bayesian-x-axis">
                  {bayesianData.map((d, i) => (
                    <div key={i} className="bayesian-x-label">{d.feature}</div>
                  ))}
                </div>
              </div>
            </div>
            {/* Likelihood ratios */}
            <div className="bayesian-stats">
              <div className="bayesian-stat">
                <span className="stat-label">LR+ (Troponin):</span>
                <span className="stat-value">8.4</span>
              </div>
              <div className="bayesian-stat">
                <span className="stat-label">LR+ (ECG):</span>
                <span className="stat-value">4.2</span>
              </div>
              <div className="bayesian-stat">
                <span className="stat-label">Post-test Probability:</span>
                <span className="stat-value" style={{ color: theme.accentSoftBlue }}>91%</span>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Flow Diagram */}
        {activeTab === 'pipeline' && (
          <div className="perf-chart-container pipeline-chart">
            <div className="chart-title">Clinical Reasoning Pipeline Architecture</div>
            <div className="pipeline-flow">
              {pipelineStages.map((stage, stageIdx) => (
                <React.Fragment key={stageIdx}>
                  <div className={`pipeline-stage ${isVisible ? 'animate' : ''}`} style={{ animationDelay: `${stageIdx * 0.15}s` }}>
                    <div className="pipeline-stage-header" style={{ background: theme.accentSoftBlue }}>
                      {stage.name}
                    </div>
                    <div className="pipeline-stage-items">
                      {stage.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className={`pipeline-item ${isVisible ? 'animate' : ''}`}
                          style={{ animationDelay: `${stageIdx * 0.15 + itemIdx * 0.05}s` }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  {stageIdx < pipelineStages.length - 1 && (
                    <div className={`pipeline-arrow ${isVisible ? 'animate' : ''}`} style={{ animationDelay: `${stageIdx * 0.15 + 0.1}s` }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke={theme.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            {/* Pipeline metrics */}
            <div className="pipeline-metrics">
              <div className={`pipeline-metric ${isVisible ? 'animate' : ''}`} style={{ animationDelay: '0.6s' }}>
                <div className="metric-value" style={{ color: theme.accentSoftBlue }}>12</div>
                <div className="metric-label">Input Features</div>
              </div>
              <div className={`pipeline-metric ${isVisible ? 'animate' : ''}`} style={{ animationDelay: '0.7s' }}>
                <div className="metric-value" style={{ color: theme.accentSoftBlue }}>31M+</div>
                <div className="metric-label">Sources Indexed</div>
              </div>
              <div className={`pipeline-metric ${isVisible ? 'animate' : ''}`} style={{ animationDelay: '0.8s' }}>
                <div className="metric-value" style={{ color: theme.accentSoftBlue }}>6.2s</div>
                <div className="metric-label">End-to-End Latency</div>
              </div>
              <div className={`pipeline-metric ${isVisible ? 'animate' : ''}`} style={{ animationDelay: '0.9s' }}>
                <div className="metric-value" style={{ color: theme.accentSoftBlue }}>94%</div>
                <div className="metric-label">Citation Accuracy</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MODE SWITCHER COMPONENT
// ============================================
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

// ============================================
// MAIN LANDING OVERLAY COMPONENT
// ============================================
const LandingOverlay = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState('reason');
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
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

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
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 600);
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
      <button onClick={handleClose} className="landing-close-btn" aria-label="Close">
        <X size={24} strokeWidth={2} />
      </button>

      {/* ========== HERO SECTION ========== */}
      <section className="landing-hero landing-hero-compact">
        <div className="landing-gradient-orb" />
        <div className="landing-gradient-orb-secondary" />

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

      {/* ========== DEMO SECTION ========== */}
      <section id="landing-demo" className="landing-section reveal-on-scroll">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Built for the full clinical chain.</h2>
          <p className="landing-section-desc">
            Most tools nibble at the edge of the problem. Astra takes responsibility for the whole process.
          </p>
        </div>

        <div className="landing-demo-container" style={{ overflow: 'visible' }}>
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
                  {selectedMode === 'search' ? 'Antithrombotic strategy in AF post-TAVI multicenter RCT outcomes' :
                    selectedMode === 'reason' ? '32-yo male marathoner collapses mid-race, ECG QTc 520 ms, syncope episode' :
                      'NSTEMI day 2 post-PCI in CICU, heparin stopped, on DAPT, telemetry monitoring'}
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

      {/* ========== CASE WALKTHROUGH SECTION ========== */}


      {/* ========== SUMMARY SECTION ========== */}
      <section className="landing-section reveal-on-scroll">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Modes for every clinical workflow.</h2>
          <p className="landing-section-desc">
            Specialized tools for the distinct phases of clinical work.
          </p>
        </div>

        <div className="modes-grid">
          {/* Research Card */}
          <div className="mode-card">
            <div className="mode-icon" style={{ background: `${theme.accentSoftBlue}15` }}>
              <Search size={24} color={theme.accentSoftBlue} />
            </div>
            <h3 className="mode-title">Research</h3>
            <p className="mode-desc">
              Whitelisted LLM search. Top journals only. No hallucinations, just evidence.
            </p>
          </div>

          {/* DDx Card */}
          <div className="mode-card">
            <div className="mode-icon" style={{ background: `${theme.accentSoftBlue}15` }}>
              <Sparkles size={24} color={theme.accentSoftBlue} />
            </div>
            <h3 className="mode-title">DDx</h3>
            <p className="mode-desc">
              Advanced robust clinical reasoning. Differentials + Next Steps.
            </p>
          </div>

          {/* A&P Card */}
          <div className="mode-card">
            <div className="mode-icon" style={{ background: `${theme.accentSoftBlue}15` }}>
              <FileText size={24} color={theme.accentSoftBlue} />
            </div>
            <h3 className="mode-title">A&P</h3>
            <p className="mode-desc">
              Notes with ICD codes & Landmark Trials built in.
            </p>
          </div>
        </div>

        <div className="modes-footer">
          <p>Plus 55+ related modes including Letters of Medical Necessity, Disability Certifications, and more...</p>
        </div>
      </section>

      {/* ========== VOICE & TRANSCRIPTION SECTION ========== */}
      <section className="landing-section reveal-on-scroll">
        <div className="landing-section-header">
          <div className="section-badge">
            <Mic size={14} />
            <span>Voice-First</span>
          </div>
          <h2 className="landing-section-title">Speak naturally. Get structured notes.</h2>
          <p className="landing-section-desc">
            Record patient encounters directly in Astra. Our transcription engine captures the conversation
            and transforms it into structured clinical documentation—ready for your review.
          </p>
        </div>

        <div className="transcription-demo">
          <div className="transcription-flow">
            {/* Step 1: Record */}
            <div className="transcription-step reveal-on-scroll delay-100">
              <div className="step-icon" style={{ background: `${theme.accentSoftBlue}15` }}>
                <Mic size={28} color={theme.accentSoftBlue} />
              </div>
              <div className="step-number">1</div>
              <h4 className="step-title">Record</h4>
              <p className="step-desc">Tap to record during the patient encounter. Works with any conversation style.</p>
            </div>

            <div className="transcription-connector">
              <div className="connector-line" />
            </div>

            {/* Step 2: Transcribe */}
            <div className="transcription-step reveal-on-scroll delay-200">
              <div className="step-icon" style={{ background: `${theme.accentSoftBlue}15` }}>
                <Volume2 size={28} color={theme.accentSoftBlue} />
              </div>
              <div className="step-number">2</div>
              <h4 className="step-title">Transcribe</h4>
              <p className="step-desc">Medical-grade speech recognition with clinical terminology awareness.</p>
            </div>

            <div className="transcription-connector">
              <div className="connector-line" />
            </div>

            {/* Step 3: Structure */}
            <div className="transcription-step reveal-on-scroll delay-300">
              <div className="step-icon" style={{ background: `${theme.accentSoftBlue}15` }}>
                <FileText size={28} color={theme.accentSoftBlue} />
              </div>
              <div className="step-number">3</div>
              <h4 className="step-title">Structure</h4>
              <p className="step-desc">Auto-generates SOAP notes, H&Ps, or specialty-specific formats.</p>
            </div>

            <div className="transcription-connector">
              <div className="connector-line" />
            </div>

            {/* Step 4: Review */}
            <div className="transcription-step reveal-on-scroll delay-400">
              <div className="step-icon" style={{ background: `${theme.successColor}15` }}>
                <CheckCircle size={28} color={theme.successColor} />
              </div>
              <div className="step-number">4</div>
              <h4 className="step-title">Review & Sign</h4>
              <p className="step-desc">Edit if needed, then export directly to your EMR or clipboard.</p>
            </div>
          </div>

          {/* Transcription Stats */}
          <div className="transcription-stats">
            <div className="transcription-stat">
              <Clock size={18} color={theme.accentSoftBlue} />
              <div className="stat-content">
                <span className="stat-value">~2 min</span>
                <span className="stat-label">Average note completion</span>
              </div>
            </div>
            <div className="transcription-stat">
              <CheckCircle size={18} color={theme.successColor} />
              <div className="stat-content">
                <span className="stat-value">98.5%</span>
                <span className="stat-label">Transcription accuracy</span>
              </div>
            </div>
            <div className="transcription-stat">
              <FileText size={18} color={theme.accentSoftBlue} />
              <div className="stat-content">
                <span className="stat-value">12+</span>
                <span className="stat-label">Note templates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PERFORMANCE METRICS SECTION ========== */}
      <section className="landing-section reveal-on-scroll">
        <div className="landing-section-header">
          <div className="section-badge">
            <TrendingUp size={14} />
            <span>Performance</span>
          </div>
          <h2 className="landing-section-title">Measurable clinical advantage.</h2>
          <p className="landing-section-desc">
            Validated performance metrics across evidence retrieval, differential compression, and citation accuracy.
          </p>
        </div>

        <PerformanceFigures theme={theme} isMobile={isMobile} />
      </section>

      {/* ========== CASE WALKTHROUGH SECTION ========== */}
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
          {/* Research Card */}
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
                    <td><strong>Falanga 2023</strong>: "In patients with platelet count &gt;50 000/µL, full therapeutic dose anticoagulation should be considered."</td>
                  </tr>
                  <tr>
                    <td><strong>50–70</strong></td>
                    <td><strong>Avoid or individualize</strong> full‑dose AC</td>
                    <td><strong>Mosarla 2019</strong>: anticoagulation should be avoided when platelets &lt;50–70 000/µL, depending on thrombotic risk.</td>
                  </tr>
                  <tr>
                    <td><strong>25–50</strong></td>
                    <td><strong>Dose‑reduced LMWH</strong> or transfusion support</td>
                    <td><strong>Blood Advances</strong>: "Limited duration of full‑dose anticoagulation with platelet transfusion support for the first 4 weeks..."</td>
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

          {/* DDx Card */}
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

          {/* Management Card */}
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

          {/* Assessment & Plan Card */}
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

              <div className="landing-ap-section">
                <div className="landing-ap-section-title">Diagnoses</div>
                <ul className="landing-diagnoses-list" style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Acute pulmonary embolism with acute cor pulmonale</strong>
                    <span className="landing-icd-tag">I26.09</span>
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Postprocedural hemorrhage of a digestive system organ</strong>
                    <span className="landing-icd-tag">K91.840</span>
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Acute kidney injury, unspecified</strong>
                    <span className="landing-icd-tag">N17.9</span>
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Thrombocytopenia, unspecified</strong>
                    <span className="landing-icd-tag">D69.6</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="landing-section reveal-on-scroll" style={{ textAlign: 'center', paddingBottom: 120 }}>
        <h2 className="landing-section-title">Ready to upgrade how you practice?</h2>
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