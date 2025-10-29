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
  MessageSquare,
  ClipboardList,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { useSupabaseAuth } from './Auth/SupabaseAuthProvider.jsx';
import PaywallModal from './Auth/PaywallModal.jsx';
import BillingModal from './BillingModal.jsx';
import BillingSuccessOverlay from './BillingSuccessOverlay.jsx';
import ProfileModal from './ProfileModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import DeleteChatModal from './DeleteChatModal.jsx';
import authService from '../services/authService.js';
import useIsMobile from '../hooks/useIsMobile.js';
import ReferencesView from './ReferencesView.jsx';
import AboutView from './AboutView.jsx';

const DEFAULT_APP_SETTINGS = {
  theme: 'system',
  accentColor: 'nightfall',
  language: 'auto',
  spokenLanguage: 'auto'
};

const ACCENT_COLOR_MAP = {
  nightfall: {
    light: '#4A6B7D',
    dark: '#8FA5B5'
  },
  glacier: {
    light: '#2563EB',
    dark: '#93C5FD'
  },
  meadow: {
    light: '#059669',
    dark: '#34D399'
  },
  ember: {
    light: '#EA580C',
    dark: '#FB923C'
  },
  rose: {
    light: '#DB2777',
    dark: '#F472B6'
  }
};

const ALLOWED_THEME_VALUES = new Set(['system', 'light', 'dark']);
const ALLOWED_ACCENT_VALUES = new Set(Object.keys(ACCENT_COLOR_MAP));
const ALLOWED_LANGUAGE_VALUES = new Set(['auto', 'en-US', 'en-GB', 'es-ES', 'fr-FR']);
const ALLOWED_SPOKEN_LANGUAGE_VALUES = new Set(['auto', 'en', 'es', 'fr', 'de']);

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

const extractTitle = (url) => {
  const hostname = url.hostname?.toLowerCase() || '';
  if (hostname.includes('pubmed')) return 'PubMed';
  if (hostname.includes('pmc')) return 'PMC Article';
  if (hostname.includes('dynamed')) return 'DynaMed';
  if (hostname.includes('heart.org')) return 'American Heart Association';
  if (hostname.includes('wikipedia')) return 'Wikipedia';
  return url.hostname || 'External Link';
};

const buildDisplayUrl = (parsedUrl) => {
  if (!parsedUrl) return '';
  const path = parsedUrl.pathname && parsedUrl.pathname !== '/' ? parsedUrl.pathname : '';
  const cleanPath = path.length > 60 ? `${path.slice(0, 57)}…` : path;
  return cleanPath || parsedUrl.hostname;
};

const buildFaviconUrl = (host) => {
  if (!host) return '';
  return `https://www.google.com/s2/favicons?sz=128&domain=${host}`;
};

const truncateSnippet = (snippet) => {
  if (!snippet || typeof snippet !== 'string') return '';
  const condensed = snippet.replace(/\s+/g, ' ').trim();
  if (condensed.length <= 220) return condensed;
  return `${condensed.slice(0, 217)}…`;
};

const normalizeCitationObject = (rawCitation, index = 0) => {
  if (!rawCitation || !rawCitation.url) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(rawCitation.url);
  } catch {
    return null;
  }

  const host = (rawCitation.host || rawCitation.hostname || parsedUrl.hostname || '').trim();
  const publicationDate = rawCitation.publishedAt || rawCitation.publicationDate || rawCitation.published_at || rawCitation.publication_date || rawCitation.date || '';
  const derivedYear = (() => {
    if (rawCitation.year) return String(rawCitation.year);
    if (!publicationDate) return null;
    const maybeYear = new Date(publicationDate).getFullYear();
    return Number.isNaN(maybeYear) ? null : String(maybeYear);
  })();
  const snippet = truncateSnippet(
    rawCitation.snippet ||
      rawCitation.summary ||
      rawCitation.description ||
      rawCitation.abstract ||
      rawCitation.excerpt ||
      rawCitation.content
  );
  const venue = rawCitation.journal || rawCitation.source || rawCitation.publisher;
  const number = rawCitation.number ?? index + 1;
  const title = rawCitation.title || extractTitle(parsedUrl);
  const authors = rawCitation.authors || rawCitation.author || rawCitation.primaryAuthor || venue || host || 'Unknown source';
  const faviconUrl = rawCitation.faviconUrl || rawCitation.favicon || buildFaviconUrl(host);

  return {
    ...rawCitation,
    number,
    title,
    url: rawCitation.url,
    authors,
    host,
    hostname: host,
    displayUrl: rawCitation.displayUrl || buildDisplayUrl(parsedUrl),
    faviconUrl,
    snippet,
    summary: rawCitation.summary || snippet,
    publishedAt: publicationDate || undefined,
    publicationDate: publicationDate || undefined,
    year: derivedYear || (rawCitation.year ? String(rawCitation.year) : undefined),
    journal: venue,
    doi: rawCitation.doi || rawCitation.DOI || undefined,
    score: rawCitation.score ?? rawCitation.relevance ?? undefined
  };
};

const normalizeCitationUrl = (urlString, index = 0) => {
  if (!urlString || typeof urlString !== 'string') return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return null;
  }

  const host = parsedUrl.hostname || '';

  return {
    number: index + 1,
    title: extractTitle(parsedUrl),
    url: urlString,
    authors: host || 'External source',
    host,
    hostname: host,
    displayUrl: buildDisplayUrl(parsedUrl),
    faviconUrl: buildFaviconUrl(host),
    snippet: '',
    summary: '',
    publishedAt: undefined,
    publicationDate: undefined,
    year: undefined,
    journal: undefined,
    doi: undefined,
    score: undefined
  };
};

