import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, ArrowUp, Square, Edit3, Sparkles, FileText, Search, Stethoscope, X, ExternalLink } from 'lucide-react';

/* =========================
   THEME
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
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = e => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
   SPEECH RECOGNITION
   ========================= */
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

      recognitionRef.current.onend = () => setIsRecording(false);
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

/* =========================
   MARKDOWN RENDERING - COMPLETELY REWRITTEN
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

// Enhanced table processing
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

  // Simple regex patterns
  const bulletRE = /^(\s*)([\*\+\-•–])\s+(.*)$/;   // All bullets including dash
  const numberRE = /^(\s*)(\d+)\.\s+(.*)$/;
  const codeFence = /^```/;

  const tabsToSpaces = (s) => s.replace(/\t/g, '    ');
  const depthFromIndent = (s) => Math.floor(tabsToSpaces(s).length / 2);

  const isTableStart = (i) =>
    (lines[i] || '').includes('|') &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] || '');

  const readTable = (i) => {
    const tbl = [lines[i], lines[i + 1]];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|')) { 
      tbl.push(lines[j]); 
      j++; 
    }
    return { block: tbl, next: j };
  };

  let listDepth = 0;

  const openList = (depth, type = 'ul') => {
    while (listDepth < depth) {
      out.push('<ul>');
      listDepth++;
    }
    while (listDepth > depth) {
      out.push('</ul>');
      listDepth--;
    }
  };

  const closeAllLists = () => {
    while (listDepth > 0) {
      out.push('</ul>');
      listDepth--;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Handle empty lines
    if (!line.trim()) {
      closeAllLists();
      i++;
      continue;
    }

    // Handle code fences
    if (codeFence.test(line)) {
      closeAllLists();
      const buf = [];
      i++;
      while (i < lines.length && !codeFence.test(lines[i])) {
        buf.push(escapeHTML(lines[i]));
        i++;
      }
      out.push(`<pre><code>${buf.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    // Handle tables
    if (isTableStart(i)) {
      closeAllLists();
      const { block, next } = readTable(i);
      out.push(processTable(block));
      i = next;
      continue;
    }

    // Handle blockquotes
    const blockquoteMatch = line.match(/^\s*>\s+(.*)$/);
    if (blockquoteMatch) {
      closeAllLists();
      out.push(`<blockquote>${processInline(blockquoteMatch[1])}</blockquote>`);
      i++;
      continue;
    }

    // Handle headers
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      closeAllLists();
      const level = headerMatch[1].length;
      out.push(`<h${level}>${processInline(headerMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Handle list items (bullets and dashes)
    const bulletMatch = line.match(bulletRE);
    if (bulletMatch) {
      const [, whitespace, bullet, content] = bulletMatch;
      let depth = depthFromIndent(whitespace);
      
      // CRITICAL FIX: If it's a dash with no indentation, make it depth 1
      if (bullet === '-' && depth === 0) {
        depth = 1;
      } else {
        depth = depth + 1; // Normal bullets start at depth 1
      }
      
      openList(depth);
      out.push(`<li>${processInline(content)}</li>`);
      i++;
      continue;
    }

    // Handle numbered lists
    const numberMatch = line.match(numberRE);
    if (numberMatch) {
      const [, whitespace, number, content] = numberMatch;
      const depth = depthFromIndent(whitespace) + 1;
      
      // For numbered lists, we need to use <ol>
      while (listDepth < depth) {
        out.push(listDepth === 0 ? '<ol>' : '<ul>');
        listDepth++;
      }
      while (listDepth > depth) {
        out.push('</ul>');
        listDepth--;
      }
      
      out.push(`<li>${processInline(content)}</li>`);
      i++;
      continue;
    }

    // Handle paragraphs
    closeAllLists();
    out.push(`<p>${processInline(line.trim())}</p>`);
    i++;
  }

  closeAllLists();
  return out.join('\n');
};

/* =========================
   CITATION OVERLAY
   ========================= */
