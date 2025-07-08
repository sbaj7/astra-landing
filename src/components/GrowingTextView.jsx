import React, { useRef, useEffect, useCallback } from 'react';

const GrowingTextView = ({ 
  text, 
  setText, 
  height, 
  setHeight, 
  maxWidth, 
  maxHeight = 88, 
  onReturn = null,
  placeholder = "",
  disabled = false,
  theme 
}) => {
  const textareaRef = useRef(null);
  const minHeight = 44;

  const calculateHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to recalculate
    textarea.style.height = `${minHeight}px`;
    
    // Calculate new height based on scroll height
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    
    // Enable scrolling if content exceeds max height
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    
    // Update height
    if (Math.abs(height - newHeight) > 0.5) {
      setHeight(newHeight);
    }
    
    textarea.style.height = `${newHeight}px`;
  }, [height, setHeight, maxHeight, minHeight]);

  useEffect(() => {
    calculateHeight();
  }, [text, calculateHeight]);

  const handleChange = (e) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onReturn) {
        onReturn();
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className="resize-none border-none outline-none w-full"
      style={{
        backgroundColor: 'transparent',
        color: theme?.textPrimary || '#000',
        fontSize: '14px',
        lineHeight: '1.4',
        padding: '12px 8px 6px 8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        minHeight: `${minHeight}px`,
        maxWidth: `${maxWidth}px`,
        height: `${height}px`,
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap'
      }}
    />
  );
};

export default GrowingTextView;