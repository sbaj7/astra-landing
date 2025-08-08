import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, ArrowUp, Square, Edit3, Sparkles, FileText, Search, Stethoscope, X, ExternalLink } from 'lucide-react';

/* =========================
   THEME SYSTEM
   ========================= */
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

const useTheme = () => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);
    
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return { colors: isDark ? colors.dark : colors.light, isDark };
};

/* =========================
   SAMPLE QUERIES
   ========================= */
const sampleQueries = {
  search: [
    'Antithrombotic strategy in AF post-TAVI multicenter RCT outcomes',
    'Restrictive vs liberal fluid resuscitation in early septic shock multicenter RCT outcomes',
    'Short-course antibiotics for uncomplicated gram-negative bacteremia systematic review update',
    'Deprescribing polypharmacy in stage-4 CKD consensus guidance'
  ],
  reason: [
    '32-yo male marathoner collapses mid-race, ECG QTc 520 ms, syncope episode',
    '68-yo female 2-week painless jaundice, 10-lb weight loss, palpable gallbladder',
    '26-yo female 3 days postpartum with sudden dyspnea, pleuritic pain, SpO₂ 88 %',
    '52-yo male with uncontrolled diabetes, orbital pain, black nasal eschar, fever'
  ],
  write: [
    'NSTEMI day 2 post-PCI in CICU, heparin stopped, on DAPT, telemetry monitoring',
    'HFrEF decompensation on IV furosemide drip, net −2 L goal, BMP and weight daily',
    'Severe aortic stenosis (78-yo) awaiting elective TAVR; optimize preload, cardiac work-up',
    'Metastatic colon cancer with bowel obstruction; comfort-care path, morphine PCA, PC consult'
  ]
};

/* =========================
   SPEECH RECOGNITION HOOK
   ========================= */
const useSpeechRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (SpeechRecognition) {
      setIsAvailable(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRecognizedText(transcript);
        setError(null);
      };

      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event) => {
        setError(event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (!isAvailable || !recognitionRef.current) return;
    
    try {
      if (isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      } else {
        setRecognizedText('');
        setError(null);
        recognitionRef.current.start();
        setIsRecording(true);
      }
    } catch (err) {
      setError(err.message);
      setIsRecording(false);
    }
  }, [isRecording, isAvailable]);

  return { 
    isRecording, 
    recognizedText, 
    isAvailable, 
    toggleRecording, 
    setRecognizedText, 
    error 
  };
};

/* =========================
   MARKDOWN RENDERING
   - Beautiful tables (alignment-aware)
   - Proper bullets (supports en dash) + **nested sub-bullets**
   ========================= */

// --- helpers ---
const escapeHTML = (s = '') =>
  s.replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;');

const processInline = (text = '') => (
  escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\[(\d+)]/g, '<sup data-citation="$1" class="md-citation">[$1]</sup>')
);