const CitationPillOverlay = ({ citation, isPresented, onDismiss, theme }) => {
  if (!isPresented || !citation) return null;
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onDismiss(); };
  const handleVisitLink = () => { if (citation.url) window.open(citation.url, '_blank', 'noopener,noreferrer'); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
      }}
    >
      <div
        style={{
          backgroundColor: theme.backgroundSurface, borderRadius: 16, padding: 24,
          maxWidth: 500, width: '100%', maxHeight: '80vh', overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{
            backgroundColor: theme.accentSoftBlue, color: 'white', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
          }}>
            {citation.number}
          </div>
          <button onClick={onDismiss} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.4 }}>
            {citation.title}
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: theme.textSecondary }}>{citation.authors}</p>
        </div>

        {citation.url && (
          <button
            onClick={handleVisitLink}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
              backgroundColor: theme.accentSoftBlue, color: 'white', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 14, fontWeight: 500, width: '100%', justifyContent: 'center'
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
   UI PARTS
   ========================= */
const ToolbarView = ({ onNewChat, onToggleSidebar, theme }) => {
  const [cooldown, setCooldown] = useState(false);
  const handleNewChat = () => {
    if (cooldown) return;
    setCooldown(true);
    onNewChat();
    setTimeout(() => setCooldown(false), 300);
  };

  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', backgroundColor: theme.backgroundSurface,
      borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative', zIndex: 10, minHeight: 52
    }}>
      <button
        onClick={onToggleSidebar}
        aria-label="Open sidebar"
        style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Stethoscope size={18} color={theme.textPrimary} />
      </button>

      <h1 style={{
        color: theme.textPrimary,
        fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
        fontSize: 28, margin: 0, fontWeight: 400
      }}>
        Astra
      </h1>

      <button
        onClick={handleNewChat}
        disabled={cooldown}
        aria-label="New chat"
        style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', opacity: cooldown ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 50,
              border: `1px solid ${theme.textSecondary}50`,
              backgroundColor: isSelected ? theme.accentSoftBlue : 'transparent',
              color: isSelected ? '#fff' : theme.textPrimary,
              fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .2s ease',
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', height: '100%', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" fill={`${theme.grayPrimary}40`} />
          </svg>
        </div>
        <h2 style={{
          color: `${theme.grayPrimary}60`,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: 36, lineHeight: 1.1, margin: 0, maxWidth: 220, fontWeight: 300
        }}>
          Uncertainty ends here.
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 448, padding: '0 32px' }}>
        {queries.map((q, i) => (
          <button
            key={i}
            onClick={() => onSampleTapped(q)}
            style={{
              width: '100%', padding: '10px 20px', borderRadius: 50, fontSize: 12, fontWeight: 500, textAlign: 'center',
              lineHeight: 1.4, backgroundColor: `${theme.grayPrimary}08`, border: `0.5px solid ${theme.grayPrimary}20`,
              color: `${theme.grayPrimary}70`, cursor: 'pointer', transition: 'all .2s ease'
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, theme, onTapCitation }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      const t = e.target;
      if (t.tagName === 'SUP' && t.dataset.citation) {
        const number = parseInt(t.dataset.citation, 10);
        const citation = message.citations?.find(c => c.number === number);
        if (citation && onTapCitation) onTapCitation(citation);
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener('click', handler);
    return () => { if (el) el.removeEventListener('click', handler); };
  }, [message.citations, onTapCitation]);

  if (message.role === 'user') {
    const getLabel = () => message.wasInWriteMode ? 'Write Request:' : (message.wasInReasonMode ? 'Reason Request:' : 'Search Query:');
    return (
      <div style={{ width: '100%', marginBottom: 16 }}>
        <div style={{ display: 'flex', backgroundColor: `${theme.accentSoftBlue}0D`, borderRadius: 6 }}>
          <div style={{ width: 3, backgroundColor: theme.accentSoftBlue, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .5, color: theme.textSecondary }}>
              {getLabel()}
            </div>
            <div style={{ fontSize: 14, color: theme.textPrimary }}>{message.content}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', marginBottom: 16, position: 'relative' }}>
      <div style={{ padding: 16, borderRadius: 12, backgroundColor: theme.backgroundSurface, border: `1px solid ${theme.accentSoftBlue}33` }}>
        {message.isStreamingComplete && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .5, color: theme.textSecondary }}>Response:</span>
          </div>
        )}
        <div
          ref={containerRef}
          className="md"
          style={{ fontSize: 14, lineHeight: 1.6, color: theme.textPrimary }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
        <button
          onClick={async () => {
            try { await navigator.clipboard.writeText(message.content || ''); } catch {}
          }}
          aria-label="Copy message"
          style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textSecondary, fontSize: 13 }}
        >
          Copy
        </button>
      </div>
    </div>
  );
};

