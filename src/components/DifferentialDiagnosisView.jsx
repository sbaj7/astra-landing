import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

/* =========================
   DIFFERENTIAL DIAGNOSIS VIEW
   Parses the "## Differential Diagnosis" markdown section into one compact
   ranked list. Each row expands to its evidence, then to its reasoning.
   ========================= */

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const TEXT_SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// The model is asked for these labels, but wording drifts — accept the common variants.
const LABEL_ALIASES = {
  'supporting': 'supporting',
  'supporting evidence': 'supporting',
  'supports': 'supporting',
  'why this fits': 'supporting',
  'favors': 'supporting',
  'for': 'supporting',
  'against': 'against',
  'evidence against': 'against',
  'argues against': 'against',
  'why this may not fit': 'against',
  'discriminator': 'discriminator',
  'key discriminator': 'discriminator',
  'discriminating test': 'discriminator',
  'how to distinguish': 'discriminator',
  'reasoning': 'reasoning',
  'clinical reasoning': 'reasoning',
  'rationale': 'reasoning',
  'why this ranking': 'reasoning',
  'assessment': 'reasoning',
};

const cleanLikelihood = (raw = '') =>
  raw
    .replace(/\*/g, '')
    .replace(/^\s*likelihood\s*[:—–-]?\s*/i, '')
    .replace(/^[—–-]\s*/, '')
    .trim();

const clamp = (n) => Math.max(0, Math.min(100, n));

// "55–70%" → {low:55, high:70}; "60%" → {low:60, high:60}; "High" → null
const rangeOf = (likelihood = '') => {
  const nums = (likelihood.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (nums.length === 0) return null;
  if (nums.length >= 2) return { low: clamp(Math.min(nums[0], nums[1])), high: clamp(Math.max(nums[0], nums[1])) };
  return { low: clamp(nums[0]), high: clamp(nums[0]) };
};

const bandFor = (range, rank) => {
  if (!range) return rank === 0 ? 'Most likely' : rank < 3 ? 'Consider' : 'Less likely';
  const mid = (range.low + range.high) / 2;
  if (mid >= 40) return 'Most likely';
  if (mid >= 20) return 'Likely';
  if (mid >= 8) return 'Consider';
  return 'Less likely';
};

const parseBlock = (block) => {
  const acc = { supporting: [], against: [], discriminator: '', reasoning: '' };
  let current = null;

  const push = (key, value) => {
    if (!value) return;
    if (Array.isArray(acc[key])) acc[key].push(value);
    else acc[key] = acc[key] ? `${acc[key]} ${value}` : value;
  };

  block.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const labelMatch = line.match(/^\*\*([^*]+?)\*\*\s*:?\s*(?:[—–-]\s*)?(.*)$/);
    if (labelMatch) {
      const key = LABEL_ALIASES[labelMatch[1].trim().replace(/:$/, '').toLowerCase()];
      if (key) {
        current = key;
        push(key, labelMatch[2].trim());
        return;
      }
    }

    const bulletMatch = line.match(/^[–—\-•*]\s+(.*)$/);
    if (bulletMatch) {
      if (current) push(current, bulletMatch[1].trim());
      return;
    }

    // Free prose only belongs to the paragraph-shaped fields.
    if (current === 'discriminator' || current === 'reasoning') push(current, line);
  });

  return acc;
};