// alignment-aware, responsive table
const processTable = (tableLines) => {
  const parseCells = (line) =>
    line.split('|')
      .map(c => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));

  const header = tableLines[0];
  const alignRowIdx = tableLines.findIndex((l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l));
  const alignRow = alignRowIdx >= 0 ? tableLines[alignRowIdx] : null;

  const align = alignRow
    ? parseCells(alignRow).map(a => {
        const left = a.startsWith(':'), right = a.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
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

  const tbody = `<tbody>${bodyLines.map(line => rowToHtml(line, 'td')).join('')}</tbody>`;

  return `<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`;
};

export const renderMarkdown = (raw = '') => {
  if (!raw) return '';

  const lines = raw.split('\n');
  const out = [];

  const listStack = [];            // stack of 'ul' | 'ol'
  let lastOpenedLiIndex = -1;      // index in out[] where the last <li> started
  let lastLiDepth = -1;            // depth of last <li>

  const bulletRE  = /^(\s*)([\*\+\-•–])\s+(.*)$/;   // bullets (incl. en dash)
  const numberRE  = /^(\s*)(\d+)\.\s+(.*)$/;        // ordered "1. ..."
  const codeFence = /^```/;

  const tableStart = (i) =>
    (lines[i] || '').includes('|') &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] || '');

  const readTable = (i) => {
    const tbl = [lines[i], lines[i + 1]];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|')) { tbl.push(lines[j]); j++; }
    return { block: tbl, next: j };
  };

  const tabsToSpaces = (s) => s.replace(/\t/g, '    ');
  const depthFromIndent = (s) => Math.floor(tabsToSpaces(s).length / 2); // 2 spaces per level

  const closeListsTo = (level) => {
    while (listStack.length > level) {
      out.push(`</${listStack.pop()}>`);
    }
  };

  const ensureListAtDepth = (depth, type) => {
    // close extra levels
    while (listStack.length > depth + 1) {
      out.push(`</${listStack.pop()}>`);
    }
    // open missing parents as <ul>
    while (listStack.length < depth) {
      out.push('<ul>');
      listStack.push('ul');
    }
    // open or switch list at target depth
    if (listStack.length === depth) {
      out.push(`<${type}>`);
      listStack.push(type);
    } else if (listStack[depth] !== type) {
      out.push(`</${listStack.pop()}>`);
      out.push(`<${type}>`);
      listStack.push(type);
    }
  };

  const emitParagraph = (text) => out.push(`<p>${processInline(text.trim())}</p>`);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // blank line → close all lists
    if (!line.trim()) {
      closeListsTo(0);
      lastOpenedLiIndex = -1;
      lastLiDepth = -1;
      i++;
      continue;
    }

    // fenced code
    if (codeFence.test(line)) {
      closeListsTo(0);
      const buf = [];
      i++;
      while (i < lines.length && !codeFence.test(lines[i])) {
        buf.push(escapeHTML(lines[i]));
        i++;
      }
      out.push(`<pre><code>${buf.join('\n')}</code></pre>`);
      i++; // skip closing ```
      continue;
    }

    // tables
    if (tableStart(i)) {
      closeListsTo(0);
      const { block, next } = readTable(i);
      out.push(processTable(block));
      lastOpenedLiIndex = -1;
      lastLiDepth = -1;
      i = next;
      continue;
    }

    // blockquote
    {
      const m = line.match(/^\s*>\s+(.*)$/);
      if (m) {
        closeListsTo(0);
        out.push(`<blockquote>${processInline(m[1])}</blockquote>`);
        lastOpenedLiIndex = -1;
        lastLiDepth = -1;
        i++;
        continue;
      }
    }

    // headers
    {
      const m = line.match(/^(#{1,3})\s+(.*)$/);
      if (m) {
        closeListsTo(0);
        const level = m[1].length;
        out.push(`<h${level}>${processInline(m[2])}</h${level}>`);
        lastOpenedLiIndex = -1;
        lastLiDepth = -1;
        i++;
        continue;
      }
    }

    // unordered bullet
    {
      const m = line.match(bulletRE);
      if (m) {
        const depth = depthFromIndent(m[1]);
        const content = m[3];

        ensureListAtDepth(depth, 'ul');
        out.push(`<li>${processInline(content)}`);
        // don't close </li> yet — we might attach auto-subpoints
        lastOpenedLiIndex = out.length - 1;
        lastLiDepth = depth;

        // lookahead: auto-nest any immediate next lines that start with a dash/en-dash and NO extra indent
        let j = i + 1;
        const subpoints = [];
        while (j < lines.length) {
          const nxt = lines[j];
          if (!nxt.trim()) break;
          // stop if next is a table, header, quote, code, or a "proper" list item with indent
          if (codeFence.test(nxt) || tableStart(j) || /^(#{1,3})\s+/.test(nxt) || /^\s*>\s+/.test(nxt)) break;

          const dash = nxt.match(/^\s*[–-]\s+(.*)$/); // exactly your "– something" lines
          const properBullet = nxt.match(bulletRE) || nxt.match(numberRE);

          if (dash && depthFromIndent(nxt.match(/^(\s*)/)[1]) === depth) {
            subpoints.push(dash[1]);
            j++;
            continue;
          }
          if (properBullet) break; // next proper list item; stop
          break; // anything else → stop
        }

        if (subpoints.length) {
          out.push('<ul>');
          for (const t of subpoints) out.push(`<li>${processInline(t)}</li>`);
          out.push('</ul>');
          i = j; // consumed the subpoint lines
        } else {
          i++; // just the one bullet
        }

        out.push('</li>');
        continue;
      }
    }

    // ordered bullet
    {
      const m = line.match(numberRE);
      if (m) {
        const depth = depthFromIndent(m[1]);
        const content = m[3];

        ensureListAtDepth(depth, 'ol');
        out.push(`<li>${processInline(content)}`);
        lastOpenedLiIndex = out.length - 1;
        lastLiDepth = depth;

        // same auto-subpoint behavior for dashes under numbered lines
        let j = i + 1;
        const subpoints = [];
        while (j < lines.length) {
          const nxt = lines[j];
          if (!nxt.trim()) break;
          if (codeFence.test(nxt) || tableStart(j) || /^(#{1,3})\s+/.test(nxt) || /^\s*>\s+/.test(nxt)) break;

          const dash = nxt.match(/^\s*[–-]\s+(.*)$/);
          const properBullet = nxt.match(bulletRE) || nxt.match(numberRE);

          if (dash && depthFromIndent(nxt.match(/^(\s*)/)[1]) === depth) {
            subpoints.push(dash[1]);
            j++;
            continue;
          }
          if (properBullet) break;
          break;
        }

        if (subpoints.length) {
          out.push('<ul>');
          for (const t of subpoints) out.push(`<li>${processInline(t)}</li>`);
          out.push('</ul>');
          i = j;
        } else {
          i++;
        }

        out.push('</li>');
        continue;
      }
    }

    // paragraph
    closeListsTo(0);
    emitParagraph(line);
    i++;
  }

  // close any dangling lists
  closeListsTo(0);
  return out.join('\n');
};

/* =========================
   CITATION MODAL
   ========================= */
const CitationModal = ({ citation, isOpen, onClose, theme }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleOpenLink = () => {
    if (citation.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        style={{
          backgroundColor: theme.backgroundSurface,
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16
        }}>
          <div style={{
            backgroundColor: theme.accentSoftBlue,
            color: 'white',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700
          }}>
            {citation.number}
          </div>
          <button
            onClick={onClose}
            aria-label="Close citation"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.textSecondary,
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{
            margin: '0 0 8px',
            fontSize: 18,
            fontWeight: 600,
            color: theme.textPrimary,
            lineHeight: 1.4
          }}>
            {citation.title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: theme.textSecondary
          }}>
            {citation.authors}
          </p>
        </div>

        {citation.url && (
          <button
            onClick={handleOpenLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              backgroundColor: theme.accentSoftBlue,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              width: '100%',
              justifyContent: 'center'
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

/* =========================
   UI COMPONENTS
   ========================= */
const Toolbar = ({ onNewChat, onToggleSidebar, theme }) => {
  const [isNewChatDisabled, setIsNewChatDisabled] = useState(false);

  const handleNewChat = () => {
    if (isNewChatDisabled) return;
    
    setIsNewChatDisabled(true);
    onNewChat();
    setTimeout(() => setIsNewChatDisabled(false), 300);
  };

  return (
    <div style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      backgroundColor: theme.backgroundSurface,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'relative',
      zIndex: 10,
      minHeight: 52
    }}>
      <button
        onClick={onToggleSidebar}
        aria-label="Open sidebar"
        style={{
          padding: 8,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Stethoscope size={18} color={theme.textPrimary} />
      </button>

      <h1 style={{
        color: theme.textPrimary,
        fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
        fontSize: 28,
        margin: 0,
        fontWeight: 400
      }}>
        Astra
      </h1>

      <button
        onClick={handleNewChat}
        disabled={isNewChatDisabled}
        aria-label="New chat"
        style={{
          padding: 8,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          opacity: isNewChatDisabled ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
    <div style={{ display: 'flex', gap: 6 }}>
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
              gap: 4,
              padding: '6px 10px',
              borderRadius: 50,
              border: `1px solid ${theme.textSecondary}50`,
              backgroundColor: isSelected ? theme.accentSoftBlue : 'transparent',
              color: isSelected ? '#fff' : theme.textPrimary,
              fontSize: 12,
              fontWeight: 500,
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

const EmptyState = ({ currentMode, onSampleSelect, theme }) => {
  const queries = sampleQueries[currentMode] || sampleQueries.search;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      height: '100%',
      gap: 24
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36,
          height: 36,
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path
              d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z"
              fill={`${theme.grayPrimary}40`}
            />
          </svg>
        </div>
        <h2 style={{
          color: `${theme.grayPrimary}60`,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: 36,
          lineHeight: 1.1,
          margin: 0,
          maxWidth: 220,
          fontWeight: 300
        }}>
          Uncertainty ends here.
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        maxWidth: 448,
        padding: '0 32px'
      }}>
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onSampleSelect(query)}
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.4,
              backgroundColor: `${theme.grayPrimary}08`,
              border: `0.5px solid ${theme.grayPrimary}20`,
              color: `${theme.grayPrimary}70`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, theme, onCitationClick }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target;
      if (target.tagName === 'SUP' && target.dataset.citation) {
        const citationNumber = parseInt(target.dataset.citation, 10);
        const citation = message.citations?.find(c => c.number === citationNumber);
        if (citation && onCitationClick) {
          onCitationClick(citation);
        }
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('click', handleClick);
      return () => element.removeEventListener('click', handleClick);
    }
  }, [message.citations, onCitationClick]);

  if (message.role === 'user') {
    const getLabel = () => {
      if (message.wasInWriteMode) return 'Write Request:';
      if (message.wasInReasonMode) return 'Reason Request:';
      return 'Search Query:';
    };

    return (
      <div style={{ width: '100%', marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          backgroundColor: `${theme.accentSoftBlue}0D`,
          borderRadius: 6
        }}>
          <div style={{
            width: 3,
            backgroundColor: theme.accentSoftBlue,
            flexShrink: 0
          }} />
          <div style={{
            flex: 1,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: theme.textSecondary
            }}>
              {getLabel()}
            </div>
            <div style={{
              fontSize: 14,
              color: theme.textPrimary
            }}>
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      marginBottom: 16,
      position: 'relative'
    }}>
      <div style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.backgroundSurface,
        border: `1px solid ${theme.accentSoftBlue}33`
      }}>
        {message.isStreamingComplete && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: theme.textSecondary
            }}>
              Response:
            </span>
          </div>
        )}

        <div
          ref={containerRef}
          className="md"
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: theme.textPrimary
          }}
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(message.content)
          }}
        />

        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message.content || '');
            } catch (error) {
              console.warn('Failed to copy to clipboard:', error);
            }
          }}
          aria-label="Copy message"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.textSecondary,
            fontSize: 13
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
};

const StreamingIndicator = ({ content, theme }) => (
  <div style={{
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.backgroundSurface,
    border: `1px solid ${theme.accentSoftBlue}33`,
    marginBottom: 16
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.textSecondary
      }}>
        Response:
      </span>
      {!content && (
        <div style={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: theme.accentSoftBlue,
                animation: `bounce 0.6s infinite ${i * 0.2}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
    <div
      className="md"
      style={{
        fontSize: 14,
        lineHeight: 1.6,
        color: theme.textPrimary
      }}
      dangerouslySetInnerHTML={{
        __html: content ? renderMarkdown(content) + '<span class="cursor">▍</span>' : ''
      }}
    />
  </div>
);

const LoadingIndicator = ({ theme }) => (
  <div style={{
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginBottom: 16
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.textSecondary
      }}>
        Thinking...
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: theme.textSecondary,
              animation: `pulse 1.5s ease-in-out infinite ${i * 150}ms`
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

/* =========================
   INPUT BAR
   ========================= */
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
    const height = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${height}px`;
    setTextareaHeight(height);
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

  const isDisabled = isStreaming || isLoading;

  return (
    <div style={{
      padding: '8px 16px 4px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      backgroundColor: theme.backgroundSurface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        position: 'relative',
        marginBottom: 0,
        border: 'none',
        outline: 'none'
      }}>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (query.trim()) onSend();
            }
          }}
          placeholder={speechRecognition.isRecording ? 'Listening...' : getPlaceholder()}
          disabled={isDisabled}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 12,
            resize: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 16,
            lineHeight: 1.5,
            backgroundColor: theme.backgroundSurface,
            color: theme.textPrimary,
            height: `${textareaHeight}px`,
            minHeight: 40,
            maxHeight: 120,
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />

        {speechRecognition.isRecording && (
          <div style={{
            position: 'absolute',
            right: 12,
            top: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{
              fontSize: 12,
              color: theme.accentSoftBlue
            }}>
              Listening
            </span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: theme.accentSoftBlue,
                    animation: `pulse 1.5s ease-in-out infinite ${i * 150}ms`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -8
      }}>
        <ModeSwitcher
          currentMode={currentMode}
          onModeChange={onModeChange}
          isDisabled={isStreaming || isLoading}
          theme={theme}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <button
            onClick={speechRecognition.toggleRecording}
            disabled={!speechRecognition.isAvailable || isStreaming || isLoading}
            aria-pressed={speechRecognition.isRecording}
            aria-label={speechRecognition.isRecording ? 'Stop recording' : 'Start recording'}
            style={{
              padding: 8,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transform: speechRecognition.isRecording ? 'scale(1.1)' : 'scale(1)',
              color: speechRecognition.isRecording ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!speechRecognition.isAvailable || isStreaming || isLoading) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {speechRecognition.isRecording ? 
              <Square size={28} fill="currentColor" /> : 
              <Mic size={28} />
            }
          </button>

          <button
            onClick={isStreaming ? onStop : onSend}
            disabled={!isStreaming && !query.trim()}
            aria-label={isStreaming ? 'Stop response' : 'Send'}
            style={{
              padding: 8,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isStreaming ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!isStreaming && !query.trim()) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isStreaming ? 
              <Square size={28} fill="currentColor" /> : 
              <ArrowUp size={28} />
            }
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 0 }}>
        <p style={{
          fontSize: 12,
          color: theme.textSecondary,
          margin: 0
        }}>
          Astra can make mistakes. Check critical info.
        </p>
      </div>
    </div>
  );
};

/* =========================
   GLOBAL STYLES
   ========================= */
const GlobalStyles = ({ theme }) => {
  const css = `
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      overflow: hidden;
      height: 100vh;
      background: ${theme.backgroundPrimary};
      color: ${theme.textPrimary};
    }
    #root { height: 100vh; width: 100vw; }
    @supports (height: 100vh) { body, #root { height: 100vh; } }
    html, body { position: fixed; overflow: hidden; width: 100%; height: 100%; }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${theme.textSecondary}40; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${theme.textSecondary}60; }
    * { scrollbar-width: thin; scrollbar-color: ${theme.textSecondary}40 transparent; }

    /* Form elements */
    textarea::placeholder { color: ${theme.textSecondary}; opacity: 1; }
    textarea {
      font-family: inherit;
      line-height: inherit;
      border: none;
      outline: none;
      resize: none;
      background: transparent;
      font-size: 16px;
    }
    button:not(:disabled):hover { transform: translateY(-1px); }
    button:not(:disabled):active { transform: translateY(0); }
    button:focus-visible, textarea:focus-visible {
      outline: 2px solid ${theme.accentSoftBlue};
      outline-offset: 2px;
    }

    /* Animations */
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    .cursor { color: #4A6B7D; animation: blink 1s infinite; }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }

    /* Markdown styles */
    .md { line-height: 1.6; }
    .md h1 { margin: 1rem 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: ${theme.textPrimary}; }
    .md h2 { margin: 0.875rem 0 0.375rem; font-size: 1.5rem; font-weight: 600; color: ${theme.textPrimary}; }
    .md h3 { margin: 0.75rem 0 0.25rem; font-size: 1.25rem; font-weight: 600; color: ${theme.textPrimary}; }
    .md h4 { margin: 0.625rem 0 0.25rem; font-size: 1.125rem; font-weight: 600; color: ${theme.textPrimary}; }
    .md h5 { margin: 0.5rem 0 0.25rem; font-size: 1rem; font-weight: 600; color: ${theme.textPrimary}; }
    .md h6 {
      margin: 0.5rem 0 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: ${theme.textPrimary};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .md p { margin: 0.5rem 0; line-height: 1.6; }
    .md a {
      color: ${theme.accentSoftBlue};
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s ease;
    }
    .md a:hover { border-bottom-color: ${theme.accentSoftBlue}; }
    .md sup.md-citation {
      color: ${theme.accentSoftBlue};
      cursor: pointer;
      font-weight: 600;
      border-radius: 4px;
      padding: 1px 3px;
    }
    .md sup.md-citation:hover { background-color: ${theme.accentSoftBlue}20; }

    /* Code blocks */
    .md pre {
      background: linear-gradient(135deg, ${theme.textSecondary}12, ${theme.textSecondary}08);
      border-radius: 12px;
      padding: 16px;
      margin: 1rem 0;
      overflow-x: auto;
      border: 1px solid ${theme.textSecondary}15;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .md code {
      background-color: ${theme.textSecondary}12;
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 0.875em;
      font-family: 'SF Mono','Monaco','Cascadia Code','Roboto Mono',monospace;
      border: 1px solid ${theme.textSecondary}15;
      color: ${theme.textPrimary};
    }
    .md pre code { background: none; border: none; padding: 0; }

    /* Blockquotes */
    .md blockquote {
      margin: 0.75rem 0;
      padding: 1rem 0 1rem 1rem;
      border-left: 4px solid ${theme.accentSoftBlue};
      background: linear-gradient(90deg, ${theme.textSecondary}08, transparent);
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }

    /* Lists */
    .md ul, .md ol {
      margin: 0.75rem 0;
      padding-left: 0;
      list-style: none;
    }
    .md li {
      margin: 0.25rem 0;
      line-height: 1.6;
      position: relative;
      padding-left: 1.5rem;
    }
    .md ul li::before {
      content: "•";
      color: ${theme.accentSoftBlue};
      font-weight: bold;
      position: absolute;
      left: 0;
      top: 0;
    }
    .md ol {
      counter-reset: list-counter;
    }
    .md ol li {
      counter-increment: list-counter;
    }
    .md ol li::before {
      content: counter(list-counter) ".";
      color: ${theme.accentSoftBlue};
      font-weight: bold;
      position: absolute;
      left: 0;
      top: 0;
      min-width: 1.2rem;
    }
    .md ul ul, .md ol ol, .md ul ol, .md ol ul {
      margin: 0.25rem 0;
      padding-left: 1.5rem;
    }
    .md li p { margin: 0.25rem 0; }

    /* Tables */
    .md-table-wrap {
      width: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      margin: 1.5rem 0;
      border-radius: 16px;
      background: ${theme.backgroundSurface};
      box-shadow: 
        0 0 0 1px ${theme.textSecondary}10 inset,
        0 8px 32px -8px rgba(0,0,0,0.15),
        0 4px 16px -4px rgba(0,0,0,0.1);
      border: 1px solid ${theme.textSecondary}08;
    }
    .md-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 14px;
      line-height: 1.5;
      color: ${theme.textPrimary};
      background: ${theme.backgroundSurface};
    }
    .md-table thead th {
      position: sticky;
      top: 0;
      z-index: 10;
      text-align: left;
      padding: 16px 20px;
      background: linear-gradient(135deg, ${theme.textSecondary}15 0%, ${theme.textSecondary}08 100%);
      backdrop-filter: saturate(150%) blur(12px);
      -webkit-backdrop-filter: saturate(150%) blur(12px);
      color: ${theme.textPrimary};
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid ${theme.accentSoftBlue}25;
      white-space: nowrap;
    }
    .md-table tbody td {
      padding: 14px 20px;
      vertical-align: top;
      border-bottom: 1px solid ${theme.textSecondary}08;
      background: ${theme.backgroundSurface};
      max-width: 400px;
      overflow-wrap: break-word;
      transition: background-color 0.2s ease;
    }
    .md-table tbody tr:nth-child(even) td { background: ${theme.textSecondary}04; }
    .md-table tbody tr:hover td {
      background: ${theme.accentSoftBlue}08;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .md-table thead th:first-child { border-top-left-radius: 16px; }
    .md-table thead th:last-child { border-top-right-radius: 16px; }
    .md-table tbody tr:last-child td { border-bottom: none; }
    .md-table tbody tr:last-child td:first-child { border-bottom-left-radius: 16px; }
    .md-table tbody tr:last-child td:last-child { border-bottom-right-radius: 16px; }
    .md-table .align-left { text-align: left; }
    .md-table .align-center { text-align: center; }
    .md-table .align-right { text-align: right; }
    .md-table code {
      white-space: nowrap;
      background: ${theme.textSecondary}10;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .md-table strong { color: ${theme.textPrimary}; font-weight: 600; }
    .md-table em { color: ${theme.textSecondary}; font-style: italic; }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .md-table-wrap {
        margin: 1rem -16px;
        border-radius: 0;
        border-left: none;
        border-right: none;
      }
      .md-table thead th, .md-table tbody td {
        padding: 12px 16px;
        font-size: 13px;
      }
      .md-table thead th:first-child,
      .md-table tbody tr:last-child td:first-child { border-radius: 0; }
      .md-table thead th:last-child,
      .md-table tbody tr:last-child td:last-child { border-radius: 0; }
    }
    @media (max-width: 520px) {
      .md-table thead th, .md-table tbody td {
        padding: 10px 12px;
        font-size: 12px;
      }
    }

    /* Horizontal rule */
    .md hr {
      border: none;
      height: 2px;
      background: linear-gradient(90deg, transparent, ${theme.textSecondary}30, transparent);
      margin: 2rem 0;
      border-radius: 1px;
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

/* =========================
   MAIN APP COMPONENT
   ========================= */
const AstraApp = () => {
  const { colors: theme } = useTheme();
  const speechRecognition = useSpeechRecognition();

  // State management
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [currentMode, setCurrentMode] = useState('search');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [showCitationModal, setShowCitationModal] = useState(false);

  // Refs
  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Chat management
  const resetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setQuery('');
    setIsStreaming(false);
    setIsLoading(false);
    setStreamingContent('');
    if (speechRecognition.isRecording) {
      speechRecognition.toggleRecording();
    }
    speechRecognition.setRecognizedText('');
  }, [speechRecognition]);

  const handleSend = useCallback(async () => {
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

    if (speechRecognition.isRecording) {
      speechRecognition.toggleRecording();
    }
    speechRecognition.setRecognizedText('');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToSend,
          mode: currentMode,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setIsLoading(false);
      setIsStreaming(true);
      setStreamingContent('');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      let fullContent = '';
      let citations = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              
              if (data.citations) {
                citations = data.citations;
              }
              
              if (data.done) {
                setIsStreaming(false);
                const assistantMessage = {
                  id: Date.now() + 1,
                  role: 'assistant',
                  content: fullContent,
                  citations: citations,
                  timestamp: new Date(),
                  isStreamingComplete: true
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingContent('');
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') return;
      
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Error: ${error.message}. Please check your connection and try again.`,
        timestamp: new Date()
      }]);
    } finally {
      abortControllerRef.current = null;
    }
  }, [query, isLoading, isStreaming, currentMode, speechRecognition]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
  }, [isStreaming, streamingContent]);

  const handleSampleSelect = useCallback((sampleQuery) => {
    setQuery(sampleQuery);
    setTimeout(() => handleSend(), 50);
  }, [handleSend]);

  const handleCitationClick = useCallback((citation) => {
    setSelectedCitation(citation);
    setShowCitationModal(true);
  }, []);

  return (
    <div style={{
      height: '100vh',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary,
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      <GlobalStyles theme={theme} />

      <Toolbar
        onNewChat={resetChat}
        onToggleSidebar={() => {}}
        theme={theme}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div
          ref={scrollRef}
          style={{
            position: 'relative',
            zIndex: 0,
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
          onClick={() => {
            if (speechRecognition.isRecording) {
              speechRecognition.toggleRecording();
            }
          }}
        >
          <div style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '16px 0',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState
                currentMode={currentMode}
                onSampleSelect={handleSampleSelect}
                theme={theme}
              />
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                theme={theme}
                onCitationClick={handleCitationClick}
              />
            ))}

            {isLoading && <LoadingIndicator theme={theme} />}
            {isStreaming && <StreamingIndicator content={streamingContent} theme={theme} />}
          </div>
        </div>

        <div style={{
          flexShrink: 0,
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 16px',
          boxSizing: 'border-box',
          width: '100%'
        }}>
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

      <CitationModal
        citation={selectedCitation}
        isOpen={showCitationModal}
        onClose={() => setShowCitationModal(false)}
        theme={theme}
      />
    </div>
  );
};

export default AstraApp;