const StreamingResponse = ({ content, theme }) => (
  <div style={{ padding: 16, borderRadius: 12, backgroundColor: theme.backgroundSurface, border: `1px solid ${theme.accentSoftBlue}33`, marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .5, color: theme.textSecondary }}>Response:</span>
      {!content && (
        <div style={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.accentSoftBlue, animation: `bounce 0.6s infinite ${i * 0.2}s` }} />
          ))}
        </div>
      )}
    </div>
    <div
      className="md"
      style={{ fontSize: 14, lineHeight: 1.6, color: theme.textPrimary }}
      dangerouslySetInnerHTML={{ __html: content ? renderMarkdown(content) + '<span class="cursor">▍</span>' : '' }}
    />
  </div>
);

const LoadingIndicator = ({ theme }) => (
  <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'transparent', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .5, color: theme.textSecondary }}>Thinking...</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.textSecondary, animation: `pulse 1.5s ease-in-out infinite ${i * 150}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

/* =========================
   INPUT BAR
   ========================= */
const InputBar = ({
  query, setQuery, currentMode, onModeChange, onSend, onStop, isStreaming, isLoading, speechRecognition, theme
}) => {
  const textareaRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(32);

  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '32px';
    const h = Math.min(ta.scrollHeight, 120);
    ta.style.height = `${h}px`;
    setTextareaHeight(h);
  }, []);

  useEffect(() => { adjustTextareaHeight(); }, [query, adjustTextareaHeight]);

  useEffect(() => {
    if (speechRecognition.isRecording && speechRecognition.recognizedText) {
      setQuery(speechRecognition.recognizedText);
    }
  }, [speechRecognition.recognizedText, speechRecognition.isRecording, setQuery]);

  const getPlaceholder = () =>
    currentMode === 'reason' ? 'Present your case'
      : currentMode === 'write' ? 'Outline your plan'
      : 'Ask anything';

  const isDisabled = isStreaming || isLoading;

  return (
    <div style={{ padding: '8px 16px 4px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))', backgroundColor: theme.backgroundSurface, borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ position: 'relative', marginBottom: 0, border: 'none', outline: 'none' }}>
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
            width: '100%', padding: 8, borderRadius: 12, resize: 'none', border: 'none', outline: 'none',
            fontSize: 16, lineHeight: 1.5, backgroundColor: theme.backgroundSurface, color: theme.textPrimary,
            height: `${textareaHeight}px`, minHeight: 40, maxHeight: 120, fontFamily: 'inherit', boxSizing: 'border-box'
          }}
        />

        {speechRecognition.isRecording && (
          <div style={{ position: 'absolute', right: 12, top: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: theme.accentSoftBlue }}>Listening</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.accentSoftBlue, animation: `pulse 1.5s ease-in-out infinite ${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -8 }}>
        <ModeSwitcher currentMode={currentMode} onModeChange={onModeChange} isDisabled={isStreaming || isLoading} theme={theme} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={speechRecognition.toggleRecording}
            disabled={!speechRecognition.isAvailable || isStreaming || isLoading}
            aria-pressed={speechRecognition.isRecording}
            aria-label={speechRecognition.isRecording ? 'Stop recording' : 'Start recording'}
            style={{ padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer',
              transform: speechRecognition.isRecording ? 'scale(1.1)' : 'scale(1)',
              color: speechRecognition.isRecording ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!speechRecognition.isAvailable || isStreaming || isLoading) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {speechRecognition.isRecording ? <Square size={28} fill="currentColor" /> : <Mic size={28} />}
          </button>

          <button
            onClick={isStreaming ? onStop : onSend}
            disabled={!isStreaming && !query.trim()}
            aria-label={isStreaming ? 'Stop response' : 'Send'}
            style={{ padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer',
              color: isStreaming ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!isStreaming && !query.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isStreaming ? <Square size={28} fill="currentColor" /> : <ArrowUp size={28} />}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 0 }}>
        <p style={{ fontSize: 12, color: theme.textSecondary, margin: 0 }}>Astra can make mistakes. Check critical info.</p>
      </div>
    </div>
  );
};

