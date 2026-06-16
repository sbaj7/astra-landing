import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../components/Themes+Styles.jsx';

// ---------------------------------------------------------------------------
// TEAM
// Edit this list to add/remove members. Each entry supports:
//   name    – full name (required)
//   role    – title / role line (required)
//   credentials – degrees / affiliation shown under the name (optional)
//   bio     – one or two sentence blurb (optional)
// ---------------------------------------------------------------------------
const TEAM = [
  { name: 'Sandi Bajrami', role: 'Founder & CEO', credentials: 'MD Candidate', bio: 'An MD candidate at Renaissance School of Medicine at Stony Brook University, Sandi leads Astra’s clinical direction, medical reasoning architecture, and physician-facing product strategy. His work spans biomedical research, perioperative outcomes, cardiovascular medicine, oncology, software development, and applied AI, with a focus on translating clinical complexity into structured, evidence-grounded systems.' },
  { name: 'Shon B. Shmushkevich', role: 'Co-Founder & COO', credentials: 'MD Candidate', bio: 'An MD candidate at Florida International University Herbert Wertheim College of Medicine, Shon leads operations, institutional strategy, partnerships, and user implementation. His background includes ophthalmology research, surgical outcomes, medical technology, and academic publishing, giving him a practical view of how clinical tools are evaluated, adopted, and integrated by physicians and trainees.' },
  { name: 'Michael Belenkiy', role: 'Co-Founder & CTO', credentials: 'Co-Founder, Sentinel Tech Solutions', bio: 'Michael leads Astra’s engineering organization, infrastructure, security, and platform reliability. He has built and deployed technology ventures across software, digital infrastructure, healthcare technology, and business automation, with responsibility for the systems architecture required to scale Astra securely.' },
];

// Officers (title + firm, no bio), rendered in the same grid as the founders.
const TEAM_MEMBERS = [
  { name: 'Arvind Dev, MD', role: '', credentials: 'Albert Einstein College of Medicine' },
  { name: 'Haseeb Iqbal', role: '', credentials: 'J.P. Morgan Chase & Co.' },
  { name: 'Randy Abramovich', role: '', credentials: 'MD Candidate' },
  { name: 'Derek Johnson', role: '', credentials: 'MD Candidate' },
  { name: 'Jeremiah von Borstel', role: '', credentials: 'MD Candidate' },
  { name: 'Emily Bellow', role: '', credentials: 'MD Candidate' },
  { name: 'Thomas Fedrigoni', role: '', credentials: 'MD Candidate' },
  { name: 'Jakub Goclon', role: '', credentials: 'PhD Candidate' },
  { name: 'Benjamin Rudolph', role: '', credentials: 'PhD Candidate' },
  { name: 'Brodi Bajrami', role: '', credentials: 'BS, Stony Brook' },
  { name: 'Calvin Sekseni', role: '', credentials: 'BS, Brooklyn College' },
  { name: 'Alex Naishuler', role: '', credentials: 'BS, Northeastern' },
  { name: 'Sean Malamud', role: '', credentials: 'BS, Plattsburgh' },
];

const SERIF = 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const MEASURE = 680;

