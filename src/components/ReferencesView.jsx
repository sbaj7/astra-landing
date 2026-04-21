import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';

const isHttpUrl = (url) => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

const getHost = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const getFavicon = (citation) => {
  if (citation?.faviconUrl) return citation.faviconUrl;
  const host = citation?.host || getHost(citation?.url);
  if (!host) return '';
  return `https://www.google.com/s2/favicons?sz=128&domain=${host}`;
};

const formatPublishedDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const ReferencesView = ({ citations, isPresented, onDismiss, theme }) => {
  const [showCopied, setShowCopied] = useState(false);

  if (!isPresented) return null;

  const handleCitationClick = (citation) => {
    if (!citation?.url) return;
    if (isHttpUrl(citation.url)) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
      onDismiss?.();
    }
  };

  const handleCopyAll = async () => {
    if (!citations || citations.length === 0) return;

    try {
      const citationText = citations
        .map(citation => `[${citation.number}] ${citation.title || 'Untitled'} - ${citation.url || ''}`)
        .join('\n');

      await navigator.clipboard.writeText(citationText);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy citations:', error);
    }
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(5, 8, 14, 0.82)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: '0 20px 22px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          backgroundColor: theme.backgroundSurface,
          borderRadius: 28,
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '64vh',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', padding: '18px 24px 6px' }}>
          <div
            style={{
              width: 44,
              height: 4,
              borderRadius: 999,
              backgroundColor: `${theme.textSecondary}40`,
              margin: '0 auto 14px'
            }}
          />
          <button
            onClick={handleCopyAll}
            style={{
              position: 'absolute',
              top: 18,
              left: 20,
              border: 'none',
              background: showCopied ? theme.accentSoftBlue : 'transparent',
              cursor: 'pointer',
              color: showCopied ? '#fff' : theme.textSecondary,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            aria-label="Copy all citations"
          >
            {showCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button
            onClick={onDismiss}
            style={{
              position: 'absolute',
              top: 18,
              right: 20,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: theme.textSecondary,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Dismiss citations"
          >
            <X size={18} />
          </button>
          <h1
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 600,
              color: theme.textPrimary
            }}
          >
            Citations
          </h1>
        </div>

        <div style={{ overflowY: 'auto', padding: '4px 0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {citations.map((citation) => {
              const key = citation.id || `${citation.number}-${citation.url || citation.title}`;
              const isClickable = isHttpUrl(citation.url);
              const host = citation.host || getHost(citation.url);
              const faviconUrl = getFavicon(citation);
              const publishedLabel = formatPublishedDate(citation.publishedAt);
              const snippet = citation.snippet?.trim();

              return (
                <button
                  key={key}
                  disabled={!isClickable}
                  onClick={() => handleCitationClick(citation)}
                  style={{
                    margin: '8px 16px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    background: `${theme.backgroundSurface}F6`,
                    border: 'none',
                    borderRadius: 22,
                    borderBottom: `1px solid ${theme.textSecondary}16`,
                    boxShadow: '0 18px 30px rgba(15, 23, 42, 0.12)',
                    textAlign: 'left',
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: isClickable ? 1 : 0.6,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 20px 36px rgba(15, 23, 42, 0.18)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 18px 30px rgba(15, 23, 42, 0.12)';
                    }
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: `${theme.accentSoftBlue}22`,
                      color: theme.accentSoftBlue,
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {citation.number ?? '•'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {faviconUrl && (
                        <img
                          src={faviconUrl}
                          alt="Site icon"
                          style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }}
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>
                        {citation.title || 'Untitled source'}
                      </h4>
                    </div>

                    {snippet && (
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: theme.textSecondary
                        }}
                      >
                        {snippet}
                      </p>
                    )}

                    {(host || publishedLabel) && (
                      <span
                        style={{
                          marginTop: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: theme.accentSoftBlue,
                          maxWidth: '100%'
                        }}
                      >
                        {isClickable && <ExternalLink size={14} color={theme.accentSoftBlue} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {host}
                          {publishedLabel && ` • ${publishedLabel}`}
                        </span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {citations.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 24px',
                  color: theme.textSecondary
                }}
              >
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No sources available</p>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>Citations will appear when Astra cites references.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferencesView;
