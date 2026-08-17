import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  GraduationCap,
  Search,
  Stethoscope,
} from 'lucide-react';
import { useTheme } from './Themes+Styles.jsx';
import AboutModeShowcase from './AboutModeShowcase.jsx';

const SERIF = 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const BENCHMARKS = [
  {
    label: 'Medical knowledge',
    detail: '500 medical licensing questions per system',
    frontier: 97.4,
    frontierLabel: '97.4%',
    clinical: 89.6,
    clinicalLabel: '89.6%',
  },
  {
    label: 'Clinician alignment',
    detail: '500 expert-rubric health questions per system',
    frontier: 88,
    frontierLabel: '88.0',
    clinical: 62.6,
    clinicalLabel: '62.6',
  },
  {
    label: 'Real clinical queries',
    detail: '100 physician queries, scored by blinded clinicians',
    frontier: 90.5,
    frontierLabel: '3.62 / 4',
    clinical: 81,
    clinicalLabel: '3.24 / 4',
  },
];

const MODES = [
  {
    icon: Search,
    name: 'Research',
    headline: 'From question to evidence.',
    text: 'Astra turns a clinical question into a focused search across guidelines, trials, reviews, and primary literature, then synthesizes the answer with sources attached to the claims.',
  },
  {
    icon: Stethoscope,
    name: 'Reason',
    headline: 'From patient data to a plan.',
    text: 'Astra builds a probability-ranked differential, weighs supporting and opposing findings, surfaces red flags, and organizes the next tests, treatments, consultations, and disposition.',
  },
  {
    icon: FileText,
    name: 'Write',
    headline: 'From encounter to complete documentation.',
    text: 'Astra converts the clinical story into a structured note and assessment and plan, keeping problems, reasoning, orders, follow-up, and medical necessity clear.',
  },
  {
    icon: GraduationCap,
    name: 'Master',
    headline: 'From practice to a personal curriculum.',
    text: 'Astra’s adaptive Step 1–3 QBank learns each student’s strengths and weaknesses, selects what to ask next, explains every answer, and tracks mastery over time.',
  },
];

const PRINCIPLES = [
  {
    label: 'Frontier by design.',
    text: 'Medical intelligence should advance with the strongest broadly capable reasoning systems, not remain frozen inside a slower specialist model.',
  },
  {
    label: 'Evidence is part of the answer.',
    text: 'Retrieval is targeted, sources stay visible, and clinical claims are designed to be checked rather than accepted on confidence alone.',
  },
  {
    label: 'Structured for the task.',
    text: 'Research, differential diagnosis, next steps, documentation, and study are different cognitive jobs. Each deserves its own interface and output structure.',
  },
  {
    label: 'The clinician stays in control.',
    text: 'Astra supports judgment; it does not replace it. The user reviews the evidence, interrogates the reasoning, and makes the decision.',
  },
];

const STUDIES = [
  {
    journal: 'Nature Medicine · 2026',
    title: 'General-purpose large language models outperform specialized clinical AI tools on medical benchmarks',
    finding: 'Frontier systems formed the leading tier across medical knowledge, clinician alignment, and blinded review of real physician queries.',
    url: 'https://www.nature.com/articles/s41591-026-04431-5',
  },
  {
    journal: 'Nature · 2025',
    title: 'Towards accurate differential diagnosis with large language models',
    finding: 'A purpose-built clinical interface improved clinicians’ differential-diagnosis accuracy beyond both unassisted work and ordinary search.',
    url: 'https://www.nature.com/articles/s41586-025-08869-4',
  },
  {
    journal: 'Nature Medicine · 2026',
    title: 'A large language model for complex cardiology care',
    finding: 'In a randomized study, assisted cardiologists produced fewer clinically significant errors and substantially less missing content.',
    url: 'https://www.nature.com/articles/s41591-025-04190-9',
  },
  {
    journal: 'Nature Medicine · 2026',
    title: 'Generative AI-enabled clinical decision support system in primary care',
    finding: 'Workflow-integrated assistance improved diagnostic appropriateness, treatment planning, and clinical-note completeness in routine care.',
    url: 'https://www.nature.com/articles/s41591-026-04503-6',
  },
  {
    journal: 'JAMA Network Open · 2024',
    title: 'Large language model influence on diagnostic reasoning',
    finding: 'Generic chatbot access did not significantly improve physician scores, showing that raw capability does not automatically become a useful clinical workflow.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11519755/',
  },
  {
    journal: 'Nature Medicine · 2026',
    title: 'Holistic evaluation of large language models for medical tasks with MedHELM',
    finding: 'A 121-task framework argues that clinical AI must be evaluated on real work: decision support, notes, communication, research, and operations.',
    url: 'https://www.nature.com/articles/s41591-025-04151-2',
  },
];