const AboutPage = () => {
  const navigate = useNavigate();
  const { colors: theme, isDark } = useTheme();

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

  const hair = `${theme.textSecondary}1A`;
  const eyebrow = {
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: 11,
    fontWeight: 600,
    color: `${theme.textSecondary}99`,
    fontFamily: SANS,
    margin: 0,
  };
  const h2 = {
    margin: 0,
    fontFamily: SERIF,
    fontSize: 'clamp(24px, 3.2vw, 30px)',
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: theme.textPrimary,
  };
  const body = {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.8,
    color: `${theme.textPrimary}D0`,
    fontFamily: SANS,
    fontWeight: 400,
  };

  const principles = [
    { label: 'Cited, or not stated.', text: 'Every clinical claim links to a primary source you can open and verify. If it cannot be grounded in the literature, Astra does not assert it.' },
    { label: 'Clinician-led.', text: 'Astra is designed and reviewed by practicing physicians. The reasoning, formatting, and thresholds reflect how medicine is actually practiced.' },
    { label: 'In service of judgment.', text: 'Astra organizes evidence and surfaces its reasoning so the decision stays with the clinician, never hidden behind a confident sentence.' },
  ];

  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: theme.backgroundPrimary,
      position: 'relative',
    }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        padding: '14px 24px',
        background: `${theme.backgroundPrimary}CC`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${hair}`,
      }}>
        <button
          onClick={() => navigate('/')}
          aria-label="Back to Astra"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            margin: '-6px -8px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: `${theme.textSecondary}C0`,
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: 500,
            fontFamily: SANS,
          }}
        >
          <ArrowLeft size={16} />
          Astra
        </button>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px 120px' }}>
        {/* ===== HERO ===== */}
        <section style={{ paddingTop: 'clamp(56px, 10vw, 112px)', maxWidth: MEASURE }}>
          <p style={eyebrow}>About</p>
          <h1 style={{
            margin: '22px 0 0',
            fontFamily: SERIF,
            fontSize: 'clamp(32px, 5.4vw, 52px)',
            lineHeight: 1.12,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            color: theme.textPrimary,
          }}>
            The best available evidence, within reach of every clinical decision.
          </h1>
          <p style={{
            margin: '28px 0 0',
            fontSize: 'clamp(17px, 2.2vw, 20px)',
            lineHeight: 1.7,
            color: `${theme.textSecondary}`,
            fontFamily: SERIF,
            fontStyle: 'italic',
          }}>
            Modern medicine produces more evidence than any clinician can track. Astra closes that gap by
            retrieving, reasoning over, and citing the literature so the answer in front of you is one you can stand behind.
          </p>
        </section>

        {/* ===== INSTITUTION BAND (full-bleed) ===== */}
        <section style={{
          width: '100vw',
          marginLeft: 'calc(50% - 50vw)',
          marginTop: 'clamp(56px, 9vw, 96px)',
          padding: 'clamp(40px, 6vw, 64px) 0',
          borderTop: `1px solid ${hair}`,
          borderBottom: `1px solid ${hair}`,
          overflow: 'hidden',
        }}>
          <p style={{ ...eyebrow, textAlign: 'center', marginBottom: 'clamp(28px, 4vw, 44px)' }}>
            Trusted by clinicians at
          </p>
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            maskImage: 'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
          }}>
            <div style={{
              display: 'flex',
              gap: 'clamp(44px, 6vw, 80px)',
              animation: 'marquee 55s linear infinite',
              width: 'max-content',
              alignItems: 'center',
            }}>
              {institutionsDoubled.map((inst, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <img
                    src={inst.logo}
                    alt=""
                    loading="lazy"
                    width={36}
                    height={36}
                    style={{
                      borderRadius: 6,
                      objectFit: 'contain',
                      filter: isDark
                        ? 'grayscale(100%) invert(1) brightness(1.2) contrast(0.85)'
                        : 'grayscale(100%) contrast(0.9)',
                      opacity: isDark ? 0.55 : 0.6,
                    }}
                  />
                  <span style={{
                    fontSize: 'clamp(18px, 2.4vw, 22px)',
                    fontWeight: 500,
                    color: `${theme.textSecondary}80`,
                    letterSpacing: '-0.01em',
                    fontFamily: SANS,
                  }}>
                    {inst.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHY ===== */}
        <section style={{ marginTop: 'clamp(56px, 9vw, 96px)', maxWidth: MEASURE }}>
          <p style={eyebrow}>Why Astra exists</p>
          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <p style={body}>
              The evidence a clinician needs is rarely missing. It is scattered across millions of papers, guidelines,
              and trials, behind paywalls and inconsistent search. Under time pressure, even careful clinicians fall
              back on memory and heuristics. The cost of that gap is measured in missed diagnoses, defensive
              documentation, and decisions made with less than the field already knows.
            </p>
            <p style={body}>
              Astra is built to close it. It reads the literature the way a diligent colleague would, reasons through
              the case, and returns an answer with its sources attached, every claim traceable to a paper you can open.
              The goal is not to decide for the clinician, but to make sure no decision is made with less evidence than it deserves.
            </p>
          </div>
        </section>

        {/* ===== PRINCIPLES ===== */}
        <section style={{ marginTop: 'clamp(56px, 9vw, 96px)', paddingTop: 'clamp(40px, 6vw, 64px)', borderTop: `1px solid ${hair}` }}>
          <p style={eyebrow}>What we hold to</p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column' }}>
            {principles.map((p, i) => (
              <div key={p.label} style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(160px, 240px) 1fr',
                gap: 'clamp(16px, 4vw, 56px)',
                padding: '26px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${hair}`,
                alignItems: 'start',
              }}>
                <h3 style={{ margin: 0, fontFamily: SERIF, fontSize: 21, fontWeight: 400, letterSpacing: '-0.015em', color: theme.textPrimary, lineHeight: 1.25 }}>
                  {p.label}
                </h3>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.75, color: `${theme.textSecondary}D0`, fontFamily: SANS }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== TEAM ===== */}
        <section style={{ marginTop: 'clamp(56px, 9vw, 96px)', paddingTop: 'clamp(40px, 6vw, 64px)', borderTop: `1px solid ${hair}` }}>
          <p style={eyebrow}>Founders</p>
          <h2 style={{ ...h2, marginTop: 18, maxWidth: MEASURE }}>
            Clinicians and engineers, building the tool they wanted at the bedside.
          </h2>
          <div style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(36px, 5vw, 56px) 40px',
            alignItems: 'start',
          }}>
            {TEAM.map((m, i) => (
              <div key={`${m.name}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 16.5, fontWeight: 600, color: theme.textPrimary, fontFamily: SANS, letterSpacing: '-0.01em' }}>{m.name}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.3, color: theme.textPrimary, fontFamily: SANS }}>{m.role}</span>
                  {m.credentials && (
                    <span style={{ fontSize: 13, lineHeight: 1.4, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>{m.credentials}</span>
                  )}
                </div>
                {m.bio && (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: `${theme.textSecondary}C0`, fontFamily: SANS }}>{m.bio}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ===== THE TEAM ===== */}
        <section style={{ marginTop: 'clamp(56px, 9vw, 96px)', paddingTop: 'clamp(40px, 6vw, 64px)', borderTop: `1px solid ${hair}` }}>
          <p style={eyebrow}>The team</p>
          <div style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(36px, 5vw, 56px) 40px',
            alignItems: 'start',
          }}>
            {TEAM_MEMBERS.map((m, i) => (
              <div key={`${m.name}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16.5, fontWeight: 600, color: theme.textPrimary, fontFamily: SANS, letterSpacing: '-0.01em' }}>{m.name}</span>
                {m.role && <span style={{ fontSize: 14, color: theme.textPrimary, fontFamily: SANS }}>{m.role}</span>}
                {m.credentials && <span style={{ fontSize: 13, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>{m.credentials}</span>}
              </div>
            ))}
          </div>
        </section>

        {/* ===== CONTACT ===== */}
        <section style={{ marginTop: 'clamp(56px, 9vw, 96px)', paddingTop: 'clamp(40px, 6vw, 64px)', borderTop: `1px solid ${hair}`, display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, fontFamily: SANS }}>Astraeus Intelligence LLC</span>
            <span style={{ fontSize: 14, color: `${theme.textSecondary}A0`, fontFamily: SANS }}>254 Chapman Rd, Ste 208 #22873 · Newark, Delaware 19702</span>
          </div>
          <a
            href="mailto:support@astramd.org"
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: theme.accentSoftBlue,
              fontFamily: SANS,
              textDecoration: 'none',
              borderBottom: `1px solid ${theme.accentSoftBlue}50`,
              paddingBottom: 2,
            }}
          >
            support@astramd.org
          </a>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
