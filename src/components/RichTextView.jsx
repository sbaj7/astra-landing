import React, { useRef, useEffect } from 'react';

const RichTextView = ({ 
  markdown, 
  inlineCitations, 
  citations, 
  onCitationTap,
  theme 
}) => {
  const containerRef = useRef(null);

  const createPillElement = (number, theme) => {
    const pill = document.createElement('span');
    pill.textContent = number.toString();
    pill.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      margin: 0 2px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      background-color: ${theme?.textSecondary || '#6b7280'};
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      vertical-align: middle;
    `;
    
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const citation = citations.find(c => c.number === number);
      if (citation && onCitationTap) {
        onCitationTap(citation);
      }
    });

    return pill;
  };

  const renderContent = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Sort citations by start index in reverse order to avoid index shifting
    const sortedCitations = [...inlineCitations].sort((a, b) => b.startIndex - a.startIndex);
    
    let text = markdown;
    const textNodes = [];
    let currentIndex = 0;

    // Process each inline citation
    for (const inline of sortedCitations) {
      const citation = citations.find(c => c.number === inline.sourceNumber);
      if (!citation) continue;

      // Add text before citation
      if (inline.startIndex > currentIndex) {
        textNodes.push({
          type: 'text',
          content: text.substring(currentIndex, inline.startIndex)
        });
      }

      // Add citation pill
      textNodes.push({
        type: 'citation',
        number: inline.sourceNumber
      });

      currentIndex = inline.endIndex;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      textNodes.push({
        type: 'text',
        content: text.substring(currentIndex)
      });
    }

    // If no citations, just add the text
    if (inlineCitations.length === 0) {
      textNodes.push({
        type: 'text',
        content: text
      });
    }

    // Create DOM elements
    textNodes.forEach(node => {
      if (node.type === 'text') {
        // Handle line breaks and basic formatting
        const lines = node.content.split('\n');
        lines.forEach((line, index) => {
          if (index > 0) {
            container.appendChild(document.createElement('br'));
          }
          if (line.trim()) {
            const textNode = document.createTextNode(line);
            container.appendChild(textNode);
          }
        });
      } else if (node.type === 'citation') {
        const pill = createPillElement(node.number, theme);
        container.appendChild(pill);
      }
    });
  };

  useEffect(() => {
    renderContent();
  }, [markdown, inlineCitations, citations, theme]);

  return (
    <div
      ref={containerRef}
      className="text-base leading-relaxed select-text"
      style={{ 
        color: theme?.textPrimary || '#000',
        lineHeight: '1.6',
        fontSize: '16px'
      }}
    />
  );
};

export default RichTextView;