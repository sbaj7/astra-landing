import React from 'react';

const StreamingMarkdownView = ({ content, theme }) => {
  const processedContent = React.useMemo(() => {
    // Convert [n] citations to superscript format
    const pattern = /\[(\d+)\]/g;
    return content.replace(pattern, '<sup>$1</sup>');
  }, [content]);

  const renderContent = () => {
    // Add blinking cursor to indicate streaming
    const contentWithCursor = processedContent + '<span class="streaming-cursor">▍</span>';
    
    // Simple markdown processing
    let html = contentWithCursor;
    
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
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  return (
    <div className="overflow-auto">
      <div 
        className="px-4 streaming-markdown"
        style={{ color: theme?.textPrimary || '#000' }}
        dangerouslySetInnerHTML={{ __html: renderContent() }}
      />
      
      <style jsx>{`
        .streaming-markdown {
          font-size: 1rem;
          line-height: 1.6;
        }
        
        .streaming-markdown h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .streaming-markdown h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .streaming-markdown h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.5rem 0 0.25rem 0;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .streaming-markdown strong {
          font-weight: 600;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .streaming-markdown em {
          font-style: italic;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .streaming-markdown code {
          background-color: ${theme?.textSecondary}20;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
          color: ${theme?.textPrimary || '#000'};
        }
        
        .streaming-markdown sup {
          vertical-align: super;
          font-size: 0.75em;
          line-height: 0;
          color: ${theme?.accentSoftBlue || '#3b82f6'};
          font-weight: 600;
        }
        
        .streaming-markdown br {
          margin: 0.25rem 0;
        }
        
        .streaming-cursor {
          color: ${theme?.accentSoftBlue || '#3b82f6'};
          animation: blink 1s infinite;
          font-weight: normal;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StreamingMarkdownView;