const BenchmarkCard = ({ metric }) => (
  <article className="about-benchmark-card">
    <div className="about-benchmark-heading">
      <h3>{metric.label}</h3>
      <p>{metric.detail}</p>
    </div>
    <div className="about-bar-group">
      <div className="about-bar-line">
        <span className="about-bar-label">Top frontier system</span>
        <div
          className="about-bar-track"
          role="img"
          aria-label={`${metric.label}: top frontier system ${metric.frontierLabel}`}
        >
          <span className="about-bar-fill about-bar-fill--frontier" style={{ width: `${metric.frontier}%` }} />
        </div>
        <strong>{metric.frontierLabel}</strong>
      </div>
      <div className="about-bar-line">
        <span className="about-bar-label">Top specialized tool</span>
        <div
          className="about-bar-track"
          role="img"
          aria-label={`${metric.label}: top specialized clinical tool ${metric.clinicalLabel}`}
        >
          <span className="about-bar-fill about-bar-fill--clinical" style={{ width: `${metric.clinical}%` }} />
        </div>
        <strong>{metric.clinicalLabel}</strong>
      </div>
    </div>
  </article>
);

const SourceLink = ({ href, children }) => (
  <a className="about-source-link" href={href} target="_blank" rel="noreferrer">
    {children}
    <ArrowUpRight size={13} aria-hidden="true" />
  </a>
);

// Embedded on the home page the sections start nearly transparent and settle into place
// as they scroll into view; the standalone route renders them fully opaque from the start.
const useScrollReveal = (rootRef, enabled) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return undefined;

    const nodes = Array.from(root.querySelectorAll('[data-reveal]'));
    if (!nodes.length) return undefined;

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-revealed'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -14% 0px', threshold: 0.06 });

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [rootRef, enabled]);
};

