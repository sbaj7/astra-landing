import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  ArrowUp,
  Square,
  Edit3,
  Sparkles,
  FileText,
  Search,
  Stethoscope,
  X,
  ExternalLink,
  User,
  Settings,
  CreditCard,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { useSupabaseAuth } from './Auth/SupabaseAuthProvider.jsx';
import PaywallModal from './Auth/PaywallModal';
import BillingModal from './BillingModal.jsx';
import BillingSuccessOverlay from './BillingSuccessOverlay.jsx';
import ProfileModal from './ProfileModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import DeleteChatModal from './DeleteChatModal.jsx';
import authService from '../services/authService';
import useIsMobile from '../hooks/useIsMobile.js';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
// import rehypeKatex from 'rehype-katex'; // <-- requires `katex` package + CSS
import rehypeSanitize from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import mermaid from 'mermaid';
import rehypeRaw from 'rehype-raw';


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

let mermaidInitialized = false;

const initializeMermaid = (/* isDark ignored for global init */) => {
  if (mermaidInitialized) return; // ← only once, ever
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true }
      // DO NOT set theme here; we’ll pass theme at render time
    });
    mermaidInitialized = true;
  } catch (err) {
    console.error('Mermaid initialization failed:', err);
  }
};

initializeMermaid();

const MermaidDiagram = ({ children, theme, isDark = false }) => {
  const ref = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = String(children || '').trim();
    
    if (!code || !ref.current) {
      return;
    }

    // Clean the code first
    const cleanCode = code.replace(/```mermaid\n?/, '').replace(/\n?```$/, '').trim();
    
    // Use a unique ID for each render
    const renderId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      mermaid.render(renderId, cleanCode).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
          setError(null);
        }
      }).catch((e) => {
        console.error("Mermaid render error:", e);
        setError(e.message);
      });
    } catch (e) {
      console.error("Mermaid render error:", e);
      setError(e.message);
    }
  }, [children, isDark]);

  if (error) {
    return (
      <div style={{
        color: theme.errorColor,
        padding: 12,
        border: `1px solid ${theme.errorColor}`,
        borderRadius: 8,
        background: `${theme.errorColor}15`,
        fontFamily: 'monospace',
        fontSize: 12,
        whiteSpace: 'pre-wrap'
      }}>
        <strong>Mermaid Error:</strong> {error}
        <pre style={{marginTop: '8px'}}>{String(children)}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        margin: '1rem 0',
        padding: '1rem',
        background: theme.backgroundSurface,
        borderRadius: 8,
        border: `1px solid ${theme.textSecondary}25`,
        overflow: 'auto',
        textAlign: 'center',
        minHeight: 60
      }}
    />
  );
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

/** 
 * Custom remark plugin to handle line breaks without requiring remark-breaks
 * Converts single newlines to hard breaks
 */
function remarkCustomBreaks() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof node.value !== 'string') return;
      
      // Split text on newlines and create break nodes
      const parts = node.value.split(/\r?\n/);
      if (parts.length <= 1) return; // No newlines found
      
      const newNodes = [];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          newNodes.push({ type: 'text', value: parts[i] });
        }
        if (i < parts.length - 1) {
          newNodes.push({ type: 'break' });
        }
      }
      
      if (newNodes.length > 1) {
        parent.children.splice(index, 1, ...newNodes);
        return index + newNodes.length;
      }
    });
  };
}

