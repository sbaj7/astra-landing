import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const isHttpUrl = (url) => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

const getHost = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const ReferencesView = ({ citations, isPresented, onDismiss, theme }) => {
  if (!isPresented) return null;

  const handleCitationClick = (citation) => {
    if (!citation?.url) return;
    if (isHttpUrl(citation.url)) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
      onDismiss?.();
    }
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: '0 16px 16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: theme.backgroundSurface,
          borderRadius: 28,
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '72vh',
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
              const host = getHost(citation.url);
              const isClickable = isHttpUrl(citation.url);

              return (
                <button
                  key={key}
                  disabled={!isClickable}
                  onClick={() => handleCitationClick(citation)}
                  style={{
                    padding: '14px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: isClickable ? 1 : 0.6
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: `${theme.accentSoftBlue}22`,
                      color: theme.accentSoftBlue,
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    {citation.number ?? '•'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: theme.textPrimary,
                          lineHeight: 1.35,
                          display: 'block'
                        }}
                      >
                        {citation.title || 'Untitled source'}
                      </span>
                      {isClickable && <ExternalLink size={16} color={theme.accentSoftBlue} />}
                    </div>

                    {host && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 4,
                          fontSize: 12,
                          color: theme.textSecondary
                        }}
                      >
                        {host}
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
