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
    borderRadius: 24,
    background: t.backgroundSurface,
    color: t.textPrimary,
    boxShadow: '0 12px 32px rgba(0,0,0,.2)',
    padding: 20,
    display: 'flex', flexDirection: 'column', gap: 20,
    transition: 'transform .3s ease, opacity .3s ease',
  }),
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    background: 'rgba(128,128,128,.5)',
  },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  badge: (t) => ({
    background: t.accentSoftBlue, color: '#fff',
    fontSize: 12, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
  }),
  linkMeta: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  favicon: { width: 20, height: 20, borderRadius: 4, flexShrink: 0 },
  footerRow: { display: 'flex', gap: 12 },
  primaryBtn: (t) => ({
    flex: 1, background: t.accentSoftBlue, color: '#fff',
    border: 'none', borderRadius: 9999, padding: '10px 0',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  }),
  secondaryBtn: (t, copied) => ({
    flex: 1, background: 'transparent',
    color: copied ? t.successColor : t.textPrimary,
    border: `1px solid ${copied ? t.successColor : 'rgba(128,128,128,.4)'}`,
    borderRadius: 9999, padding: '10px 0', fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
  }),
};

// -----------------------------
// Helper that ALWAYS returns some metadata
// -----------------------------
const buildFallbackMeta = (citation) => {
  try {
    const u = new URL(citation.url);
    return {
      title: citation.title || 'Untitled',
      description: citation.authors || '',
      host: u.host,
      faviconURL: `https://${u.host}/favicon.ico`,
    };
  } catch {
    return {
      title: citation.title || 'Untitled',
      description: citation.authors || '',
      host: 'external link',
      faviconURL: '',
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
  if (meta?.description?.trim()) return meta.description.trim();

  // Fallback: first 160 characters of title
  if (meta?.title) return meta.title.slice(0, 160) + '…';

  return 'No summary available for this source.';
}, [meta]);



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
              {meta.faviconURL && <img src={meta.faviconURL} alt="favicon" style={styles.favicon} onError={(e) => (e.currentTarget.style.display = 'none')} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{meta.title}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {meta.host}
                </div>
              </div>
            </div>
{summaryText && (
  <div
    style={{
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 1.35,
      maxHeight: 48, // ~2 lines
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}
  >
    {summaryText}
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