export const parseDifferentials = (text = '') => {
  if (!text) return [];

  const headRe = /^[ \t]*(\d+)\.\s*\*\*(.+?)\*\*\s*(?:[—–-]+\s*(.*))?$/gm;
  const heads = [];
  let match;

  while ((match = headRe.exec(text)) !== null) {
    heads.push({
      start: match.index,
      end: headRe.lastIndex,
      condition: match[2].trim(),
      likelihood: cleanLikelihood(match[3] || ''),
    });
  }

  return heads.map((head, i) => {
    const nextStart = i + 1 < heads.length ? heads[i + 1].start : text.length;
    let block = text.slice(head.end, nextStart);
    const nextHeading = block.search(/^##\s+/m);
    if (nextHeading > -1) block = block.slice(0, nextHeading);

    return {
      condition: head.condition,
      likelihood: head.likelihood,
      range: rangeOf(head.likelihood),
      ...parseBlock(block),
    };
  });
};

/* ---------------------------------------------------------------- inline md */

// Bullets arrive as raw markdown fragments — render bold, italic and [N] citations.
export const InlineText = ({ children, citations, theme }) => {
  const text = String(children ?? '');
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\d+\])/g).filter(Boolean);

  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (/^\[\d+\]$/.test(part)) {
      const number = part.slice(1, -1);
      const citation = Array.isArray(citations)
        ? citations.find((c) => c && String(c.number) === number)
        : null;
      const pill = (
        <sup
          style={{
            display: 'inline-block',
            minWidth: 14,
            marginLeft: 2,
            padding: '1px 4px',
            borderRadius: 5,
            background: `${theme.accentSoftBlue}1F`,
            color: theme.accentSoftBlue,
            fontSize: 9,
            fontWeight: 650,
            lineHeight: 1.4,
            textAlign: 'center',
            verticalAlign: 'super',
          }}
        >
          {number}
        </sup>
      );
      return citation?.url
        ? <a key={i} href={citation.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{pill}</a>
        : <React.Fragment key={i}>{pill}</React.Fragment>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

/* ------------------------------------------------------------------ pieces */

const EvidenceColumn = ({ items, tone, label, theme, citations, isStreaming }) => (
  <div style={{ minWidth: 0 }}>
    <span
      style={{
        display: 'block',
        marginBottom: 8,
        color: tone,
        fontFamily: TEXT_SANS,
        fontSize: 9.5,
        fontWeight: 650,
        letterSpacing: '0.13em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
    {items.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span
              style={{
                width: 3,
                height: 3,
                marginTop: 8,
                flexShrink: 0,
                borderRadius: '50%',
                background: `${tone}80`,
              }}
            />
            <span
              style={{
                color: theme.textPrimary,
                fontFamily: TEXT_SANS,
                fontSize: 13.5,
                letterSpacing: '-0.008em',
                lineHeight: 1.5,
              }}
            >
              <InlineText citations={citations} theme={theme}>{item}</InlineText>
            </span>
          </div>
        ))}
      </div>
    ) : (
      <span style={{ color: theme.textSecondary, fontFamily: TEXT_SANS, fontSize: 13, fontStyle: 'italic', opacity: 0.7 }}>
        {isStreaming ? 'Reasoning…' : 'None specified'}
      </span>
    )}
  </div>
);

