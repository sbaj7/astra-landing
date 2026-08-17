import React, { useMemo } from 'react';
import { InlineText } from './DifferentialDiagnosisView.jsx';

/* =========================
   CLINICAL SECTIONS VIEW
   Renders everything after the differential (next steps, management, evidence)
   in the same visual language as the ranked differential above it.
   Sections shaped like "– **Label** — detail" become numbered step rows;
   anything else (prose, tables) falls through to the markdown renderer.
   ========================= */

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const TEXT_SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// "– **Label** — detail", with an optional bullet or list number in front.
const STEP_RE = /^(?:[–—\-•*]|\d+[.)])?\s*\*\*(.+?)\*\*\s*[:—–-]+\s*(.+)$/;
// A bullet with no bold label — still a row, just without a heading.
const PLAIN_BULLET_RE = /^(?:[–—\-•*]|\d+[.)])\s+(.+)$/;
// Tables and nested headings belong to the markdown renderer, not the step list.
const OPAQUE_RE = /^(\||#{1,6}\s|```)/;

export const splitSections = (markdown = '') => {
  const sections = [];
  const lines = markdown.split('\n');
  let current = { title: null, body: [] };

  lines.forEach((line) => {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      sections.push(current);
      current = { title: heading[1].trim(), body: [] };
      return;
    }
    current.body.push(line);
  });
  sections.push(current);

  return sections
    .map((section) => ({ title: section.title, body: section.body.join('\n').trim() }))
    .filter((section) => section.title || section.body);
};

// A section renders as steps when it holds at least two "**Label** — detail" rows.
// Anything before the first row is kept as a lead paragraph; wrapped rationale lines
// fold back into the row above them, so line count never decides the layout — otherwise
// the list would flip back to plain markdown as wrapped lines arrive mid-stream.
const parseSteps = (body) => {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  if (lines.some((line) => OPAQUE_RE.test(line))) return null;

  const steps = [];
  const lead = [];
  let labelled = 0;

  lines.forEach((line) => {
    const step = line.match(STEP_RE);
    if (step) {
      labelled += 1;
      steps.push({ label: step[1].trim(), detail: step[2].trim() });
      return;
    }

    const bullet = line.match(PLAIN_BULLET_RE);
    if (bullet) {
      steps.push({ label: '', detail: bullet[1].trim() });
      return;
    }

    // Wrapped continuation of the row above, or preamble prose before any row.
    if (steps.length) steps[steps.length - 1].detail += ` ${line}`;
    else lead.push(line);
  });

  if (labelled < 2) return null;
  return { lead: lead.join('\n'), steps };
};

const StepList = ({ steps, theme, isDark, citations, isMobile }) => {
  const line = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const lineSoft = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.05)';

  return (
    <div style={{ border: `1px solid ${line}`, borderRadius: 12, overflow: 'hidden' }}>
      {steps.map((step, index) => (
        <div
          key={`${step.label}-${index}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '22px minmax(0, 1fr)',
            gap: isMobile ? 10 : 14,
            padding: isMobile ? '11px 12px' : '12px 16px',
            borderTop: index === 0 ? 'none' : `1px solid ${lineSoft}`,
          }}
        >
          <span
            style={{
              paddingTop: 1,
              color: theme.accentSoftBlue,
              fontFamily: TEXT_SANS,
              fontSize: 10.5,
              fontWeight: 650,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <div style={{ minWidth: 0 }}>
            {step.label && (
              <span
                style={{
                  display: 'block',
                  color: theme.textPrimary,
                  fontFamily: TEXT_SANS,
                  fontSize: isMobile ? 13.5 : 14,
                  fontWeight: 600,
                  letterSpacing: '-0.011em',
                  lineHeight: 1.45,
                }}
              >
                <InlineText citations={citations} theme={theme}>{step.label}</InlineText>
              </span>
            )}
            <span
              style={{
                display: 'block',
                marginTop: step.label ? 3 : 0,
                color: theme.textSecondary,
                fontFamily: TEXT_SANS,
                fontSize: 13.5,
                letterSpacing: '-0.008em',
                lineHeight: 1.6,
              }}
            >
              <InlineText citations={citations} theme={theme}>{step.detail}</InlineText>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ClinicalSectionsView = ({
  markdown,
  theme,
  isDark,
  citations = [],
  isMobile = false,
  renderMarkdown,
}) => {
  const sections = useMemo(() => splitSections(markdown), [markdown]);

  if (sections.length === 0) return null;

  const line = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 26 }}>
      {sections.map((section, index) => {
        const parsed = section.body ? parseSteps(section.body) : null;

        return (
          <section key={`${section.title || 'intro'}-${index}`}>
            {section.title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    flexShrink: 0,
                    color: theme.textPrimary,
                    fontFamily: SANS,
                    fontSize: isMobile ? 16 : 17,
                    fontWeight: 600,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {section.title}
                </h2>
                <span style={{ flex: 1, height: 1, background: line }} />
              </div>
            )}

            {parsed ? (
              <>
                {parsed.lead && (
                  <div className="markdown-body clinical-section-body" style={{ marginBottom: 12 }}>
                    {renderMarkdown(parsed.lead)}
                  </div>
                )}
                <StepList steps={parsed.steps} theme={theme} isDark={isDark} citations={citations} isMobile={isMobile} />
              </>
            ) : (
              <div className="markdown-body clinical-section-body">
                {renderMarkdown(section.body)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ClinicalSectionsView;
