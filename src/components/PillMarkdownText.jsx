import React from 'react';

const PillMarkdownText = ({ markdown, citations, theme }) => {
  const buildStyledText = (text, citations) => {
    const regex = /\[(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const number = parseInt(match[1]);
      const startIndex = match.index;
      const endIndex = match.index + fullMatch.length;

      // Add text before citation
      if (startIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, startIndex),
          key: `text-${lastIndex}`
        });
      }

      // Add citation pill if citation exists
      if (citations.find(c => c.number === number)) {
        parts.push({
          type: 'citation',
          number: number,
          key: `citation-${number}-${startIndex}`
        });
      }

      lastIndex = endIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
        key: `text-${lastIndex}`
      });
    }

    return parts;
  };

  const parts = buildStyledText(markdown, citations);

  return (
    <div 
      className="text-base leading-relaxed py-1"
      style={{ color: theme?.textPrimary || '#000' }}
    >
      {parts.map((part) => {
        if (part.type === 'text') {
          return (
            <span key={part.key}>
              {part.content}
            </span>
          );
        } else if (part.type === 'citation') {
          return (
            <span
              key={part.key}
              className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 mx-0.5 text-xs font-medium text-white rounded"
              style={{ 
                backgroundColor: theme?.textSecondary || '#6b7280',
                fontSize: '12px',
                lineHeight: '1'
              }}
            >
              {part.number}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};

export default PillMarkdownText;