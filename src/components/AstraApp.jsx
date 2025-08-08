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

// --- FIXED: robust renderer with true nested lists (bullets + ordered) ---
export const renderMarkdown = (raw = '') => {
  if (!raw) return '';
  const lines = raw.split('\n');
  const out = [];

  // list stack stores the open list types at each depth: 'ul' | 'ol'
  const listStack = [];

  const bulletRE  = /^(\s*)([*+\-•–])\s+(.*)$/;     // bullets (incl. en dash)
  const numberRE  = /^(\s*)(\d+)\.\s+(.*)$/;        // ordered (1. ...)
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
  const depthFromIndent = (s) => {
    const spaces = tabsToSpaces(s).length;
    return Math.floor(spaces / 2); // 2 spaces per level
  };

  const closeListsTo = (level) => {
    // level is number of open lists to keep
    while (listStack.length > level) {
      const type = listStack.pop();
      out.push(`</${type}>`);
    }
  };

  // ensure there is an open list at "depth" with the given "type"
  const ensureListAtDepth = (depth, type) => {
    // keep only parents strictly above target depth
    while (listStack.length > depth + 1) {
      const t = listStack.pop();
      out.push(`</${t}>`);
    }
    // open intermediate levels as <ul> if user jumps multiple depths
    while (listStack.length < depth) {
      out.push('<ul>');
      listStack.push('ul');
    }
    // handle the target level itself
    if (listStack.length === depth) {
      out.push(`<${type}>`);
      listStack.push(type);
    } else if (listStack[depth] !== type) {
      // switch list type at this depth
      out.push(`</${listStack.pop()}>`);
      out.push(`<${type}>`);
      listStack.push(type);
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // blank line → close all lists
    if (!line.trim()) {
      closeListsTo(0);
      i++;
      continue;
    }

    // fenced code blocks
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
      i = next;
      continue;
    }

    // blockquote
    const bq = line.match(/^\s*>\s+(.*)$/);
    if (bq) {
      closeListsTo(0);
      out.push(`<blockquote>${processInline(bq[1])}</blockquote>`);
      i++;
      continue;
    }

    // headers
    const hd = line.match(/^(#{1,3})\s+(.*)$/);
    if (hd) {
      closeListsTo(0);
      const level = hd[1].length;
      out.push(`<h${level}>${processInline(hd[2])}</h${level}>`);
      i++;
      continue;
    }

    // unordered list item
    const mb = line.match(bulletRE);
    if (mb) {
      const depth = depthFromIndent(mb[1]);
      const content = mb[3];
      ensureListAtDepth(depth, 'ul');
      out.push(`<li>${processInline(content)}</li>`);
      i++;
      continue;
    }

    // ordered list item
    const mn = line.match(numberRE);
    if (mn) {
      const depth = depthFromIndent(mn[1]);
      const content = mn[3];
      ensureListAtDepth(depth, 'ol');
      out.push(`<li>${processInline(content)}</li>`);
      i++;
      continue;
    }

    // paragraph
    closeListsTo(0);
    out.push(`<p>${processInline(line.trim())}</p>`);
    i++;
  }

  // close any dangling lists
  closeListsTo(0);

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
.md { line-height: 1.55; }
.md h1 { margin: 0.6rem 0 0.3rem; font-size: 1.5rem; font-weight: 700; }
.md h2 { margin: 0.5rem 0 0.25rem; font-size: 1.25rem; font-weight: 600; }
.md h3 { margin: 0.4rem 0 0.2rem; font-size: 1.1rem; font-weight: 600; }
.md p  { margin: 0.24rem 0; line-height: 1.5; }
.md a  { color: ${theme.accentSoftBlue}; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color .2s ease; }
.md a:hover { border-bottom-color: ${theme.accentSoftBlue}; }
.md sup.md-citation { color: ${theme.accentSoftBlue}; cursor: pointer; font-weight: 600; border-radius: 4px; }
.md sup.md-citation:hover { background-color: ${theme.accentSoftBlue}20; }

/* Code blocks */
.md pre {
  background-color: ${theme.textSecondary}15; border-radius: 10px; padding: 12px; margin: 0.6rem 0; overflow-x: auto;
  border: 1px solid ${theme.textSecondary}20;
}
.md code {
  background-color: ${theme.textSecondary}15; border-radius: 6px; padding: 2px 6px; font-size: .9em;
  font-family: 'SF Mono','Monaco','Cascadia Code','Roboto Mono',monospace;
  border: 1px solid ${theme.textSecondary}20;
}
.md pre code { background: none; border: none; padding: 0; }

/* Blockquote & hr */
.md blockquote { margin: 0.25rem 0; padding: 0.5rem 0 0.5rem 0.75rem; border-left: 3px solid ${theme.accentSoftBlue}; background: ${theme.textSecondary}0D; border-radius: 6px; }
.md hr { border: none; height: 1px; background: ${theme.textSecondary}40; margin: 1rem 0; }

/* Lists: proper hanging indents + nested rhythm */
.md ul, .md ol { margin: 0.45rem 0; padding-left: 1.5rem; list-style-position: outside; }
.md li { margin: 0.16rem 0; line-height: 1.5; padding-left: 0.2rem; text-indent: 0; }
.md li p { margin: 0.12rem 0; }
.md li::marker { color: ${theme.accentSoftBlue}; font-weight: 700; }
.md ul ul, .md ol ol, .md ul ol, .md ol ul { margin: 0.22rem 0; padding-left: 1.2rem; }

/* Custom numbered-item layout (for your non-ol numbering) */
.md .numbered-item { display: flex; align-items: baseline; gap: 0.5rem; margin: 0.26rem 0; }
.md .numbered-item .number { min-width: 2.4ch; text-align: right; font-weight: 700; color: ${theme.accentSoftBlue}; }
.md .numbered-item .content { flex: 1; line-height: 1.45; }

/* Tables: sticky header, blur, zebra, rounded, soft borders, hover */
.md-table-wrap {
  width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0.6rem 0 0.8rem;
  border-radius: 12px;
  background: ${theme.backgroundSurface};
  box-shadow: 0 0 0 1px ${theme.textSecondary}12 inset, 0 6px 20px -12px rgba(0,0,0,.35);
}
.md-table {
  width: 100%;
  border-collapse: separate !important; /* safeguard */
  border-spacing: 0;
  font-size: 13.5px;
  line-height: 1.45;
  color: ${theme.textPrimary};
}
.md-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: left;
  padding: 11px 12px;
  background: linear-gradient(180deg, ${theme.textSecondary}22, ${theme.textSecondary}10);
  -webkit-backdrop-filter: saturate(130%) blur(6px);
  backdrop-filter: saturate(130%) blur(6px);
  color: ${theme.textPrimary};
  font-weight: 700;
  border-bottom: 1px solid ${theme.textSecondary}35;
  white-space: nowrap;
}
.md-table tbody td {
  padding: 10px 12px;
  vertical-align: middle;
  border-bottom: 1px solid ${theme.textSecondary}22;
  background: ${theme.backgroundSurface};
  max-width: 560px;
  overflow-wrap: anywhere;
}
.md-table tbody tr:nth-child(odd) td { background: ${theme.textSecondary}0D; }
.md-table tbody tr:hover td { background: ${theme.accentSoftBlue}14; }
.md-table thead th:first-child { border-top-left-radius: 12px; }
.md-table thead th:last-child  { border-top-right-radius: 12px; }
.md-table tbody tr:last-child td:first-child { border-bottom-left-radius: 12px; }
.md-table tbody tr:last-child td:last-child  { border-bottom-right-radius: 12px; }
.md-table .align-left { text-align: left; }
.md-table .align-center { text-align: center; }
.md-table .align-right { text-align: right; }
.md-table code { white-space: nowrap; display: inline-block; }
@media (max-width: 520px) {
  .md-table thead th, .md-table tbody td { padding: 8px 10px; }
  .md-table { font-size: 13px; }
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

            const handleLine = (line) => {
              if (!line.startsWith('data:')) return;
              const payload = line.substring(5).trim();
              if (!payload || payload === '[DONE]') return;
              try {
                const json = JSON.parse(payload);

                if (currentMode === 'search' && collectedCitations.length === 0) {
                  if (json.citations && Array.isArray(json.citations)) {
                    if (typeof json.citations[0] === 'object') {
                      json.citations.forEach(cd => {
                        if (cd.number && cd.title && cd.url) {
                          collectedCitations.push({
                            number: cd.number,
                            title: cd.title,
                            url: cd.url,
                            authors: cd.authors || new URL(cd.url).hostname || 'Unknown'
                          });
                        }
                      });
                    } else {
                      json.citations.forEach((urlString, i) => {
                        try {
                          const url = new URL(urlString);
                          collectedCitations.push({
                            number: i + 1,
                            title: url.hostname || 'External Link',
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

                if (content) {
                  finalContent += content;
                  setStreamingContent(finalContent);
                }
              } catch {}
            };

            if (endsWithNewline) {
              lines.forEach(l => l.trim() && handleLine(l.trim()));
              buffer = '';
            } else if (lines.length > 1) {
              lines.slice(0, -1).forEach(l => l.trim() && handleLine(l.trim()));
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
        } catch {
          setIsStreaming(false);
          setIsLoading(false);
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '⚠️ Error occurred while streaming response. Please try again.', timestamp: new Date() }]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `⚠️ Error: ${error.message}. Please check your connection and try again.`, timestamp: new Date() }]);
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
