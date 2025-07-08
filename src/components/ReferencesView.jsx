import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const ReferencesView = ({ citations, isPresented, onDismiss, theme }) => {
  const handleLinkClick = (url) => {
    // Safely open only valid HTTP(S) URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('Invalid URL scheme:', url);
    }
  };

  const getDisplayUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname || url;
    } catch {
      return 'Invalid URL';
    }
  };

  if (!isPresented) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onDismiss}
    >
      <div 
        className="w-full max-w-2xl h-5/6 rounded-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: theme.backgroundSurface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: `${theme.textSecondary}20` }}
        >
          <button
            onClick={onDismiss}
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{ backgroundColor: `${theme.textSecondary}33` }}
          >
            <X size={18} color={theme.textPrimary} />
          </button>

          <h1 
            className="text-xl font-bold"
            style={{ color: theme.textPrimary }}
          >
            Sources
          </h1>

          <div className="w-9" /> {/* Spacer for alignment */}
        </div>

        {/* Sources list */}
        <div className="overflow-y-auto h-full">
          <div className="divide-y" style={{ borderColor: `${theme.textSecondary}20` }}>
            {citations.map((citation) => (
              <div key={citation.id} className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Citation number */}
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${theme.textSecondary}33`, color: theme.textPrimary }}
                  >
                    {citation.number}
                  </div>

                  {/* Citation content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 
                      className="text-lg font-semibold leading-tight"
                      style={{ color: theme.textPrimary }}
                    >
                      {citation.title}
                    </h3>

                    <p 
                      className="text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      {citation.authors}
                    </p>

                    {/* URL link */}
                    {(citation.url.startsWith('http://') || citation.url.startsWith('https://')) ? (
                      <button
                        onClick={() => handleLinkClick(citation.url)}
                        className="flex items-center space-x-1 text-sm hover:underline"
                        style={{ color: theme.accentSoftBlue }}
                      >
                        <ExternalLink size={12} />
                        <span>{getDisplayUrl(citation.url)}</span>
                      </button>
                    ) : (
                      <span 
                        className="text-xs"
                        style={{ color: theme.textSecondary }}
                      >
                        Tap to view
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {citations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <p 
                  className="text-lg font-medium"
                  style={{ color: theme.textSecondary }}
                >
                  No sources available
                </p>
                <p 
                  className="text-sm mt-1"
                  style={{ color: theme.textSecondary }}
                >
                  Citations will appear here when available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferencesView;