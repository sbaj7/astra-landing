import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, ArrowUp, Square, Copy, Check, Edit3, Sparkles, FileText, Search, Stethoscope, X, ExternalLink } from 'lucide-react';

// Original color system (unchanged)
const colors = {
  light: {
    backgroundPrimary: '#FAFAF9',
    backgroundSurface: '#FEFEFE',
    textPrimary: '#2A2A2A',
    textSecondary: '#5A6169',
    accentSoftBlue: '#4A6B7D',
    errorColor: '#D92D20',
    successColor: '#12B76A',
    grayPrimary: '#8B8B8B'
  },
  dark: {
    backgroundPrimary: '#121417',
    backgroundSurface: '#1C1F23',
    textPrimary: '#F9FAFB',
    textSecondary: '#A0AAB4',
    accentSoftBlue: '#8FA5B5',
    errorColor: '#F97066',
    successColor: '#32D583',
    grayPrimary: '#8B8B8B'
  }
};

const sampleQueries = {
  search: [
    "Antithrombotic strategy in AF post-TAVI multicenter RCT outcomes",
    "Restrictive vs liberal fluid resuscitation in early septic shock multicenter RCT outcomes",
    "Short-course antibiotics for uncomplicated gram-negative bacteremia systematic review update",
    "Deprescribing polypharmacy in stage-4 CKD consensus guidance"
  ],
  reason: [
    "32-yo male marathoner collapses mid-race, ECG QTc 520 ms, syncope episode",
    "68-yo female 2-week painless jaundice, 10-lb weight loss, palpable gallbladder",
    "26-yo female 3 days postpartum with sudden dyspnea, pleuritic pain, SpO₂ 88 %",
    "52-yo male with uncontrolled diabetes, orbital pain, black nasal eschar, fever"
  ],
  write: [
    "NSTEMI day 2 post-PCI in CICU, heparin stopped, on DAPT, telemetry monitoring",
    "HFrEF decompensation on IV furosemide drip, net −2 L goal, BMP and weight daily",
    "Severe aortic stenosis (78-yo) awaiting elective TAVR; optimize preload, cardiac work-up",
    "Metastatic colon cancer with bowel obstruction; comfort-care path, morphine PCA, PC consult"
  ]
};

const useTheme = () => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);
    
    const handler = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return { colors: isDark ? colors.dark : colors.light, isDark };
};

// Enhanced speech recognition with better error handling
const useSpeechRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsAvailable(true);
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setRecognizedText(text);
        setError(null);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event) => {
        setError(event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (!isAvailable) return;
    
    try {
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
      } else {
        setRecognizedText('');
        setError(null);
        recognitionRef.current?.start();
        setIsRecording(true);
      }
    } catch (err) {
      setError(err.message);
      setIsRecording(false);
    }
  }, [isRecording, isAvailable]);

  return { isRecording, recognizedText, isAvailable, toggleRecording, setRecognizedText, error };
};

// Proper markdown renderer with correct list handling and table support
export const renderMarkdown = (raw = '') => {
  if (!raw) return '';
  
  // Split into lines and process
  const lines = raw.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines but add spacing
    if (!line.trim()) {
      if (result.length > 0 && result[result.length - 1] !== '<br>') {
        result.push('<br>');
      }
      i++;
      continue;
    }
    
    // Tables - check if current line looks like a table
    if (line.includes('|')) {
      const tableLines = [];
      let j = i;
      while (j < lines.length && lines[j].includes('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      if (tableLines.length >= 2) {
        result.push(processTable(tableLines));
        i = j;
        continue;
      }
    }
    
    // Headers
    if (line.match(/^#{1,3}\s/)) {
      const level = line.match(/^(#{1,3})/)[1].length;
      const text = line.replace(/^#{1,3}\s+/, '');
      result.push(`<h${level}>${processInline(text)}</h${level}>`);
      i++;
      continue;
    }
    
    // Numbered items (custom block)
    if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s+(.*)$/);
      if (match) {
        const number = match[1];
        const text = match[2];
        result.push(`<div class="numbered-item"><span class="number">${number}.</span><span class="content">${processInline(text)}</span></div>`);
      }
      i++;
      continue;
    }
    
    // Unordered lists (bullets) - group consecutive items
    if (line.match(/^[•*+\-–]\s/)) {
      result.push('<ul>');
      while (i < lines.length && lines[i].match(/^[•*+\-]\s/)) {
        const text = lines[i].replace(/^[•*+\-]\s+/, '');
        result.push(`<li>${processInline(text)}</li>`);
        i++;
      }
      result.push('</ul>');
      continue;
    }
    
    // Blockquotes
    if (line.match(/^>\s/)) {
      const text = line.replace(/^>\s+/, '');
      result.push(`<blockquote>${processInline(text)}</blockquote>`);
      i++;
      continue;
    }
    
    // Horizontal rules
    if (line.match(/^---+$/)) {
      result.push('<hr>');
      i++;
      continue;
    }
    
    // Code blocks
    if (line.match(/^```/)) {
      result.push('<pre><code>');
      i++;
      while (i < lines.length && !lines[i].match(/^```/)) {
        // escape HTML inside code block
        const safe = lines[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        result.push(safe);
        i++;
      }
      result.push('</code></pre>');
      i++;
      continue;
    }
    
    // Regular paragraphs
    if (line.trim()) {
      result.push(`<p>${processInline(line.trim())}</p>`);
    }
    i++;
  }
  
  return result.join('\n');
};

// Process markdown tables (alignment-aware + responsive wrapper)
const processTable = (tableLines) => {
  if (tableLines.length < 2) return '';

  const parseCells = (line) =>
    line.split('|')
      .map(c => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));

  const header = tableLines[0];
  const alignRowIdx = tableLines.findIndex((l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l));
  const alignRow = alignRowIdx >= 0 ? tableLines[alignRowIdx] : null;

  const align = alignRow
    ? parseCells(alignRow).map(a => {
        const left = a.startsWith(':');
        const right = a.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return 'left';
      })
    : [];

  const headCells = parseCells(header);

  const bodyLines = tableLines
    .filter((l, i) => i !== 0 && i !== alignRowIdx)
    .filter(l => l.trim().length > 0 && !/^\s*\|[\s\-:|]*\|\s*$/.test(l));

  const rowToHtml = (line, tag) => {
    const cells = parseCells(line);
    const tds = cells.map((cell, idx) => {
      const a = align[idx] || 'left';
      return `<${tag} class="md-td align-${a}">${processInline(cell)}</${tag}>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  };

  const thead = `<thead><tr>${
    headCells.map((cell, idx) => {
      const a = align[idx] || 'left';
      return `<th class="md-th align-${a}">${processInline(cell)}</th>`;
    }).join('')
  }</tr></thead>`;

  const tbody = `<tbody>${
    bodyLines.map(line => rowToHtml(line, 'td')).join('')
  }</tbody>`;

  return [
    '<div class="md-table-wrap">',
    '<table class="md-table">',
    thead,
    tbody,
    '</table>',
    '</div>'
  ].join('');
};

// Process inline formatting
const processInline = (text) => {
  return text
    // escape angle brackets first
    .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic (avoid bold conflicts)
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Citations
    .replace(/\[(\d+)]/g, '<sup data-citation="$1" class="md-citation">[$1]</sup>');
};

// Citation overlay component (unchanged visuals)
const CitationPillOverlay = ({ citation, isPresented, onDismiss, theme }) => {
  if (!isPresented || !citation) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  const handleVisitLink = () => {
    if (citation.url) window.open(citation.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: theme.backgroundSurface, borderRadius: '16px', padding: '24px',
          maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{
            backgroundColor: theme.accentSoftBlue, color: 'white', borderRadius: '50%',
            width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 'bold'
          }}>
            {citation.number}
          </div>
          <button
            onClick={onDismiss}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary, padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: theme.textPrimary, lineHeight: '1.4' }}>
            {citation.title}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: theme.textSecondary }}>
            {citation.authors}
          </p>
        </div>

        {citation.url && (
          <button
            onClick={handleVisitLink}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
              backgroundColor: theme.accentSoftBlue, color: 'white', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px', fontWeight: '500', width: '100%', justifyContent: 'center'
            }}
          >
            <ExternalLink size={16} />
            Visit Source
          </button>
        )}
      </div>
    </div>
  );
};

const ToolbarView = ({ onNewChat, onToggleSidebar, theme }) => {
  const [newChatCooldown, setNewChatCooldown] = useState(false);

  const handleNewChat = () => {
    if (newChatCooldown) return;
    setNewChatCooldown(true);
    onNewChat();
    setTimeout(() => setNewChatCooldown(false), 300);
  };

  return (
    <div style={{
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      backgroundColor: theme.backgroundSurface,
      borderBottomLeftRadius: '20px',
      borderBottomRightRadius: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      zIndex: 10,
      minHeight: '52px'
    }}>
      <button
        onClick={onToggleSidebar}
        aria-label="Open sidebar"
        style={{
          padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <Stethoscope size={18} color={theme.textPrimary} />
      </button>

      <h1 style={{
        color: theme.textPrimary,
        fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
        fontSize: '28px',
        margin: 0,
        fontWeight: 'normal'
      }}>
        Astra
      </h1>

      <button
        onClick={handleNewChat}
        disabled={newChatCooldown}
        aria-label="New chat"
        style={{
          padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent',
          cursor: 'pointer', opacity: newChatCooldown ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <Edit3 size={18} color={theme.textPrimary} />
      </button>
    </div>
  );
};

const ModeSwitcher = ({ currentMode, onModeChange, isDisabled, theme }) => {
  const modes = [
    { key: 'search', title: 'Research', icon: Search },
    { key: 'reason', title: 'DDx', icon: Sparkles },
    { key: 'write', title: 'A&P', icon: FileText }
  ];

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {modes.map(({ key, title, icon: Icon }) => {
        const isSelected = currentMode === key;
        return (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            disabled={isDisabled}
            aria-pressed={isSelected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '50px',
              border: `1px solid ${theme.textSecondary}50`,
              backgroundColor: isSelected ? theme.accentSoftBlue : 'transparent',
              color: isSelected ? '#ffffff' : theme.textPrimary,
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: isDisabled ? 0.5 : 1
            }}
          >
            <Icon size={10} />
            <span>{title}</span>
          </button>
        );
      })}
    </div>
  );
};

const EmptyState = ({ currentMode, onSampleTapped, theme }) => {
  const queries = sampleQueries[currentMode] || sampleQueries.search;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', height: '100%', gap: '24px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '36px', height: '36px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" fill={`${theme.grayPrimary}40`} />
          </svg>
        </div>
        <h2 style={{
          color: `${theme.grayPrimary}60`,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: '36px',
          lineHeight: '1.1',
          margin: 0,
          maxWidth: '220px',
          fontWeight: '300'
        }}>
          Uncertainty ends here.
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '448px', padding: '0 32px' }}>
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onSampleTapped(query)}
            style={{
              width: '100%', padding: '10px 20px', borderRadius: '50px', fontSize: '12px', fontWeight: '500', textAlign: 'center',
              lineHeight: '1.4', backgroundColor: `${theme.grayPrimary}08`, border: `0.5px solid ${theme.grayPrimary}20`,
              color: `${theme.grayPrimary}70`, cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, theme, onTapCitation }) => {
  const [showCopied, setShowCopied] = useState(false);
  const containerRef = useRef(null);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1600);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (target.tagName === 'SUP' && target.dataset.citation) {
        const number = parseInt(target.dataset.citation, 10);
        const citation = message.citations?.find(c => c.number === number);
        if (citation && onTapCitation) onTapCitation(citation);
      }
    };
    const container = containerRef.current;
    if (container) container.addEventListener('click', handler);
    return () => { if (container) container.removeEventListener('click', handler); };
  }, [message.citations, onTapCitation]);

  if (message.role === 'user') {
    const getQueryLabel = () => {
      if (message.wasInWriteMode) return 'Write Request:';
      if (message.wasInReasonMode) return 'Reason Request:';
      return 'Search Query:';
    };

    return (
      <div style={{ width: '100%', marginBottom: '16px' }}>
        <div style={{ display: 'flex', backgroundColor: `${theme.accentSoftBlue}0D`, borderRadius: '6px' }}>
          <div style={{ width: '3px', backgroundColor: theme.accentSoftBlue, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: theme.textSecondary }}>
              {getQueryLabel()}
            </div>
            <div style={{ fontSize: '14px', color: theme.textPrimary }}>
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', marginBottom: '16px', position: 'relative' }}>
      <div style={{
        padding: '16px', borderRadius: '12px', backgroundColor: theme.backgroundSurface,
        border: `1px solid ${theme.accentSoftBlue}33`
      }}>
        {message.isStreamingComplete && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: theme.textSecondary }}>
              Response:
            </span>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="md"
          style={{ fontSize: '14px', lineHeight: '1.6', color: theme.textPrimary }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} 
        />

        <button
          onClick={handleCopy}
          aria-label="Copy message"
          style={{
            position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none',
            cursor: 'pointer', color: theme.textSecondary, fontSize: '13px'
          }}
        >
          {showCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

const StreamingResponse = ({ content, theme }) => {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: theme.backgroundSurface,
      border: `1px solid ${theme.accentSoftBlue}33`,
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: theme.textSecondary }}>
          Response:
        </span>
        {!content && (
          <div style={{ display: 'flex', gap: '2px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  backgroundColor: theme.accentSoftBlue, animation: `bounce 0.6s infinite ${i * 0.2}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div 
        className="md"
        style={{ fontSize: '14px', lineHeight: '1.6', color: theme.textPrimary }}
        dangerouslySetInnerHTML={{ 
          __html: content ? renderMarkdown(content) + '<span class="cursor">▍</span>' : ''
        }}
      />
    </div>
  );
};

const LoadingIndicator = ({ theme }) => {
  return (
    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'transparent', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: theme.textSecondary }}>
          Thinking...
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '4px', height: '4px', borderRadius: '50%',
                backgroundColor: theme.textSecondary, animation: `pulse 1.5s ease-in-out infinite ${i * 150}ms`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose, chatHistory, onSelectChat, onDeleteChat, onNewChat, theme }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose} />
      <div style={{
        width: '320px', height: '100%', padding: '24px',
        paddingTop: 'max(24px, env(safe-area-inset-top))', overflowY: 'auto',
        backgroundColor: theme.backgroundSurface
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: theme.textPrimary, margin: 0 }}>
            Chat History
          </h2>
          <button
            onClick={onNewChat}
            aria-label="New chat"
            style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            <Edit3 size={16} color={theme.textPrimary} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {chatHistory.map((chat) => (
            <div key={chat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => onSelectChat(chat)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', textAlign: 'left',
                  backgroundColor: `${theme.textSecondary}0A`, border: 'none', cursor: 'pointer'
                }}
              >
                <div style={{
                  fontSize: '14px', fontWeight: '500', color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {chat.title}
                </div>
                <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                  {new Date(chat.timestamp).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={() => onDeleteChat(chat)}
                aria-label="Delete chat"
                style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                <Square size={12} color={theme.errorColor} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const InputBar = ({
  query,
  setQuery,
  currentMode,
  onModeChange,
  onSend,
  onStop,
  isStreaming,
  isLoading,
  speechRecognition,
  theme
}) => {
  const textareaRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(32);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '32px';
    const scrollHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${scrollHeight}px`;
    setTextareaHeight(scrollHeight);
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [query, adjustTextareaHeight]);

  useEffect(() => {
    if (speechRecognition.isRecording && speechRecognition.recognizedText) {
      setQuery(speechRecognition.recognizedText);
    }
  }, [speechRecognition.recognizedText, speechRecognition.isRecording, setQuery]);

  const getPlaceholder = () => {
    switch (currentMode) {
      case 'reason': return 'Present your case';
      case 'write': return 'Outline your plan';
      default: return 'Ask anything';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) onSend();
    }
  };

  const handlePaste = () => {};

  const isDisabled = isStreaming || isLoading;

  return (
    <div style={{
      padding: '8px 16px 4px 16px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      backgroundColor: theme.backgroundSurface,
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Text Input Area */}
      <div style={{ position: 'relative', marginBottom: '0px', border: 'none', outline: 'none' }}>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={speechRecognition.isRecording ? 'Listening...' : getPlaceholder()}
          disabled={isDisabled}
          style={{
            width: '100%',
            padding: '8px 8px',
            borderRadius: '12px',
            resize: 'none',
            border: `none`,
            outline: 'none',
            fontSize: '16px',
            lineHeight: '1.5',
            backgroundColor: theme.backgroundSurface,
            color: theme.textPrimary,
            height: `${textareaHeight}px`,
            minHeight: '40px',
            maxHeight: '120px',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />

        {speechRecognition.isRecording && (
          <div style={{
            position: 'absolute', right: '12px', top: '0px', display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <span style={{ fontSize: '12px', color: theme.accentSoftBlue }}>
              Listening
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '4px', height: '4px', borderRadius: '50%',
                    backgroundColor: theme.accentSoftBlue, animation: `pulse 1.5s ease-in-out infinite ${i * 0.15}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-8px' }}>
        <ModeSwitcher
          currentMode={currentMode}
          onModeChange={onModeChange}
          isDisabled={isDisabled}
          theme={theme}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Microphone Button */}
          <button
            onClick={speechRecognition.toggleRecording}
            disabled={!speechRecognition.isAvailable || isDisabled}
            aria-pressed={speechRecognition.isRecording}
            aria-label={speechRecognition.isRecording ? 'Stop recording' : 'Start recording'}
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transform: speechRecognition.isRecording ? 'scale(1.1)' : 'scale(1)',
              color: speechRecognition.isRecording ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!speechRecognition.isAvailable || isDisabled) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {speechRecognition.isRecording ? (
              <Square size={28} fill="currentColor" />
            ) : (
              <Mic size={28} />
            )}
          </button>

          {/* Send/Stop Button */}
          <button
            onClick={isStreaming ? onStop : onSend}
            disabled={!isStreaming && !query.trim()}
            aria-label={isStreaming ? 'Stop response' : 'Send'}
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: isStreaming ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!isStreaming && !query.trim()) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isStreaming ? (
              <Square size={28} fill="currentColor" />
            ) : (
              <ArrowUp size={28} />
            )}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ textAlign: 'center', marginTop: '0px' }}>
        <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>
          Astra can make mistakes. Check critical info.
        </p>
      </div>
    </div>
  );
};