/* =========================
   GLOBAL STYLE INJECTOR
   ========================= */
const buildGlobalCSS = (theme) => `
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden; height: 100vh;
  background: ${theme.backgroundPrimary}; color: ${theme.textPrimary};
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

/* Buttons & inputs */
textarea::placeholder { color: ${theme.textSecondary}; opacity: 1; }
textarea { font-family: inherit; line-height: inherit; border: none; outline: none; resize: none; background: transparent; font-size: 16px; }
button:not(:disabled):hover { transform: translateY(-1px); }
button:not(:disabled):active { transform: translateY(0); }
button:focus-visible, textarea:focus-visible { outline: 2px solid ${theme.accentSoftBlue}; outline-offset: 2px; }

/* Animations */
@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
.cursor { color: #4A6B7D; animation: blink 1s infinite; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

/* Markdown base */
.md { line-height: 1.6; }
.md h1 { margin: 1rem 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: ${theme.textPrimary}; }
.md h2 { margin: 0.875rem 0 0.375rem; font-size: 1.5rem; font-weight: 600; color: ${theme.textPrimary}; }
.md h3 { margin: 0.75rem 0 0.25rem; font-size: 1.25rem; font-weight: 600; color: ${theme.textPrimary}; }
.md h4 { margin: 0.625rem 0 0.25rem; font-size: 1.125rem; font-weight: 600; color: ${theme.textPrimary}; }
.md h5 { margin: 0.5rem 0 0.25rem; font-size: 1rem; font-weight: 600; color: ${theme.textPrimary}; }
.md h6 { margin: 0.5rem 0 0.25rem; font-size: 0.875rem; font-weight: 600; color: ${theme.textPrimary}; text-transform: uppercase; letter-spacing: 0.5px; }
.md p { margin: 0.5rem 0; line-height: 1.6; }
.md a { color: ${theme.accentSoftBlue}; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color .2s ease; }
.md a:hover { border-bottom-color: ${theme.accentSoftBlue}; }
.md sup.md-citation { color: ${theme.accentSoftBlue}; cursor: pointer; font-weight: 600; border-radius: 4px; padding: 1px 3px; }
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

/* Lists: Perfect nested indentation */
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

/* Nested lists with proper indentation */
.md ul ul, .md ol ol, .md ul ol, .md ol ul { 
  margin: 0.25rem 0;
  padding-left: 1.5rem;
}

.md li p { margin: 0.25rem 0; }

/* BEAUTIFUL TABLES */
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
  background: linear-gradient(
    135deg, 
    ${theme.textSecondary}15 0%, 
    ${theme.textSecondary}08 100%
  );
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

.md-table tbody tr:nth-child(even) td { 
  background: ${theme.textSecondary}04; 
}

.md-table tbody tr:hover td { 
  background: ${theme.accentSoftBlue}08; 
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.md-table thead th:first-child { border-top-left-radius: 16px; }
.md-table thead th:last-child  { border-top-right-radius: 16px; }
.md-table tbody tr:last-child td { border-bottom: none; }
.md-table tbody tr:last-child td:first-child { border-bottom-left-radius: 16px; }
.md-table tbody tr:last-child td:last-child  { border-bottom-right-radius: 16px; }

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

.md-table strong {
  color: ${theme.textPrimary};
  font-weight: 600;
}

.md-table em {
  color: ${theme.textSecondary};
  font-style: italic;
}

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
  .md-table tbody tr:last-child td:first-child { 
    border-radius: 0; 
  }
  
  .md-table thead th:last-child,
  .md-table tbody tr:last-child td:last-child  { 
    border-radius: 0; 
  }
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

const GlobalStyle = ({ theme }) => (
  <style dangerouslySetInnerHTML={{ __html: buildGlobalCSS(theme) }} />
);

/* =========================
   APP
   ========================= */
const AstraApp = () => {
  const { colors: theme } = useTheme();
  const speechRecognition = useSpeechRecognition();

  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [currentMode, setCurrentMode] = useState('search');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

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
      const response = await fetch('/api/mock-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToSend,
          mode: currentMode,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      setIsLoading(false);
      setIsStreaming(true);
      setStreamingContent('');

      // Mock streaming response for demo
      const mockContent = `## Key trial findings

