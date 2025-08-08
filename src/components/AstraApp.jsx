import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, ArrowUp, Square, Edit3, Sparkles, FileText, Search, Stethoscope, X, ExternalLink } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
// import rehypeKatex from 'rehype-katex'; // <-- requires `katex` package + CSS
import rehypeSanitize from 'rehype-sanitize';
import { visit } from 'unist-util-visit';

// If you enable KaTeX, also:
// import 'katex/dist/katex.min.css';

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
   MARKDOWN via LIBRARIES (ChatGPT-ish)
   ========================= */

/** Rehype plugin: turn "[12]" into <sup class="md-citation" data-citation="12">[12]</sup> */
function rehypeBracketCitations() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof node.value !== 'string') return;
      const regex = /\[(\d+)]/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(node.value)) !== null) {
        const before = node.value.slice(lastIndex, match.index);
        if (before) parts.push({ type: 'text', value: before });
        const num = match[1];
        parts.push({
          type: 'element',
          tagName: 'sup',
          properties: { className: ['md-citation'], 'data-citation': num },
          children: [{ type: 'text', value: `[${num}]` }]
        });
        lastIndex = match.index + match[0].length;
      }
      const after = node.value.slice(lastIndex);
      if (parts.length) {
        if (after) parts.push({ type: 'text', value: after });
        parent.children.splice(index, 1, ...parts);
        return index + parts.length;
      }
    });
  };
}

/** Sanitize schema allowing list attrs + citations */
const sanitizeSchema = {
  tagNames: [
    'a','p','strong','em','code','pre','blockquote','ul','ol','li','hr',
    'h1','h2','h3','table','thead','tbody','tr','th','td','sup','span','br'
  ],
  attributes: {
    a: ['href','title','target','rel'],
    code: ['className'],
    sup: ['data-citation','className'],
    span: ['className','style'],
    th: ['align'],
    td: ['align'],
    table: ['className'],
    h1: ['id'], h2: ['id'], h3: ['id'],
    ol: ['start','reversed','type'] // keep correct numbering
  },
  clobberPrefix: 'md-',
  protocols: { href: ['http', 'https', 'mailto', 'tel'] }
};

// keep plugin arrays stable between renders for perf
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'append' }],
  rehypeHighlight,
  rehypeBracketCitations,
  // rehypeKatex, // enable if you installed katex
  [rehypeSanitize, sanitizeSchema]
];

/* =========================
   CITATION OVERLAY
   ========================= */
const CitationPillOverlay = ({ citation, isPresented, onDismiss, theme }) => {
  if (!isPresented || !citation) return null;
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onDismiss(); };
  const handleVisitLink = () => { if (citation.url) window.open(citation.url, '_blank', 'noopener,noreferrer'); };

  return (
    <div
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
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary, padding: 4 }}
            aria-label="Close"
          >
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
  const [newChatCooldown, setNewChatCooldown] = useState(false);
  const handleNewChat = () => {
    if (newChatCooldown) return;
    setNewChatCooldown(true);
    onNewChat();
    setTimeout(() => setNewChatCooldown(false), 300);
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
        disabled={newChatCooldown}
        aria-label="New chat"
        style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', opacity: newChatCooldown ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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

/* =========================
   MARKDOWN BLOCK (Tailwind Typography)
   ========================= */
const MarkdownBlock = ({ markdown, theme, invert = false, onTapCitation }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const t = e.target;
      if (t.tagName === 'SUP' && t.dataset.citation) {
        const number = parseInt(t.dataset.citation, 10);
        onTapCitation?.(number);
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener('click', handler);
    return () => { if (el) el.removeEventListener('click', handler); };
  }, [onTapCitation]);

  return (
    <div
      ref={containerRef}
      className={`markdown-body prose max-w-none ${invert ? 'prose-invert' : 'prose-neutral'}`}
      style={{ color: theme.textPrimary }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';
            const isExternal = /^https?:\/\//i.test(href);
            return <a {...props} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} />;
          },
          table: ({ node, ...props }) => <table {...props} className="md-table" />,
          ol: ({ node, ...props }) => <ol start={node?.start} {...props} />,
        }}
      >
        {markdown || ''}
      </ReactMarkdown>
    </div>
  );
};

