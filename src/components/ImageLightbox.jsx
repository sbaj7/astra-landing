import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Full-size image lightbox overlay.
 * Opens when user clicks on a chat image thumbnail.
 * Closes on backdrop click, X button, or Escape key.
 */
const ImageLightbox = ({ imageUrl, onClose, theme }) => {
  // Escape key listener
  useEffect(() => {
    if (!imageUrl) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out'
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close lightbox"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: theme.textPrimary,
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
      >
        <X size={24} />
      </button>

      {/* Full-size image */}
      <img
        src={imageUrl}
        alt="Full size view"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: '8px'
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageLightbox;