const AstraApp = () => {
  const { colors: theme } = useTheme();
  const speechRecognition = useSpeechRecognition();

  // App state
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [currentMode, setCurrentMode] = useState('search');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Citation overlay state
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [showCitationOverlay, setShowCitationOverlay] = useState(false);

  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);

  const resetChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setQuery('');
    setIsStreaming(false);
    setIsLoading(false);
    setStreamingContent('');
    if (speechRecognition.isRecording) speechRecognition.toggleRecording();
    speechRecognition.setRecognizedText('');
  };

  const handleSend = async () => {
    if (!query.trim() || isLoading || isStreaming) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query.trim(),
      wasInReasonMode: currentMode === 'reason',
      wasInWriteMode: currentMode === 'write',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const queryToSend = query.trim();
    setQuery('');
    setIsLoading(true);

    if (speechRecognition.isRecording) speechRecognition.toggleRecording();
    speechRecognition.setRecognizedText('');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_API_KEY,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          query: queryToSend,
          isClinical: false,
          isReason: currentMode === 'reason',
          isWrite: currentMode === 'write',
          mode: currentMode,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      setIsLoading(false);
      setIsStreaming(true);
      setStreamingContent('');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let collectedCitations = [];
      let finalContent = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split(/\r?\n/);
            const endsWithNewline = buffer.endsWith('\n') || buffer.endsWith('\r\n');

            if (endsWithNewline) {
              lines.forEach(line => {
                if (line.trim()) {
                  processStreamLine(line.trim(), collectedCitations, (content) => {
                    finalContent += content;
                    setStreamingContent(finalContent);
                  }, currentMode);
                }
              });
              buffer = '';
            } else if (lines.length > 1) {
              lines.slice(0, -1).forEach(line => {
                if (line.trim()) {
                  processStreamLine(line.trim(), collectedCitations, (content) => {
                    finalContent += content;
                    setStreamingContent(finalContent);
                  }, currentMode);
                }
              });
              buffer = lines[lines.length - 1] || '';
            }
          }

          if (finalContent.trim()) {
            const assistantMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: finalContent.trim(),
              citations: collectedCitations,
              timestamp: new Date(),
              isStreamingComplete: true
            };

            setMessages(prev => [...prev, assistantMessage]);
            
            const chatSession = {
              id: Date.now() + 2,
              title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : ''),
              messages: [...messages, userMessage, assistantMessage],
              timestamp: new Date(),
              wasInClinicalMode: false
            };
            setChatHistory(prev => [chatSession, ...prev]);
          }

          setIsStreaming(false);
          setStreamingContent('');
        } catch (streamError) {
          if (streamError.name === 'AbortError') return;
          console.error('Stream reading error:', streamError);
          setIsStreaming(false);
          setIsLoading(false);
          const errorMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: '⚠️ Error occurred while streaming response. Please try again.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Request failed:', error);
      setIsLoading(false);
      setIsStreaming(false);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Error: ${error.message}. Please check your connection and try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Helper function to process stream lines
  const processStreamLine = (line, citations, onContent, currentModeSnapshot) => {
    if (!line.startsWith('data:')) return;

    const payload = line.substring(5).trim();
    if (payload === '[DONE]' || !payload) return;

    try {
      const json = JSON.parse(payload);

      if (currentModeSnapshot === 'search' && citations.length === 0) {
        if (json.citations && Array.isArray(json.citations)) {
          if (typeof json.citations[0] === 'object') {
            json.citations.forEach(citationDict => {
              if (citationDict.number && citationDict.title && citationDict.url) {
                citations.push({
                  number: citationDict.number,
                  title: citationDict.title,
                  url: citationDict.url,
                  authors: citationDict.authors || new URL(citationDict.url).hostname || 'Unknown'
                });
              }
            });
          } else {
            json.citations.forEach((urlString, i) => {
              try {
                const url = new URL(urlString);
                citations.push({
                  number: i + 1,
                  title: extractTitle(url),
                  url: urlString,
                  authors: url.hostname || 'Unknown'
                });
              } catch {}
            });
          }
        }
      }

      let content = null;
      if (json.choices?.[0]?.delta?.content) content = json.choices[0].delta.content;
      else if (json.choices?.[0]?.message?.content) content = json.choices[0].message.content;
      else if (json.content) content = json.content;
      else if (json.text) content = json.text;

      if (content && content.length > 0) onContent(content);
    } catch {}
  };

  const extractTitle = (url) => {
    const hostname = url.hostname?.toLowerCase() || '';
    if (hostname.includes('pubmed')) return 'PubMed';
    if (hostname.includes('pmc')) return 'PMC Article';
    if (hostname.includes('dynamed')) return 'DynaMed';
    if (hostname.includes('heart.org')) return 'American Heart Association';
    if (hostname.includes('wikipedia')) return 'Wikipedia';
    return url.hostname || 'External Link';
  };

  const handleStop = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (isStreaming) {
      setIsStreaming(false);
      if (streamingContent) {
        const assistantMessage = {
          id: Date.now(),
          role: 'assistant',
          content: streamingContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      setStreamingContent('');
    }
  };

  const handleSampleTapped = (sampleQuery) => {
    setQuery(sampleQuery);
    setTimeout(() => {
      handleSend();
    }, 50);
  };

  const loadChatSession = (session) => {
    setMessages(session.messages);
    setQuery('');
    setIsStreaming(false);
    setIsLoading(false);
    setStreamingContent('');
    setShowSidebar(false);
  };

  const deleteChatSession = (session) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== session.id));
  };

  return (
    <div style={{
      height: '100vh',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {/* Toolbar */}
      <ToolbarView
        onNewChat={resetChat}
        onToggleSidebar={() => setShowSidebar(true)}
        theme={theme}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Conversation Area */}
        <div
          ref={scrollRef}
          style={{
            position:'relative', zIndex:0, flex: 1, overflowY: 'auto', padding: '0 16px',
            minHeight: 0, WebkitOverflowScrolling: 'touch'
          }}
          onClick={() => { if (speechRecognition.isRecording) speechRecognition.toggleRecording(); }}
        >
          <div style={{
            maxWidth: '900px', margin: '0 auto', padding: '16px 0', minHeight: '100%',
            display: 'flex', flexDirection: 'column'
          }}>
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState currentMode={currentMode} onSampleTapped={handleSampleTapped} theme={theme} />
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                theme={theme}
                onTapCitation={(citation) => {
                  setSelectedCitation(citation);
                  setShowCitationOverlay(true);
                }}
              />
            ))}

            {isLoading && <LoadingIndicator theme={theme} />}

            {isStreaming && (
              <StreamingResponse content={streamingContent} theme={theme} />
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ flexShrink: 0, maxWidth: '900px', margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', width: '100%' }}>
          <InputBar
            query={query}
            setQuery={setQuery}
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            isLoading={isLoading}
            speechRecognition={speechRecognition}
            theme={theme}
          />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        chatHistory={chatHistory}
        onSelectChat={loadChatSession}
        onDeleteChat={deleteChatSession}
        onNewChat={() => { resetChat(); setShowSidebar(false); }}
        theme={theme}
      />

      {/* Citation Overlay */}
      {showCitationOverlay && selectedCitation && (
        <CitationPillOverlay
          citation={selectedCitation}
          isPresented={showCitationOverlay}
          onDismiss={() => setShowCitationOverlay(false)}
          theme={theme}
        />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        * { box-sizing: border-box; }
        html { -webkit-text-size-adjust: 100%; }
        body {
          margin: 0; padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          overflow: hidden; height: 100vh;
        }
        #root { height: 100vh; width: 100vw; }
        @supports (height: 100vh) { body, #root { height: 100vh; } }
        html, body { position: fixed; overflow: hidden; width: 100%; height: 100%; }

        /* Custom scrollbars */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.textSecondary}40; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textSecondary}60; }
        * { scrollbar-width: thin; scrollbar-color: ${theme.textSecondary}40 transparent; }

        textarea::placeholder { color: ${theme.textSecondary}; opacity: 1; }
        textarea {
          font-family: inherit; line-height: inherit; border: none; outline: none; resize: none; background: transparent; font-size: 16px;
        }

        button:not(:disabled):hover { transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0); }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        .cursor { color: #4A6B7D; animation: blink 1s infinite; }

        /* Accessibility focus */
        button:focus-visible, textarea:focus-visible {
          outline: 2px solid ${theme.accentSoftBlue};
          outline-offset: 2px;
        }

        /* Typography + markdown */
        .md { line-height: 1.5; }
        h1, h2, h3, strong, em, code, ul, ol, li { color: ${theme.textPrimary} !important; }
        pre { background-color: ${theme.textSecondary}15 !important; }
        sup { color: ${theme.accentSoftBlue} !important; }

        .md h1 { margin: 0.6rem 0 0.3rem; font-size: 1.5rem; font-weight: 700; }
        .md h2 { margin: 0.5rem 0 0.25rem; font-size: 1.25rem; font-weight: 600; }
        .md h3 { margin: 0.4rem 0 0.2rem; font-size: 1.1rem; font-weight: 600; }
        .md p  { margin: 0.2rem 0; line-height: 1.45; }

        .md .numbered-item {
          margin: 0.22rem 0; display: flex; align-items: baseline; gap: 0.25rem;
        }
        .md .numbered-item .number { font-weight: 600; flex-shrink: 0; min-width: auto; }
        .md .numbered-item .content { flex: 1; line-height: 1.4; }

        /* ---- LISTS: hanging indents + clean rhythm ---- */
        .md ul, .md ol {
          margin: 0.35rem 0 0.35rem 0;
          padding-left: 1.35rem;
          list-style-position: outside;
        }
        .md ul ul, .md ol ol, .md ul ol, .md ol ul {
          margin: 0.25rem 0;
          padding-left: 1.15rem;
        }
        .md li {
          margin: 0.12rem 0;
          line-height: 1.45;
          padding-left: 0.15rem;
          text-indent: 0;
        }
        .md li::marker {
          color: ${theme.accentSoftBlue};
          font-weight: 600;
        }

        /* Inline code + blocks */
        .md pre {
          background-color: ${theme.textSecondary}15 !important;
          border-radius: 8px;
          padding: 12px;
          margin: 0.5rem 0;
          overflow-x: auto;
        }
        .md code {
          background-color: ${theme.textSecondary}15 !important;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.9em;
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
        }
        .md pre code { background: none !important; border: none; padding: 0; }

        .md blockquote {
          margin: 0.2rem 0;
          padding-left: 0.75rem;
          border-left: 3px solid ${theme.accentSoftBlue};
          font-style: italic;
        }

        .md hr {
          border: none; height: 1px; background-color: ${theme.textSecondary}40; margin: 1rem 0;
        }

        .md a {
          color: ${theme.accentSoftBlue} !important;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }
        .md a:hover { border-bottom-color: ${theme.accentSoftBlue}; }

        .md sup.md-citation {
          color: ${theme.accentSoftBlue} !important;
          cursor: pointer;
          font-weight: 600;
          padding: 0;
          border-radius: 4px;
          transition: all 0.2s ease;
          margin: 0;
        }
        .md sup.md-citation:hover {
          background-color: ${theme.accentSoftBlue}20;
          transform: translateY(-1px);
        }
        .md br { line-height: 0.3; }

        /* ---- TABLES: responsive, sticky header, zebra, soft borders ---- */
        .md-table-wrap {
          width: 100%;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0.5rem 0 0.75rem;
          border-radius: 10px;
          box-shadow: 0 1px 0 ${theme.textSecondary}1A inset;
          background: ${theme.backgroundSurface};
        }
        .md-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13.5px;
          line-height: 1.45;
          color: ${theme.textPrimary};
          overflow: hidden;
        }
        .md-table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          text-align: left;
          padding: 10px 12px;
          background: linear-gradient(0deg, ${theme.textSecondary}10, ${theme.textSecondary}18);
          color: ${theme.textPrimary};
          font-weight: 600;
          border-bottom: 1px solid ${theme.textSecondary}30;
          white-space: nowrap;
        }
        .md-table tbody td {
          padding: 10px 12px;
          vertical-align: middle;
          border-bottom: 1px solid ${theme.textSecondary}20;
          background: ${theme.backgroundSurface};
          max-width: 420px;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        .md-table tbody tr:nth-child(odd) td { background: ${theme.textSecondary}08; }
        .md-table tbody tr:hover td { background: ${theme.accentSoftBlue}12; }

        .md-table thead th:first-child { border-top-left-radius: 10px; }
        .md-table thead th:last-child  { border-top-right-radius: 10px; }
        .md-table tbody tr:last-child td:first-child { border-bottom-left-radius: 10px; }
        .md-table tbody tr:last-child td:last-child  { border-bottom-right-radius: 10px; }

        .md-table .align-left  { text-align: left; }
        .md-table .align-center{ text-align: center; }
        .md-table .align-right { text-align: right; }

        .md-table code { white-space: nowrap; max-width: 100%; display: inline-block; }

        @media (max-width: 520px) {
          .md-table thead th, .md-table tbody td { padding: 8px 10px; }
          .md-table { font-size: 13px; }
        }
      `}</style>
    </div>
  );
};

export default AstraApp;