• NEJM multicenter RCT (n = 1,563; "Early Restrictive vs Liberal"):
- Restrictive arm received ≈2.1 L less fluid over the 24-hour protocol period.
- Restrictive group initiated vasopressors earlier and more often; they had longer vasopressor duration.
- No significant difference in death before discharge home by day 90 (14.0% restrictive vs 14.9% liberal; difference −0.9 percentage points; P = 0.61). Serious adverse events similar. [3]

• CLASSIC trial (ICU patients with septic shock after initial resuscitation):
- Restrictive approach reduced additional ICU fluid volumes (median ~1.8 L vs ~3.8 L in usual care).
- No difference in 90-day mortality (42.3% restrictive vs 42.1% usual care; RR 1.00). No difference in serious adverse events.

| Trial | Population | Fluid Difference | Mortality Outcome |
|-------|------------|------------------|-------------------|
| NEJM | Early septic shock | 2.1L less | 14.0% vs 14.9% |
| CLASSIC | ICU after resuscitation | 1.8L vs 3.8L | 42.3% vs 42.1% |`;

      // Simulate streaming
      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        if (currentIndex < mockContent.length) {
          const chunk = mockContent.slice(0, currentIndex + 10);
          setStreamingContent(chunk);
          currentIndex += 10;
        } else {
          clearInterval(streamInterval);
          setIsStreaming(false);
          
          const assistantMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: mockContent,
            citations: [
              { number: 3, title: 'Early Restrictive vs Liberal Fluid Management', url: 'https://example.com', authors: 'NEJM Study Group' }
            ],
            timestamp: new Date(),
            isStreamingComplete: true
          };

          setMessages(prev => [...prev, assistantMessage]);
          setStreamingContent('');
        }
      }, 50);

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
  };

  const handleStop = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (isStreaming) {
      setIsStreaming(false);
      if (streamingContent) {
        const assistantMessage = { id: Date.now(), role: 'assistant', content: streamingContent, timestamp: new Date() };
        setMessages(prev => [...prev, assistantMessage]);
      }
      setStreamingContent('');
    }
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
      height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif',
      overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      <GlobalStyle theme={theme} />

      <ToolbarView onNewChat={resetChat} onToggleSidebar={() => setShowSidebar(true)} theme={theme} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div
          ref={scrollRef}
          style={{ position:'relative', zIndex:0, flex: 1, overflowY: 'auto', padding: '0 16px', minHeight: 0, WebkitOverflowScrolling: 'touch' }}
          onClick={() => { if (speechRecognition.isRecording) speechRecognition.toggleRecording(); }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 0', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState currentMode={currentMode} onSampleTapped={(q)=>{ setQuery(q); setTimeout(()=>handleSend(),50); }} theme={theme} />
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                theme={theme}
                onTapCitation={(citation) => { setSelectedCitation(citation); setShowCitationOverlay(true); }}
              />
            ))}

            {isLoading && <LoadingIndicator theme={theme} />}
            {isStreaming && <StreamingResponse content={streamingContent} theme={theme} />}
          </div>
        </div>

        <div style={{ flexShrink: 0, maxWidth: 900, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', width: '100%' }}>
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

      {showCitationOverlay && selectedCitation && (
        <CitationPillOverlay
          citation={selectedCitation}
          isPresented={showCitationOverlay}
          onDismiss={() => setShowCitationOverlay(false)}
          theme={theme}
        />
      )}
    </div>
  );
};

export default AstraApp;