const ProbabilityBar = ({ range, rank, theme, track, height = 6 }) => {
  const solid = range ? range.low : Math.max(4, 60 - rank * 14);
  const extended = range ? range.high : solid;
  const fill = rank === 0 ? theme.accentSoftBlue : rank < 3 ? `${theme.accentSoftBlue}B8` : `${theme.textSecondary}70`;

  return (
    <span
      style={{
        position: 'relative',
        display: 'block',
        height,
        overflow: 'hidden',
        borderRadius: 999,
        background: track,
      }}
    >
      {/* 50% reference tick, so the 0–100 scale is readable */}
      <span style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: `${theme.textSecondary}26` }} />
      <span
        className="ddx-bar-seg"
        style={{ position: 'absolute', top: 0, bottom: 0, left: `${solid}%`, width: `${Math.max(0, extended - solid)}%`, background: `${fill}52` }}
      />
      <span
        className="ddx-bar-seg"
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${solid}%`, borderRadius: 999, background: fill }}
      />
    </span>
  );
};

/* ------------------------------------------------------------------- view */

const DifferentialDiagnosisView = ({ content, theme, isDark, isStreaming, citations = [], isMobile = false }) => {
  const differentials = useMemo(() => parseDifferentials(content), [content]);
  const [openRows, setOpenRows] = useState(() => new Set([0]));
  const [openReasoning, setOpenReasoning] = useState(() => new Set());

  const toggleRow = useCallback((index) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const toggleReasoning = useCallback((index) => {
    setOpenReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  if (differentials.length === 0) return null;

  const line = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const lineSoft = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.05)';
  const track = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const hover = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.022)';
  const panelBg = isDark ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.014)';
  const positive = theme.successColor || '#12B76A';
  const negative = theme.errorColor || '#D92D20';

  return (
    <div className="ddx-view">
      <style>{`
        .ddx-view .ddx-item + .ddx-item { border-top: 1px solid ${lineSoft}; }
        .ddx-view .ddx-head {
          display: grid;
          width: 100%;
          grid-template-columns: 18px minmax(0, 1fr) clamp(96px, 22%, 220px) 62px 14px;
          gap: 12px;
          align-items: center;
          padding: 9px 12px;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background-color 140ms ease;
        }
        .ddx-view .ddx-head:hover { background: ${hover}; }
        .ddx-view .ddx-head:focus-visible { outline: 2px solid ${theme.accentSoftBlue}; outline-offset: -2px; }
        .ddx-view .ddx-chevron { transition: transform 200ms cubic-bezier(.22,1,.36,1); }
        .ddx-view .ddx-head[aria-expanded="true"] .ddx-chevron { transform: rotate(90deg); }
        .ddx-view .ddx-bar-seg { transition: width 460ms cubic-bezier(.22,1,.36,1), left 460ms cubic-bezier(.22,1,.36,1); }
        .ddx-view .ddx-panel { animation: ddx-open 220ms cubic-bezier(.22,1,.36,1) both; }
        .ddx-view .ddx-more {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          margin-left: -8px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: ${theme.accentSoftBlue};
          cursor: pointer;
          font-family: ${TEXT_SANS};
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .ddx-view .ddx-more:hover { background: ${theme.accentSoftBlue}12; }
        @keyframes ddx-open { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
        @media (max-width: 640px) {
          .ddx-view .ddx-head { grid-template-columns: 18px minmax(0, 1fr) 58px 14px; gap: 5px 10px; padding: 8px 10px; }
          .ddx-view .ddx-head .ddx-bar { grid-column: 2 / -1; grid-row: 2; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ddx-view .ddx-bar-seg, .ddx-view .ddx-chevron { transition: none; }
          .ddx-view .ddx-panel { animation: none; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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
          Differential Diagnosis
        </h2>
        <span style={{ flex: 1, height: 1, background: line }} />
        <span
          style={{
            flexShrink: 0,
            color: theme.textSecondary,
            fontFamily: TEXT_SANS,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            opacity: 0.6,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {differentials.length} ranked
        </span>
      </div>

      <div style={{ border: `1px solid ${line}`, borderRadius: 12, overflow: 'hidden' }}>
        {differentials.map((item, index) => {
          const isOpen = openRows.has(index);
          const showReasoning = openReasoning.has(index);
          const hasDeeper = Boolean(item.discriminator || item.reasoning);

          return (
            <div className="ddx-item" key={`${item.condition}-${index}`}>
              <button
                type="button"
                className="ddx-head"
                aria-expanded={isOpen}
                onClick={() => toggleRow(index)}
              >
                <span
                  style={{
                    color: theme.textSecondary,
                    fontFamily: TEXT_SANS,
                    fontSize: 11,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    opacity: 0.55,
                  }}
                >
                  {index + 1}
                </span>

                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    color: theme.textPrimary,
                    fontFamily: TEXT_SANS,
                    fontSize: isMobile ? 13.5 : 14,
                    fontWeight: index === 0 ? 600 : 500,
                    letterSpacing: '-0.011em',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.condition}
                </span>

                <span className="ddx-bar">
                  <ProbabilityBar range={item.range} rank={index} theme={theme} track={track} />
                </span>

                <span
                  style={{
                    color: theme.textPrimary,
                    fontFamily: TEXT_SANS,
                    fontSize: 11.5,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.likelihood || bandFor(item.range, index)}
                </span>

                <ChevronRight
                  className="ddx-chevron"
                  size={14}
                  strokeWidth={2}
                  style={{ color: theme.textSecondary, opacity: 0.5 }}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div
                  className="ddx-panel"
                  style={{
                    padding: isMobile ? '12px 12px 14px 12px' : '12px 16px 16px 42px',
                    borderTop: `1px solid ${lineSoft}`,
                    background: panelBg,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                      gap: isMobile ? 14 : 24,
                    }}
                  >
                    <EvidenceColumn
                      items={item.supporting}
                      tone={positive}
                      label="Supporting"
                      theme={theme}
                      citations={citations}
                      isStreaming={isStreaming}
                    />
                    <EvidenceColumn
                      items={item.against}
                      tone={negative}
                      label="Against"
                      theme={theme}
                      citations={citations}
                      isStreaming={isStreaming}
                    />
                  </div>

                  {hasDeeper && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="ddx-more"
                        aria-expanded={showReasoning}
                        onClick={() => toggleReasoning(index)}
                      >
                        <ChevronRight
                          size={11}
                          strokeWidth={2.4}
                          style={{ transform: showReasoning ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease' }}
                          aria-hidden="true"
                        />
                        {showReasoning ? 'Hide reasoning' : 'Why this ranking'}
                      </button>

                      {showReasoning && (
                        <div
                          className="ddx-panel"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            marginTop: 8,
                            paddingTop: 12,
                            borderTop: `1px solid ${lineSoft}`,
                          }}
                        >
                          {item.discriminator && (
                            <div>
                              <span
                                style={{
                                  display: 'block',
                                  marginBottom: 4,
                                  color: theme.textSecondary,
                                  fontFamily: TEXT_SANS,
                                  fontSize: 9.5,
                                  fontWeight: 650,
                                  letterSpacing: '0.13em',
                                  opacity: 0.7,
                                  textTransform: 'uppercase',
                                }}
                              >
                                Discriminator
                              </span>
                              <p style={{ margin: 0, color: theme.textPrimary, fontFamily: TEXT_SANS, fontSize: 13.5, lineHeight: 1.6 }}>
                                <InlineText citations={citations} theme={theme}>{item.discriminator}</InlineText>
                              </p>
                            </div>
                          )}
                          {item.reasoning && (
                            <p style={{ margin: 0, color: theme.textPrimary, fontFamily: TEXT_SANS, fontSize: 13.5, lineHeight: 1.68 }}>
                              <InlineText citations={citations} theme={theme}>{item.reasoning}</InlineText>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DifferentialDiagnosisView;
