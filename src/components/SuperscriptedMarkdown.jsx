import React from 'react';

const SuperscriptedMarkdown = ({ markdown, citations, onTapCitation, theme }) => {
  const parsedMarkdown = React.useMemo(() => {
    // Convert [n] citations to clickable links
    const regex = /\[(\d+)\]/g;
    let result = markdown;
    const matches = Array.from(markdown.matchAll(regex)).reverse(); // Reverse to avoid index shifting

    for (const match of matches) {
      const fullMatch = match[0];
      const number = match[1];
      const startIndex = match.index;
      const endIndex = match.index + fullMatch.length;
      
      const replacement = `[[${number}]](citation://${number})`;
      result = result.substring(0, startIndex) + replacement + result.substring(endIndex);
    }
    
    return result;
  }, [markdown]);

  const handleLinkClick = (url) => {
    if (url.startsWith('citation://')) {
      const number = parseInt(url.replace('citation://', ''));
      const citation = citations.find(c => c.number === number);
      if (citation && onTapCitation) {
        onTapCitation(citation);
      }
      return false; // Prevent default link behavior
    }
    return true; // Allow default behavior for other links
  };

  const renderMarkdown = (text) => {
    // Simple markdown parser for basic formatting
    let html = text;
    
    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Citation links - make them superscript and clickable
    html = html.replace(/\[\[(\d+)\]\]\(citation:\/\/(\d+)\)/g, (match, number, citationNumber) => {
      return `<sup><a href="citation://${citationNumber}" data-citation="${citationNumber}" class="citation-link">${number}</a></sup>`;
    });
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  const handleClick = (e) => {
    if (e.target.classList.contains('citation-link')) {
      e.preventDefault();
      const citationNumber = parseInt(e.target.getAttribute('data-citation'));
      const citation = citations.find(c => c.number === citationNumber);
      if (citation && onTapCitation) {
        onTapCitation(citation);
      }
    }
  };

  return (
    <div
      className="markdown-content text-base leading-relaxed select-text"
      style={{ color: theme?.textPrimary || '#000' }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(parsedMarkdown) }}
    >
      <style jsx>{`
        .markdown-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .markdown-content h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .markdown-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.5rem 0 0.25rem 0;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .markdown-content strong {
          font-weight: 600;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .markdown-content em {
          font-style: italic;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .markdown-content code {
          background-color: ${theme?.textSecondary}20;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .markdown-content .citation-link {
          color: ${theme?.accentSoftBlue || '#3b82f6'};
          text-decoration: none;
          font-weight: 600;
          font-size: 0.75em;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        
        .markdown-content .citation-link:hover {
          opacity: 0.8;
        }
        
        .markdown-content sup {
          vertical-align: super;
          font-size: 0.75em;
          line-height: 0;
        }
        
        .markdown-content br {
          margin: 0.25rem 0;
        }
        
        .markdown-content p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
};

export default SuperscriptedMarkdown;