const buildInlineCitations = (content = '', citationsArray = []) => {
  if (!content || !Array.isArray(citationsArray) || citationsArray.length === 0) {
    return [];
  }

  const available = new Set(
    citationsArray
      .map((c) => {
        const num = c?.number;
        return Number.isFinite(num) ? String(num) : null;
      })
      .filter(Boolean)
  );

  const inline = [];
  const regex = /\[(\d+)]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const numberStr = match[1];
    if (!available.has(numberStr)) continue;
    inline.push({
      sourceNumber: Number.parseInt(numberStr, 10),
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return inline;
};

const normalizeCitationForPersistence = (citation) => {
  if (!citation || !citation.url) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(citation.url);
  } catch {
    parsedUrl = null;
  }

  const host = (citation.host || citation.hostname || parsedUrl?.hostname || '').trim();
  const displayUrl = citation.displayUrl || (parsedUrl ? buildDisplayUrl(parsedUrl) : '');
  const faviconUrl = citation.faviconUrl || buildFaviconUrl(host || parsedUrl?.hostname);
  const snippet = truncateSnippet(citation.snippet || citation.summary || '');
  const publishedAt = citation.publishedAt || citation.publicationDate || '';
  const year = citation.year || (publishedAt
    ? (() => {
        const maybe = new Date(publishedAt);
        return Number.isNaN(maybe.getTime()) ? undefined : String(maybe.getFullYear());
      })()
    : undefined);

  const parsedNumber = Number.parseInt(citation.number, 10);

  return {
    number: Number.isNaN(parsedNumber) ? citation.number : parsedNumber,
    title: citation.title || (parsedUrl ? extractTitle(parsedUrl) : 'Untitled'),
    url: citation.url,
    authors: citation.authors || host || 'Unknown source',
    host,
    hostname: host,
    displayUrl,
    faviconUrl,
    snippet,
    summary: snippet,
    publishedAt,
    publicationDate: publishedAt,
    year,
    journal: citation.journal || citation.source || citation.publisher || undefined,
    doi: citation.doi || undefined,
    score: citation.score ?? undefined
  };
};

const serializeMessageForPersistence = (message) => {
  if (!message || typeof message !== 'object') {
    return { role: 'assistant', content: '' };
  }

  const base = {
    role: message.role,
    content: message.content ?? ''
  };

  if (message.wasInClinicalMode !== undefined) {
    base.wasInClinicalMode = message.wasInClinicalMode;
  }
  if (message.wasInReasonMode !== undefined) {
    base.wasInReasonMode = message.wasInReasonMode;
  }
  if (message.wasInWriteMode !== undefined) {
    base.wasInWriteMode = message.wasInWriteMode;
  }

  if (message.timestamp) {
    base.timestamp = message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp;
  }

  if (message.isStreamingComplete) {
    base.isStreamingComplete = true;
  }

  const normalizedCitations = Array.isArray(message.citations)
    ? message.citations.map(normalizeCitationForPersistence).filter(Boolean)
    : [];

  if (normalizedCitations.length) {
    base.citations = normalizedCitations;
  }

  const inline = Array.isArray(message.inlineCitations) && message.inlineCitations.length
    ? message.inlineCitations
    : buildInlineCitations(base.content, normalizedCitations);

  if (inline.length) {
    base.inlineCitations = inline;
  }

  return base;
};

const hydrateStoredMessage = (storedMessage, index = 0) => {
  if (!storedMessage || typeof storedMessage !== 'object') return null;

  const role = storedMessage.role || 'assistant';
  const content = storedMessage.content || '';

  const normalizedCitations = Array.isArray(storedMessage.citations)
    ? storedMessage.citations.map(normalizeCitationForPersistence).filter(Boolean)
    : [];

  const inlineFromStore = Array.isArray(storedMessage.inlineCitations)
    ? storedMessage.inlineCitations
        .map((inline) => {
          if (!inline) return null;
          const sourceNumber = Number.parseInt(inline.sourceNumber ?? inline.number ?? inline.citation, 10);
          const startIndex = typeof inline.startIndex === 'number' ? inline.startIndex : Number.parseInt(inline.startIndex, 10);
          const endIndex = typeof inline.endIndex === 'number' ? inline.endIndex : Number.parseInt(inline.endIndex, 10);
          if (Number.isNaN(sourceNumber) || Number.isNaN(startIndex) || Number.isNaN(endIndex)) {
            return null;
          }
          return {
            sourceNumber,
            startIndex,
            endIndex
          };
        })
        .filter(Boolean)
    : [];

  const inline = inlineFromStore.length ? inlineFromStore : buildInlineCitations(content, normalizedCitations);

  const isComplete = storedMessage.isStreamingComplete !== undefined
    ? !!storedMessage.isStreamingComplete
    : role === 'assistant';

  const hydrated = {
    id: storedMessage.id || Date.now() + index,
    role,
    content,
    citations: normalizedCitations,
    inlineCitations: inline,
    wasInClinicalMode: storedMessage.wasInClinicalMode,
    wasInReasonMode: storedMessage.wasInReasonMode,
    wasInWriteMode: storedMessage.wasInWriteMode,
    timestamp: storedMessage.timestamp ? new Date(storedMessage.timestamp) : new Date()
  };

  if (isComplete) {
    hydrated.isStreamingComplete = true;
  }

  return hydrated;
};

const useTheme = (settings) => {
  const getSystemPreference = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [systemDark, setSystemDark] = useState(getSystemPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => setSystemDark(event.matches);
    mediaQuery.addEventListener('change', handler);
    setSystemDark(mediaQuery.matches);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const themePreference = settings?.theme;
  const isDark = themePreference === 'dark'
    ? true
    : themePreference === 'light'
      ? false
      : systemDark;

  const accentKey = settings?.accentColor && ALLOWED_ACCENT_VALUES.has(settings.accentColor)
    ? settings.accentColor
    : DEFAULT_APP_SETTINGS.accentColor;
  const accentPalette = ACCENT_COLOR_MAP[accentKey] || ACCENT_COLOR_MAP[DEFAULT_APP_SETTINGS.accentColor];

  const baseColors = isDark ? colors.dark : colors.light;
  const themedColors = {
    ...baseColors,
    accentSoftBlue: isDark ? accentPalette.dark : accentPalette.light
  };

  return { colors: themedColors, isDark };
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
        left: isMobile ? 'auto' : 'auto',
        right: isMobile ? 8 : 16,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 12
      }}>
        {/* Chat Counter for Anonymous Users */}
        {!isLoggedIn && !authStateLoading && (
          <span style={{
            color: theme.textPrimary,
            fontSize: isMobile ? '11px' : '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {chatLimit.remaining} left
          </span>
        )}

        {/* Sign Up Button */}
        {!isLoggedIn && !authStateLoading && (
          <button
            onClick={() => handleLogin('signUp')}
            style={{
              padding: isMobile ? '5px 10px' : '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: theme.textPrimary,
              fontSize: isMobile ? '11px' : '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap'
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
            padding: isMobile ? 5 : 8,
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
          <Edit3 size={isMobile ? 16 : 18} color={theme.textPrimary} />
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
    <div style={{ display: 'flex', gap: isMobile ? 4 : 6, flexWrap: 'nowrap' }}>
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '48px 12px' : '64px 16px',
      height: '100%',
      gap: isMobile ? 32 : 40
    }}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{
          width: isMobile ? 48 : 56,
          height: isMobile ? 48 : 56,
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <svg width={isMobile ? 48 : 56} height={isMobile ? 48 : 56} viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" fill={`${theme.textSecondary}30`} />
          </svg>
        </div>
        <h2 style={{
          color: `${theme.textSecondary}90`,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: isMobile ? 32 : 42,
          lineHeight: 1.2,
          margin: 0,
          maxWidth: isMobile ? 280 : 360,
          fontWeight: 400,
          marginInline: 'auto',
          letterSpacing: '-0.02em',
          animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s backwards'
        }}>
          Uncertainty ends here.
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 10 : 12,
        width: '100%',
        maxWidth: 560,
        padding: isMobile ? '0 8px' : '0 16px'
      }}>
        {queries.map((q, i) => (
          <button
            key={i}
            onClick={() => onSampleTapped(q)}
            style={{
              width: '100%',
              padding: isMobile ? '14px 20px' : '16px 24px',
              borderRadius: isMobile ? 16 : 20,
              fontSize: isMobile ? 14 : 15,
              fontWeight: 450,
              textAlign: 'left',
              lineHeight: 1.5,
              backgroundColor: `${theme.backgroundSurface}F5`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${theme.textSecondary}15`,
              color: `${theme.textSecondary}85`,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.014em',
              WebkitFontSmoothing: 'antialiased',
              animation: `fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${0.2 + i * 0.08}s backwards`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.accentSoftBlue}08`;
              e.currentTarget.style.borderColor = `${theme.accentSoftBlue}25`;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.backgroundSurface}F5`;
              e.currentTarget.style.borderColor = `${theme.textSecondary}15`;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
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
const buildTooltipText = (citation) => {
  if (!citation) return '';

  const addUnique = (acc, value) => {
    if (!value) return acc;
    const normalized = String(value).trim();
    if (!normalized) return acc;
    if (acc.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) return acc;
    acc.push(normalized);
    return acc;
  };

  const segments = [];
  addUnique(segments, citation.title);
  addUnique(
    segments,
    citation.journal || citation.publisher || citation.source || citation.hostname
  );
  addUnique(segments, citation.year);

  if (citation.authors) {
    const normalizedAuthors = citation.authors.trim();
    if (normalizedAuthors && !segments.some((entry) => entry.toLowerCase() === normalizedAuthors.toLowerCase())) {
      segments.push(normalizedAuthors);
    }
  }

  return segments.join(' • ');
};

const MarkdownBlock = ({ markdown, theme, invert = false, onOpenCitation, isStreaming = false, citations = [] }) => {
   const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const t = e.target;
      if (t.tagName === 'SUP' && t.dataset.citation) {
        const number = parseInt(t.dataset.citation, 10);
        onOpenCitation?.(number);
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener('click', handler);
    return () => { if (el) el.removeEventListener('click', handler); };
  }, [onOpenCitation]);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const el = containerRef.current;
    if (!el || !Array.isArray(citations)) return () => {};

    const map = new Map(citations.map((c) => [String(c?.number ?? ''), c]));
    const supNodes = Array.from(el.querySelectorAll('sup.md-citation'));

    supNodes.forEach((sup) => {
      const num = sup.dataset.citation;
      if (!num) return;
      const citation = map.get(num);
      const tooltip = buildTooltipText(citation);
      if (tooltip) {
        sup.setAttribute('data-tooltip', tooltip);
      } else {
        sup.removeAttribute('data-tooltip');
      }
    });

    const updatePositions = () => {
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      supNodes.forEach((sup) => {
        const rect = sup.getBoundingClientRect();
        let position = 'center';
        if (rect.left < 80) position = 'left';
        else if (viewportWidth - rect.right < 80) position = 'right';

        if (position === 'center') sup.removeAttribute('data-tooltip-pos');
        else sup.setAttribute('data-tooltip-pos', position);
      });
    };

    updatePositions();
    const rafId = window.requestAnimationFrame(updatePositions);
    window.addEventListener('resize', updatePositions);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePositions);
    };
  }, [citations, markdown]);

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

const MessageBubble = ({ message, theme, invertMarkdown, onShowCitations, isMobile }) => {
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
    return (
      <div style={{
        width: '100%',
        marginBottom: isMobile ? 24 : 32,
        paddingLeft: isMobile ? 0 : 8,
        paddingRight: isMobile ? 0 : 8
      }}>
        <div style={{
          fontSize: isMobile ? 21 : 24,
          color: theme.textPrimary,
          fontFamily: 'Georgia, "Times New Roman", Charter, serif',
          fontWeight: 500,
          letterSpacing: '-0.015em',
          lineHeight: 1.4,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          wordWrap: 'break-word'
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  // assistant message
  const citationCount = Array.isArray(message.citations) ? message.citations.length : 0;

  return (
    <div style={{
      width: '100%',
      marginBottom: isMobile ? 32 : 40,
      position: 'relative',
      paddingLeft: isMobile ? 0 : 8,
      paddingRight: isMobile ? 0 : 8
    }}>
      <div style={{
        position: 'relative',
        animation: 'fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <MarkdownBlock
          markdown={message.content}
          theme={theme}
          invert={invertMarkdown}
          isStreaming={!message.isStreamingComplete}
          citations={message.citations}
          onOpenCitation={(num) => {
            const citation = message.citations?.find((c) => c.number === num);
            if (!citation || !citation.url) return;
            if (citation.url.startsWith('http://') || citation.url.startsWith('https://')) {
              window.open(citation.url, '_blank', 'noopener,noreferrer');
            }
          }}
        />
        {citationCount > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.textSecondary}10` }}>
            <button
              onClick={() => onShowCitations?.(message.citations)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${theme.accentSoftBlue}30`,
                backgroundColor: `${theme.accentSoftBlue}10`,
                color: theme.accentSoftBlue,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                letterSpacing: '-0.011em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.accentSoftBlue}18`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.accentSoftBlue}10`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ClipboardList size={16} />
              <span>{`${citationCount} ${citationCount === 1 ? 'Citation' : 'Citations'}`}</span>
            </button>
          </div>
        )}
        <button
          onClick={handleCopy}
          aria-label="Copy message"
          style={{
            position: 'absolute',
            top: -8,
            right: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            borderRadius: '50%',
            border: `1px solid ${theme.textSecondary}15`,
            backgroundColor: showCopied ? theme.accentSoftBlue : theme.backgroundSurface,
            color: showCopied ? '#fff' : theme.textSecondary,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 0.7
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {showCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};

/* Streaming shell that renders only after first token */
const StreamingResponse = ({ content, theme, invert = false, citations = [], isMobile }) => {
  const mermaidInfo = React.useMemo(() => processStreamingContentForMermaid(content), [content]);
  const isStillStreaming = !mermaidInfo.hasCompleteMermaid;
  const handleOpenCitation = React.useCallback((num) => {
    const citation = citations.find((c) => c.number === num);
    if (!citation?.url) return;
    if (citation.url.startsWith('http://') || citation.url.startsWith('https://')) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  }, [citations]);

  return (
    <div style={{
      marginBottom: isMobile ? 32 : 40,
      paddingLeft: isMobile ? 0 : 8,
      paddingRight: isMobile ? 0 : 8,
      animation: 'fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div>
        <MarkdownBlock
          markdown={content || ''}
          theme={theme}
          invert={invert}
          onOpenCitation={handleOpenCitation}
          citations={citations}
          isStreaming={isStillStreaming}
        />
      </div>
    </div>
  );
};

const LoadingIndicator = ({ theme, isMobile }) => (
  <div style={{
    paddingLeft: isMobile ? 0 : 8,
    paddingRight: isMobile ? 0 : 8,
    marginBottom: isMobile ? 24 : 32,
    animation: 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '12px 16px',
        backgroundColor: `${theme.accentSoftBlue}12`,
        borderRadius: 20,
        border: `1px solid ${theme.accentSoftBlue}20`
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: theme.accentSoftBlue,
              animation: `elasticPulse 1.4s ease-in-out infinite ${i * 0.15}s`
            }} />
          ))}
        </div>
        <span style={{
          fontSize: isMobile ? 15 : 16,
          fontWeight: 500,
          color: theme.accentSoftBlue,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          letterSpacing: '-0.015em'
        }}>
          Thinking
        </span>
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
  onShowAbout,
  theme,
  user,
  subscription,
  isAuthenticated,
  profile,
  onAuthPrompt,
  isMobile
}) => {
  if (!isOpen) return null;

  const currentPlanKey = subscription?.plan_key
    || profile?.subscription_plan
    || profile?.subscription?.plan_key
    || null;

  const planLabel = currentPlanKey
    ? `${currentPlanKey.replace(/(^|\s)(\w)/g, (match, p1, p2) => `${p1}${p2.toUpperCase()}`)} plan`
    : 'Free plan';
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
        <X size={12} />
      </button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'row' }}>
      <aside
        style={{
          width: isMobile ? '100vw' : 380,
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
                icon={Info}
                label="About Astra"
                theme={theme}
                onClick={() => {
                  onShowAbout?.();
                  onClose();
                }}
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

              <SidebarAction
                icon={Info}
                label="About Astra"
                theme={theme}
                onClick={() => {
                  onShowAbout?.();
                  onClose();
                }}
              />
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
  const isExtraSmall = useIsMobile(420);

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
    const minHeight = 24;
    const maxHeight = isMobile ? 100 : 120;
    textarea.style.height = `${minHeight}px`;
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${scrollHeight}px`;
    setTextareaHeight(scrollHeight);
  }, [isMobile]);

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
        paddingTop: 0,
        paddingRight: isMobile ? 16 : 24,
        paddingLeft: isMobile ? 16 : 24,
        paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : 20,
        backgroundColor: 'transparent',
        marginTop: isMobile ? -20 : -24,
        pointerEvents: 'auto'
      }}
    >
      <div style={{
        position: 'relative',
        backgroundColor: `${theme.backgroundSurface}F5`,
        borderRadius: isMobile ? 22 : 28,
        border: `1px solid ${theme.textSecondary}25`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        {/* Input Row */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 10,
          padding: isMobile ? '10px 10px 4px 10px' : '12px 12px 6px 12px'
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
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            style={{
              flex: 1,
              padding: '8px 10px',
              resize: 'none',
              border: 'none',
              outline: 'none',
              fontSize: isMobile ? 16 : 17,
              lineHeight: 1.4,
              backgroundColor: 'transparent',
              color: theme.textPrimary,
              height: `${textareaHeight}px`,
              minHeight: 24,
              maxHeight: isMobile ? 100 : 120,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
              boxSizing: 'border-box',
              fontWeight: 400,
              letterSpacing: '-0.011em'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, paddingBottom: 2 }}>
            {speechRecognition.isAvailable && (
              <button
                onClick={speechRecognition.toggleRecording}
                disabled={!speechRecognition.isAvailable || isStreaming || isLoading}
                aria-pressed={speechRecognition.isRecording}
                aria-label={speechRecognition.isRecording ? 'Stop recording' : 'Start recording'}
                style={{
                  padding: isMobile ? 8 : 10,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: speechRecognition.isRecording ? `${theme.errorColor}15` : 'transparent',
                  cursor: 'pointer',
                  color: speechRecognition.isRecording ? theme.errorColor : theme.textSecondary,
                  opacity: (!speechRecognition.isAvailable || isStreaming || isLoading) ? 0.4 : 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = speechRecognition.isRecording ? '1' : '0.7'; }}
              >
                {speechRecognition.isRecording ? <Square size={isMobile ? 18 : 20} fill="currentColor" /> : <Mic size={isMobile ? 18 : 20} />}
              </button>
            )}

            <button
              onClick={isStreaming ? onStop : onSend}
              disabled={!isStreaming && !query.trim()}
              aria-label={isStreaming ? 'Stop response' : 'Send'}
              style={{
                padding: isMobile ? 8 : 10,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: (isStreaming || query.trim()) ? theme.accentSoftBlue : `${theme.textSecondary}20`,
                cursor: 'pointer',
                color: '#fff',
                opacity: (!isStreaming && !query.trim()) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: (isStreaming || query.trim()) ? '0 2px 8px rgba(74, 107, 125, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (isStreaming || query.trim()) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 107, 125, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = (isStreaming || query.trim()) ? '0 2px 8px rgba(74, 107, 125, 0.3)' : 'none';
              }}
            >
              {isStreaming ? <Square size={isMobile ? 18 : 20} fill="currentColor" /> : <ArrowUp size={isMobile ? 18 : 20} />}
            </button>
          </div>
        </div>

        {/* Mode Switcher Row - Bottom */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 0,
          paddingBottom: isMobile ? 10 : 14,
          paddingLeft: isMobile ? 12 : 16,
          paddingRight: isMobile ? 12 : 16,
          gap: isMobile ? 6 : 12
        }}>
          <div style={{ flexShrink: 0 }}>
            <ModeSwitcher
              currentMode={currentMode}
              onModeChange={onModeChange}
              isDisabled={isStreaming || isLoading}
              theme={theme}
              isMobile={isMobile}
            />
          </div>
          <p style={{
            fontSize: isMobile ? 10 : 11,
            color: theme.textSecondary,
            margin: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            fontWeight: 400,
            opacity: 0.5,
            lineHeight: 1.2,
            whiteSpace: isExtraSmall ? 'normal' : 'nowrap',
            marginLeft: 'auto',
            textAlign: isExtraSmall ? 'center' : 'right',
            width: isExtraSmall ? '100%' : 'auto',
            marginTop: isExtraSmall ? 4 : 0,
            flexShrink: 0
          }}>
            Astra can make mistakes.
          </p>
        </div>
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
  const rawMessages = parseSessionMessages(session.messages);
  let messages = rawMessages
    .map((msg, idx) => hydrateStoredMessage(msg, idx))
    .filter(Boolean);

  if (messages.length === 0) {
    messages = rawMessages
      .map((msg, idx) => {
        if (!msg || typeof msg !== 'object') return null;
        const role = msg.role || 'user';
        const content = typeof msg.content === 'string' ? msg.content : '';
        return {
          id: msg.id || Date.now() + idx,
          role,
          content,
          citations: Array.isArray(msg.citations) ? msg.citations : [],
          inlineCitations: Array.isArray(msg.inlineCitations) ? msg.inlineCitations : [],
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          isStreamingComplete: role === 'assistant'
        };
      })
      .filter(Boolean);
  }

  if (messages.length === 0) {
    const fallbackContentRaw = typeof session.messages === 'string' ? session.messages.trim() : '';
    const fallbackContent = fallbackContentRaw && fallbackContentRaw !== '[object Object]'
      ? fallbackContentRaw
      : (typeof session.title === 'string' ? session.title : 'Saved conversation');

    messages = [{
      id: session.id || `session-${Date.now()}`,
      role: 'assistant',
      content: fallbackContent,
      citations: [],
      inlineCitations: [],
      timestamp: session.created_at ? new Date(session.created_at) : new Date(),
      isStreamingComplete: true
    }];
  }

  if (messages.length === 0) return null;
  const mode = session.mode || 'search';
  const sourceTitle = sanitizeTitleText(session.title) || createChatTitle(messages[0]?.content);
  const displayTitle = createChatTitle(sourceTitle);
  const createdAt = session.created_at ? new Date(session.created_at) : new Date();
  const updatedAt = session.updated_at ? new Date(session.updated_at) : createdAt;

  return {
    id: session.id || `session-${session.created_at || Date.now()}`,
    title: sourceTitle,
    displayTitle,
    messages,
    createdAt,
    updatedAt,
    timestamp: updatedAt,
    mode,
    wasInClinicalMode: mode === 'reason',
    wasInReasonMode: mode === 'reason',
    wasInWriteMode: mode === 'write'
  };
};

const GlobalChromeStyles = ({ theme }) => (
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
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes elasticPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.7;
  }
}

.markdown-body {
  color: ${theme.textPrimary};
  line-height: 1.75;
  font-size: 17px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  letter-spacing: -0.014em;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* prevent first/last child margins from leaking out of the bubble */
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child  { margin-bottom: 0; }

/* Headings with more space below */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: ${theme.textPrimary};
  margin: 1.5em 0 0.75em;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.022em;
}

.markdown-body h1 { font-size: 2em; font-weight: 700; }
.markdown-body h2 { font-size: 1.5em; font-weight: 650; }
.markdown-body h3 { font-size: 1.25em;  font-weight: 600; }

/* Paragraphs with more breathing room */
.markdown-body p {
  margin: 0.85em 0;
  line-height: 1.7;
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
  position: relative;
}
.markdown-body sup.md-citation:hover {
  background-color: ${theme.accentSoftBlue}20;
  transform: translateY(-1px);
}
.markdown-body sup.md-citation[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: 0;
  background-color: ${theme.backgroundSurface};
  color: ${theme.textPrimary};
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  white-space: normal;
  max-width: 240px;
  line-height: 1.4;
  opacity: 0;
  pointer-events: none;
  box-shadow: 0 12px 24px rgba(0,0,0,0.18);
  transition: opacity .15s ease, transform .15s ease;
  z-index: 5;
}
.markdown-body sup.md-citation[data-tooltip]::before {
  content: '';
  position: absolute;
  top: 0;
  border-width: 6px;
  border-style: solid;
  border-color: ${theme.backgroundSurface} transparent transparent transparent;
  opacity: 0;
  transition: opacity .15s ease;
  pointer-events: none;
  z-index: 5;
}
.markdown-body sup.md-citation[data-tooltip]:not([data-tooltip-pos="left"]):not([data-tooltip-pos="right"])::after {
  left: 50%;
  transform: translate(-50%, -105%);
}
.markdown-body sup.md-citation[data-tooltip]:not([data-tooltip-pos="left"]):not([data-tooltip-pos="right"])::before {
  left: 50%;
  transform: translate(-50%, -95%);
}
.markdown-body sup.md-citation[data-tooltip-pos="left"]::after {
  left: 0;
  transform: translate(0, -105%);
}
.markdown-body sup.md-citation[data-tooltip-pos="left"]::before {
  left: 6px;
  transform: translate(0, -95%);
}
.markdown-body sup.md-citation[data-tooltip-pos="right"]::after {
  right: 0;
  transform: translate(0, -105%);
}
.markdown-body sup.md-citation[data-tooltip-pos="right"]::before {
  right: 6px;
  transform: translate(0, -95%);
}
.markdown-body sup.md-citation[data-tooltip]:hover::after,
.markdown-body sup.md-citation[data-tooltip]:hover::before {
  opacity: 1;
}
.markdown-body sup.md-citation[data-tooltip]:not([data-tooltip-pos="left"]):not([data-tooltip-pos="right"]):hover::after {
  transform: translate(-50%, -120%);
}
.markdown-body sup.md-citation[data-tooltip-pos="left"]:hover::after {
  transform: translate(0, -120%);
}
.markdown-body sup.md-citation[data-tooltip-pos="right"]:hover::after {
  transform: translate(0, -120%);
}

/* Images */
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Code */
.markdown-body code {
  background-color: ${theme.textSecondary}12;
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 0.92em;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.markdown-body pre {
  background-color: ${theme.textSecondary}10;
  border: 1px solid ${theme.textSecondary}15;
  borderRadius: 12px;
  padding: 16px;
  margin: 1em 0;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
  font-size: 0.9em;
}

/* Lists themselves with more space */
.markdown-body ol,
.markdown-body ul {
  margin: 0.75em 0;
  padding-left: 1.75em;
  list-style-position: outside;
}

/* List items with more space */
.markdown-body li {
  margin: 0.4em 0;
  line-height: 1.7;
}

.markdown-body ul > li {
  list-style-type: disc;
}

.markdown-body ol > li {
  list-style-type: decimal;
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
);

/* =========================
   APP
   ========================= */
const AstraApp = () => {
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);
  const { colors: theme, isDark } = useTheme(appSettings);
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
  const [streamingCitations, setStreamingCitations] = useState([]);

  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const [citationSheetCitations, setCitationSheetCitations] = useState([]);
  const [showCitationSheet, setShowCitationSheet] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

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
  const [accountProfile, setAccountProfile] = useState(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [hasLoadedSubscription, setHasLoadedSubscription] = useState(false);
  const [settingsSyncState, setSettingsSyncState] = useState('idle');
  const [settingsSyncError, setSettingsSyncError] = useState('');

  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const settingsPersistRef = useRef({ timeoutId: null, pending: null });
  const settingsStatusResetRef = useRef(null);

  const sanitizeSettings = useCallback((rawSettings) => {
    const result = { ...DEFAULT_APP_SETTINGS };
    if (!rawSettings || typeof rawSettings !== 'object') {
      return result;
    }

    if (ALLOWED_THEME_VALUES.has(rawSettings.theme)) {
      result.theme = rawSettings.theme;
    }
    if (ALLOWED_ACCENT_VALUES.has(rawSettings.accentColor)) {
      result.accentColor = rawSettings.accentColor;
    }
    if (ALLOWED_LANGUAGE_VALUES.has(rawSettings.language)) {
      result.language = rawSettings.language;
    }
    if (ALLOWED_SPOKEN_LANGUAGE_VALUES.has(rawSettings.spokenLanguage)) {
      result.spokenLanguage = rawSettings.spokenLanguage;
    }

    return result;
  }, []);

  const areSettingsEqual = useCallback((left, right) => {
    if (left === right) return true;
    if (!left || !right) return false;
    return (
      left.theme === right.theme &&
      left.accentColor === right.accentColor &&
      left.language === right.language &&
      left.spokenLanguage === right.spokenLanguage
    );
  }, []);

  const scheduleSettingsPersist = useCallback((nextSettings) => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (settingsPersistRef.current.timeoutId) {
      clearTimeout(settingsPersistRef.current.timeoutId);
    }

    if (settingsStatusResetRef.current) {
      clearTimeout(settingsStatusResetRef.current);
      settingsStatusResetRef.current = null;
    }

    settingsPersistRef.current.pending = nextSettings;
    setSettingsSyncState('saving');
    setSettingsSyncError('');

    settingsPersistRef.current.timeoutId = setTimeout(async () => {
      settingsPersistRef.current.timeoutId = null;
      const payload = settingsPersistRef.current.pending;
      try {
        const response = await authService.updateUserProfile(user, {
          settings: payload
        });

        if (response?.user) {
          setAccountProfile(response.user);
        } else {
          setAccountProfile((prevProfile) => {
            if (!prevProfile) return prevProfile;
            const nextMetadata = {
              ...(typeof prevProfile.metadata === 'object' && prevProfile.metadata ? prevProfile.metadata : {}),
              settings: payload
            };
            return { ...prevProfile, metadata: nextMetadata };
          });
        }

        setSettingsSyncState('saved');
        settingsStatusResetRef.current = setTimeout(() => {
          setSettingsSyncState('idle');
          setSettingsSyncError('');
          settingsStatusResetRef.current = null;
        }, 2000);
      } catch (error) {
        console.error('Failed to persist settings:', error);
        setSettingsSyncState('error');
        setSettingsSyncError(error.message || 'Unable to save settings');
      }
    }, 450);
  }, [isAuthenticated, user]);

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

  useEffect(() => {
    if (!accountProfile || !accountProfile.metadata) {
      setAppSettings((prev) => (areSettingsEqual(prev, DEFAULT_APP_SETTINGS) ? prev : DEFAULT_APP_SETTINGS));
      setHasLoadedSubscription(false);
      return;
    }

    const storedSettings = sanitizeSettings(accountProfile.metadata.settings);
    setAppSettings((prev) => (areSettingsEqual(prev, storedSettings) ? prev : storedSettings));
  }, [accountProfile, sanitizeSettings, areSettingsEqual]);

  const refreshChatHistory = useCallback(async () => {
    if (authLoading) return;

    try {
      const supabaseUser = isAuthenticated && user ? user : null;
      const sessions = await authService.getChatSessions(supabaseUser, 20);
      if (!Array.isArray(sessions)) {
        return;
      }

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
      setHasLoadedSubscription(true);
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
  }, [authLoading, isAuthenticated, user, refreshChatHistory]);

  useEffect(() => {
    if (!showBilling) return;
    refreshSubscription(true);
  }, [showBilling, refreshSubscription]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (hasLoadedSubscription) return;

    let cancelled = false;

    (async () => {
      try {
        await refreshSubscription();
        if (!cancelled) setHasLoadedSubscription(true);
      } catch (error) {
        console.error('Failed to refresh subscription for account:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, hasLoadedSubscription, refreshSubscription]);

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

  // Instagram browser fix - allow scrolling since their bars cover content
  useEffect(() => {
    const isInstagram = /Instagram/i.test(navigator.userAgent);
    
    if (isInstagram && isMobile) {
      // Allow body to scroll on Instagram
      document.body.style.position = 'relative';
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
  }, [isMobile]);

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

  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoadedSubscription(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (settingsPersistRef.current.timeoutId) {
        clearTimeout(settingsPersistRef.current.timeoutId);
        settingsPersistRef.current.timeoutId = null;
      }
      if (settingsStatusResetRef.current) {
        clearTimeout(settingsStatusResetRef.current);
        settingsStatusResetRef.current = null;
      }
      setSettingsSyncState('idle');
      setSettingsSyncError('');
    }
  }, [isAuthenticated]);

  useEffect(() => () => {
    if (settingsPersistRef.current.timeoutId) {
      clearTimeout(settingsPersistRef.current.timeoutId);
      settingsPersistRef.current.timeoutId = null;
    }
    if (settingsStatusResetRef.current) {
      clearTimeout(settingsStatusResetRef.current);
      settingsStatusResetRef.current = null;
    }
  }, []);

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

  const handleOpenAbout = useCallback(() => {
    setShowAbout(true);
  }, []);

  const handleCloseAbout = useCallback(() => {
    setShowAbout(false);
  }, []);

  const handleSettingChange = useCallback((key, value) => {
    setAppSettings((prev) => {
      const merged = { ...prev, [key]: value };
      const sanitized = sanitizeSettings(merged);

      if (areSettingsEqual(prev, sanitized)) {
        return prev;
      }

      scheduleSettingsPersist(sanitized);

      setAccountProfile((prevProfile) => {
        if (!prevProfile) return prevProfile;
        const nextMetadata = {
          ...(typeof prevProfile.metadata === 'object' && prevProfile.metadata ? prevProfile.metadata : {}),
          settings: sanitized
        };
        return { ...prevProfile, metadata: nextMetadata };
      });

      return sanitized;
    });
  }, [sanitizeSettings, areSettingsEqual, scheduleSettingsPersist]);

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
    setStreamingCitations([]);
    if (speechRecognition.isRecording) speechRecognition.toggleRecording();
    speechRecognition.setRecognizedText('');
  };

  const processStreamLine = (line, citations, onContent, onCitationsUpdate) => {
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
            json.citations.forEach((rawCitation, index) => {
              const normalizedCitation = normalizeCitationObject(rawCitation, index);
              if (normalizedCitation) {
                citations.push(normalizedCitation);
                onCitationsUpdate?.([...citations]);
              }
            });
          } else {
            json.citations.forEach((urlString, i) => {
              const normalizedCitation = normalizeCitationUrl(urlString, i);
              if (normalizedCitation) {
                citations.push(normalizedCitation);
                onCitationsUpdate?.([...citations]);
              }
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
    setStreamingCitations([]);

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
              }, (updated) => setStreamingCitations(updated));
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
            const inlineCitations = buildInlineCitations(trimmedAssistantContent, collectedCitations);
            const assistantMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: trimmedAssistantContent,
              citations: collectedCitations,
              inlineCitations,
              timestamp: new Date(),
              isStreamingComplete: true
            };

            setMessages(prev => [...prev, assistantMessage]);

            const generatedTitle = createChatTitle(userMessage.content);
            const allMessagesForPersistence = [...messages, userMessage, assistantMessage];
            persistedMessages = allMessagesForPersistence.map(serializeMessageForPersistence);
            const historyMessages = allMessagesForPersistence.map((msg, idx) => ({
              ...msg,
              id: msg.id || Date.now() + idx,
              isStreamingComplete: msg.role === 'assistant' ? true : msg.isStreamingComplete
            }));

            const chatSession = {
              id: `local-${Date.now()}`,
              title: generatedTitle,
              displayTitle: generatedTitle,
              messages: historyMessages,
              createdAt: new Date(),
              updatedAt: new Date(),
              timestamp: new Date(),
              wasInClinicalMode: false
            };
            pendingChatSession = chatSession;
            setChatHistory(prev => [chatSession, ...prev]);
          }

            setIsStreaming(false);
            setStreamingContent('');
            setHasFirstToken(false);
            setStreamingCitations([]);

          // Handle usage tracking and session saving
          if (!isAuthenticated) {
            // For anonymous users, usage is already tracked in localStorage
            // No need for backend sync - localStorage is the single source of truth
            console.log('Anonymous usage tracked locally via localStorage');
          }

          // Save chat session
          if (persistedMessages && persistedMessages.length > 0) {
            const chatTitle = createChatTitle(userMessage.content);
            try {
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
            } catch (saveError) {
              console.error('Failed to persist chat session:', saveError);
            }
          }

        } catch (streamErr) {
          if (streamErr.name === 'AbortError') return;
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingCitations([]);
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '⚠️ Error occurred while streaming response. Please try again.', timestamp: new Date() }]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      setIsLoading(false);
      setIsStreaming(false);
      setHasFirstToken(false);
      setStreamingCitations([]);
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
        const inlineCitations = buildInlineCitations(streamingContent, streamingCitations);
        const assistantMessage = {
          id: Date.now(),
          role: 'assistant',
          content: streamingContent,
          citations: streamingCitations,
          inlineCitations,
          timestamp: new Date(),
          isStreamingComplete: true
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      setStreamingContent('');
      setHasFirstToken(false);
      setStreamingCitations([]);
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
    if (!session) return;
    const hydrated = Array.isArray(session.messages)
      ? session.messages
          .map((msg, idx) => hydrateStoredMessage(msg, idx))
          .filter(Boolean)
      : [];
    setMessages(hydrated);
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

  const sortedCitationSheet = Array.isArray(citationSheetCitations)
    ? [...citationSheetCitations].sort((a, b) => (a?.number ?? 0) - (b?.number ?? 0))
    : [];

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary, fontFamily: '-apple-system, BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif',
      overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      outline: 'none'
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
            paddingBottom: inputBarHeight - (isMobile ? 20 : 24), // extra space for text to run around input
            scrollPaddingBottom: inputBarHeight - (isMobile ? 20 : 24),
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            outline: 'none'
          }}
          onClick={() => { if (speechRecognition.isRecording) speechRecognition.toggleRecording(); }}
          tabIndex={-1}
        >
          <div style={{ maxWidth: isMobile ? '100%' : 855, margin: '0 auto', padding: isMobile ? '12px 0' : '16px 0', minHeight: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState currentMode={currentMode} onSampleTapped={handleSampleTapped} theme={theme} isMobile={isMobile} />
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                theme={theme}
                invertMarkdown={isDark}
                isMobile={isMobile}
                onShowCitations={(citations) => {
                  if (!Array.isArray(citations) || citations.length === 0) return;
                  setCitationSheetCitations(citations);
                  setShowCitationSheet(true);
                }}
              />
            ))}

            {isLoading && <LoadingIndicator theme={theme} isMobile={isMobile} />}
            {isStreaming && hasFirstToken && (
              <StreamingResponse
                isMobile={isMobile}
                content={streamingContent}
                theme={theme}
                invert={isDark}
                citations={streamingCitations}
              />
            )}
          </div>
        </div>

        
{/* Input - matching width container */}
<div style={{
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  padding: isMobile ? '0 12px' : '0 16px',
  boxSizing: 'border-box',
  width: '100%',
  zIndex: 10,
  pointerEvents: 'none'
}}>

  <div style={{ maxWidth: isMobile ? '100%' : 900, margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>
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
        syncState={settingsSyncState}
        syncError={settingsSyncError}
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
        onShowAbout={handleOpenAbout}
        theme={theme}
        user={user}
        subscription={subscriptionInfo}
        isAuthenticated={isAuthenticated}
        profile={accountProfile}
        onAuthPrompt={handleAuthPrompt}
        isMobile={isMobile}
      />

      {/* Citations */}
      {showCitationSheet && sortedCitationSheet.length > 0 && (
        <ReferencesView
          citations={sortedCitationSheet}
          isPresented={showCitationSheet}
          onDismiss={() => setShowCitationSheet(false)}
          theme={theme}
        />
      )}

      {showAbout && (
        <AboutView
          isPresented={showAbout}
          onDismiss={handleCloseAbout}
          theme={theme}
        />
      )}

      <GlobalChromeStyles theme={theme} />
    </div>
  );
};

export default AstraApp;
