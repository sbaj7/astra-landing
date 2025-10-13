import React, { useEffect, useState } from 'react';

/**
 * Pure‑CSS, dependency‑free citation pill overlay.
 * -------------------------------------------------
 * – Centred modal with dimmed / blurred backdrop.
 * – Gracefully downgrades when the link‑preview API is missing.
 * – No Tailwind, no external component libs.
 * – Just pass your existing `theme` object.
 */

// -----------------------------
// Inline style objects
// -----------------------------
const styles = {
  wrapper: {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  card: (t) => ({
    width: '100%', maxWidth: 480,
    borderRadius: 22,
    background: `${t.backgroundSurface}F6`,
    color: t.textPrimary,
    boxShadow: '0 18px 30px rgba(15, 23, 42, 0.12)',
    padding: '18px 22px',
    display: 'flex', flexDirection: 'column', gap: 18,
    transition: 'transform .3s ease, opacity .3s ease',
    borderBottom: `1px solid ${t.textSecondary}16`,
  }),
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    background: 'rgba(128,128,128,.5)',
  },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge: (t) => ({
    background: t.accentSoftBlue, color: '#fff',
    fontSize: 12, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
  }),
  linkMeta: { display: 'flex', alignItems: 'flex-start', gap: 16 },
  faviconWrapper: (t) => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: `${t.textSecondary}12`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0
  }),
  favicon: { width: 24, height: 24 },
  footerRow: { display: 'flex', gap: 12, marginTop: 8 },
  primaryBtn: (t) => ({
    flex: 1, background: t.accentSoftBlue, color: '#fff',
    border: 'none', borderRadius: 9999, padding: '10px 0',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
  secondaryBtn: (t, copied) => ({
    flex: 1, background: 'transparent',
    color: copied ? t.successColor : t.textPrimary,
    border: `1px solid ${copied ? t.successColor : 'rgba(128,128,128,.4)'}`,
    borderRadius: 9999, padding: '10px 0', fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
};

// -----------------------------
// Helper that ALWAYS returns some metadata
// -----------------------------
const buildFallbackMeta = (citation) => {
  try {
    const parsed = new URL(citation.url);
    const host = citation.host || citation.hostname || parsed.host;
    return {
      title: citation.title || 'Untitled',
      description: citation.summary || citation.snippet || citation.authors || '',
      host,
      faviconURL: citation.faviconUrl || `https://${host}/favicon.ico`,
    };
  } catch {
    const host = citation.host || citation.hostname || 'external link';
    return {
      title: citation.title || 'Untitled',
      description: citation.summary || citation.snippet || citation.authors || '',
      host,
      faviconURL: citation.faviconUrl || '',
    };
  }
};

// -----------------------------
// Main component
// -----------------------------
const CitationPillOverlay = ({ citation, isPresented, onDismiss, theme }) => {
  const [meta, setMeta] = useState(() => buildFallbackMeta(citation));
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // ------- fetch preview data (if API route exists) -------
useEffect(() => {
  if (!isPresented) return;

  if (citation?.summary || citation?.snippet) {
    setLoading(false);
    setMeta(prev => ({
      title: citation.title || prev.title,
      description: citation.summary || citation.snippet || prev.description,
      host: citation.host || citation.hostname || prev.host,
      faviconURL: citation.faviconUrl || prev.faviconURL
    }));
    return () => {};
  }

  let alive = true;

  (async () => {
    try {
      setLoading(true);
      const res = await fetch(citation.url);
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const getMeta = (selector) => doc.querySelector(selector)?.getAttribute('content')?.trim();

      const title = getMeta('meta[property="og:title"]') || doc.title || 'Untitled';
      const description = getMeta('meta[property="og:description"]') ||
                          getMeta('meta[name="description"]') ||
                          citation.authors || '';
      const host = new URL(citation.url).host;
      const faviconURL = `https://${host}/favicon.ico`;

      if (alive) {
        setMeta({
          title,
          description,
          host,
          faviconURL,
        });
      }
    } catch (err) {
      console.warn('Preview fetch failed:', err);
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => { alive = false; };
}, [isPresented, citation.url]);


  // ------- copy handler -------
  const handleCopy = () => {
    navigator.clipboard.writeText(citation.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // pick a description, fall back to a 1-sentence auto-summary if needed
const summaryText = React.useMemo(() => {
  if (citation?.summary) {
    return citation.summary.length > 220 ? `${citation.summary.slice(0, 217)}…` : citation.summary;
  }
  if (meta?.description?.trim()) return meta.description.trim();

  // Fallback: first 160 characters of title
  if (meta?.title) return meta.title.slice(0, 160) + '…';

  return 'No summary available for this source.';
}, [meta, citation]);



  if (!isPresented) return null;

  return (
    <div style={styles.wrapper} onClick={onDismiss}>
      <div style={styles.card(theme)} onClick={(e) => e.stopPropagation()}>
        {/* drag‑handle */}
        <div style={styles.handle} />

        {/* header */}
        <div style={styles.headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={styles.badge(theme)}>[{citation.number}]</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Source</span>
          </div>
          <button
            aria-label="Dismiss"
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: theme.textSecondary }}
          >
            ×
          </button>
        </div>

        {/* body */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 14, color: theme.textSecondary }}>
            Loading preview…
          </div>
        ) : (
          <>
            <div style={styles.linkMeta}>
              <div style={styles.faviconWrapper(theme)}>
                {meta.faviconURL ? (
                  <img
                    src={meta.faviconURL}
                    alt="favicon"
                    style={styles.favicon}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.textPrimary, marginBottom: 6 }}>
                  {meta.title}
                </h4>
                {citation?.detail && (
                  <p style={{ margin: '6px 0 0', fontSize: 12.5, color: theme.textSecondary }}>
                    {citation.detail}
                  </p>
                )}
                <div style={{
                  fontSize: 12,
                  color: theme.accentSoftBlue,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 8
                }}>
                  {meta.host}
                </div>
              </div>
            </div>
            {summaryText && (
              <div
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                {summaryText}
              </div>
            )}

            {(citation?.authors || citation?.journal || citation?.source || citation?.publisher || citation?.year || citation?.doi) && (
              <div style={{ fontSize: 12, color: theme.textSecondary, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {citation?.authors && <span>{citation.authors}</span>}
                {(citation?.journal || citation?.source || citation?.publisher || citation?.hostname || citation?.year || citation?.doi) && (
                  <span>
                    {[citation?.journal || citation?.source || citation?.publisher || citation?.hostname, citation?.year, citation?.doi ? `doi:${citation.doi}` : null]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* footer */}
        <div style={styles.footerRow}>
          <button style={styles.primaryBtn(theme)} onClick={() => window.open(citation.url, '_blank')}>Open link</button>
          <button style={styles.secondaryBtn(theme, copied)} onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>
    </div>
  );
};

export default CitationPillOverlay;
