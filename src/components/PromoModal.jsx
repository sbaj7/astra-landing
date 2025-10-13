import React from 'react';
import { X, Smartphone } from 'lucide-react';

const PromoModal = ({ isOpen, onClose, theme, isAuthenticated }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(10, 12, 16, 0.55)',
        backdropFilter: 'blur(3px)'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Astra MD mobile promotion"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          backgroundColor: theme.backgroundSurface,
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 24px 55px -18px rgba(15, 23, 42, 0.32)',
          border: `1px solid ${theme.textSecondary}18`,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          textAlign: 'center',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif'
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close promotion"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: `${theme.textSecondary}15`,
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '20px',
            backgroundColor: `${theme.accentSoftBlue}20`,
            color: theme.accentSoftBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}
        >
          <Smartphone size={28} />
        </div>

        <div>
          <h2
            style={{
              margin: '0 0 10px',
              fontSize: 24,
              fontWeight: 600,
              color: theme.textPrimary,
              fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
            }}
          >
            Take Astra MD Anywhere
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: theme.textSecondary
            }}
          >
            Get faster answers and track your consultations on the go with the Astra MD iOS app.
            {isAuthenticated ? ' Thanks for being a member!' : ' Sign in or create an account to unlock more features.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href="https://apps.apple.com/us/app/astra-md/id6749516660"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 16,
              backgroundColor: theme.accentSoftBlue,
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
              boxShadow: '0 12px 25px -12px rgba(79, 145, 197, 0.65)'
            }}
          >
            Download on the App Store
          </a>
          {!isAuthenticated && (
            <span
              style={{
                fontSize: 12,
                color: theme.textSecondary
              }}
            >
              Tip: create a free account to remove daily limits and keep your history synced.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoModal;