// Add this function after your preprocessMarkdown function (around line 260)
const fixMermaidContent = (content) => {
  if (!content) return content;
  
  console.log('=== FIXING MERMAID CONTENT ===');
  console.log('Original content:', content);
  
  // Pattern to detect mermaid diagrams that aren't wrapped in code blocks
  const lines = content.split('\n');
  const result = [];
  let inMermaidBlock = false;
  let mermaidLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    console.log(`Line ${i}: "${trimmed}" (inMermaidBlock: ${inMermaidBlock})`);
    
    // Check if this line starts a mermaid diagram - more comprehensive detection
    const isMermaidStart = !inMermaidBlock && (
      // Flowchart patterns
      /^flowchart\s+(TD|LR|TB|BT|RL)/.test(trimmed) ||
      /^graph\s+(TD|LR|TB|BT|RL)/.test(trimmed) ||
      // Other diagram types
      trimmed === 'sequenceDiagram' ||
      trimmed === 'classDiagram' ||
      trimmed === 'stateDiagram' ||
      trimmed === 'stateDiagram-v2' ||
      trimmed === 'erDiagram' ||
      trimmed === 'journey' ||
      trimmed === 'gantt' ||
      trimmed === 'pie' ||
      trimmed === 'gitGraph' ||
      trimmed === 'mindmap' ||
      trimmed === 'timeline' ||
      // Catch any remaining flowchart/graph variations
      trimmed.startsWith('flowchart ') ||
      trimmed.startsWith('graph ')
    );
    
    if (isMermaidStart) {
      // Check if it's already in a code block
      const recentLines = result.slice(-5).join('\n');
      if (!recentLines.includes('```mermaid') && !recentLines.includes('```')) {
        console.log('🎯 DETECTED MERMAID START:', trimmed);
        inMermaidBlock = true;
        mermaidLines = [trimmed];
        continue;
      }
    }
    
    // If we're in a mermaid block, check if we should continue or end
    if (inMermaidBlock) {
      // Continue if the line looks like mermaid syntax
      if (trimmed === '' || 
          /^[A-Z]\s*-->/.test(trimmed) ||
          /^[A-Z]\s*--[A-Z]/.test(trimmed) ||
          /^[A-Z]\s*\{/.test(trimmed) ||
          /^[A-Z]\s*\[/.test(trimmed) ||
          /^\s*[A-Z]\s*-->/.test(trimmed) ||
          /^\s*[A-Z]\s*--/.test(trimmed) ||
          trimmed.includes('-->') ||
          trimmed.includes('[') && trimmed.includes(']') ||
          trimmed.includes('{') && trimmed.includes('}')) {
        
        if (trimmed !== '') {
          console.log('📝 Adding mermaid line:', trimmed);
          mermaidLines.push(trimmed);
        }
      } else {
        // End of mermaid block
        console.log('🏁 ENDING MERMAID BLOCK, collected lines:', mermaidLines);
        inMermaidBlock = false;
        result.push('```mermaid');
        result.push(...mermaidLines);
        result.push('```');
        result.push('');
        
        // Add the current line if it's not empty
        if (trimmed !== '') {
          result.push(line);
        }
        mermaidLines = [];
      }
    } else {
      result.push(line);
    }
  }
  
  // Handle case where mermaid block extends to end of content
  if (inMermaidBlock && mermaidLines.length > 0) {
    console.log('🏁 ENDING MERMAID BLOCK AT EOF, collected lines:', mermaidLines);
    result.push('```mermaid');
    result.push(...mermaidLines);
    result.push('```');
  }
  
  const finalContent = result.join('\n');
  console.log('=== FIXED CONTENT ===');
  console.log(finalContent);
  console.log('======================');
  
  return finalContent;
};

const preprocessMarkdown = (markdown, isStreaming = false) => {
 if (!markdown) return '';
 
 const lines = markdown.split('\n');
 const processedLines = [];
 
 for (let i = 0; i < lines.length; i++) {
   const line = lines[i];
   processedLines.push(line);
   
   let emptyLineCount = 0;
   let j = i + 1;
   while (j < lines.length && lines[j].trim() === '') {
     emptyLineCount++;
     j++;
   }
   
   if (emptyLineCount >= 2) {
     processedLines.push('');
     for (let k = 1; k < emptyLineCount; k++) {
       processedLines.push('&nbsp;');
     }
     i = j - 1;
   }
 }
 
 return processedLines.join('\n');
};

/** Sanitize schema allowing list attrs + citations */
/** Sanitize schema allowing list attrs + citations */
const sanitizeSchema = {
  tagNames: [
    'a','p','strong','em','code','pre','blockquote','ul','ol','li','hr',
    'h1','h2','h3','table','thead','tbody','tr','th','td','sup','span','br','div'
  ],
  attributes: {
    a: ['href','title','target','rel'],
    //
    // THIS IS THE FIX: Add 'className' to the line below
    //
    code: ['className'],
    //
    //
    //
    sup: ['data-citation','className'],
    span: ['className','style'],
    th: ['align'],
    td: ['align'],
    table: ['className'],
    h1: ['id'], h2: ['id'], h3: ['id'],
    ol: ['start','reversed','type'],
    p: ['className']
  },
  clobberPrefix: 'md-',
  protocols: { href: ['http', 'https-dev', 'https', 'mailto', 'tel'] }
};

// keep plugin arrays stable between renders for perf
const remarkPlugins = [remarkGfm, remarkMath, remarkCustomBreaks];
const rehypePlugins = [
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'append' }],
  rehypeHighlight,
  rehypeRaw,
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
const ToolbarView = ({
  onNewChat,
  onToggleSidebar,
  theme,
  chatLimit,
  isMobile
}) => {
  const [newChatCooldown, setNewChatCooldown] = useState(false);
  const {
    signIn,
    isAuthenticated,
    isLoading: authStateLoading
  } = useSupabaseAuth();

  const isLoggedIn = !!isAuthenticated;

  const handleNewChat = () => {
    if (newChatCooldown) return;
    setNewChatCooldown(true);
    onNewChat();
    setTimeout(() => setNewChatCooldown(false), 300);
  };

  const handleLogin = async (mode = 'signIn') => {
    try {
      await signIn({ mode });
    } catch (error) {
      console.error('Supabase sign-in failed', error);
    }
  };

  return (
    <div style={{
      height: isMobile ? 56 : 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `0 ${isMobile ? 12 : 16}px`,
      backgroundColor: theme.backgroundSurface,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'relative',
      zIndex: 10,
      minHeight: isMobile ? 56 : 52
    }}>
      <button
        onClick={onToggleSidebar}
        aria-label="Open sidebar"
        style={{
          position: 'absolute',
          left: isMobile ? 12 : 16,
          padding: isMobile ? 6 : 8,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <h1 style={{
    color: theme.textPrimary,
    fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
    fontSize: isMobile ? 24 : 28,
    margin: 0,
    fontWeight: 400
  }}>
    Astra
  </h1>
      </div>

      <div style={{
        position: 'absolute',
        right: isMobile ? 12 : 16,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 12
      }}>
        {/* Chat Counter for Anonymous Users */}
        {!isLoggedIn && !authStateLoading && (
          <span style={{
            color: theme.textPrimary,
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: '500'
          }}>
            {chatLimit.remaining} free left
          </span>
        )}

        {/* Sign Up Button */}
        {!isLoggedIn && !authStateLoading && (
          <button
            onClick={() => handleLogin('signUp')}
            style={{
              padding: isMobile ? '6px 12px' : '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: theme.textPrimary,
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(10px)'
            }}
          >
            Sign Up
          </button>
        )}

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          disabled={newChatCooldown}
          aria-label="New chat"
          style={{
            padding: isMobile ? 6 : 8,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            opacity: newChatCooldown ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Edit3 size={18} color={theme.textPrimary} />
        </button>

      </div>
    </div>
  );
};

const ModeSwitcher = ({ currentMode, onModeChange, isDisabled, theme, isMobile }) => {
  const modes = [
    { key: 'search', title: 'Research', icon: Search },
    { key: 'reason', title: 'DDx', icon: Sparkles },
    { key: 'write', title: 'A&P', icon: FileText }
  ];
  return (
    <div style={{ display: 'flex', gap: isMobile ? 4 : 6, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
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
              padding: isMobile ? '5px 10px' : '6px 10px',
              borderRadius: 50,
              border: `1px solid ${theme.textSecondary}50`,
              backgroundColor: isSelected ? theme.accentSoftBlue : 'transparent',
              color: isSelected ? '#fff' : theme.textPrimary,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all .2s ease',
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

const EmptyState = ({ currentMode, onSampleTapped, theme, isMobile }) => {
  const queries = sampleQueries[currentMode] || sampleQueries.search;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 12px' : '32px 16px', height: '100%', gap: isMobile ? 20 : 24 }}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ width: 36, height: 36, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" fill={`${theme.grayPrimary}40`} />
          </svg>
        </div>
        <h2 style={{
          color: `${theme.grayPrimary}60`,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: isMobile ? 28 : 36,
          lineHeight: 1.1,
          margin: 0,
          maxWidth: isMobile ? 200 : 220,
          fontWeight: 300,
          marginInline: 'auto'
        }}>
          Uncertainty ends here.
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 448, padding: isMobile ? '0 12px' : '0 32px' }}>
        {queries.map((q, i) => (
          <button
            key={i}
            onClick={() => onSampleTapped(q)}
            style={{
              width: '100%',
              padding: isMobile ? '9px 16px' : '10px 20px',
              borderRadius: 50,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 500,
              textAlign: 'center',
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

// Optional: Enhanced streaming support for live Mermaid rendering
const processStreamingContentForMermaid = (content) => {
  // Check if we have complete Mermaid blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  const matches = [];
  let match;
  
  while ((match = mermaidRegex.exec(content)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1].trim(),
      fullMatch: match[0]
    });
  }
  
  return {
    hasCompleteMermaid: matches.length > 0,
    mermaidBlocks: matches,
    content
  };
};

/* =========================
   MARKDOWN BLOCK (Tailwind Typography)
   ========================= */
const markdownComponents = {
  a: ({ node, ...props }) => {
    const href = props.href || '';
    const isExternal = /^https?:\/\//i.test(href);
    return <a {...props} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} />;
  },
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';

    if (!inline && language === 'mermaid') {
      const rawCode = String(children);
      return <MermaidDiagram {...props}>{rawCode}</MermaidDiagram>;
    }
    
    return <code className={className} {...props}>{children}</code>;
  },
  p: ({ node, children, ...props }) => {
    if (children && children.length === 1 && typeof children[0] === 'string' && children[0] === '\u00A0') {
      return <div style={{ height: '1.5em' }} {...props} />;
    }
    return <p {...props}>{children}</p>;
  },
};

// Update your MarkdownBlock to use the components and pass theme/isDark
const MarkdownBlock = ({ markdown, theme, invert = false, onTapCitation, isStreaming = false }) => {
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

const processedMarkdown = preprocessMarkdown(markdown, isStreaming);
   
const componentsWithTheme = {
  ...markdownComponents,
code: ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  if (!inline && language === 'mermaid') {
    const code = String(children).replace(/\n$/, '');

    // ✅ Only show as code block if actively streaming AND content is incomplete
    if (isStreaming && !code.includes('flowchart') && !code.includes('graph')) {
      return (
        <pre className={className}>
          <code {...props}>{code}</code>
        </pre>
      );
    }

    // ✅ Otherwise, render the diagram
    return (
      <MermaidDiagram theme={theme} isDark={invert}>
        {code}
      </MermaidDiagram>
    );
  }

  return <code className={className} {...props}>{children}</code>;
}
};

  return (
    <div
      ref={containerRef}
      className={`markdown-body prose max-w-none ${invert ? 'prose-invert' : 'prose-neutral'}`}
      style={{ color: theme.textPrimary }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={componentsWithTheme}
      >
        {processedMarkdown || ''}
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
  isStreaming={false}   // ← change this to: isStreaming={!message.isStreamingComplete}
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
const StreamingResponse = ({ content, theme, invert = false }) => {
  const mermaidInfo = processStreamingContentForMermaid(content);
  
  return (
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
          letterSpacing: .5, 
          color: theme.textSecondary 
        }}>
          Response:
        </span>
      </div>
      
      <div>
<MarkdownBlock 
  markdown={content || ''} 
  theme={theme} 
  invert={invert} 
  onTapCitation={() => {}} 
  isStreaming={!content.includes('```mermaid')}  // ← change this line
        />
        {content ? (
          <span style={{ 
            color: '#4A6B7D', 
            animation: 'blink 1s infinite' 
          }}>
          </span>
        ) : null}
      </div>
    </div>
  );
};

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

const Sidebar = ({
  isOpen,
  onClose,
  chatHistory,
  onSelectChat,
  onRequestDeleteChat,
  onNewChat,
  onShowProfile,
  onShowSettings,
  onShowBilling,
  onShowLogout,
  theme,
  user,
  subscription,
  isAuthenticated,
  profile,
  onAuthPrompt,
  isMobile
}) => {
  if (!isOpen) return null;

  const planLabel = subscription?.plan_key ? `${subscription.plan_key.replace(/(^|\s)(\w)/g, (m, p1, p2) => `${p1}${p2.toUpperCase()}`)} plan` : 'Free plan';
  const userName = user?.name || profile?.full_name || user?.email || profile?.email || 'Account';
  const isLoggedIn = !!isAuthenticated;

  const userInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.name) {
      return user.name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const requestAuth = (mode = 'signIn') => {
    onAuthPrompt?.(mode);
  };

  const performAuthedAction = (action, mode = 'signIn') => {
    if (!isLoggedIn) {
      requestAuth(mode);
      onClose();
      return;
    }
    action?.();
    onClose();
  };

  const renderChatItem = (chat) => (
    <div
      key={chat.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 10,
        backgroundColor: `${theme.textSecondary}08`,
        cursor: 'pointer'
      }}
        onClick={() => onSelectChat(chat)}
    >
      <span style={{
        flex: 1,
        fontSize: 13,
        color: theme.textPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {chat.displayTitle || chat.title || 'Untitled'}
      </span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onRequestDeleteChat?.(chat);
        }}
        style={{
          border: 'none',
          background: 'transparent',
          color: `${theme.textSecondary}AA`,
          cursor: 'pointer'
        }}
        aria-label="Delete chat"
      >
        <Square size={12} />
      </button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'row' }}>
      <aside
        style={{
          width: isMobile ? '100vw' : 320,
          maxWidth: isMobile ? '100vw' : '92vw',
          height: '100%',
          backgroundColor: `${theme.backgroundSurface}`,
          color: theme.textPrimary,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 48px rgba(0,0,0,0.35)'
        }}
      >
        <div style={{ padding: isMobile ? '20px 18px 10px' : '24px 20px 12px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.accentSoftBlue }} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>Astra</span>
          {isMobile && (
            <button
              onClick={onClose}
              aria-label="Close menu"
              style={{
                border: 'none',
                background: 'transparent',
                color: theme.textSecondary,
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{ padding: isMobile ? '0 18px' : '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => { onNewChat(); onClose(); }}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: isMobile ? '10px 14px' : '10px 16px',
              backgroundColor: theme.accentSoftBlue,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            + New chat
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SidebarNavItem icon={MessageSquare} label="Chats" active theme={theme} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 18px 24px' : '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chatHistory.length === 0 && (
            <div style={{
              padding: '24px 18px',
              borderRadius: 16,
              backgroundColor: `${theme.textSecondary}10`,
              textAlign: 'center',
              color: theme.textSecondary,
              fontSize: 13,
              lineHeight: 1.4
            }}>
              <strong style={{ display: 'block', marginBottom: 8, color: theme.textPrimary }}>No chats yet</strong>
              Start a conversation to see your chat history here
            </div>
          )}

          {chatHistory.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chatHistory.map(renderChatItem)}
            </div>
          )}
        </div>

        <div
          style={{
            padding: isMobile ? '16px 18px' : '16px 20px',
            borderTop: `1px solid ${theme.textSecondary}15`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {isLoggedIn ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer'
                }}
                onClick={() => performAuthedAction(onShowProfile)}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: `${theme.textSecondary}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.textPrimary
                  }}
                >
                  {userInitials()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{userName}</span>
                  <span style={{ fontSize: 12, color: theme.textSecondary }}>{planLabel}</span>
                </div>
              </div>

              <SidebarAction
                icon={User}
                label="Profile"
                theme={theme}
                onClick={() => performAuthedAction(onShowProfile)}
              />

              <SidebarAction
                icon={Settings}
                label="Settings"
                theme={theme}
                onClick={() => performAuthedAction(onShowSettings)}
              />

              <SidebarAction
                icon={CreditCard}
                label="Billing & Plans"
                theme={theme}
                onClick={() => performAuthedAction(onShowBilling, 'signUp')}
              />

              <div style={{ height: 1, backgroundColor: `${theme.textSecondary}20` }} />

              <SidebarAction
                icon={LogOut}
                label="Log out"
                theme={theme}
                isDestructive
                onClick={() => performAuthedAction(onShowLogout)}
              />
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '8px 0'
              }}
            >
              <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>
                Create a free Astra account to sync chats, manage billing, and update your profile.
              </div>
              <button
                onClick={() => { requestAuth('signUp'); onClose(); }}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '10px 16px',
                  backgroundColor: theme.accentSoftBlue,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sign up for free
              </button>
              <button
                onClick={() => { requestAuth('signIn'); onClose(); }}
                style={{
                  borderRadius: 999,
                  padding: '10px 16px',
                  background: 'transparent',
                  border: `1px solid ${theme.textSecondary}40`,
                  color: theme.textPrimary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Already have an account? Sign in
              </button>
            </div>
          )}
        </div>
      </aside>
      {!isMobile && (
        <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose} />
      )}
    </div>
  );
};

const SidebarNavItem = ({ icon: Icon, label, active = false, theme }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 12,
      backgroundColor: active ? `${theme.textSecondary}15` : 'transparent',
      color: active ? theme.textPrimary : theme.textSecondary,
      fontSize: 13,
      fontWeight: active ? 600 : 500
    }}
  >
    <Icon size={16} />
    {label}
  </div>
);

const SidebarAction = ({ icon: Icon, label, theme, onClick, isDestructive = false }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      width: '100%',
      borderRadius: 12,
      border: 'none',
      backgroundColor: `${theme.textSecondary}08`,
      color: isDestructive ? theme.errorColor : theme.textPrimary,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      textAlign: 'left'
    }}
  >
    <Icon size={16} />
    {label}
  </button>
);

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
  onHeightChange,
  isMobile
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
    const handlePointerDown = (event) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (event.target instanceof Node && textarea.contains(event.target)) {
        return;
      }
      textarea.blur();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

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
      style={{
        paddingTop: isMobile ? 12 : 8,
        paddingRight: isMobile ? 12 : 16,
        paddingLeft: isMobile ? 12 : 16,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        backgroundColor: theme.backgroundSurface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
      }}
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
            width: '100%',
            padding: isMobile ? '8px 10px' : '8px 12px',
            borderRadius: 12,
            resize: 'none',
            border: 'none',
            outline: 'none',
            fontSize: isMobile ? 15 : 16,
            lineHeight: 1.5,
            backgroundColor: theme.backgroundSurface,
            color: theme.textPrimary,
            height: `${textareaHeight}px`,
            minHeight: isMobile ? 36 : 40,
            maxHeight: isMobile ? 100 : 120,
            fontFamily: 'inherit',
            boxSizing: 'border-box'
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -8, flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0 }}>
        <ModeSwitcher
          currentMode={currentMode}
          onModeChange={onModeChange}
          isDisabled={isStreaming || isLoading}
          theme={theme}
          isMobile={isMobile}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, marginLeft: isMobile ? 'auto' : 0 }}>
          <button
            onClick={speechRecognition.toggleRecording}
            disabled={!speechRecognition.isAvailable || isStreaming || isLoading}
            aria-pressed={speechRecognition.isRecording}
            aria-label={speechRecognition.isRecording ? 'Stop recording' : 'Start recording'}
            style={{
              padding: isMobile ? 6 : 8,
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
            {speechRecognition.isRecording ? <Square size={isMobile ? 24 : 28} fill="currentColor" /> : <Mic size={isMobile ? 24 : 28} />}
          </button>

          <button
            onClick={isStreaming ? onStop : onSend}
            disabled={!isStreaming && !query.trim()}
            aria-label={isStreaming ? 'Stop response' : 'Send'}
            style={{
              padding: isMobile ? 6 : 8,
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
            {isStreaming ? <Square size={isMobile ? 24 : 28} fill="currentColor" /> : <ArrowUp size={isMobile ? 24 : 28} />}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 0 }}>
        <p style={{ fontSize: isMobile ? 11 : 12, color: theme.textSecondary, margin: 0 }}>Astra can make mistakes. Check critical info.</p>
      </div>
    </div>
  );
};

const parseSessionMessages = (rawMessages) => {
  if (Array.isArray(rawMessages)) return rawMessages;
  if (typeof rawMessages === 'string') {
    try {
      const parsed = JSON.parse(rawMessages);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse stored messages JSON:', error);
      return [];
    }
  }
  if (rawMessages && typeof rawMessages === 'object') {
    return Array.isArray(rawMessages) ? rawMessages : [];
  }
  return [];
};

const MAX_TITLE_LENGTH = 36;

const sanitizeTitleText = (text) => text?.replace(/\s+/g, ' ').trim() || '';

const createChatTitle = (source, fallback = 'Conversation') => {
  const sanitizedSource = sanitizeTitleText(source);
  if (!sanitizedSource) return fallback;

  const sentenceFragment = sanitizedSource.split(/(?<=[.!?])\s+/)[0] || sanitizedSource;
  const words = sentenceFragment.split(' ').slice(0, 6).join(' ').trim() || sanitizedSource.split(' ').slice(0, 6).join(' ').trim();
  const candidate = sanitizeTitleText(words || sentenceFragment || sanitizedSource);

  if (!candidate) return fallback;
  if (candidate.length <= MAX_TITLE_LENGTH) return candidate;
  return `${candidate.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
};

const normalizeSessionForHistory = (session) => {
  if (!session) return null;
  const messages = parseSessionMessages(session.messages);
  const mode = session.mode || 'search';
  const sourceTitle = sanitizeTitleText(session.title) || createChatTitle(messages[0]?.content);
  const displayTitle = createChatTitle(sourceTitle);

  return {
    id: session.id || `session-${session.created_at || Date.now()}`,
    title: sourceTitle,
    displayTitle,
    messages,
    timestamp: session.created_at || new Date().toISOString(),
    mode,
    wasInClinicalMode: mode === 'reason',
    wasInReasonMode: mode === 'reason',
    wasInWriteMode: mode === 'write'
  };
};

/* =========================
   APP
   ========================= */
const AstraApp = () => {
  const { colors: theme, isDark } = useTheme();
  const speechRecognition = useSpeechRecognition();
  const isMobile = useIsMobile();

  // Supabase auth
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    signOut,
    signIn
  } = useSupabaseAuth();

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

  // Auth-related state
  const [showPaywall, setShowPaywall] = useState(false);
  const [chatLimit, setChatLimit] = useState(() => {
    // Initialize from cache if available and not expired
    const cached = authService.getCachedAnonymousLimitState();
    if (cached && cached.reset_at) {
      const resetTime = new Date(cached.reset_at);
      if (resetTime > new Date()) {
        return {
          remaining: cached.remaining,
          used: cached.used,
          resetAt: cached.reset_at
        };
      }
    }
    // Default state if no valid cache
    return { remaining: 10, used: 0, resetAt: null };
  });
  const [showBilling, setShowBilling] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isBillingAction, setIsBillingAction] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingStatus, setBillingStatus] = useState(null);
  const [showBillingWelcome, setShowBillingWelcome] = useState(false);
  const [billingWelcomePlan, setBillingWelcomePlan] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [chatPendingDeletion, setChatPendingDeletion] = useState(null);
  const [appSettings, setAppSettings] = useState({
    syncSystem: true,
    forceDark: false,
    language: 'en-US',
    requireLogin: true,
    phiMode: false
  });
  const [accountProfile, setAccountProfile] = useState(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [inputBarHeight, setInputBarHeight] = useState(0);

  const refreshProfile = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setAccountProfile(null);
      return;
    }

    try {
      const supabaseUser = await authService.syncUserWithSupabase(user);
      setAccountProfile(supabaseUser);
    } catch (error) {
      console.error('Failed to sync account profile:', error);
    }
  }, [authLoading, isAuthenticated, user]);

  const refreshChatHistory = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setChatHistory([]);
      return;
    }

    try {
      const sessions = await authService.getChatSessions(user, 20);
      if (!Array.isArray(sessions)) return;
      const normalized = sessions
        .map(normalizeSessionForHistory)
        .filter(Boolean);
      setChatHistory(normalized);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [authLoading, isAuthenticated, user]);

  const refreshSubscription = useCallback(async (showSpinner = false) => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setSubscriptionInfo(null);
      return;
    }

    try {
      setBillingError('');
      if (showSpinner) setIsBillingLoading(true);
      const result = await authService.getSubscriptionStatus(user);
      setSubscriptionInfo(result?.subscription || null);
    } catch (error) {
      console.error('Failed to load subscription details:', error);
      setBillingError(error.message || 'Unable to load subscription details');
    } finally {
      if (showSpinner) setIsBillingLoading(false);
    }
  }, [authLoading, isAuthenticated, user]);

  // Sync user with Supabase when authenticated
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (authLoading) return;
    refreshChatHistory();
  }, [authLoading, refreshChatHistory]);

  useEffect(() => {
    if (!showBilling) return;
    refreshSubscription(true);
  }, [showBilling, refreshSubscription]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('billing');
    if (!status) return;

    setBillingStatus(status);
    if (isAuthenticated && user) {
      refreshSubscription();
    }

    params.delete('billing');
    const query = params.toString();
    const newUrl = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [isAuthenticated, user, refreshSubscription]);

  useEffect(() => {
    if (billingStatus !== 'success') return;
    const planKey = subscriptionInfo?.plan_key;
    if (!planKey) return;

    setBillingWelcomePlan(planKey);
    setShowBillingWelcome(true);
    setBillingStatus(null);
  }, [billingStatus, subscriptionInfo]);

  useEffect(() => {
    if (!profileSuccess) return;
    const timer = setTimeout(() => setProfileSuccess(''), 2500);
    return () => clearTimeout(timer);
  }, [profileSuccess]);

  // Initialize chat limits from localStorage for anonymous users
  useEffect(() => {
    if (isAuthenticated) {
      // Reset chat limits for authenticated users (they don't have limits)
      setChatLimit({ remaining: 10, used: 0, resetAt: null });
      return;
    }

    // For anonymous users, check and sync with localStorage
    const cached = authService.getCachedAnonymousLimitState();
    if (cached && cached.reset_at) {
      const resetTime = new Date(cached.reset_at);
      if (resetTime > new Date()) {
        // Valid cached limit found
        setChatLimit({
          remaining: cached.remaining,
          used: cached.used,
          resetAt: cached.reset_at
        });
        return;
      } else {
        // Cached limit has expired, clear it
        authService.setCachedAnonymousLimitState({ used: 0, reset_at: authService.getDefaultAnonymousResetTimestamp() });
      }
    }

    // No valid cache or expired - initialize fresh limit
    const resetAt = authService.getDefaultAnonymousResetTimestamp();
    setChatLimit({ remaining: 10, used: 0, resetAt });
    authService.setCachedAnonymousLimitState({ used: 0, reset_at: resetAt });
  }, [isAuthenticated]);

  // Update chat limit for authenticated users only (anonymous users use localStorage only)
  const updateChatLimit = useCallback(async () => {
    if (isAuthenticated) {
      // For authenticated users, they don't have limits - set unlimited
      setChatLimit({ remaining: 999, used: 0, resetAt: null });
    }
    // For anonymous users, do nothing - localStorage is the single source of truth
  }, [isAuthenticated]);

  // Initialize chat limit only for authenticated users (removed for anonymous users)
  useEffect(() => {
    if (isAuthenticated) {
      updateChatLimit();
    }
    // For anonymous users, initialization is handled by the dedicated useEffect above
  }, [isAuthenticated, updateChatLimit]);

  const handleOpenBilling = useCallback(() => {
    if (!isAuthenticated) {
      setShowPaywall(true);
      return;
    }
    setBillingError('');
    setShowBilling(true);
  }, [isAuthenticated]);

  const handleOpenProfile = useCallback(() => {
    if (!isAuthenticated) {
      setShowPaywall(true);
      return;
    }
    setProfileError('');
    setProfileSuccess('');
    refreshProfile();
    setShowProfile(true);
  }, [isAuthenticated, refreshProfile]);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleSettingChange = useCallback((key, value) => {
    setAppSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCheckoutPlan = useCallback(async (planId) => {
    if (!isAuthenticated || !user) {
      setShowBilling(false);
      setShowPaywall(true);
      return;
    }

    try {
      setBillingError('');
      setBillingStatus(null);
      setIsBillingAction(true);
      const result = await authService.createCheckoutSession(planId, user, window.location.origin);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
      setBillingError(error.message || 'Unable to start checkout. Please try again.');
    } finally {
      setIsBillingAction(false);
    }
  }, [isAuthenticated, user]);

  const handleManageSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setShowBilling(false);
      setShowPaywall(true);
      return;
    }

    try {
      setBillingError('');
      setIsBillingAction(true);
      const result = await authService.createPortalSession(user, window.location.origin);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      setBillingError(error.message || 'Unable to open billing portal. Please try again.');
    } finally {
      setIsBillingAction(false);
    }
  }, [isAuthenticated, user]);

  const handleCloseBilling = useCallback(() => {
    setShowBilling(false);
    setBillingError('');
  }, []);

  const handleCloseBillingWelcome = useCallback(() => {
    setShowBillingWelcome(false);
    setBillingWelcomePlan(null);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setShowProfile(false);
    setProfileError('');
    setProfileSuccess('');
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleRequestDeleteChat = useCallback((session) => {
    if (!session) return;
    setChatPendingDeletion(session);
    setShowDeleteChatModal(true);
    setShowSidebar(false);
  }, []);

  const handleCancelDeleteChat = useCallback(() => {
    setShowDeleteChatModal(false);
    setChatPendingDeletion(null);
  }, []);

  const handleAuthLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Supabase sign-out failed', error);
    }
  }, [signOut]);

  const handleAuthPrompt = useCallback(
    (mode = 'signIn') => {
      signIn({ mode }).catch((error) => {
        console.error('Supabase sign-in prompt failed', error);
      });
    },
    [signIn]
  );

  const handleUpdateProfile = useCallback(async (profileUpdates) => {
    if (!isAuthenticated || !user) {
      setShowPaywall(true);
      return;
    }

    try {
      setProfileError('');
      setProfileSuccess('');
      setIsProfileSaving(true);
      const response = await authService.updateUserProfile(user, profileUpdates);
      const updatedUser = response?.user || response;
      if (updatedUser) {
        setAccountProfile(updatedUser);
        setProfileSuccess('Profile updated');
        refreshProfile();
      } else {
        setProfileError('Profile update failed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setProfileError(error.message || 'Unable to update profile');
    } finally {
      setIsProfileSaving(false);
    }
  }, [isAuthenticated, user, refreshProfile]);

  // Add scroll bump function for new user requests
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Removed all scrollToBottom functionality - no more autoscroll!

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

    // Check authentication and limits for anonymous users
  if (!isAuthenticated) {
    // Check current limit
    if (chatLimit.remaining <= 0) {
      setShowPaywall(true);
      return;
    }

    // Immediately decrement the counter (optimistic update)
    setChatLimit(prev => {
      const resetAt = prev.resetAt || authService.getDefaultAnonymousResetTimestamp();
      const nextUsed = Math.min(10, (prev.used || 0) + 1);
      const nextRemaining = Math.max(0, 10 - nextUsed);
      const nextState = {
        remaining: nextRemaining,
        used: nextUsed,
        resetAt
      };
      authService.setCachedAnonymousLimitState({ used: nextUsed, reset_at: resetAt });
      if (nextRemaining <= 0) {
        setShowPaywall(true);
      }
      return nextState;
    });
  }

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

    // Scroll bump when user sends a new request
    setTimeout(scrollToBottom, 100);

    if (speechRecognition.isRecording) speechRecognition.toggleRecording();
    speechRecognition.setRecognizedText('');

    abortControllerRef.current = new AbortController();
    let pendingChatSession = null;

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
        // Removed scrollToBottom() call here
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

          const trimmedAssistantContent = finalContent.trim();
          let persistedMessages = null;

          if (trimmedAssistantContent) {
            const assistantMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: trimmedAssistantContent,
              citations: collectedCitations,
              timestamp: new Date(),
              isStreamingComplete: true
            };

            setMessages(prev => [...prev, assistantMessage]);

            const generatedTitle = createChatTitle(userMessage.content);
            persistedMessages = [...messages, userMessage, { role: 'assistant', content: trimmedAssistantContent }];
            const chatSession = {
              id: `local-${Date.now()}`,
              title: generatedTitle,
              displayTitle: generatedTitle,
              messages: persistedMessages,
              timestamp: new Date(),
              wasInClinicalMode: false
            };
            pendingChatSession = chatSession;
            setChatHistory(prev => [chatSession, ...prev]);
          }

            setIsStreaming(false);
            setStreamingContent('');
            setHasFirstToken(false);

          // Handle usage tracking and session saving
          if (!isAuthenticated) {
            // For anonymous users, usage is already tracked in localStorage
            // No need for backend sync - localStorage is the single source of truth
            console.log('Anonymous usage tracked locally via localStorage');
          }

          // Save chat session
          if (persistedMessages && persistedMessages.length > 0) {
            const chatTitle = createChatTitle(userMessage.content);
            const saveResult = await authService.saveChatSession(chatTitle, persistedMessages, currentMode, user);

            if (saveResult?.session) {
              const normalized = normalizeSessionForHistory(saveResult.session);
              if (normalized) {
                setChatHistory(prev => {
                  const withoutTemp = prev.filter(chat => chat.id !== pendingChatSession?.id && chat.id !== normalized.id);
                  return [normalized, ...withoutTemp];
                });
              }
            } else if (isAuthenticated) {
              refreshChatHistory();
            }
          }

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

      // Revert optimistic update if API call failed
      if (!isAuthenticated) {
        setChatLimit(prev => ({
          ...prev,
          remaining: prev.remaining + 1,
          used: Math.max(0, prev.used - 1)
        }));
      }
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
    // Scroll bump when sample is tapped
    setTimeout(() => {
      handleSend();
      setTimeout(scrollToBottom, 100);
    }, 50);
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

  const deleteChatSession = useCallback(async (session) => {
    if (!session) return;
    const sessionId = session.id;
    const isLocalOnly = !sessionId || String(sessionId).startsWith('local-');

    setChatHistory(prev => prev.filter(chat => chat.id !== sessionId));

    if (isLocalOnly) return;

    try {
      await authService.deleteChatSession(sessionId, user);
      if (isAuthenticated) {
        await refreshChatHistory();
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      if (isAuthenticated) {
        await refreshChatHistory();
      } else {
        setChatHistory(prev => [session, ...prev]);
      }
    }
  }, [isAuthenticated, refreshChatHistory, user]);

  const handleConfirmDeleteChat = useCallback(async () => {
    if (!chatPendingDeletion) return;
    try {
      await deleteChatSession(chatPendingDeletion);
    } finally {
      setShowDeleteChatModal(false);
      setChatPendingDeletion(null);
    }
  }, [chatPendingDeletion, deleteChatSession]);

  // Removed all useEffect hooks that called scrollToBottom

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary, fontFamily: '-apple-system, BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif',
      overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      userSelect: 'none', outline: 'none'
    }}>
      {/* Toolbar */}
      <ToolbarView
        onNewChat={resetChat}
        onToggleSidebar={() => setShowSidebar(true)}
        theme={theme}
        chatLimit={chatLimit}
        isMobile={isMobile}
      />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Conversation */}
        <div
          ref={scrollRef}
          style={{
            position: 'relative',
            zIndex: 0,
            flex: 1,
            overflowY: 'auto',
            paddingTop: 0,
            paddingRight: isMobile ? 12 : 16,
            paddingLeft: isMobile ? 12 : 16,
            paddingBottom: inputBarHeight + (isMobile ? 12 : 16), // prevent bottom clipping
            scrollPaddingBottom: inputBarHeight + (isMobile ? 12 : 16),
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            userSelect: 'none',
            outline: 'none'
          }}
          onClick={() => { if (speechRecognition.isRecording) speechRecognition.toggleRecording(); }}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          <div style={{ maxWidth: isMobile ? '100%' : 900, margin: '0 auto', padding: isMobile ? '12px 0' : '16px 0', minHeight: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState currentMode={currentMode} onSampleTapped={handleSampleTapped} theme={theme} isMobile={isMobile} />
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

        
{/* Input - matching width container */}
<div style={{
  flexShrink: 0,
  padding: isMobile ? '0 12px' : '0 16px',
  boxSizing: 'border-box',
  width: '100%',
  position: 'relative',
  backgroundColor: theme.backgroundPrimary
}}>
  
  <div style={{ maxWidth: isMobile ? '100%' : 900, margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>
    {/* Subtle blur fade overlay - extended with full rounding */}
<div style={{
  position: 'absolute',
  top: -15,
  left: 0,
  right: 0,
  height: 35,
  background: `linear-gradient(to bottom, transparent, ${theme.backgroundSurface})`,
  pointerEvents: 'none',
  zIndex: 1,
  clipPath: 'ellipse(100% 50% at 50% 0%), ellipse(100% 150% at 50% 100%)'
}} />
    
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
      isMobile={isMobile}
    />
  </div>
</div>
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        theme={theme}
        chatLimit={chatLimit}
      />

      <BillingModal
        isOpen={showBilling}
        onClose={handleCloseBilling}
        theme={theme}
        subscription={subscriptionInfo}
        isLoading={isBillingLoading}
        onSelectPlan={handleCheckoutPlan}
        onManageSubscription={handleManageSubscription}
        billingStatus={billingStatus}
        error={billingError}
        isProcessing={isBillingAction}
        isMobile={isMobile}
      />

      {showBillingWelcome && billingWelcomePlan && (
        <BillingSuccessOverlay
          planKey={billingWelcomePlan}
          onClose={handleCloseBillingWelcome}
          theme={theme}
          isMobile={isMobile}
        />
      )}

      <ProfileModal
        isOpen={showProfile}
        onClose={handleCloseProfile}
        theme={theme}
        user={user}
        profile={accountProfile}
        subscription={subscriptionInfo}
        onManageSubscription={isAuthenticated ? handleManageSubscription : undefined}
        onUpdateProfile={handleUpdateProfile}
        isSaving={isProfileSaving}
        error={profileError}
        successMessage={profileSuccess}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        theme={theme}
        settings={appSettings}
        onSettingChange={handleSettingChange}
      />

      <DeleteChatModal
        isOpen={showDeleteChatModal}
        onConfirm={handleConfirmDeleteChat}
        onCancel={handleCancelDeleteChat}
        chat={chatPendingDeletion}
        theme={theme}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        chatHistory={chatHistory}
        onSelectChat={loadChatSession}
        onRequestDeleteChat={handleRequestDeleteChat}
        onNewChat={resetChat}
        onShowProfile={handleOpenProfile}
        onShowSettings={handleOpenSettings}
        onShowBilling={handleOpenBilling}
        onShowLogout={handleAuthLogout}
        theme={theme}
        user={user}
        subscription={subscriptionInfo}
        isAuthenticated={isAuthenticated}
        profile={accountProfile}
        onAuthPrompt={handleAuthPrompt}
        isMobile={isMobile}
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
/* ===== App chrome (unchanged) ===== */
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

.markdown-body {
  color: ${theme.textPrimary};
  line-height: 1.6;
  font-size: 14px;
}

/* prevent first/last child margins from leaking out of the bubble */
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child  { margin-bottom: 0; }

/* Headings with more space below */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: ${theme.textPrimary};
  margin: 0.8rem 0 0.6rem;  /* Changed from 0.6rem 0 0.25rem */
  line-height: 1.25;
}

.markdown-body h1 { font-size: 1.5rem; font-weight: 700; }
.markdown-body h2 { font-size: 1.25rem; font-weight: 600; }
.markdown-body h3 { font-size: 1.1rem;  font-weight: 600; }

/* Paragraphs with more breathing room */
.markdown-body p { 
  margin: 0.5rem 0;  /* Changed from 0.25rem to 0.5rem */
  line-height: 1.6;  /* Increased from 1.55 */
}
/* Horizontal rule */
.markdown-body hr {
  border: none;
  height: 1px;
  background-color: ${theme.textSecondary}40;
  margin: 1rem 0;
}

/* Blockquotes */
.markdown-body blockquote {
  margin: 0.4rem 0;
  padding: 0.2rem 0.75rem;
  border-left: 3px solid ${theme.accentSoftBlue};
  color: ${theme.textSecondary};
  background: ${theme.textSecondary}10;
  border-radius: 4px;
}

/* Links + citation pills */
.markdown-body a {
  color: ${theme.accentSoftBlue};
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color .2s ease;
  word-break: break-word;
}
.markdown-body a:hover { border-bottom-color: ${theme.accentSoftBlue}; }

.markdown-body sup.md-citation {
  color: ${theme.accentSoftBlue};
  cursor: pointer;
  font-weight: 600;
  border-radius: 4px;
  transition: all .2s ease;
}
.markdown-body sup.md-citation:hover {
  background-color: ${theme.accentSoftBlue}20;
  transform: translateY(-1px);
}

/* Images */
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Code */
.markdown-body code {
  background-color: ${theme.textSecondary}15;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.9em;
  font-family: 'SF Mono','Monaco','Cascadia Code','Roboto Mono',monospace;
}
.markdown-body pre {
  background-color: ${theme.textSecondary}15;
  border-radius: 8px;
  padding: 12px;
  margin: 0.6rem 0;
  overflow-x: auto;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
}

/* Lists themselves with more space */
.markdown-body ol,
.markdown-body ul {
  margin: 0.5rem 0;  /* Changed from 0.25rem to 0.5rem */
  padding-left: 1.5rem;
  list-style-position: outside;
}

/* List items with more space */
.markdown-body li {
  margin: 0.25rem 0;  /* Changed from 0.1rem to 0.25rem */
  line-height: 1.6;   /* Increased from 1.5 */
}

/* ALL possible nested list combinations get more indentation */
.markdown-body li > ol,
.markdown-body li > ul,
.markdown-body ol li > ol,
.markdown-body ol li > ul,
.markdown-body ul li > ol,
.markdown-body ul li > ul {
  margin: 0.1rem 0;
  padding-left: 2.5rem;
}

/* Third level nesting */
.markdown-body li li > ol,
.markdown-body li li > ul {
  padding-left: 2.5rem;
}

/* Fourth level nesting */
.markdown-body li li li > ol,
.markdown-body li li li > ul {
  padding-left: 2.5rem;
}

/* Keep everything else the same */
.markdown-body ul { list-style-type: disc; }
.markdown-body ol { list-style-type: decimal; }
.markdown-body ul ul { list-style-type: circle; }
.markdown-body ul ul ul { list-style-type: square; }

/* GFM task lists */
.markdown-body ul.contains-task-list { 
  list-style: none;
  padding-left: 1.5rem;
}
.markdown-body li.task-list-item { 
  list-style: none;
}
.markdown-body li.task-list-item > input[type="checkbox"] {
  margin-right: 0.5rem;
  transform: translateY(1px);
}

/* When code blocks appear in lists, keep spacing tidy */
.markdown-body li pre { margin-top: 0.25rem; }

/* ===== Tables: full width, zebra, header bg, borders, rounded ===== */
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0 0.75rem;
  border-radius: 8px;
  overflow: hidden; /* keep rounded corners */
  background: ${theme.backgroundSurface};
}

.markdown-body thead th {
  background: ${theme.textSecondary}15;
  color: ${theme.textPrimary};
  font-weight: 600;
  text-align: left;
}

.markdown-body th,
.markdown-body td {
  padding: 10px 12px;
  border-bottom: 1px solid ${theme.textSecondary}25;
  vertical-align: top;
}

.markdown-body tbody tr:nth-child(even) td {
  background: ${theme.textSecondary}08;
}

/* Table alignment classes from remark/rehype */
.markdown-body th.align-center,
.markdown-body td.align-center { text-align: center; }
.markdown-body th.align-right,
.markdown-body td.align-right  { text-align: right; }

/* ===== Streaming caret ===== */
.streaming-caret {
  display: inline-block;
  animation: blink 1s infinite;
  color: ${theme.accentSoftBlue};
}
`
  }}
/>
    </div>
  );
};

export default AstraApp;
