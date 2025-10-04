import React from 'react';
import { X, Sparkles, ShieldCheck, Activity, Compass, Mail } from 'lucide-react';

const SectionHeader = ({ eyebrow, title, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, color: `${theme.textSecondary}BB` }}>{eyebrow}</span>
    <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: theme.textPrimary }}>{title}</h2>
  </div>
);

const StatisticPill = ({ label, value, theme }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '18px 20px',
      borderRadius: 20,
      background: `${theme.accentSoftBlue}15`,
      border: `1px solid ${theme.accentSoftBlue}30`,
      minWidth: 160
    }}
  >
    <span style={{ fontSize: 30, fontWeight: 700, color: theme.textPrimary }}>{value}</span>
    <span style={{ fontSize: 13, color: theme.textSecondary }}>{label}</span>
  </div>
);

const GradientCard = ({ icon: Icon, title, body, theme }) => (
  <div
    style={{
      borderRadius: 28,
      padding: 28,
      background: `linear-gradient(135deg, ${theme.accentSoftBlue}1A, ${theme.textSecondary}08)`
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: `${theme.accentSoftBlue}26`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon size={18} color={theme.accentSoftBlue} />
      </div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>{title}</h3>
    </div>
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: theme.textSecondary }}>{body}</p>
  </div>
);

const FeaturePill = ({ title, description, theme }) => (
  <div
    style={{
      flex: 1,
      minWidth: 220,
      padding: 20,
      borderRadius: 20,
      border: `1px solid ${theme.textSecondary}25`,
      backgroundColor: `${theme.backgroundSurface}F2`,
      boxShadow: '0 18px 35px rgba(0,0,0,0.08)'
    }}
  >
    <h4 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, color: theme.textPrimary }}>{title}</h4>
    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: theme.textSecondary }}>{description}</p>
  </div>
);

const ModeCard = ({ eyebrow, title, description, bullets, theme }) => (
  <div
    style={{
      flex: 1,
      minWidth: 260,
      borderRadius: 28,
      padding: 26,
      backgroundColor: `${theme.backgroundSurface}F8`,
      border: `1px solid ${theme.textSecondary}15`,
      boxShadow: '0 22px 40px rgba(15,23,42,0.14)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }}
  >
    <span style={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 11, color: `${theme.textSecondary}AA` }}>{eyebrow}</span>
    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>{title}</h3>
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: theme.textSecondary }}>{description}</p>
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bullets.map((item) => (
        <li key={item} style={{ fontSize: 13, lineHeight: 1.55, color: theme.textPrimary }}>{item}</li>
      ))}
    </ul>
  </div>
);