const MessageBubble = ({ message, theme, invertMarkdown, onTapCitation }) => {
  const [showCopied, setShowCopied] = useState(false);
  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    } catch {}
  };

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

  // assistant message
  return (
    <div style={{ width: '100%', marginBottom: 16, position: 'relative' }}>
      <div style={{ padding: 16, borderRadius: 12, backgroundColor: theme.backgroundSurface, border: `1px solid ${theme.accentSoftBlue}33` }}>
        {message.isStreamingComplete && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .5, color: theme.textSecondary }}>Response:</span>
          </div>
        )}
        <MarkdownBlock
          markdown={message.content}
          theme={theme}
          invert={invertMarkdown}
          onTapCitation={(num) => {
            const citation = message.citations?.find((c) => c.number === num);
            if (citation && onTapCitation) onTapCitation(citation);
          }}
        />
        <button
          onClick={handleCopy}
          aria-label="Copy message"
          style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textSecondary, fontSize: 13 }}
        >
          {showCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

/* Streaming shell that renders only after first token */
const StreamingResponse = ({ content, theme, invert = false }) => (
  <div style={{ padding: 16, borderRadius: 12, backgroundColor: theme.backgroundSurface, border: `1px solid ${theme.accentSoftBlue}33`, marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .5, color: theme.textSecondary }}>Response:</span>
    </div>
    <div>
      <MarkdownBlock markdown={content || ''} theme={theme} invert={invert} onTapCitation={() => {}} />
      {content ? <span style={{ color: '#4A6B7D', animation: 'blink 1s infinite' }}>▍</span> : null}
    </div>
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

const Sidebar = ({ isOpen, onClose, chatHistory, onSelectChat, onDeleteChat, onNewChat, theme }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose} />
      <div style={{ width: 320, height: '100%', padding: 24, paddingTop: 'max(24px, env(safe-area-inset-top))', overflowY: 'auto', backgroundColor: theme.backgroundSurface }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary, margin: 0 }}>Chat History</h2>
          <button onClick={onNewChat} style={{ padding: 8, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <Edit3 size={16} color={theme.textPrimary} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chatHistory.map((chat) => (
            <div key={chat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => onSelectChat(chat)}
                style={{ flex: 1, padding: 12, borderRadius: 8, textAlign: 'left', backgroundColor: `${theme.textSecondary}0A`, border: 'none', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {chat.title}
                </div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>
                  {new Date(chat.timestamp).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={() => onDeleteChat(chat)}
                style={{ padding: 8, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
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

/* =========================
   INPUT BAR (reports its height)
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
  theme,
  onHeightChange
}) => {
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(32);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) onHeightChange?.(e.contentRect.height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [onHeightChange]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '32px';
    const scrollHeight = Math.min(textarea.scrollHeight, 64);
    textarea.style.height = `${scrollHeight}px`;
    setTextareaHeight(scrollHeight);
  }, []);

  useEffect(() => { adjustTextareaHeight(); }, [query, adjustTextareaHeight]);

  useEffect(() => {
    if (speechRecognition.isRecording && speechRecognition.recognizedText) {
      setQuery(speechRecognition.recognizedText);
    }
  }, [speechRecognition.recognizedText, speechRecognition.isRecording, setQuery]);

  const getPlaceholder = () => (
    speechRecognition.isRecording ? 'Listening...' :
    currentMode === 'reason' ? 'Present your case' :
    currentMode === 'write' ? 'Outline your plan' : 'Ask anything'
  );

  const isDisabled = isStreaming || isLoading;

  return (
    <div
      ref={containerRef}
      style={{ padding: '8px 16px 4px 16px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))', backgroundColor: theme.backgroundSurface, borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}
    >
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
          placeholder={getPlaceholder()}
          disabled={isDisabled}
          style={{
            width: '100%', padding: '8px 8px', borderRadius: 12, resize: 'none', border: 'none', outline: 'none',
            fontSize: 16, lineHeight: 1.5, backgroundColor: theme.backgroundSurface, color: theme.textPrimary,
            height: `${textareaHeight}px`, minHeight: 40, maxHeight: 120, fontFamily: 'inherit', boxSizing: 'border-box'
          }}
        />

        {speechRecognition.isRecording && (
          <div style={{ position: 'absolute', right: 12, top: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: theme.accentSoftBlue }}>Listening</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.accentSoftBlue, animation: `pulse 1.5s ease-in-out infinite ${i * 0.15}s` }} />
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
   APP
   ========================= */
const AstraApp = () => {
  const { colors: theme, isDark } = useTheme();
  const speechRecognition = useSpeechRecognition();

  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [currentMode, setCurrentMode] = useState('search');

  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFirstToken, setHasFirstToken] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const [selectedCitation, setSelectedCitation] = useState(null);
  const [showCitationOverlay, setShowCitationOverlay] = useState(false);

  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [inputBarHeight, setInputBarHeight] = useState(0);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const resetChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setQuery('');
    setIsStreaming(false);
    setIsLoading(false);
    setHasFirstToken(false);
    setStreamingContent('');
    if (speechRecognition.isRecording) speechRecognition.toggleRecording();
    speechRecognition.setRecognizedText('');
  };

  const processStreamLine = (line, citations, onContent) => {
    if (!line.startsWith('data:')) return;
    const payload = line.substring(5).trim();
    if (payload === '[DONE]') return;
    if (!payload) return;

    try {
      const json = JSON.parse(payload);

      // Citations only once for search mode
      if (currentMode === 'search' && citations.length === 0) {
        if (Array.isArray(json.citations) && json.citations.length) {
          if (typeof json.citations[0] === 'object') {
            json.citations.forEach(cd => {
              if (cd.number && cd.title && cd.url) {
                citations.push({
                  number: cd.number,
                  title: cd.title,
                  url: cd.url,
                  authors: cd.authors || (() => { try { return new URL(cd.url).hostname; } catch { return 'Unknown'; } })()
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

      if (content) onContent(content);
    } catch {
      // ignore malformed chunks
    }
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
    setIsStreaming(true);
    setHasFirstToken(false);
    setStreamingContent('');

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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let collectedCitations = [];
      let finalContent = '';
      let rafId = null;

      const flush = () => {
        rafId = null;
        setStreamingContent(finalContent);
        scrollToBottom();
      };

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
              if (!line.trim()) return;
              processStreamLine(line.trim(), collectedCitations, (delta) => {
                const wasEmpty = finalContent.length === 0;
                finalContent += delta;
                if (wasEmpty) {
                  setHasFirstToken(true);
                  setIsLoading(false);
                }
                if (!rafId) rafId = requestAnimationFrame(flush);
              });
            };

            if (endsWithNewline) {
              lines.forEach(handleLine);
              buffer = '';
            } else if (lines.length > 1) {
              lines.slice(0, -1).forEach(handleLine);
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
          setHasFirstToken(false);
        } catch (streamErr) {
          if (streamErr.name === 'AbortError') return;
          setIsStreaming(false);
          setIsLoading(false);
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '⚠️ Error occurred while streaming response. Please try again.', timestamp: new Date() }]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      setIsLoading(false);
      setIsStreaming(false);
      setHasFirstToken(false);
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
      setHasFirstToken(false);
    }
  };

  const handleSampleTapped = (sampleQuery) => {
    setQuery(sampleQuery);
    setTimeout(handleSend, 50);
  };

  const loadChatSession = (session) => {
    setMessages(session.messages);
    setQuery('');
    setIsStreaming(false);
    setIsLoading(false);
    setHasFirstToken(false);
    setStreamingContent('');
    setShowSidebar(false);
  };

  const deleteChatSession = (session) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== session.id));
  };

  useEffect(() => {
    if (isStreaming) scrollToBottom();
  }, [streamingContent, isStreaming, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  return (
    <div style={{
      height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary, fontFamily: '-apple-system, BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif',
      overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {/* Toolbar */}
      <ToolbarView onNewChat={resetChat} onToggleSidebar={() => setShowSidebar(true)} theme={theme} />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Conversation */}
        <div
          ref={scrollRef}
          style={{
            position:'relative',
            zIndex:0,
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
            paddingBottom: inputBarHeight + 16,  // prevent bottom clipping
            scrollPaddingBottom: inputBarHeight + 16,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
          onClick={() => { if (speechRecognition.isRecording) speechRecognition.toggleRecording(); }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 0', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState currentMode={currentMode} onSampleTapped={handleSampleTapped} theme={theme} />
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                theme={theme}
                invertMarkdown={isDark}
                onTapCitation={(citation) => { setSelectedCitation(citation); setShowCitationOverlay(true); }}
              />
            ))}

            {isLoading && <LoadingIndicator theme={theme} />}
            {isStreaming && hasFirstToken && <StreamingResponse content={streamingContent} theme={theme} invert={isDark} />}
          </div>
        </div>

        {/* Input */}
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
            onHeightChange={setInputBarHeight}
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

      {/* Citations */}
      {showCitationOverlay && selectedCitation && (
        <CitationPillOverlay
          citation={selectedCitation}
          isPresented={showCitationOverlay}
          onDismiss={() => setShowCitationOverlay(false)}
          theme={theme}
        />
      )}

      {/* Global Styles (minimal) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        * { box-sizing: border-box; }
        html { -webkit-text-size-adjust: 100%; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; overflow: hidden; height: 100vh; }
        #root { height: 100vh; width: 100vw; }
        @supports (height: 100vh) { body, #root { height: 100vh; } }
        html, body { position: fixed; overflow: hidden; width: 100%; height: 100%; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.textSecondary}40; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textSecondary}60; }
        * { scrollbar-width: thin; scrollbar-color: ${theme.textSecondary}40 transparent; }

        textarea::placeholder { color: ${theme.textSecondary}; opacity: 1; }
        textarea { font-family: inherit; line-height: inherit; border: none; outline: none; resize: none; background: transparent; font-size: 16px; }

        button:not(:disabled):hover { transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0); }
        button:focus-visible, textarea:focus-visible { outline: 2px solid ${theme.accentSoftBlue}; outline-offset: 2px; }

        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

        /* Link & citation tint to match brand */
        .markdown-body a { color: ${theme.accentSoftBlue}; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color .2s ease; }
        .markdown-body a:hover { border-bottom-color: ${theme.accentSoftBlue}; }
        .markdown-body sup.md-citation { color: ${theme.accentSoftBlue}; cursor: pointer; font-weight: 600; border-radius: 4px; transition: all .2s ease; }
        .markdown-body sup.md-citation:hover { background-color: ${theme.accentSoftBlue}20; transform: translateY(-1px); }
      `
        }}
      />
    </div>
  );
};

export default AstraApp;
