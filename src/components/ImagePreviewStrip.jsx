import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Image count indicator showing current/max images
 * Displays a pill-shaped badge with visual distinction at limit
 */
const ImageCountIndicator = ({ count, max, theme }) => {
  const isAtLimit = count === max;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isAtLimit
          ? `${theme.accentSoftBlue}20`
          : `${theme.textSecondary}10`,
        color: isAtLimit
          ? theme.accentSoftBlue
          : theme.textSecondary,
        fontSize: 12,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: 12,
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
      aria-label={`${count} of ${max} images attached`}
    >
      {count}/{max}
    </div>
  );
};

/**
 * Individual image thumbnail with remove button
 */
const ImageThumbnail = ({ image, onRemove, theme }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let objectUrl = null;

    if (image.file) {
      // Use createObjectURL for fast preview (faster than base64)
      objectUrl = URL.createObjectURL(image.file);
      setPreviewUrl(objectUrl);
    } else if (image.data) {
      // Fallback to base64 data if file not available
      setPreviewUrl(image.data);
    }

    // Cleanup: revoke object URL on unmount to prevent memory leak
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [image]);

  return (
    <div
      style={{
        position: 'relative',
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 8,
        overflow: 'visible' // Allow X button to overflow
      }}
    >
      {/* Image container with clipped corners */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          border: `1px solid ${theme.textSecondary}20`,
          backgroundColor: `${theme.textSecondary}10`
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={image.name || 'Preview'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          // Loading placeholder
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.textSecondary,
              fontSize: 10
            }}
          >
            ...
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${image.name || 'image'}`}
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: theme.errorColor || '#EF4444',
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
};

/**
 * Horizontal strip of image previews with removal buttons
 * Displays above the text input in InputBar
 */
export const ImagePreviewStrip = ({ images, onRemove, theme, isMobile, maxImages }) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: isMobile ? '10px 10px 6px 10px' : '12px 12px 8px 12px',
        overflowX: 'auto',
        overflowY: 'visible',
        // Hide scrollbar but allow scrolling
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      }}
      // Hide scrollbar for Chrome/Safari
      className="hide-scrollbar"
    >
      {images.map((image, index) => (
        <ImageThumbnail
          key={image.id || index}
          image={image}
          onRemove={() => onRemove(index)}
          theme={theme}
        />
      ))}
      {maxImages && (
        <ImageCountIndicator
          count={images.length}
          max={maxImages}
          theme={theme}
        />
      )}
    </div>
  );
};

export default ImagePreviewStrip;