const AboutView = ({ isPresented, onDismiss, theme }) => {
  if (!isPresented) return null;

  const statistics = [
    { label: 'Landmark trials indexed', value: '~500+' },
    { label: 'Model latency at bedside', value: '< 3s' },
    { label: 'Clinical personas supported', value: 'Search • DDx • A&P' },
    { label: 'Peer-reviewed articles within reach', value: '~2.5M+' }
  ];

  const features = [
    {
      title: 'Evidence-first answers',
      description: 'Every reply is grounded in indexed trials and guidelines before a single sentence reaches you.'
    },
    {
      title: 'Structured reasoning',
      description: 'Probabilities, next diagnostics, and Plans mirror the cadence of an attending teaching on rounds.'
    },
    {
      title: 'Workflow aware',
      description: 'Dedicated modes keep the workspace aligned with literature review, diagnostic reasoning, and note writing.'
    }
  ];

  const modeInsights = [
    {
      eyebrow: 'Research',
      title: 'Literature scout',
      description: 'Breaks a question into PICO-style components, plans literature searches, and ranks sources from a vetted journal list.',
      bullets: [
        'A lightweight planner creates primary and supporting search phrases.',
        'Parallel fetches triage guideline and trial snippets from a curated domain list.',
        'Sources surface as numbered citations streamed with the answer.'
      ]
    },
    {
      eyebrow: 'DDx',
      title: 'Reasoning engine',
      description: 'Follows clinician-authored reasoning rules to produce a Bayesian differential with concrete diagnostics.',
      bullets: [
        'A local trial library is searched for studies that resemble the vignette.',
        'Those studies are woven into the clinician prompt before generation.',
        'The response emphasizes likelihood shifts, next tests, and bedside actions.'
      ]
    },
    {
      eyebrow: 'Write',
      title: 'Assessment & Plan partner',
      description: 'Follows a strict assessment-and-plan template so every problem reads like a polished note.',
      bullets: [
        'Formatting rules maintain the exact headers, bolding, and en-dash actions clinicians expect.',
        'Each problem references hallmark studies without exposing underlying tooling.',
        'Perfect for turning bedside impressions into structured documentation.'
      ]
    }
  ];
  const safeguards = [
    'AES-256 encryption at rest with daily encrypted backups',
    'Row-level security and role-based policies for every session',
    'Immutable audit logs retained ≥ 30 days',
    'Isolated runtime with secrets confined to the server'
  ];

  const roadmap = [
    'Bidirectional EHR connector for one-click note insertion and order sets',
    'In-line drug interaction guardrails inside the Plan composer',
    'HIPAA compliance enhancements rolling out early 2026 with deeper auditing controls',
    'Practice-gap analytics based on de-identified usage insights'
  ];

  return (
    <div
      onClick={onDismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(11, 15, 21, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 32 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '86vh',
          overflow: 'hidden',
          borderRadius: 40,
          position: 'relative',
          background: `linear-gradient(160deg, ${theme.backgroundSurface}F2 0%, ${theme.backgroundPrimary}F0 60%, ${theme.backgroundSurface}F8 100%)`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.35)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(180% 120% at 10% 10%, ${theme.accentSoftBlue}25 0%, transparent 45%)`,
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '28px 36px',
            borderBottom: `1px solid ${theme.textSecondary}20`,
            position: 'relative'
          }}
        >
          <div>
            <div style={{ fontSize: 14, letterSpacing: 2, color: `${theme.textSecondary}BB`, textTransform: 'uppercase' }}>Discover Astra</div>
            <h1 style={{ margin: 6, marginLeft: 0, fontSize: 38, letterSpacing: -0.5, fontWeight: 600, color: theme.textPrimary }}>Clinical clarity, in seconds.</h1>
          </div>
          <button
            onClick={onDismiss}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: `${theme.textSecondary}20`,
              color: theme.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close about panel"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ position: 'relative', overflowY: 'auto', maxHeight: 'calc(86vh - 120px)', padding: '36px 36px 42px 36px', display: 'flex', flexDirection: 'column', gap: 36 }}>
          <section style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionHeader eyebrow="Why Astra" title="Engineered for the pace of modern rounds." theme={theme} />
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: theme.textSecondary }}>
                Astra collaborates with clinicians across academic centers to distill landmark trials, guidelines, and lived heuristics into a single workspace. Each response blends retrieval augmented reasoning with structured citation checks so you can move from question to plan in one motion.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {features.map((feature) => (
                  <div key={feature.title} style={{ fontSize: 14, color: theme.textPrimary }}>
                    <strong>{feature.title}</strong>
                    <span style={{ color: theme.textSecondary }}> — {feature.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 280,
                borderRadius: 32,
                padding: 28,
                backgroundColor: `${theme.backgroundSurface}F2`,
                border: `1px solid ${theme.textSecondary}12`,
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: `${theme.accentSoftBlue}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color={theme.accentSoftBlue} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary }}>Impact snapshot</span>
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {statistics.map((item) => (
                  <StatisticPill key={item.label} {...item} theme={theme} />
                ))}
              </div>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader eyebrow="Modes" title="How each mode thinks under the hood." theme={theme} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {modeInsights.map((mode) => (
                <ModeCard key={mode.title} {...mode} theme={theme} />
              ))}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            <GradientCard
              icon={Activity}
              title="Retrieval-augmented reasoning"
              body="Questions are decomposed into PICO elements, matched against our curated trial index, then synthesized by transformer models tuned alongside practicing clinicians."
              theme={theme}
            />
            <GradientCard
              icon={ShieldCheck}
              title="Citations with teeth"
              body="Every recommendation must cite a verifiable PMID or DOI; responses fail validation if they cannot be grounded in the literature."
              theme={theme}
            />
            <GradientCard
              icon={Compass}
              title="Transparent guardrails"
              body="Telemetry highlights low-evidence segments, surfaces model confidence, and flags when manual verification is essential."
              theme={theme}
            />
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader eyebrow="Safety & Compliance" title="Engineered for modern clinical governance." theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {safeguards.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 18, backgroundColor: `${theme.textSecondary}10`, color: theme.textPrimary }}>
                  <ShieldCheck size={16} color={theme.accentSoftBlue} />
                  <span style={{ fontSize: 13.5, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader eyebrow="Coming soon" title="Roadmap in partnership with frontline teams." theme={theme} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              {roadmap.map((entry) => (
                <FeaturePill key={entry} title={entry.split(' ').slice(0, 3).join(' ')} description={entry} theme={theme} />
              ))}
            </div>
          </section>

          <section
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 28,
              padding: 28,
              background: `${theme.accentSoftBlue}12`,
              border: `1px solid ${theme.accentSoftBlue}33`
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: `${theme.accentSoftBlue}CC` }}>Business & Contact</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary }}>Astraeus Intelligence LLC</span>
              <span style={{ fontSize: 14, color: theme.textSecondary }}>254 Chapman Rd, Ste 208 #22873 • Newark, Delaware 19702</span>
            </div>
            <button
              onClick={() => window.open('mailto:support@astramd.org', '_blank')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 18px',
                borderRadius: 999,
                border: 'none',
                backgroundColor: theme.accentSoftBlue,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 14px 30px rgba(50, 112, 180, 0.35)'
              }}
            >
              <Mail size={16} />
              support@astramd.org
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutView;