const AboutContent = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { colors: theme, isDark } = useTheme();
  const rootRef = useRef(null);

  useScrollReveal(rootRef, embedded);

  const institutions = [
    { name: 'Mayo Clinic', logo: '/logos/mayo-clinic.png' },
    { name: 'Cleveland Clinic', logo: '/logos/cleveland-clinic.png' },
    { name: 'Johns Hopkins', logo: '/logos/johns-hopkins.png' },
    { name: 'Mass General', logo: '/logos/mass-general.png' },
    { name: 'Stanford Health', logo: '/logos/stanford-health.png' },
    { name: 'UCLA Health', logo: '/logos/ucla-health.png' },
    { name: 'UCSF', logo: '/logos/ucsf.png' },
    { name: 'Northwestern', logo: '/logos/northwestern.png' },
    { name: 'Mount Sinai', logo: '/logos/mount-sinai.png' },
    { name: 'Cedars-Sinai', logo: '/logos/cedars-sinai.png' },
    { name: 'Duke Health', logo: '/logos/duke-health.png' },
    { name: 'NYU Langone', logo: '/logos/nyu-langone.png' },
    { name: 'Penn Medicine', logo: '/logos/penn-medicine.png' },
    { name: 'Brigham and Women’s', logo: '/logos/brigham-womens.png' },
  ];
  const institutionsDoubled = [...institutions, ...institutions];

  const pageVariables = {
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
    fontFamily: SANS,
  };

  return (
    <div
      ref={rootRef}
      className={`about-page${embedded ? ' about-page--embedded' : ''}`}
      style={pageVariables}
    >
      <style>{`
        @keyframes about-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .about-page {
          height: 100dvh;
          width: 100%;
          overflow-x: clip;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          background: var(--about-bg);
          color: var(--about-text);
        }

        .about-page *, .about-page *::before, .about-page *::after { box-sizing: border-box; }

        .about-header {
          position: sticky;
          top: 0;
          z-index: 10;
          padding: 14px 24px;
          background: color-mix(in srgb, var(--about-bg) 84%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--about-line);
        }

        .about-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          margin: -6px -8px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: color-mix(in srgb, var(--about-muted) 78%, transparent);
          cursor: pointer;
          font: 500 13.5px/1 ${SANS};
        }

        .about-back:focus-visible,
        .about-source-link:focus-visible,
        .about-sources-button:focus-visible {
          outline: 2px solid var(--about-accent);
          outline-offset: 4px;
        }

        .about-main {
          width: min(100%, 1040px);
          margin: 0 auto;
          padding: 0 28px 112px;
        }

        .about-hero {
          max-width: 820px;
          padding-top: clamp(64px, 10vw, 116px);
        }

        .about-eyebrow {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 64%, transparent);
          font: 650 11px/1.2 ${SANS};
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .about-hero h1 {
          max-width: 790px;
          margin: 22px 0 0;
          color: var(--about-text);
          font: 400 clamp(39px, 6vw, 64px)/1.04 ${SERIF};
          letter-spacing: -.04em;
          text-wrap: balance;
        }

        .about-lead {
          max-width: 760px;
          margin: 28px 0 0;
          color: color-mix(in srgb, var(--about-muted) 94%, transparent);
          font: 400 clamp(18px, 2.35vw, 22px)/1.62 ${SERIF};
          text-wrap: pretty;
        }

        .about-thesis-line {
          display: grid;
          grid-template-columns: 110px minmax(0, 1fr);
          gap: 28px;
          max-width: 790px;
          margin-top: clamp(42px, 6vw, 64px);
          padding-top: 22px;
          border-top: 1px solid var(--about-line-strong);
        }

        .about-thesis-line span {
          padding-top: 3px;
          color: color-mix(in srgb, var(--about-muted) 58%, transparent);
          font: 650 10px/1.4 ${SANS};
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .about-thesis-line p {
          margin: 0;
          color: var(--about-text);
          font: 400 clamp(19px, 2.5vw, 24px)/1.42 ${SERIF};
          letter-spacing: -.015em;
          text-wrap: pretty;
        }

        .about-institutions {
          margin-top: clamp(62px, 9vw, 96px);
          padding: clamp(30px, 4.5vw, 44px) 0;
          border-top: 1px solid var(--about-line);
          border-bottom: 1px solid var(--about-line);
          overflow: hidden;
        }

        .about-institutions .about-eyebrow { text-align: center; }

        .about-marquee-viewport {
          margin-top: 30px;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent);
          mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent);
        }

        .about-marquee {
          display: flex;
          align-items: center;
          gap: clamp(38px, 5vw, 64px);
          width: max-content;
          animation: about-marquee 55s linear infinite;
        }

        .about-institution {
          display: flex;
          flex: none;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
        }

        .about-institution img {
          width: 31px;
          height: 31px;
          border-radius: 5px;
          object-fit: contain;
          filter: ${isDark ? 'grayscale(100%) invert(1) brightness(1.15) contrast(.84)' : 'grayscale(100%) contrast(.88)'};
          opacity: ${isDark ? '.52' : '.55'};
        }

        .about-institution span {
          color: color-mix(in srgb, var(--about-muted) 50%, transparent);
          font: 520 clamp(16px, 2vw, 19px)/1 ${SANS};
          letter-spacing: -.01em;
        }

        .about-section {
          margin-top: clamp(72px, 10vw, 112px);
          padding-top: clamp(48px, 6vw, 68px);
          border-top: 1px solid var(--about-line);
        }

        .about-section--first {
          margin-top: clamp(72px, 10vw, 112px);
          padding-top: 0;
          border-top: 0;
        }

        .about-section-heading {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr);
          gap: clamp(30px, 6vw, 76px);
          align-items: end;
        }

        .about-section-heading h2 {
          max-width: 620px;
          margin: 16px 0 0;
          color: var(--about-text);
          font: 400 clamp(31px, 4.3vw, 46px)/1.12 ${SERIF};
          letter-spacing: -.035em;
          text-wrap: balance;
        }

        .about-section-heading > p {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 88%, transparent);
          font: 400 16px/1.72 ${SANS};
          text-wrap: pretty;
        }

        .about-study-figure {
          margin: 42px 0 0;
          padding: clamp(22px, 4vw, 40px);
          border: 1px solid var(--about-line-strong);
          border-radius: 24px;
          background: linear-gradient(145deg, var(--about-soft), transparent 66%);
          box-shadow: var(--about-shadow);
        }

        .about-figure-topline {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--about-line);
        }

        .about-figure-topline h3 {
          margin: 0;
          color: var(--about-text);
          font: 400 clamp(23px, 3vw, 30px)/1.2 ${SERIF};
          letter-spacing: -.025em;
        }

        .about-figure-topline p {
          max-width: 460px;
          margin: 8px 0 0;
          color: color-mix(in srgb, var(--about-muted) 82%, transparent);
          font: 400 14px/1.65 ${SANS};
        }

        .about-figure-key {
          display: flex;
          flex: none;
          align-items: center;
          gap: 14px;
          padding-top: 4px;
          color: color-mix(in srgb, var(--about-muted) 72%, transparent);
          font: 500 11px/1.2 ${SANS};
          white-space: nowrap;
        }

        .about-key-item { display: inline-flex; align-items: center; gap: 6px; }
        .about-key-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--about-accent); }
        .about-key-dot--clinical { background: color-mix(in srgb, var(--about-muted) 38%, transparent); }

        .about-benchmark-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0;
        }

        .about-benchmark-card {
          min-width: 0;
          padding: 30px 26px 4px;
          border-left: 1px solid var(--about-line);
        }

        .about-benchmark-card:first-child { padding-left: 0; border-left: 0; }
        .about-benchmark-card:last-child { padding-right: 0; }

        .about-benchmark-heading { min-height: 72px; }

        .about-benchmark-heading h3 {
          margin: 0;
          color: var(--about-text);
          font: 620 14px/1.35 ${SANS};
          letter-spacing: -.01em;
        }

        .about-benchmark-heading p {
          margin: 7px 0 0;
          color: color-mix(in srgb, var(--about-muted) 64%, transparent);
          font: 400 11.5px/1.45 ${SANS};
        }

        .about-bar-group { display: flex; flex-direction: column; gap: 19px; margin-top: 18px; }

        .about-bar-line {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 7px 10px;
          align-items: center;
        }

        .about-bar-label {
          color: color-mix(in srgb, var(--about-muted) 72%, transparent);
          font: 500 11px/1 ${SANS};
        }

        .about-bar-line strong {
          grid-column: 2;
          grid-row: 1 / span 2;
          min-width: 50px;
          color: var(--about-text);
          font: 650 12px/1 ${SANS};
          text-align: right;
        }

        .about-bar-track {
          position: relative;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--about-soft-strong);
        }

        .about-bar-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
        }

        .about-bar-fill--frontier { background: var(--about-accent); }
        .about-bar-fill--clinical { background: color-mix(in srgb, var(--about-muted) 38%, transparent); }

        .about-study-figure figcaption {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid var(--about-line);
          color: color-mix(in srgb, var(--about-muted) 68%, transparent);
          font: 400 12px/1.6 ${SANS};
        }

        .about-source-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: var(--about-text);
          text-decoration: none;
          border-bottom: 1px solid var(--about-line-strong);
        }

        .about-source-link:hover { border-color: var(--about-text); }

        .about-interpretation {
          display: grid;
          grid-template-columns: minmax(220px, .68fr) minmax(0, 1.32fr);
          gap: clamp(34px, 7vw, 86px);
          margin-top: 42px;
          padding: clamp(28px, 4vw, 42px) 0 0;
          border-top: 1px solid var(--about-line);
        }

        .about-interpretation h3 {
          margin: 0;
          color: var(--about-text);
          font: 400 25px/1.25 ${SERIF};
          letter-spacing: -.025em;
        }

        .about-copy-stack { display: flex; flex-direction: column; gap: 20px; }

        .about-copy-stack p {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 91%, transparent);
          font: 400 16px/1.78 ${SANS};
          text-wrap: pretty;
        }

        .about-copy-stack strong { color: var(--about-text); font-weight: 630; }

        .about-evidence-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 42px;
        }

        .about-evidence-card {
          min-width: 0;
          padding: clamp(22px, 3vw, 28px);
          border: 1px solid var(--about-line);
          border-radius: 18px;
          background: var(--about-soft);
        }

        .about-evidence-card h3 {
          margin: 12px 0 0;
          color: var(--about-text);
          font: 400 23px/1.2 ${SERIF};
          letter-spacing: -.025em;
        }

        .about-evidence-card > p {
          min-height: 68px;
          margin: 12px 0 0;
          color: color-mix(in srgb, var(--about-muted) 82%, transparent);
          font: 400 13.5px/1.65 ${SANS};
        }

        .about-mini-chart {
          display: flex;
          flex-direction: column;
          gap: 13px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--about-line);
        }

        .about-mini-row {
          display: grid;
          grid-template-columns: 76px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          color: color-mix(in srgb, var(--about-muted) 72%, transparent);
          font: 500 10.5px/1.2 ${SANS};
        }

        .about-mini-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--about-soft-strong);
        }

        .about-mini-fill { display: block; height: 100%; border-radius: inherit; background: color-mix(in srgb, var(--about-muted) 35%, transparent); }
        .about-mini-fill--accent { background: var(--about-accent); }

        .about-mini-row strong {
          min-width: 40px;
          color: var(--about-text);
          font: 650 11px/1 ${SANS};
          text-align: right;
        }

        .about-card-source { margin-top: 22px; font: 500 11.5px/1.4 ${SANS}; }

        .about-stat-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--about-line);
        }

        .about-stat {
          padding: 12px;
          border-radius: 12px;
          background: var(--about-soft);
        }

        .about-stat strong {
          display: block;
          color: var(--about-text);
          font: 400 25px/1 ${SERIF};
          letter-spacing: -.03em;
        }

        .about-stat span {
          display: block;
          margin-top: 6px;
          color: color-mix(in srgb, var(--about-muted) 72%, transparent);
          font: 500 10.5px/1.35 ${SANS};
        }

        .about-mode-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 52px;
          margin-top: 42px;
        }

        .about-mode {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 18px;
          padding: 30px 0;
          border-top: 1px solid var(--about-line);
        }

        .about-mode-icon {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid var(--about-line-strong);
          border-radius: 11px;
          color: var(--about-accent);
          background: var(--about-soft);
        }

        .about-mode-name {
          color: color-mix(in srgb, var(--about-muted) 66%, transparent);
          font: 650 10.5px/1.2 ${SANS};
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .about-mode h3 {
          margin: 8px 0 0;
          color: var(--about-text);
          font: 400 23px/1.22 ${SERIF};
          letter-spacing: -.025em;
        }

        .about-mode p {
          margin: 11px 0 0;
          color: color-mix(in srgb, var(--about-muted) 84%, transparent);
          font: 400 14px/1.68 ${SANS};
          text-wrap: pretty;
        }

        .about-sources-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 30px;
          padding: 10px 14px;
          border: 1px solid var(--about-line-strong);
          border-radius: 10px;
          background: transparent;
          color: var(--about-text);
          cursor: pointer;
          font: 600 12.5px/1 ${SANS};
        }

        .about-principles { margin-top: 34px; }

        .about-principle {
          display: grid;
          grid-template-columns: minmax(180px, 270px) minmax(0, 1fr);
          gap: clamp(24px, 6vw, 76px);
          padding: 27px 0;
          border-top: 1px solid var(--about-line);
        }

        .about-principle h3 {
          margin: 0;
          color: var(--about-text);
          font: 400 21px/1.3 ${SERIF};
          letter-spacing: -.02em;
        }

        .about-principle p {
          margin: 0;
          color: color-mix(in srgb, var(--about-muted) 82%, transparent);
          font: 400 14.5px/1.72 ${SANS};
        }

        .about-study-list { margin-top: 34px; border-top: 1px solid var(--about-line); }

        .about-study-row {
          display: grid;
          grid-template-columns: 170px minmax(230px, .9fr) minmax(280px, 1.1fr) 18px;
          gap: 24px;
          align-items: start;
          padding: 24px 0;
          border-bottom: 1px solid var(--about-line);
          color: inherit;
          text-decoration: none;
        }

        .about-study-row:hover .about-study-title { border-color: var(--about-text); }

        .about-study-journal {
          color: color-mix(in srgb, var(--about-muted) 61%, transparent);
          font: 600 11px/1.45 ${SANS};
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .about-study-title {
          width: fit-content;
          color: var(--about-text);
          border-bottom: 1px solid transparent;
          font: 400 17px/1.4 ${SERIF};
        }

        .about-study-finding {
          color: color-mix(in srgb, var(--about-muted) 80%, transparent);
          font: 400 13.5px/1.62 ${SANS};
        }

        .about-study-row svg { margin-top: 2px; color: color-mix(in srgb, var(--about-muted) 60%, transparent); }

        .about-evidence-note {
          max-width: 720px;
          margin: 26px 0 0;
          color: color-mix(in srgb, var(--about-muted) 62%, transparent);
          font: 400 12px/1.65 ${SANS};
        }

        .about-contact {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 24px;
          margin-top: clamp(72px, 10vw, 112px);
          padding-top: 38px;
          border-top: 1px solid var(--about-line);
        }

        .about-contact-company { display: flex; flex-direction: column; gap: 6px; }
        .about-contact-company strong { color: var(--about-text); font: 600 14.5px/1.4 ${SANS}; }
        .about-contact-company span { color: color-mix(in srgb, var(--about-muted) 65%, transparent); font: 400 13px/1.5 ${SANS}; }
        .about-contact a { color: var(--about-accent); font: 550 14px/1.4 ${SANS}; text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--about-accent) 35%, transparent); }

        /* --- Embedded in the home page --- */

        .about-page--embedded {
          height: auto;
          overflow: visible;
          background: transparent;
        }

        .about-page--embedded .about-main {
          padding-bottom: clamp(48px, 7vw, 84px);
        }

        .about-page--embedded .about-hero {
          padding-top: 0;
        }

        .about-page--embedded [data-reveal] {
          opacity: .07;
          transform: translateY(24px);
          filter: blur(1.5px);
          transition:
            opacity 820ms cubic-bezier(.22, 1, .36, 1),
            transform 820ms cubic-bezier(.22, 1, .36, 1),
            filter 820ms cubic-bezier(.22, 1, .36, 1);
          will-change: opacity, transform;
        }

        .about-page--embedded [data-reveal].is-revealed {
          opacity: 1;
          transform: none;
          filter: none;
          will-change: auto;
        }

        .about-page--embedded .about-evidence-card:nth-child(2),
        .about-page--embedded .about-mode:nth-child(2) { transition-delay: 90ms; }

        .about-page--embedded .about-evidence-card:nth-child(3),
        .about-page--embedded .about-mode:nth-child(3) { transition-delay: 180ms; }

        .about-page--embedded .about-mode:nth-child(4) { transition-delay: 270ms; }

        @media (max-width: 820px) {
          .about-section-heading { grid-template-columns: 1fr; gap: 20px; align-items: start; }
          .about-section-heading > p { max-width: 650px; }
          .about-benchmark-grid { grid-template-columns: 1fr; }
          .about-benchmark-card,
          .about-benchmark-card:first-child,
          .about-benchmark-card:last-child { padding: 24px 0; border-left: 0; border-top: 1px solid var(--about-line); }
          .about-benchmark-card:first-child { border-top: 0; }
          .about-benchmark-heading { min-height: 0; }
          .about-bar-group { margin-top: 19px; }
          .about-evidence-grid { grid-template-columns: 1fr; }
          .about-evidence-card > p { min-height: 0; }
          .about-study-row { grid-template-columns: 140px minmax(210px, .9fr) minmax(240px, 1.1fr) 18px; gap: 18px; }
        }

        @media (max-width: 740px) {
          .about-study-row { grid-template-columns: minmax(0, 1fr) 18px; gap: 8px 12px; padding: 22px 0; }
          .about-study-journal,
          .about-study-title,
          .about-study-finding { grid-column: 1; }
          .about-study-title { font-size: 17px; }
          .about-study-finding { margin-top: 4px; }
          .about-study-row svg { grid-column: 2; grid-row: 1 / span 3; }
        }

        @media (max-width: 680px) {
          .about-header { padding: 13px 18px; }
          .about-main { padding: 0 18px 80px; }
          .about-hero { padding-top: 52px; }
          .about-page--embedded .about-hero { padding-top: 0; }
          .about-hero h1 { font-size: clamp(36px, 11vw, 48px); line-height: 1.06; }
          .about-lead { margin-top: 22px; font-size: 18px; line-height: 1.58; }
          .about-thesis-line { grid-template-columns: 1fr; gap: 12px; margin-top: 38px; }
          .about-thesis-line p { font-size: 20px; }
          .about-institutions { margin-top: 58px; padding: 28px 0; }
          .about-marquee-viewport { margin-top: 24px; }
          .about-institution img { width: 27px; height: 27px; }
          .about-institution span { font-size: 15px; }
          .about-section, .about-section--first { margin-top: 68px; }
          .about-section { padding-top: 42px; }
          .about-section--first { padding-top: 0; }
          .about-section-heading h2 { margin-top: 13px; font-size: 32px; line-height: 1.14; }
          .about-section-heading > p { font-size: 15px; line-height: 1.68; }
          .about-study-figure { margin: 32px 0 0; padding: 20px 16px; border-radius: 18px; }
          .about-figure-topline { flex-direction: column; padding-bottom: 21px; }
          .about-figure-topline h3 { font-size: 25px; }
          .about-figure-key { padding-top: 0; }
          .about-benchmark-card,
          .about-benchmark-card:first-child,
          .about-benchmark-card:last-child { padding: 22px 0; }
          .about-bar-line { grid-template-columns: minmax(0, 1fr) auto; }
          .about-study-figure figcaption { margin-top: 20px; }
          .about-interpretation { grid-template-columns: 1fr; gap: 18px; margin-top: 34px; }
          .about-interpretation h3 { font-size: 23px; }
          .about-copy-stack { gap: 17px; }
          .about-copy-stack p { font-size: 15px; line-height: 1.72; }
          .about-evidence-grid { margin-top: 32px; gap: 12px; }
          .about-evidence-card { border-radius: 16px; }
          .about-mode-grid { grid-template-columns: 1fr; gap: 0; margin-top: 30px; }
          .about-mode { grid-template-columns: 34px minmax(0, 1fr); gap: 15px; padding: 25px 0; }
          .about-mode-icon { width: 34px; height: 34px; border-radius: 10px; }
          .about-mode h3 { font-size: 21px; }
          .about-principle { grid-template-columns: 1fr; gap: 10px; padding: 23px 0; }
          .about-principle p { font-size: 14px; }
          .about-contact { align-items: flex-start; flex-direction: column; }
          .about-contact-company span { max-width: 310px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .about-marquee { animation: none; }
          .about-marquee-viewport { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
          .about-page--embedded [data-reveal] { opacity: 1; transform: none; filter: none; transition: none; }
        }
      `}</style>

      {!embedded && (
        <header className="about-header">
          <button className="about-back" onClick={() => navigate('/')} aria-label="Back to Astra">
            <ArrowLeft size={16} />
            Astra
          </button>
        </header>
      )}

      <main className="about-main">
        <section className="about-hero" data-reveal>
          <p className="about-eyebrow">About Astra</p>
          <h1>The strongest intelligence available, shaped for medicine.</h1>
          <p className="about-lead">
            Astra harnesses frontier reasoning models, then adds focused evidence retrieval, clinical structure,
            visible citations, and a workflow built around the decisions clinicians actually make.
          </p>
          <div className="about-thesis-line">
            <span>The thesis</span>
            <p>
              A medical label is not the advantage. The advantage is frontier intelligence made useful,
              inspectable, and clinically coherent.
            </p>
          </div>
        </section>

        <section className="about-institutions" aria-label="Institutions where Astra users practice and train" data-reveal>
          <p className="about-eyebrow">Used by clinicians at</p>
          <div className="about-marquee-viewport">
            <div className="about-marquee">
              {institutionsDoubled.map((institution, index) => (
                <div className="about-institution" key={`${institution.name}-${index}`} aria-hidden={index >= institutions.length}>
                  <img src={institution.logo} alt="" loading="lazy" width="31" height="31" />
                  <span>{institution.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-section about-section--first">
          <div className="about-section-heading" data-reveal>
            <div>
              <p className="about-eyebrow">Why the frontier matters</p>
              <h2>Specialized does not automatically mean more capable.</h2>
            </div>
            <p>
              An independent 2026 study tested frontier systems and specialized clinical tools on medical knowledge,
              expert-defined behavior, and real physician questions. The frontier systems led every evaluation.
            </p>
          </div>

          <figure className="about-study-figure" data-reveal>
            <div className="about-figure-topline">
              <div>
                <h3>One study. Three different tests. The same result.</h3>
                <p>
                  Top score within each tested category. Longer bars indicate better performance; the final measure uses a four-point clinician rating.
                </p>
              </div>
              <div className="about-figure-key" aria-hidden="true">
                <span className="about-key-item"><span className="about-key-dot" />Frontier</span>
                <span className="about-key-item"><span className="about-key-dot about-key-dot--clinical" />Specialized</span>
              </div>
            </div>
            <div className="about-benchmark-grid">
              {BENCHMARKS.map((metric) => <BenchmarkCard key={metric.label} metric={metric} />)}
            </div>
            <figcaption>
              Original visualization of data reported by Vishwanath et al., <em>Nature Medicine</em> (2026).
              The study evaluated the systems available at that moment; it did not evaluate Astra and should not be read as a permanent ranking.{' '}
              <SourceLink href="https://www.nature.com/articles/s41591-026-04431-5">Read the study</SourceLink>
            </figcaption>
          </figure>

          <div className="about-interpretation" data-reveal>
            <h3>What the result actually means</h3>
            <div className="about-copy-stack">
              <p>
                The finding challenges a common assumption: that putting a smaller model behind medical retrieval
                automatically creates better clinical intelligence. In this study, it did not. Scale, broad reasoning,
                and alignment mattered more than the specialized label.
              </p>
              <p>
                <strong>That is the first half of Astra’s thesis.</strong> The reasoning engine should remain at the frontier,
                where capability is advancing fastest, rather than being locked inside a slower, opaque clinical wrapper.
              </p>
              <p>
                But frontier intelligence alone is not a clinical product. Medical work still requires deliberate source
                selection, structured uncertainty, task-specific outputs, and a clinician who can inspect and challenge the result.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-heading" data-reveal>
            <div>
              <p className="about-eyebrow">The second half</p>
              <h2>The interface determines whether intelligence becomes useful.</h2>
            </div>
            <p>
              The broader literature is clear on the nuance: a powerful model in an ordinary chat box is not enough.
              When assistance is designed around the clinical task, the benefit becomes measurable.
            </p>
          </div>

          <div className="about-evidence-grid">
            <article className="about-evidence-card" data-reveal>
              <p className="about-eyebrow">Differential diagnosis</p>
              <h3>Structured assistance beat ordinary search.</h3>
              <p>Correct diagnosis included in the top ten for challenging clinical cases.</p>
              <div className="about-mini-chart">
                {[
                  { label: 'Unassisted', value: 36.1 },
                  { label: 'Search', value: 44.4 },
                  { label: 'AI-assisted', value: 51.7, accent: true },
                ].map((item) => (
                  <div className="about-mini-row" key={item.label}>
                    <span>{item.label}</span>
                    <span className="about-mini-track" role="img" aria-label={`${item.label}: ${item.value}% top-ten accuracy`}>
                      <span className={`about-mini-fill${item.accent ? ' about-mini-fill--accent' : ''}`} style={{ width: `${item.value}%` }} />
                    </span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
              <div className="about-card-source">
                <SourceLink href="https://www.nature.com/articles/s41586-025-08869-4">Nature, 2025</SourceLink>
              </div>
            </article>

            <article className="about-evidence-card" data-reveal>
              <p className="about-eyebrow">Complex management</p>
              <h3>Assistance reduced errors and omissions.</h3>
              <p>Blinded subspecialist review of complex cardiology assessments.</p>
              <div className="about-stat-list">
                <div className="about-stat">
                  <strong>24.3%</strong>
                  <span>clinically significant errors, unassisted</span>
                </div>
                <div className="about-stat">
                  <strong>13.1%</strong>
                  <span>clinically significant errors, assisted</span>
                </div>
                <div className="about-stat">
                  <strong>37.4%</strong>
                  <span>missing content, unassisted</span>
                </div>
                <div className="about-stat">
                  <strong>17.8%</strong>
                  <span>missing content, assisted</span>
                </div>
              </div>
              <div className="about-card-source">
                <SourceLink href="https://www.nature.com/articles/s41591-025-04190-9">Nature Medicine, 2026</SourceLink>
              </div>
            </article>

            <article className="about-evidence-card" data-reveal>
              <p className="about-eyebrow">Clinical documentation</p>
              <h3>Integrated support improved the record.</h3>
              <p>Adjusted odds ratios from 2,000 encounters reviewed for documentation quality.</p>
              <div className="about-stat-list">
                <div className="about-stat">
                  <strong>1.74</strong>
                  <span>appropriate diagnosis</span>
                </div>
                <div className="about-stat">
                  <strong>1.68</strong>
                  <span>comprehensive note</span>
                </div>
                <div className="about-stat">
                  <strong>1.71</strong>
                  <span>appropriate treatment plan</span>
                </div>
              </div>
              <div className="about-card-source">
                <SourceLink href="https://www.nature.com/articles/s41591-026-04503-6">Nature Medicine, 2026</SourceLink>
              </div>
            </article>
          </div>

          <div className="about-interpretation" data-reveal>
            <h3>Capability is not the same as adoption</h3>
            <div className="about-copy-stack">
              <p>
                A randomized diagnostic-reasoning trial found that simply giving physicians access to a general chatbot
                changed scores by only two percentage points, a nonsignificant result, even though the model alone scored
                sixteen points above the conventional-resources group.
              </p>
              <p>
                The capability was present; it did not automatically translate through a generic interface.
                <strong> That translation gap is the product problem Astra is built to solve.</strong>
              </p>
              <p>
                Astra separates distinct clinical jobs, gives each one a purpose-built structure, grounds research in
                inspectable sources, and keeps the clinician in the loop. It is not an autonomous decision-maker and does
                not ask clinicians to practice medicine inside a generic chat window.
              </p>
              <p>
                <SourceLink href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11519755/">Read the randomized trial</SourceLink>
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-heading" data-reveal>
            <div>
              <p className="about-eyebrow">What Astra does</p>
              <h2>Four modes, each built for a different clinical job.</h2>
            </div>
            <p>
              Astra carries a question from evidence to reasoning to documentation, then helps the next generation of
              clinicians master the same underlying medicine.
            </p>
          </div>

          <div className="about-mode-grid">
            {MODES.map(({ icon: Icon, name, headline, text }) => (
              <article className="about-mode" key={name} data-reveal>
                <div className="about-mode-icon">
                  {React.createElement(Icon, { size: 18, strokeWidth: 1.8, 'aria-hidden': true })}
                </div>
                <div>
                  <span className="about-mode-name">{name}</span>
                  <h3>{headline}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>

          <AboutModeShowcase theme={theme} isDark={isDark} />

          <button className="about-sources-button" type="button" onClick={() => navigate('/sources')} data-reveal>
            Explore Astra’s source list
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </section>

        <section className="about-section">
          <div className="about-section-heading" data-reveal>
            <div>
              <p className="about-eyebrow">How we build</p>
              <h2>Frontier capability. Clinical discipline.</h2>
            </div>
            <p>
              The literature supports neither blind trust nor blanket dismissal. Astra is built for the more demanding
              middle ground: use the strongest tools available, then make their work visible and reviewable.
            </p>
          </div>
          <div className="about-principles">
            {PRINCIPLES.map((principle) => (
              <div className="about-principle" key={principle.label} data-reveal>
                <h3>{principle.label}</h3>
                <p>{principle.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-heading" data-reveal>
            <div>
              <p className="about-eyebrow">Evidence behind the thesis</p>
              <h2>Read the work, not the claim.</h2>
            </div>
            <p>
              These studies approach the question from different directions: benchmark performance, differential
              diagnosis, complex management, documentation, human–AI interaction, and evaluation across real workflows.
            </p>
          </div>
          <div className="about-study-list">
            {STUDIES.map((study) => (
              <a className="about-study-row" href={study.url} target="_blank" rel="noreferrer" key={study.title} data-reveal>
                <span className="about-study-journal">{study.journal}</span>
                <span className="about-study-title">{study.title}</span>
                <span className="about-study-finding">{study.finding}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="about-evidence-note" data-reveal>
            These studies support the design thesis described here; they are not evaluations of Astra. Results are
            task-specific, model capabilities change quickly, and clinical use still requires independent validation,
            appropriate oversight, and professional judgment.
          </p>
        </section>

        <footer className="about-contact" data-reveal>
          <div className="about-contact-company">
            <strong>Astraeus Intelligence LLC</strong>
            <span>254 Chapman Rd, Ste 208 #22873 · Newark, Delaware 19702</span>
          </div>
          <a href="mailto:outreach@astramd.org">outreach@astramd.org</a>
        </footer>
      </main>
    </div>
  );
};

export default AboutContent;
