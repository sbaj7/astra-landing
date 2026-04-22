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
  Info,
  BookOpen,
  Image,
  Plus,
  ShieldCheck,
  Maximize2,
  Minimize2
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
import ClinicalArticlesModal from './ClinicalArticlesModal.jsx';
import RemoteArticleView from './RemoteArticleView.jsx';
import { useImageInputManager, MAX_IMAGES } from './ImageInputManager.jsx';
import { ImagePreviewStrip } from './ImagePreviewStrip.jsx';
import { processPdfToImages } from '../utils/pdfUtils.js';
import ImageLightbox from './ImageLightbox.jsx';

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

/* =========================
   MODE DISPLAY INFO & WORKSPACE HELPERS
   ========================= */
const getModeDisplayInfo = (mode) => {
  const ddxModes = ['differential', 'next-steps', 'dispo', 'disposition', 'specialty-referral', 'orders'];
  const adminModes = ['prior-auth-appeal', 'medical-necessity', 'disability-fmla', 'dme', 'peer-to-peer'];

  const labels = {
    'search': 'Research',
    'reason': 'Clinical Reasoning',
    'differential': 'Differential Diagnosis',
    'next-steps': 'Next Steps',
    'dispo': 'Disposition',
    'disposition': 'Disposition',
    'specialty-referral': 'Specialty Consultation',
    'orders': 'Order Set',
    'write': 'Clinical Note',
    'prior-auth-appeal': 'Prior Authorization',
    'medical-necessity': 'Medical Necessity',
    'disability-fmla': 'Disability & FMLA',
    'dme': 'DME Documentation',
    'peer-to-peer': 'Peer-to-Peer Review',
  };

  const formatSpecialty = (m) => m.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (mode === 'search') {
    return { label: labels[mode], group: 'research', iconName: 'Search' };
  }
  if (mode === 'reason' || ddxModes.includes(mode)) {
    return { label: labels[mode] || 'Clinical Reasoning', group: 'reasoning', iconName: 'Stethoscope' };
  }
  return { label: labels[mode] || formatSpecialty(mode), group: 'documentation', iconName: 'FileText' };
};

// ICD-10 Code Extraction from clinical text
const extractICDCodes = (content) => {
  if (!content) return [];
  const seen = new Set();
  const codes = [];
  // Match ICD-10 codes with decimal (high confidence pattern)
  const pattern = /\b([A-Z]\d{2}\.\d{1,4})\b/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const code = match[1];
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
};

// Group flat messages array into workspace turns
const groupIntoWorkspaces = (messages) => {
  // Build pairs first, then merge consecutive same-mode pairs into one workspace
  const pairs = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const next = messages[i + 1];
      if (next && next.role === 'assistant') {
        pairs.push({
          userMessage: msg,
          assistantMessage: next,
          mode: next.mode || msg.mode || 'search'
        });
        i++;
      } else {
        pairs.push({
          userMessage: msg,
          assistantMessage: null,
          mode: msg.mode || 'search'
        });
      }
    } else if (msg.role === 'assistant' && (pairs.length === 0 || pairs[pairs.length - 1].assistantMessage)) {
      pairs.push({
        userMessage: null,
        assistantMessage: msg,
        mode: msg.mode || 'search'
      });
    }
  }

  // Merge consecutive same-mode pairs into multi-turn workspaces
  const workspaces = [];
  for (const pair of pairs) {
    const last = workspaces[workspaces.length - 1];
    if (last && last.mode === pair.mode) {
      // Append to existing workspace
      last.turns.push({ userMessage: pair.userMessage, assistantMessage: pair.assistantMessage });
      // Legacy single-pair compat: point to latest turn
      last.userMessage = pair.userMessage;
      last.assistantMessage = pair.assistantMessage;
    } else {
      workspaces.push({
        id: `ws-${pair.userMessage?.id || pair.assistantMessage?.id || workspaces.length}`,
        mode: pair.mode,
        turns: [{ userMessage: pair.userMessage, assistantMessage: pair.assistantMessage }],
        // Legacy single-pair compat: point to latest turn
        userMessage: pair.userMessage,
        assistantMessage: pair.assistantMessage,
      });
    }
  }
  return workspaces;
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

// Domain → Journal name mapping for favicon citation tooltips
const domainToJournal = {
  'nejm.org': 'NEJM',
  'clinician.nejm.org': 'NEJM',
  'thelancet.com': 'The Lancet',
  'jamanetwork.com': 'JAMA',
  'bmj.com': 'BMJ',
  'annals.org': 'Annals of Internal Medicine',
  'ahajournals.org': 'AHA Journals',
  'acc.org': 'ACC',
  'nature.com': 'Nature',
  'sciencedirect.com': 'ScienceDirect',
  'academic.oup.com': 'Oxford Academic',
  'onlinelibrary.wiley.com': 'Wiley',
  'journals.lww.com': 'Wolters Kluwer',
  'ncbi.nlm.nih.gov': 'PubMed',
  'pubmed.ncbi.nlm.nih.gov': 'PubMed',
  'cochranelibrary.com': 'Cochrane',
  'diabetesjournals.org': 'Diabetes Journals',
  'atsjournals.org': 'ATS Journals',
  'idsociety.org': 'IDSA',
  'cdc.gov': 'CDC',
  'who.int': 'WHO',
  'neurology.org': 'Neurology',
  'ascopubs.org': 'ASCO',
  'ashpublications.org': 'ASH',
  'gastrojournal.org': 'Gastroenterology',
  'gut.bmj.com': 'Gut',
  'kidney-international.org': 'Kidney International',
  'escardio.org': 'ESC',
  'esmo.org': 'ESMO',
  'uptodate.com': 'UpToDate',
};

const getJournalName = (hostname) => {
  if (!hostname) return '';
  const clean = hostname.replace('www.', '');
  if (domainToJournal[clean]) return domainToJournal[clean];
  // Check partial matches (e.g. "stroke.ahajournals.org" → "AHA Journals")
  for (const [domain, name] of Object.entries(domainToJournal)) {
    if (clean.endsWith(domain)) return name;
  }
  // Fallback: prettify hostname
  return clean.replace(/\.org$|\.com$|\.gov$|\.int$|\.edu$/, '').replace(/\./g, ' ');
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

// Sort grouped citations numerically and reorder by first appearance
const reorderCitationsByAppearance = (content = '', citationsArray = []) => {
  if (!content || !Array.isArray(citationsArray) || citationsArray.length === 0) {
    return { reorderedCitations: citationsArray, updatedContent: content };
  }

  // STEP 1: Find all citations in order of first appearance
  const appearanceOrder = [];
  const seen = new Set();
  const regex = /\[(\d+)]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const num = Number.parseInt(match[1], 10);
    if (!seen.has(num)) {
      appearanceOrder.push(num);
      seen.add(num);
    }
  }

  // STEP 2: Create mapping from old numbers to new sequential numbers [1, 2, 3...]
  const numberMap = {};
  appearanceOrder.forEach((oldNum, index) => {
    numberMap[oldNum] = index + 1;
  });

  // STEP 3: Renumber citations in content
  let renumberedContent = content.replace(/\[(\d+)\]/g, (match, numStr) => {
    const oldNum = Number.parseInt(numStr, 10);
    const newNum = numberMap[oldNum];
    return newNum !== undefined ? `[${newNum}]` : match;
  });

  // STEP 4: NOW sort grouped citations (after renumbering)
  const finalContent = renumberedContent.replace(/(\[\d+\](?:\s*,\s*\[\d+\])+)/g, (group) => {
    // Extract all citation numbers from the group
    const numbers = [];
    const citationRegex = /\[(\d+)\]/g;
    let groupMatch;

    while ((groupMatch = citationRegex.exec(group)) !== null) {
      numbers.push(Number.parseInt(groupMatch[1], 10));
    }

    // Sort numbers numerically
    numbers.sort((a, b) => a - b);

    // Rebuild the group with sorted numbers
    return numbers.map(n => `[${n}]`).join(', ');
  });

  // Reorder and renumber citations array
  const reorderedCitations = citationsArray
    .filter(c => seen.has(c.number))
    .map(citation => ({
      ...citation,
      number: numberMap[citation.number]
    }))
    .sort((a, b) => a.number - b.number);

  // Add unreferenced citations at the end
  const unreferencedCitations = citationsArray
    .filter(c => !seen.has(c.number))
    .map((c, index) => ({
      ...c,
      number: appearanceOrder.length + index + 1
    }));

  const allReorderedCitations = [...reorderedCitations, ...unreferencedCitations];

  return { reorderedCitations: allReorderedCitations, updatedContent: finalContent };
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

  // Strip image data for persistence but preserve flag that images were attached
  // HIPAA-friendly: no image data persisted, only metadata for placeholder display
  if (message.images && message.images.length > 0) {
    base.hadImages = true;
    base.imageCount = message.images.length;
    // Explicitly do NOT include base.images - no image data persisted
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

  // Restore image metadata for placeholder display
  if (storedMessage.hadImages) {
    hydrated.hadImages = true;
    hydrated.imageCount = storedMessage.imageCount || 1;
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

// Replace (domain.com) citation patterns with inline favicon buttons
const preprocessMarkdownCitations = (markdown) => {
  if (!markdown) return '';
  // Match patterns like (domain.tld), (sub.domain.tld), (domain.tld/path...)
  // But NOT markdown image/link syntax like [text](url) or (text with spaces)
  return markdown.replace(/\(([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(?:\/[^\s)]*)?)\)/gi, (match, domain) => {
    // Skip if it looks like part of markdown link syntax — check char before the (
    // The regex won't catch [text](url) because markdown parser handles those first,
    // but guard anyway: if domain has a protocol prefix, skip
    if (domain.startsWith('http://') || domain.startsWith('https://')) return match;
    // Extract just the hostname for favicon/journal lookup
    const hostMatch = domain.match(/^([a-z0-9.-]+\.[a-z]{2,})/i);
    if (!hostMatch) return match;
    const host = hostMatch[1].replace(/^www\./, '');
    const journal = getJournalName(host);
    const faviconSrc = buildFaviconUrl(host);
    const url = `https://${domain}`;
    // Return inline HTML — a small pill with favicon + journal name + hover detail
    const safeTitle = (journal || host).replace(/"/g, '&quot;');
    const safeDomain = domain.replace(/"/g, '&quot;');
    return `<span class="cite-wrap"><a class="cite-btn" href="${url}" target="_blank" rel="noopener noreferrer"><img class="cite-btn-favicon" src="${faviconSrc}" alt="" /><span class="cite-btn-label">${journal}</span></a><span class="cite-hover"><img class="cite-hover-favicon" src="${faviconSrc}" alt="" /><span class="cite-hover-body"><span class="cite-hover-journal">${safeTitle}</span><span class="cite-hover-url">${safeDomain}</span></span></span></span>`;
  });
};

// Convert [N] citation refs into hoverable pill HTML using the citations array
// Groups adjacent citations like [1], [2], [3] or [1][2][3] into a single pill
// NOTE: Only injects the pill button + data attribute — hover cards are rendered
// dynamically via JS in MarkdownBlock's useEffect to avoid rehype-sanitize mangling
const injectCitationPills = (markdown, citations = []) => {
  if (!markdown || !Array.isArray(citations) || citations.length === 0) return markdown;

  // Build a map: citation number → citation object
  const citMap = {};
  citations.forEach((c) => {
    if (c && c.number != null) citMap[String(c.number)] = c;
  });
  if (Object.keys(citMap).length === 0) return markdown;

  // Match groups of adjacent citations: [1], [2], [3] or [1][2][3] or [1], [2] [3]
  // Pattern: [N] not followed by ( (skip markdown links), then greedily consume adjacent [N]s
  return markdown.replace(/\[\d+\](?!\()(?:[,\s]*\[\d+\](?!\())*/g, (match) => {
    // Extract all numbers from the match
    const nums = [];
    const numRegex = /\[(\d+)\]/g;
    let m;
    while ((m = numRegex.exec(match)) !== null) {
      const n = m[1];
      if (citMap[n]) nums.push(n);
    }
    if (nums.length === 0) return match;

    const firstCit = citMap[nums[0]];
    const host = (firstCit.host || firstCit.hostname || (() => { try { return new URL(firstCit.url).hostname; } catch { return ''; } })()).replace(/^www\./, '');
    const journal = getJournalName(host) || host || 'Source';
    const faviconSrc = buildFaviconUrl(host);
    const url = firstCit.url || '';
    const extraCount = nums.length - 1;

    // Build pill label: "PubMed +2" or just "PubMed"
    const pillLabel = extraCount > 0
      ? `<span class="cite-btn-label">${journal}</span><span class="cite-btn-count">+${extraCount}</span>`
      : `<span class="cite-btn-label">${journal}</span>`;

    // data-cite-nums carries the citation numbers — hover card built by JS at runtime
    const dataNums = nums.join(',');

    return `<span class="cite-wrap" data-cite-nums="${dataNums}"><a class="cite-btn" href="${url}" target="_blank" rel="noopener noreferrer"><img class="cite-btn-favicon" src="${faviconSrc}" alt="" />${pillLabel}</a></span>`;
  });
};

const preprocessMarkdown = (markdown, isStreaming = false) => {
 if (!markdown) return '';

 // Strip markdown reference-link definitions like [1]: https://... so they don't render as links
 markdown = markdown.replace(/^\s*\[\d+\]:\s*https?:\/\/[^\s]+$/gm, '');

 // Strip inline citation links: [1](https://...) → [1] so injectCitationPills can handle them
 markdown = markdown.replace(/\[(\d+)\]\(https?:\/\/[^)]+\)/g, '[$1]');

 // Strip parentheses wrapping citation links: ([domain](url)) → [domain](url)
 markdown = markdown.replace(/\(\[([^\]]+)\]\(([^)]+)\)\)/g, '[$1]($2)');

 // Strip bare URLs on their own line (model sometimes outputs a references section)
 markdown = markdown.replace(/^\s*https?:\/\/[^\s]+\s*$/gm, '');

 // Strip "References" / "Sources" / "Bibliography" sections at end of response
 markdown = markdown.replace(/\n#{1,3}\s*(?:References|Sources|Bibliography|Works Cited|Citations)\s*\n[\s\S]*$/i, '');

 // Strip bare URLs in parentheses: (https://...) → empty
 markdown = markdown.replace(/\(https?:\/\/[^)]+\)/g, '');

 // Strip domain-text markdown links: [domain.com](url) → empty (citations already shown as [N] pills)
 markdown = markdown.replace(/\[([a-z0-9.-]+\.[a-z]{2,})\]\(https?:\/\/[^)]+\)/gi, '');

 // Strip markdown links where text is a full URL: [https://...](https://...) → empty
 markdown = markdown.replace(/\[https?:\/\/[^\]]+\]\(https?:\/\/[^)]+\)/g, '');

 // Strip any remaining markdown link whose href points to a known citation/medical domain
 // These are always citation artifacts — the [N] pills handle display
 markdown = markdown.replace(/\[([^\]]*)\]\(https?:\/\/(?:www\.)?(?:pubmed\.ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov|ahajournals\.org|heart\.org|nejm\.org|thelancet\.com|bmj\.com|jamanetwork\.com|nature\.com|sciencedirect\.com|springer\.com|wiley\.com|doi\.org|dynamed\.com|uptodate\.com|cochranelibrary\.com|mayoclinic\.org|cdc\.gov|who\.int|nih\.gov|medscape\.com|webmd\.com|wikipedia\.org)[^)]*\)/gi, '');

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
    'h1','h2','h3','table','thead','tbody','tr','th','td','sup','span','br','div','img'
  ],
  attributes: {
    a: ['href','title','target','rel','className'],
    img: ['src','alt','className'],
    //
    // THIS IS THE FIX: Add 'className' to the line below
    //
    code: ['className'],
    //
    //
    //
    sup: ['data-citation','className'],
    span: ['className','style','dataCiteNums'],
    th: ['align'],
    td: ['align'],
    table: ['className'],
    h1: ['id'], h2: ['id'], h3: ['id'],
    ol: ['start','reversed','type'],
    p: ['className']
  },
  clobberPrefix: 'md-',
  protocols: { href: ['http', 'https-dev', 'https', 'mailto', 'tel'], src: ['http', 'https'] }
};

// keep plugin arrays stable between renders for perf
const remarkPlugins = [remarkGfm, remarkMath, remarkCustomBreaks];
const rehypePlugins = [
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'append' }],
  rehypeHighlight,
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
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
  const [showDDxMenu, setShowDDxMenu] = useState(false);
  const [showAPMenu, setShowAPMenu] = useState(false);
  const ddxMenuRef = useRef(null);
  const apMenuRef = useRef(null);

  useEffect(() => {
    if (!showDDxMenu) return;

    const handleClickOutside = (e) => {
      if (ddxMenuRef.current && !ddxMenuRef.current.contains(e.target)) {
        setShowDDxMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDDxMenu]);

  useEffect(() => {
    if (!showAPMenu) return;

    const handleClickOutside = (e) => {
      if (apMenuRef.current && !apMenuRef.current.contains(e.target)) {
        setShowAPMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAPMenu]);

  const modes = [
    { key: 'search', title: 'Research', icon: Search },
    { key: 'reason', title: 'DDx', icon: Sparkles },
    { key: 'write', title: 'A&P', icon: FileText }
  ];

  // DDx-related modes
  const ddxModes = ['differential', 'next-steps', 'dispo', 'disposition', 'specialty-referral', 'orders'];
  const isDDxMode = ddxModes.includes(currentMode);

  // A&P-related modes - Administrative
  const administrativeModes = ['prior-auth-appeal', 'medical-necessity', 'disability-fmla', 'dme', 'peer-to-peer'];

  // A&P-related modes - Specialty
  const specialtyModes = [
    'psychiatry', 'procedure-note', 'dermatology', 'emergency-medicine', 'neurology', 'ophthalmology',
    'cardiology', 'nephrology', 'gastroenterology', 'endocrinology', 'hematology-oncology',
    'rheumatology', 'pulmonology', 'infectious-disease', 'allergy-immunology', 'hospital-medicine',
    'geriatrics', 'palliative-care', 'transplant', 'sleep-medicine', 'occupational-medicine',
    'sports-medicine', 'pain-medicine', 'wound-care', 'bariatric-surgery', 'general-surgery',
    'colorectal-surgery', 'endocrine-surgery', 'ent', 'orthopedic-trauma', 'plastic-surgery',
    'urology', 'vascular-surgery', 'anesthesiology', 'critical-care', 'family-medicine',
    'internal-medicine', 'urgent-care', 'maternal-fetal-medicine', 'pediatric-hospital-medicine',
    'reproductive-endocrinology'
  ];
  const isAPMode = [...administrativeModes, ...specialtyModes].includes(currentMode);

  // Determine display mode
  let displayMode = currentMode;
  if (isDDxMode) displayMode = 'reason';
  if (isAPMode) displayMode = 'write';

  // Helper to get display title for current mode
  const getButtonDisplayTitle = (key, defaultTitle) => {
    if (key === 'reason' && isDDxMode) {
      if (currentMode === 'differential') return 'Differential';
      if (currentMode === 'next-steps') return 'Next Steps';
      if (currentMode === 'dispo' || currentMode === 'disposition') return 'Dispo';
      if (currentMode === 'specialty-referral') return 'Consults';
      if (currentMode === 'orders') return 'Orders';
    }
    if (key === 'write' && isAPMode) {
      // For A&P modes, show a more specific title based on category
      if (administrativeModes.includes(currentMode)) {
        const titleMap = {
          'prior-auth-appeal': 'Prior Auth',
          'medical-necessity': 'Med Necessity',
          'disability-fmla': 'Disability',
          'dme': 'DME',
          'peer-to-peer': 'Peer Review'
        };
        return titleMap[currentMode] || 'Admin';
      }
      if (specialtyModes.includes(currentMode)) {
        // Format specialty name nicely
        const formatted = currentMode.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return formatted.length > 15 ? 'Specialty' : formatted;
      }
    }
    return defaultTitle;
  };

  return (
    <div style={{ display: 'flex', gap: isMobile ? 4 : 6, flexWrap: 'nowrap', position: 'relative' }}>
      {modes.map(({ key, title, icon: Icon }) => {
        const isSelected = displayMode === key;
        const isDDx = key === 'reason';
        const isAP = key === 'write';
        const hasDropdown = isDDx || isAP;

        return (
          <div
            key={key}
            style={{ position: 'relative', display: 'flex' }}
            ref={isDDx ? ddxMenuRef : isAP ? apMenuRef : null}
          >
            <button
              onClick={() => {
                if (isDDx && isDDxMode) {
                  onModeChange('reason');
                } else if (isAP && isAPMode) {
                  onModeChange('write');
                } else {
                  onModeChange(key);
                }
              }}
              disabled={isDisabled}
              aria-pressed={isSelected}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingTop: isMobile ? '5px' : '6px',
                paddingBottom: isMobile ? '5px' : '6px',
                paddingLeft: isMobile ? '10px' : '10px',
                paddingRight: hasDropdown ? (isMobile ? '4px' : '5px') : (isMobile ? '10px' : '10px'),
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
              <span>{getButtonDisplayTitle(key, title)}</span>
              {hasDropdown && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      if (isDDx) setShowDDxMenu(!showDDxMenu);
                      if (isAP) setShowAPMenu(!showAPMenu);
                    }
                  }}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-label={`Toggle ${isDDx ? 'DDx' : 'A&P'} menu`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDisabled) {
                        if (isDDx) setShowDDxMenu(!showDDxMenu);
                        if (isAP) setShowAPMenu(!showAPMenu);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    marginLeft: '2px',
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    borderRadius: '50%',
                    transition: 'background-color .2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.backgroundColor = isSelected ? 'rgba(255,255,255,0.15)' : `${theme.textSecondary}15`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                    style={{
                      transform: (isDDx && showDDxMenu) || (isAP && showAPMenu)
                        ? 'rotate(0deg)'
                        : 'rotate(180deg)',
                      transition: 'transform .2s ease'
                    }}
                  >
                    <path
                      d="M1 2.5L4 5.5L7 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </button>

            {/* DDx Dropdown */}
            {isDDx && showDDxMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 8,
                  backgroundColor: `${theme.backgroundSurface}F2`,
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: `1px solid ${theme.textSecondary}15`,
                  borderRadius: 14,
                  boxShadow: '0 -12px 40px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.06)',
                  padding: '5px',
                  minWidth: 210,
                  zIndex: 50,
                  animation: 'fadeInDown 0.18s cubic-bezier(0.2, 0, 0, 1)'
                }}
              >
                {[
                  { mode: 'reason', label: 'DDx', desc: 'Full differential diagnosis' },
                  { mode: 'differential', label: 'Differential', desc: 'Structured probability ranking' },
                  { mode: 'next-steps', label: 'Next Steps', desc: 'Workup & management plan' },
                  { mode: 'dispo', label: 'Dispo', desc: 'Disposition guidance', altMode: 'disposition' },
                  { mode: 'specialty-referral', label: 'Consults', desc: 'Specialty referral letters' },
                  { mode: 'orders', label: 'Orders', desc: 'Order sets & lab panels' },
                ].map(({ mode, label, desc, altMode }) => {
                  const isActive = currentMode === mode || (altMode && currentMode === altMode);
                  return (
                    <button
                      key={mode}
                      onClick={() => { onModeChange(mode); setShowDDxMenu(false); }}
                      disabled={isDisabled}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '8px 12px',
                        border: 'none',
                        background: isActive ? `${theme.accentSoftBlue}12` : 'transparent',
                        color: theme.textPrimary,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        borderRadius: 9,
                        textAlign: 'left',
                        transition: 'background-color .15s ease'
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = `${theme.textSecondary}08`; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span>{label}</span>
                        <span style={{ fontSize: 11, color: `${theme.textSecondary}80`, fontWeight: 400 }}>{desc}</span>
                      </div>
                      {isActive && <Check size={14} color={theme.accentSoftBlue} style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* A&P Dropdown with Categories */}
            {isAP && showAPMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: isMobile ? 'auto' : 0,
                  right: isMobile ? 0 : 'auto',
                  marginBottom: 8,
                  backgroundColor: `${theme.backgroundSurface}F2`,
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: `1px solid ${theme.textSecondary}15`,
                  borderRadius: 14,
                  boxShadow: '0 -12px 40px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.06)',
                  padding: '5px',
                  width: isMobile ? 260 : 320,
                  maxHeight: isMobile ? '50vh' : '420px',
                  overflowY: 'auto',
                  zIndex: 50,
                  animation: 'fadeInDown 0.18s cubic-bezier(0.2, 0, 0, 1)'
                }}
              >
                {/* Standard A&P */}
                <button
                  onClick={() => { onModeChange('write'); setShowAPMenu(false); }}
                  disabled={isDisabled}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 12px',
                    border: 'none',
                    background: currentMode === 'write' ? `${theme.accentSoftBlue}12` : 'transparent',
                    color: theme.textPrimary,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: 9,
                    textAlign: 'left',
                    transition: 'background-color .15s ease'
                  }}
                  onMouseEnter={(e) => { if (currentMode !== 'write') e.currentTarget.style.backgroundColor = `${theme.textSecondary}08`; }}
                  onMouseLeave={(e) => { if (currentMode !== 'write') e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span>A&P Note</span>
                  {currentMode === 'write' && <Check size={14} color={theme.accentSoftBlue} />}
                </button>

                {/* Administrative */}
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: `${theme.textSecondary}80`,
                  padding: '10px 12px 5px 12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderTop: `1px solid ${theme.textSecondary}0A`,
                  marginTop: 2,
                }}>
                  Administrative
                </div>

                {[
                  { mode: 'prior-auth-appeal', label: 'Prior Auth Appeal', desc: 'Insurance authorization' },
                  { mode: 'medical-necessity', label: 'Medical Necessity', desc: 'Justification letters' },
                  { mode: 'disability-fmla', label: 'Disability / FMLA', desc: 'Certification forms' },
                  { mode: 'dme', label: 'DME Letter', desc: 'Equipment authorization' },
                  { mode: 'peer-to-peer', label: 'Peer Review', desc: 'P2P preparation' }
                ].map(({ mode, label, desc }) => {
                  const isActive = currentMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => { onModeChange(mode); setShowAPMenu(false); }}
                      disabled={isDisabled}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '7px 12px',
                        border: 'none',
                        background: isActive ? `${theme.accentSoftBlue}12` : 'transparent',
                        color: theme.textPrimary,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        borderRadius: 9,
                        textAlign: 'left',
                        transition: 'background-color .15s ease'
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = `${theme.textSecondary}08`; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span>{label}</span>
                        <span style={{ fontSize: 11, color: `${theme.textSecondary}70`, fontWeight: 400 }}>{desc}</span>
                      </div>
                      {isActive && <Check size={14} color={theme.accentSoftBlue} style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}

                {/* Specialty - 2 column grid */}
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: `${theme.textSecondary}80`,
                  padding: '10px 12px 5px 12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderTop: `1px solid ${theme.textSecondary}0A`,
                  marginTop: 2,
                }}>
                  Specialty
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}>
                  {[
                    { mode: 'psychiatry', label: 'Psychiatry' },
                    { mode: 'cardiology', label: 'Cardiology' },
                    { mode: 'neurology', label: 'Neurology' },
                    { mode: 'nephrology', label: 'Nephrology' },
                    { mode: 'emergency-medicine', label: 'Emergency Med' },
                    { mode: 'gastroenterology', label: 'GI' },
                    { mode: 'pulmonology', label: 'Pulmonology' },
                    { mode: 'endocrinology', label: 'Endocrinology' },
                    { mode: 'dermatology', label: 'Dermatology' },
                    { mode: 'rheumatology', label: 'Rheumatology' },
                    { mode: 'hematology-oncology', label: 'Heme/Onc' },
                    { mode: 'infectious-disease', label: 'ID' },
                    { mode: 'ophthalmology', label: 'Ophthalmology' },
                    { mode: 'allergy-immunology', label: 'Allergy/Immuno' },
                    { mode: 'hospital-medicine', label: 'Hospitalist' },
                    { mode: 'internal-medicine', label: 'Internal Med' },
                    { mode: 'family-medicine', label: 'Family Med' },
                    { mode: 'geriatrics', label: 'Geriatrics' },
                    { mode: 'palliative-care', label: 'Palliative' },
                    { mode: 'urgent-care', label: 'Urgent Care' },
                    { mode: 'procedure-note', label: 'Procedure Note' },
                  ].map(({ mode, label }) => {
                    const isActive = currentMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => { onModeChange(mode); setShowAPMenu(false); }}
                        disabled={isDisabled}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          border: 'none',
                          background: isActive ? `${theme.accentSoftBlue}12` : 'transparent',
                          color: isActive ? theme.accentSoftBlue : theme.textPrimary,
                          fontSize: 12,
                          fontWeight: isActive ? 600 : 450,
                          cursor: 'pointer',
                          borderRadius: 7,
                          textAlign: 'left',
                          transition: 'background-color .15s ease',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = `${theme.textSecondary}08`; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {isActive && <Check size={11} style={{ flexShrink: 0 }} />}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


const EmptyState = ({ currentMode, onSampleTapped, onModeChange, theme, isMobile, inputBarSlot }) => {
  const getModeGroup = (mode) => {
    if (['reason', 'differential', 'next-steps', 'dispo', 'specialty-referral', 'orders'].includes(mode)) return 'reason';
    if (['write', 'prior-auth-appeal', 'medical-necessity', 'disability-fmla', 'dme', 'peer-to-peer'].includes(mode)) return 'write';
    return 'search';
  };

  const activeGroup = getModeGroup(currentMode);
  const queries = sampleQueries[activeGroup] || sampleQueries.search;

  const modeTabs = [
    { key: 'search', label: 'Research', Icon: Search },
    { key: 'reason', label: 'DDx', Icon: Stethoscope },
    { key: 'write', label: 'A&P', Icon: ClipboardList },
  ];

  const stats = [
    { value: '500+', label: 'Landmark trials' },
    { value: '<3s', label: 'Latency' },
    { value: '31M+', label: 'Articles' },
    { value: '55+', label: 'Modes' },
  ];

  const features = [
    { Icon: BookOpen, title: 'Built for clinicians', desc: 'Designed with practicing physicians for real clinical workflows' },
    { Icon: FileText, title: 'Always cited', desc: 'Every claim backed by verifiable trials and guidelines' },
    { Icon: Sparkles, title: 'Save hours daily', desc: 'Literature review, DDx, and notes in one place' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: isMobile ? '24px 12px' : '40px 16px',
      height: '100%',
      gap: isMobile ? 20 : 28,
      position: 'relative',
      width: '100%',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: isMobile ? -120 : -180,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isMobile ? 400 : 640,
        height: isMobile ? 400 : 640,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accentSoftBlue}0A 0%, ${theme.accentSoftBlue}05 35%, transparent 70%)`,
        pointerEvents: 'none',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute',
        top: isMobile ? 100 : 80,
        right: isMobile ? -80 : -40,
        width: isMobile ? 200 : 300,
        height: isMobile ? 200 : 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accentSoftBlue}06 0%, transparent 70%)`,
        pointerEvents: 'none',
        filter: 'blur(50px)',
      }} />

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{
          width: isMobile ? 44 : 52,
          height: isMobile ? 44 : 52,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: isMobile ? 13 : 15,
          background: `${theme.accentSoftBlue}0C`,
          border: `1px solid ${theme.accentSoftBlue}15`,
          boxShadow: `0 0 24px ${theme.accentSoftBlue}08`,
        }}>
          <svg width={isMobile ? 22 : 26} height={isMobile ? 22 : 26} viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" fill={theme.accentSoftBlue} fillOpacity="0.45" />
          </svg>
        </div>
        <h2 style={{
          color: theme.textPrimary,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: isMobile ? 34 : 46,
          lineHeight: 1.1,
          margin: 0,
          fontWeight: 400,
          letterSpacing: '-0.03em',
          maxWidth: isMobile ? 300 : 460,
          marginInline: 'auto',
        }}>
          Uncertainty ends here.
        </h2>
        <p style={{
          margin: '14px auto 0',
          fontSize: isMobile ? 13.5 : 15.5,
          lineHeight: 1.6,
          color: `${theme.textSecondary}85`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
          fontWeight: 400,
          maxWidth: isMobile ? 300 : 420,
          letterSpacing: '-0.01em',
        }}>
          31 million articles. 55+ clinical modes. Retrieval-augmented reasoning with structured citations—one workspace.
        </p>
      </div>

      {/* Trust Strip */}
      {(() => {
        const isDark = theme.backgroundPrimary === '#121417';
        const hospitals = [
          { name: 'Mayo Clinic', logo: '/logos/mayo-clinic.png' },
          { name: 'Cleveland Clinic', logo: '/logos/cleveland-clinic.png' },
          { name: 'Johns Hopkins', logo: '/logos/johns-hopkins.png' },
          { name: 'Mass General', logo: '/logos/mass-general.png' },
          { name: 'Stanford Health', logo: '/logos/stanford-health.png' },
          { name: 'UCLA Health', logo: '/logos/ucla-health.png' },
          { name: 'UCSF', logo: '/logos/ucsf.png' },
          { name: 'Northwestern', logo: '/logos/northwestern.png' },
          { name: 'Mount Sinai', logo: '/logos/mount-sinai.png' },
          { name: 'Cedars-Sinai', logo: '/logos/cedars-sinai.png' },
          { name: 'Duke Health', logo: '/logos/duke-health.png' },
          { name: 'NYU Langone', logo: '/logos/nyu-langone.png' },
          { name: 'Penn Medicine', logo: '/logos/penn-medicine.png' },
          { name: 'Brigham and Women\u2019s', logo: '/logos/brigham-womens.png' },
        ];
        const doubled = [...hospitals, ...hospitals];
        return (
          <div style={{
            width: '100%',
            maxWidth: 640,
            overflow: 'hidden',
            animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.04s backwards',
          }}>
            <p style={{
              textAlign: 'center',
              fontSize: isMobile ? 10 : 11,
              fontWeight: 600,
              color: `${theme.textSecondary}45`,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 12px 0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
            }}>
              Trusted by clinicians at
            </p>
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
            }}>
              <div style={{
                display: 'flex',
                gap: isMobile ? 24 : 36,
                animation: 'marquee 40s linear infinite',
                width: 'max-content',
                alignItems: 'center',
              }}>
                {doubled.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 6 : 8,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    <img
                      src={h.logo}
                      alt=""
                      loading="lazy"
                      width={isMobile ? 18 : 22}
                      height={isMobile ? 18 : 22}
                      style={{
                        borderRadius: isMobile ? 3 : 4,
                        objectFit: 'contain',
                        filter: isDark
                          ? 'grayscale(100%) invert(1) brightness(1.2) contrast(0.85)'
                          : 'grayscale(100%) contrast(0.9)',
                        opacity: isDark ? 0.45 : 0.5,
                      }}
                    />
                    <span style={{
                      fontSize: isMobile ? 11.5 : 13,
                      fontWeight: 500,
                      color: `${theme.textSecondary}40`,
                      letterSpacing: '-0.01em',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                    }}>
                      {h.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Inline Input Bar on start page */}
      {inputBarSlot && (
        <div style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 640,
          marginTop: isMobile ? 16 : 20,
          marginBottom: isMobile ? -4 : -8,
          animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.06s backwards',
        }}>
          {inputBarSlot}
        </div>
      )}

      {/* Mode Tabs */}
      <div style={{
        display: 'inline-flex',
        gap: 2,
        padding: 4,
        borderRadius: isMobile ? 14 : 16,
        background: `${theme.backgroundSurface}C0`,
        border: `1px solid ${theme.textSecondary}10`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.08s backwards',
      }}>
        {modeTabs.map(tab => {
          const isActive = activeGroup === tab.key;
          const TabIcon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => onModeChange?.(tab.key)}
              style={{
                padding: isMobile ? '8px 18px' : '10px 26px',
                borderRadius: isMobile ? 11 : 13,
                border: 'none',
                background: isActive ? `${theme.accentSoftBlue}14` : 'transparent',
                color: isActive ? theme.accentSoftBlue : `${theme.textSecondary}70`,
                cursor: 'pointer',
                fontSize: isMobile ? 13 : 14,
                fontWeight: isActive ? 600 : 450,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                letterSpacing: '-0.01em',
                WebkitFontSmoothing: 'antialiased',
              }}
            >
              <TabIcon size={isMobile ? 14 : 15} strokeWidth={isActive ? 2.2 : 1.8} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sample Queries */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 8 : 10,
        width: '100%',
        maxWidth: 640,
        animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.16s backwards',
      }}>
        {queries.map((q, i) => (
          <button
            key={`${activeGroup}-${i}`}
            onClick={() => onSampleTapped(q)}
            style={{
              padding: isMobile ? '14px 16px' : '16px 20px',
              borderRadius: isMobile ? 14 : 16,
              background: `${theme.backgroundSurface}F0`,
              border: `1px solid ${theme.textSecondary}0D`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: `${theme.textSecondary}90`,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: isMobile ? 13 : 13.5,
              lineHeight: 1.55,
              fontWeight: 420,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.014em',
              WebkitFontSmoothing: 'antialiased',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${theme.accentSoftBlue}08`;
              e.currentTarget.style.borderColor = `${theme.accentSoftBlue}20`;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${theme.backgroundSurface}F0`;
              e.currentTarget.style.borderColor = `${theme.textSecondary}0D`;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
            }}
          >
            <ArrowUp
              size={13}
              style={{
                transform: 'rotate(45deg)',
                opacity: 0.4,
                flexShrink: 0,
                marginTop: 3,
                color: theme.accentSoftBlue,
              }}
            />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: 540,
        borderRadius: isMobile ? 14 : 16,
        background: `${theme.backgroundSurface}80`,
        border: `1px solid ${theme.textSecondary}08`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.28s backwards',
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            flex: 1,
            padding: isMobile ? '14px 6px' : '16px 12px',
            textAlign: 'center',
            borderRight: i < stats.length - 1 ? `1px solid ${theme.textSecondary}08` : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}>
            <span style={{
              fontSize: isMobile ? 18 : 22,
              fontWeight: 700,
              color: theme.accentSoftBlue,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              {stat.value}
            </span>
            <span style={{
              fontSize: isMobile ? 9 : 10,
              color: `${theme.textSecondary}70`,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 10 : 12,
        width: '100%',
        maxWidth: 660,
        animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.36s backwards',
      }}>
        {features.map((feature, i) => {
          const FeatureIcon = feature.Icon;
          return (
            <div key={i} style={{
              flex: 1,
              padding: isMobile ? '16px' : '20px',
              borderRadius: isMobile ? 14 : 16,
              background: `${theme.backgroundSurface}E8`,
              border: `1px solid ${theme.textSecondary}08`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: `${theme.accentSoftBlue}0C`,
                border: `1px solid ${theme.accentSoftBlue}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FeatureIcon size={17} color={theme.accentSoftBlue} strokeWidth={1.8} />
              </div>
              <h4 style={{
                margin: 0,
                fontSize: isMobile ? 14 : 14.5,
                fontWeight: 600,
                color: theme.textPrimary,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                letterSpacing: '-0.01em',
              }}>
                {feature.title}
              </h4>
              <p style={{
                margin: 0,
                fontSize: isMobile ? 12 : 12.5,
                lineHeight: 1.5,
                color: `${theme.textSecondary}A0`,
                fontWeight: 400,
              }}>
                {feature.desc}
              </p>
            </div>
          );
        })}
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
   DIFFERENTIAL DIAGNOSIS RENDERER - Apple-inspired minimal design
   ========================= */
const DifferentialDiagnosisRenderer = ({ content, theme, isDark, isStreaming }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse differential diagnosis structure - loose parser since format is always the same
  const parseDifferentials = (text) => {
    console.log('🔍 Parsing differential diagnosis, content length:', text.length);

    const differentials = [];
    // Very loose regex - just look for numbered items with bolded condition names
    // Format: "1. **Condition** — *Likelihood*" or "1. **Condition** - *Likelihood*"
    const diffRegex = /(\d+)\.\s*\*\*([^*]+)\*\*\s*[—–\-]\s*\*([^*]+)\*/g;
    let match;

    while ((match = diffRegex.exec(text)) !== null) {
      const number = match[1];
      const condition = match[2].trim();
      const likelihood = match[3].replace(/^Likelihood\s+/i, '').trim();

      console.log(`📊 Found differential #${number}: "${condition}" (${likelihood})`);

      // Get the block for this differential (from current match to next number or section)
      const startIndex = match.index;
      const nextNum = parseInt(number) + 1;
      let endIndex = text.length;

      // Look for next differential or next ## section
      const searchAfter = text.substring(startIndex + match[0].length);
      const nextDiff = searchAfter.search(new RegExp(`^\\s*${nextNum}\\.\\s*\\*\\*`, 'm'));
      const nextSection = searchAfter.search(/^##\s+[A-Z]/m);

      if (nextDiff > -1) {
        endIndex = startIndex + match[0].length + nextDiff;
      } else if (nextSection > -1) {
        endIndex = startIndex + match[0].length + nextSection;
      }

      const diffBlock = text.substring(startIndex, endIndex);

      // Extract Supporting items - just look for lines starting with dash after "Supporting"
      const supporting = [];
      const supportingStart = diffBlock.search(/\*\*Supporting\*\*/i);
      if (supportingStart > -1) {
        const afterSupporting = diffBlock.substring(supportingStart);
        const againstStart = afterSupporting.search(/\*\*Against\*\*/i);
        const supportingText = againstStart > -1 ? afterSupporting.substring(0, againstStart) : afterSupporting;

        supportingText.split('\n').forEach(line => {
          const trimmed = line.trim();
          // Match any line starting with dash/bullet
          if (/^[–—\-•]/.test(trimmed)) {
            supporting.push(trimmed.replace(/^[–—\-•]\s*/, ''));
          }
        });
      }

      // Extract Against items
      const against = [];
      const againstStart = diffBlock.search(/\*\*Against\*\*/i);
      if (againstStart > -1) {
        const afterAgainst = diffBlock.substring(againstStart);

        afterAgainst.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (/^[–—\-•]/.test(trimmed)) {
            against.push(trimmed.replace(/^[–—\-•]\s*/, ''));
          }
        });
      }

      console.log(`   ✅ ${supporting.length} supporting, ⚠️ ${against.length} against`);
      differentials.push({ condition, likelihood, supporting, against });
    }

    console.log(`🎯 Total differentials parsed: ${differentials.length}`);
    return differentials;
  };

  const differentials = parseDifferentials(content);

  // Debug logging
  if (differentials.length === 0) {
    console.log('⚠️ No differentials parsed from content:', content.substring(0, 200));
  } else {
    console.log('✅ Parsed', differentials.length, 'differentials');
  }

  if (differentials.length === 0) return null;

  return (
    <div>
      {/* Minimal header with subtle divider */}
      <div style={{
        marginBottom: isMobile ? 18 : 24,
        paddingBottom: isMobile ? 12 : 16,
        borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`
      }}>
        <h2 style={{
          fontSize: isMobile ? 20 : 24,
          fontWeight: 600,
          margin: 0,
          color: theme.textPrimary,
          letterSpacing: '-0.02em',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
        }}>
          Differential Diagnosis
        </h2>
      </div>

      {/* Card layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        {differentials.map((diff, index) => (
          <div key={index} style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: isMobile ? 14 : 18,
            padding: isMobile ? 18 : 24,
            boxShadow: isDark
              ? '0 4px 16px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
          }}>
            {/* Header: condition name and percentage on same line */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: isMobile ? 16 : 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, flex: 1, minWidth: 0 }}>
                {/* Circular number badge */}
                <div style={{
                  width: isMobile ? 26 : 30,
                  height: isMobile ? 26 : 30,
                  borderRadius: '50%',
                  background: `${theme.accentSoftBlue}15`,
                  border: `1.5px solid ${theme.accentSoftBlue}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                    color: theme.accentSoftBlue,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                  }}>
                    {index + 1}
                  </span>
                </div>

                {/* Condition name */}
                <h3 style={{
                  fontSize: isMobile ? 17 : 20,
                  fontWeight: 600,
                  margin: 0,
                  color: theme.textPrimary,
                  letterSpacing: '-0.015em',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {diff.condition}
                </h3>
              </div>

              {/* Likelihood percentage - top right */}
              <div style={{
                background: `${theme.accentSoftBlue}12`,
                borderRadius: 100,
                padding: isMobile ? '4px 12px' : '5px 13px',
                flexShrink: 0
              }}>
                <span style={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 500,
                  color: theme.accentSoftBlue,
                  letterSpacing: '0.01em',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                  whiteSpace: 'nowrap'
                }}>
                  {diff.likelihood}
                </span>
              </div>
            </div>

            {/* Evidence grid — always stacked for clean readability */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: isMobile ? 14 : 16 }}>
              {/* Supporting Evidence */}
              <div>
                <h4 style={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: isMobile ? 10 : 12,
                  color: theme.successColor || '#12B76A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                }}>
                  Supporting
                </h4>

                <div>
                  {diff.supporting.length > 0 ? (
                    diff.supporting.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: isMobile ? 8 : 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: `${theme.successColor || '#12B76A'}40`,
                          flexShrink: 0,
                          marginTop: isMobile ? 8 : 9
                        }} />
                        <span style={{
                          fontSize: 16,
                          lineHeight: 1.65,
                          letterSpacing: '-0.011em',
                          color: theme.textPrimary,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                          fontWeight: 400,
                          WebkitFontSmoothing: 'antialiased'
                        }}>
                          {item}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span style={{
                      fontSize: isMobile ? 14 : 15,
                      color: theme.textSecondary,
                      fontStyle: 'italic',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                    }}>
                      {isStreaming ? 'Loading...' : 'None specified'}
                    </span>
                  )}
                </div>
              </div>

              {/* Against Evidence */}
              <div>
                <h4 style={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: isMobile ? 10 : 12,
                  color: theme.errorColor || '#D92D20',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                }}>
                  Against
                </h4>

                <div>
                  {diff.against.length > 0 ? (
                    diff.against.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: isMobile ? 8 : 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: `${theme.errorColor || '#D92D20'}40`,
                          flexShrink: 0,
                          marginTop: isMobile ? 8 : 9
                        }} />
                        <span style={{
                          fontSize: 16,
                          lineHeight: 1.65,
                          letterSpacing: '-0.011em',
                          color: theme.textPrimary,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                          fontWeight: 400,
                          WebkitFontSmoothing: 'antialiased'
                        }}>
                          {item}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span style={{
                      fontSize: isMobile ? 14 : 15,
                      color: theme.textSecondary,
                      fontStyle: 'italic',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                    }}>
                      {isStreaming ? 'Loading...' : 'None specified'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================
   MARKDOWN BLOCK (Tailwind Typography)
   ========================= */
const markdownComponents = {
  a: ({ node, children, ...props }) => {
    const href = props.href || '';
    const isExternal = /^https?:\/\//i.test(href);

    // Domain-text links (e.g. [pubmed.ncbi.nlm.nih.gov](url)) are citation artifacts —
    // hide them since injectCitationPills already renders proper [N] citation pills
    if (isExternal) {
      const childText = typeof children === 'string' ? children
        : Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : '';
      const isDomainText = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(childText.trim());
      if (isDomainText) {
        return null; // Suppress — citation pills handle this
      }
    }
    return <a {...props} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>{children}</a>;
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

/* =========================
   REASONING BLOCK (collapsible thinking)
   ========================= */
const ReasoningBlock = ({ reasoning, theme, isDark }) => {
  const [expanded, setExpanded] = useState(false);
  if (!reasoning) return null;

  const lines = reasoning.trim().split('\n');
  const preview = lines.slice(0, 2).join(' ').slice(0, 120);

  return (
    <div style={{
      marginBottom: 10,
      borderLeft: `2px solid ${theme.accentSoftBlue}30`,
      paddingLeft: 12,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          color: theme.textSecondary,
          fontSize: 12,
          fontWeight: 550,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
          <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Thought process</span>
        {!expanded && (
          <span style={{ fontWeight: 400, opacity: 0.6, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            — {preview}…
          </span>
        )}
      </button>
      {expanded && (
        <div style={{
          fontSize: 12.5,
          lineHeight: 1.5,
          color: theme.textSecondary,
          whiteSpace: 'pre-wrap',
          paddingTop: 4,
          paddingBottom: 4,
        }}>
          {reasoning}
        </div>
      )}
    </div>
  );
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
};

const MarkdownBlock = ({ markdown, theme, invert = false, isStreaming = false, citations = [] }) => {
   const containerRef = useRef(null);
   const windowWidth = useWindowWidth();

  // Build citation map from props for hover card creation
  const citMapRef = useRef({});
  useEffect(() => {
    const map = {};
    if (Array.isArray(citations)) {
      citations.forEach(c => { if (c && c.number != null) map[String(c.number)] = c; });
    }
    citMapRef.current = map;
  }, [citations]);

  // Dynamically create & position hover cards on mouseenter of .cite-wrap
  // Hover HTML is built at runtime (not embedded in markdown) to avoid rehype-sanitize issues
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let activeCard = null;
    let hideTimer = null;

    const buildHoverCard = (wrap) => {
      const nums = (wrap.dataset.citeNums || '').split(',').filter(Boolean);
      if (nums.length === 0) return null;

      const citMap = citMapRef.current;
      const cits = nums.map(n => citMap[n]).filter(Boolean);
      if (cits.length === 0) return null;

      const card = document.createElement('div');
      card.className = cits.length > 1 ? 'cite-hover cite-hover-multi cite-hover-visible' : 'cite-hover cite-hover-visible';
      card.style.position = 'fixed';
      card.style.zIndex = '9999';
      card.style.display = 'flex';

      cits.forEach((cit, i) => {
        const host = (cit.host || cit.hostname || (() => { try { return new URL(cit.url).hostname; } catch { return ''; } })()).replace(/^www\./, '');
        const journal = getJournalName(host) || host || 'Source';
        const faviconSrc = buildFaviconUrl(host);
        const url = cit.url || '';
        const title = cit.title || '';
        const authors = cit.authors || '';
        const snippet = cit.snippet || cit.summary || '';
        const year = cit.year || '';
        const doi = cit.doi || '';

        const row = document.createElement('a');
        row.className = cits.length > 1 ? 'cite-hover-row cite-hover-entry' : 'cite-hover-row';
        row.href = url;
        row.target = '_blank';
        row.rel = 'noopener noreferrer';

        const fav = document.createElement('img');
        fav.className = 'cite-hover-favicon';
        fav.src = faviconSrc;
        fav.alt = '';
        fav.onerror = () => { fav.style.display = 'none'; };
        row.appendChild(fav);

        const body = document.createElement('span');
        body.className = 'cite-hover-body';

        const jEl = document.createElement('span');
        jEl.className = 'cite-hover-journal';
        jEl.textContent = journal;
        body.appendChild(jEl);

        if (title) {
          const tEl = document.createElement('span');
          tEl.className = 'cite-hover-title';
          tEl.textContent = title;
          body.appendChild(tEl);
        }
        if (authors && authors !== host && authors !== 'Unknown') {
          const aEl = document.createElement('span');
          aEl.className = 'cite-hover-authors';
          aEl.textContent = authors;
          body.appendChild(aEl);
        }
        if (snippet) {
          const sEl = document.createElement('span');
          sEl.className = 'cite-hover-snippet';
          sEl.textContent = snippet;
          body.appendChild(sEl);
        }
        if (year || doi) {
          const mEl = document.createElement('span');
          mEl.className = 'cite-hover-meta';
          mEl.textContent = (year && doi) ? `${year} · DOI: ${doi}` : year || `DOI: ${doi}`;
          body.appendChild(mEl);
        }

        row.appendChild(body);
        card.appendChild(row);
      });

      return card;
    };

    const positionCard = (card, wrap) => {
      const rect = wrap.getBoundingClientRect();
      document.body.appendChild(card);

      const hoverRect = card.getBoundingClientRect();
      let top = rect.top - hoverRect.height - 8;
      let left = rect.left + rect.width / 2 - hoverRect.width / 2;

      if (top < 8) top = rect.bottom + 8;
      if (left < 8) left = 8;
      if (left + hoverRect.width > window.innerWidth - 8) left = window.innerWidth - hoverRect.width - 8;

      card.style.top = `${top}px`;
      card.style.left = `${left}px`;
    };

    const removeCard = () => {
      if (activeCard && activeCard.parentNode) {
        activeCard.parentNode.removeChild(activeCard);
      }
      activeCard = null;
    };

    const show = (wrap) => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      removeCard();
      const card = buildHoverCard(wrap);
      if (!card) return;
      activeCard = card;

      // Allow mouse to move to the card
      card.addEventListener('mouseenter', () => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      });
      card.addEventListener('mouseleave', () => {
        hideTimer = setTimeout(removeCard, 80);
      });

      positionCard(card, wrap);
    };

    const hide = () => {
      hideTimer = setTimeout(() => {
        if (activeCard && activeCard.matches(':hover')) return;
        removeCard();
      }, 80);
    };

    const onEnter = (e) => {
      const wrap = e.target.closest('.cite-wrap');
      if (wrap) show(wrap);
    };
    const onLeave = (e) => {
      const wrap = e.target.closest('.cite-wrap');
      if (wrap) hide();
    };

    container.addEventListener('mouseenter', onEnter, true);
    container.addEventListener('mouseleave', onLeave, true);

    return () => {
      container.removeEventListener('mouseenter', onEnter, true);
      container.removeEventListener('mouseleave', onLeave, true);
      if (hideTimer) clearTimeout(hideTimer);
      removeCard();
    };
  });

  const baseMarkdown = preprocessMarkdown(markdown, isStreaming);
  const processedMarkdown = injectCitationPills(baseMarkdown, citations);

  // Check if this markdown contains a differential diagnosis section
  const hasDifferentialDiagnosis = /##\s*Differential\s+Diagnosis/i.test(markdown);

  // Split content into sections if differential diagnosis is present
  let beforeDiff = markdown;
  let diffSection = '';
  let afterDiff = '';

  if (hasDifferentialDiagnosis) {
    // Find the start of the Differential Diagnosis section
    const diffStartMatch = markdown.match(/##\s*Differential\s+Diagnosis/i);
    if (diffStartMatch) {
      const diffStartIndex = diffStartMatch.index;

      // Everything before the differential section
      beforeDiff = markdown.substring(0, diffStartIndex);

      // Find the next ## heading (simpler approach)
      // Look for the next line that starts with "## " after the differential diagnosis header
      const afterDiffStart = markdown.substring(diffStartIndex + diffStartMatch[0].length);

      // Find all ## headings after the differential section
      const headingRegex = /\n##\s+[A-Z]/g;
      const matches = [];
      let match;

      while ((match = headingRegex.exec(afterDiffStart)) !== null) {
        // Get the full line to check if it's Supporting or Against
        const lineStart = match.index;
        const lineEnd = afterDiffStart.indexOf('\n', lineStart + 1);
        const headingLine = afterDiffStart.substring(lineStart, lineEnd > -1 ? lineEnd : afterDiffStart.length);

        // Skip if this heading contains "Supporting" or "Against" (those are part of differential)
        if (!/Supporting|Against/i.test(headingLine)) {
          matches.push(match.index);
          break; // Found the first real next section
        }
      }

      if (matches.length > 0) {
        // Found a next section
        const nextSectionIndex = diffStartIndex + diffStartMatch[0].length + matches[0];
        diffSection = markdown.substring(diffStartIndex, nextSectionIndex);
        afterDiff = markdown.substring(nextSectionIndex);
      } else {
        // No next section, differential goes to end
        diffSection = markdown.substring(diffStartIndex);
        afterDiff = '';
      }
    }
  }

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
      {hasDifferentialDiagnosis ? (
        <>
          {beforeDiff && (
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              rehypePlugins={rehypePlugins}
              components={componentsWithTheme}
            >
              {injectCitationPills(preprocessMarkdown(beforeDiff, isStreaming), citations) || ''}
            </ReactMarkdown>
          )}

          {/* Container for differential pills and content pill side-by-side */}
          <div style={{
            display: 'flex',
            flexDirection: windowWidth < 1024 ? 'column' : 'row',
            gap: 32,
            alignItems: 'flex-start',
            marginTop: 32,
            marginBottom: 32,
            maxWidth: '100%',
            width: '100%'
          }}>
            {/* Differential pills - always takes up exactly half width */}
            <div style={{
              flex: '1',
              minWidth: 0,
              width: '100%',
              maxWidth: windowWidth >= 1024 ? 'calc(50% - 16px)' : '100%'
            }}>
              <DifferentialDiagnosisRenderer
                content={diffSection}
                theme={theme}
                isDark={invert}
                isStreaming={isStreaming}
              />
            </div>

            {/* Content pill or empty spacer - always present to maintain layout */}
            {afterDiff ? (
              <div style={{
                flex: '1',
                minWidth: 0,
                width: '100%',
                maxWidth: windowWidth >= 1024 ? 'calc(50% - 16px)' : '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Title header matching differential style */}
                <div style={{
                  marginBottom: windowWidth < 768 ? 18 : 24,
                  paddingBottom: windowWidth < 768 ? 12 : 16,
                  borderBottom: `1px solid ${invert ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
                  marginTop: 0,
                  paddingTop: 0
                }}>
                  <h2 style={{
                    fontSize: windowWidth < 768 ? 20 : 24,
                    fontWeight: 600,
                    margin: 0,
                    padding: 0,
                    color: theme.textPrimary,
                    letterSpacing: '-0.02em',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
                  }}>
                    Clinical Reasoning
                  </h2>
                </div>

                {/* Content with same pill styling as differentials */}
                <div
                  className="clinical-reasoning-content markdown-body"
                  style={{
                    background: invert ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${invert ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: windowWidth < 768 ? 14 : 18,
                    padding: windowWidth < 768 ? 18 : 24,
                    boxShadow: invert
                      ? '0 4px 16px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)'
                      : '0 4px 20px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                  }}>
                  <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={componentsWithTheme}
                  >
                    {injectCitationPills(preprocessMarkdown(afterDiff, isStreaming), citations) || ''}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div style={{
                flex: '1',
                minWidth: 0,
                width: '100%',
                maxWidth: windowWidth >= 1024 ? 'calc(50% - 16px)' : '100%'
              }} />
            )}
          </div>
        </>
      ) : (
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={componentsWithTheme}
        >
          {processedMarkdown || ''}
        </ReactMarkdown>
      )}
    </div>
  );
};

/* =========================
   ICD CODE BADGES COMPONENT
   ========================= */
const ICDCodeBadges = ({ codes, theme }) => {
  if (!codes || codes.length === 0) return null;
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 16,
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: theme.textSecondary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        alignSelf: 'center',
        marginRight: 2,
      }}>ICD-10</span>
      {codes.map((code) => (
        <span key={code} style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
          letterSpacing: '0.01em',
          color: theme.accentSoftBlue,
          backgroundColor: `${theme.accentSoftBlue}0A`,
          border: `1px solid ${theme.accentSoftBlue}18`,
        }}>
          {code}
        </span>
      ))}
    </div>
  );
};

/* =========================
   WORKSPACE CARD - Subtle, muted response card matching toolbar aesthetic
   ========================= */
const WorkspaceCard = ({
  workspace,
  isStreamingThis,
  streamingContent,
  streamingCitations,
  isLoadingThis,
  theme,
  isDark,
  isMobile,
  onShowCitations,
  isSingleCard,
  inputBarHeight = 0,
  onFocus,
  isFocusedCard = false,
}) => {
  const [copiedTurnIdx, setCopiedTurnIdx] = useState(null);
  const mode = workspace.mode || 'search';
  const modeInfo = getModeDisplayInfo(mode);
  const turns = workspace.turns || [{ userMessage: workspace.userMessage, assistantMessage: workspace.assistantMessage }];

  const IconMap = { Search, Stethoscope, FileText };
  const ModeIcon = IconMap[modeInfo.iconName] || Sparkles;

  // Check if any turn has a DDx for maxWidth sizing
  const anyDDx = turns.some(t => {
    const c = t.assistantMessage?.content;
    return c && /##\s*Differential\s+Diagnosis/i.test(c);
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Inner scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        padding: isMobile ? '0 12px' : (isSingleCard ? '0 16px' : '0 8px'),
      }}>
        <div style={{
          maxWidth: isSingleCard ? (anyDDx ? 1400 : 855) : '100%',
          margin: isSingleCard ? '0 auto' : 0,
          width: '100%',
          paddingTop: isMobile ? 12 : 20,
        }}>

          {/* Mode header — sticky at top */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: isMobile ? 12 : 16,
          }}>
            <ModeIcon size={15} color={theme.accentSoftBlue} strokeWidth={1.8} />
            <span style={{
              fontSize: isMobile ? 11.5 : 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: theme.textSecondary,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              opacity: 0.7,
            }}>
              {modeInfo.label}
            </span>
            <div style={{ flex: 1 }} />
            {/* Focus/expand */}
            {onFocus && !isMobile && (
              <button onClick={onFocus} aria-label={isFocusedCard ? 'Exit focus' : 'Focus'}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 7,
                  border: 'none',
                  backgroundColor: isFocusedCard ? `${theme.accentSoftBlue}15` : 'transparent',
                  color: isFocusedCard ? theme.accentSoftBlue : theme.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isFocusedCard ? 0.85 : 0.45,
                  padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = isFocusedCard ? '0.85' : '0.45'; }}
              >
                {isFocusedCard ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>

          {/* === TURNS === */}
          {turns.map((turn, turnIdx) => {
            const isLastTurn = turnIdx === turns.length - 1;
            const turnContent = (isLastTurn && isStreamingThis) ? streamingContent : turn.assistantMessage?.content;
            const turnCitations = (isLastTurn && isStreamingThis) ? streamingCitations : (turn.assistantMessage?.citations || []);
            const turnCitationCount = Array.isArray(turnCitations) ? turnCitations.length : 0;
            const turnComplete = turn.assistantMessage?.isStreamingComplete !== false;
            const turnIcdCodes = modeInfo.group === 'documentation' && turnContent ? extractICDCodes(turnContent) : [];
            const turnIsLoading = isLastTurn && isLoadingThis && !turn.assistantMessage;
            const turnIsStreaming = isLastTurn && isStreamingThis;
            const showCopied = copiedTurnIdx === turnIdx;

            const handleCopy = async () => {
              if (!turnContent) return;
              try {
                await navigator.clipboard.writeText(turnContent);
                setCopiedTurnIdx(turnIdx);
                setTimeout(() => setCopiedTurnIdx(null), 1500);
              } catch {}
            };

            // handleOpenCitation removed — favicon citations handle their own click behavior

            return (
              <div key={turn.userMessage?.id || turn.assistantMessage?.id || turnIdx}
                style={{ marginBottom: isLastTurn ? 0 : (isMobile ? 20 : 28) }}>

                {/* === USER QUERY === */}
                {turn.userMessage && (
                  <div style={{ marginBottom: isMobile ? 12 : 16 }}>
                    {turn.userMessage.images && turn.userMessage.images.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        {turn.userMessage.images.map((img, idx) => (
                          <img key={img.id || idx} src={img.data} alt={`Attached ${idx + 1}`}
                            style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, objectFit: 'cover',
                              border: `1px solid ${theme.textSecondary}15` }} />
                        ))}
                      </div>
                    )}
                    {turn.userMessage.hadImages && !turn.userMessage.images && (
                      <div style={{ padding: '4px 8px', backgroundColor: `${theme.textSecondary}08`, borderRadius: 6,
                        fontSize: 11, color: theme.textSecondary, fontStyle: 'italic', marginBottom: 10, display: 'inline-block' }}>
                        [{turn.userMessage.imageCount || 1} image{turn.userMessage.imageCount !== 1 ? 's' : ''} attached]
                      </div>
                    )}
                    <div style={{
                      fontSize: isMobile ? 19 : 22,
                      color: theme.textPrimary,
                      fontFamily: 'Georgia, "Times New Roman", Charter, serif',
                      fontWeight: 500,
                      letterSpacing: '-0.018em',
                      lineHeight: 1.35,
                      WebkitFontSmoothing: 'antialiased',
                      wordWrap: 'break-word',
                    }}>
                      {turn.userMessage.content}
                    </div>
                  </div>
                )}

                {/* === RESPONSE CONTAINER === */}
                {(turnContent || turnIsLoading) && (
                  <div style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: isMobile ? 14 : 18,
                    padding: isMobile ? 16 : 24,
                    position: 'relative',
                    animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                    {/* Copy button — top right of response */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: turnContent ? -4 : 0 }}>
                      {turnContent && (
                        <button onClick={handleCopy} aria-label="Copy"
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: 7,
                            border: 'none',
                            backgroundColor: showCopied ? theme.accentSoftBlue : 'transparent',
                            color: showCopied ? '#fff' : theme.textSecondary,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            opacity: showCopied ? 1 : 0.45,
                            padding: 0,
                          }}
                          onMouseEnter={(e) => { if (!showCopied) e.currentTarget.style.opacity = '0.8'; }}
                          onMouseLeave={(e) => { if (!showCopied) e.currentTarget.style.opacity = '0.45'; }}
                        >
                          {showCopied ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Loading */}
                    {turnIsLoading && !turnContent && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[0, 1, 2].map((i) => (
                            <div key={i} style={{
                              width: 5, height: 5, borderRadius: '50%',
                              backgroundColor: theme.accentSoftBlue,
                              animation: `elasticPulse 1.4s ease-in-out infinite ${i * 0.15}s`,
                            }} />
                          ))}
                        </div>
                        <span style={{
                          fontSize: 14, fontWeight: 500, color: theme.accentSoftBlue,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                          letterSpacing: '-0.01em',
                        }}>Thinking</span>
                      </div>
                    )}

                    {/* Response content */}
                    {turnContent && (
                      <div>
                        <MarkdownBlock
                          markdown={turnContent}
                          theme={theme}
                          invert={isDark}
                          isStreaming={turnIsStreaming || !turnComplete}
                          citations={turnCitations}
                        />

                        {turnIcdCodes.length > 0 && turnComplete && (
                          <ICDCodeBadges codes={turnIcdCodes} theme={theme} />
                        )}

                        {/* Source pills row */}
                        {turnCitationCount > 0 && turnComplete && (
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            marginTop: 14,
                            paddingTop: 12,
                            borderTop: `1px solid ${theme.textSecondary}12`,
                          }}>
                            {turnCitations.slice(0, 8).map((cit, ci) => {
                              const host = cit.host || cit.hostname || (() => { try { return new URL(cit.url).hostname; } catch { return ''; } })();
                              const journal = getJournalName(host) || host?.replace('www.', '') || 'Source';
                              const favicon = cit.faviconUrl || cit.favicon || buildFaviconUrl(host);
                              return (
                                <a
                                  key={ci}
                                  href={cit.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={cit.title || cit.url}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '4px 10px 4px 6px',
                                    borderRadius: 20,
                                    background: isDark ? `${theme.accentSoftBlue}12` : `${theme.accentSoftBlue}0A`,
                                    border: `1px solid ${theme.accentSoftBlue}20`,
                                    textDecoration: 'none',
                                    color: theme.accentSoftBlue,
                                    fontSize: 12,
                                    fontWeight: 550,
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                                    letterSpacing: '-0.01em',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 180,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = isDark ? `${theme.accentSoftBlue}22` : `${theme.accentSoftBlue}16`;
                                    e.currentTarget.style.borderColor = `${theme.accentSoftBlue}40`;
                                    e.currentTarget.style.boxShadow = `0 2px 8px ${theme.accentSoftBlue}15`;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isDark ? `${theme.accentSoftBlue}12` : `${theme.accentSoftBlue}0A`;
                                    e.currentTarget.style.borderColor = `${theme.accentSoftBlue}20`;
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <img
                                    src={favicon}
                                    alt=""
                                    style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', flexShrink: 0 }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{journal}</span>
                                </a>
                              );
                            })}
                            {turnCitationCount > 8 && (
                              <span style={{
                                fontSize: 11, color: theme.textSecondary, fontWeight: 500,
                                alignSelf: 'center', opacity: 0.7,
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                              }}>+{turnCitationCount - 8} more</span>
                            )}
                          </div>
                        )}

                        {/* Source list */}
                        {turnCitationCount > 0 && turnComplete && (
                          <div style={{
                            marginTop: 16,
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: isDark ? `${theme.textSecondary}08` : `${theme.textSecondary}06`,
                            border: `1px solid ${theme.textSecondary}10`,
                          }}>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: theme.textSecondary,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: 8,
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                            }}>Sources</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {turnCitations.map((cit, ci) => {
                                const host = cit.host || cit.hostname || (() => { try { return new URL(cit.url).hostname; } catch { return ''; } })();
                                const favicon = cit.faviconUrl || cit.favicon || buildFaviconUrl(host);
                                const title = cit.title || host?.replace('www.', '') || 'Source';
                                return (
                                  <a
                                    key={ci}
                                    href={cit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      textDecoration: 'none',
                                      padding: '4px 0',
                                      color: theme.textPrimary,
                                      transition: 'opacity 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                                  >
                                    <span style={{
                                      fontSize: 10, fontWeight: 600, color: theme.textSecondary,
                                      minWidth: 16, textAlign: 'right', opacity: 0.5,
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                                    }}>{ci + 1}</span>
                                    <img
                                      src={favicon}
                                      alt=""
                                      style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', flexShrink: 0 }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span style={{
                                      fontSize: 13, fontWeight: 500, lineHeight: 1.3,
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                                    }}>{title}</span>
                                    <span style={{
                                      fontSize: 11, color: theme.textSecondary, opacity: 0.5,
                                      marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                                    }}>{host?.replace('www.', '')}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom spacing — clears the fixed input bar */}
          <div style={{ height: inputBarHeight + (isMobile ? 8 : 16) }} />
        </div>
      </div>
    </div>
  );
};

/* =========================
   WORKSPACE NAVIGATION
   ========================= */
const WorkspaceNav = ({ total, activeIndex, onNavigate, theme }) => {
  if (total <= 1) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: '6px 0 4px', flexShrink: 0,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <button key={i} onClick={() => onNavigate(i)}
          aria-label={`Workspace ${i + 1}`}
          style={{
            width: i === activeIndex ? 18 : 6, height: 6, borderRadius: 3,
            border: 'none', cursor: 'pointer', padding: 0,
            backgroundColor: i === activeIndex ? theme.accentSoftBlue : `${theme.textSecondary}25`,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
      ))}
      <span style={{
        fontSize: 10, color: theme.textSecondary, fontWeight: 500, marginLeft: 6,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        opacity: 0.5,
      }}>
        {activeIndex + 1}/{total}
      </span>
    </div>
  );
};

/* =========================
   WORKSPACE CONTAINER
   ========================= */
const WorkspaceContainer = ({
  messages, currentMode, isLoading, isStreaming, hasFirstToken,
  streamingContent, streamingCitations, theme, isDark, isMobile, onShowCitations, inputBarHeight = 0,
}) => {
  const scrollContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const prevCountRef = useRef(0);

  const workspaces = React.useMemo(() => groupIntoWorkspaces(messages), [messages]);
  const total = workspaces.length;
  const lastWs = workspaces[total - 1];
  // Check the very last turn of the last workspace for pending loading/streaming
  const lastTurn = lastWs?.turns?.[lastWs.turns.length - 1];
  const lastNeedsLoading = lastWs && lastTurn && !lastTurn.assistantMessage && isLoading;
  const lastNeedsStreaming = lastWs && lastTurn && !lastTurn.assistantMessage && isStreaming && hasFirstToken;
  const isFocused = focusedIndex !== null;

  const GAP = isMobile ? 0 : 16;

  // Auto-scroll to newest card
  useEffect(() => {
    if (total > prevCountRef.current && scrollContainerRef.current && total > 1) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      }, 60);
    }
    if (total > 0) setActiveIndex(total - 1);
    prevCountRef.current = total;
  }, [total]);

  // Track scroll for active dot
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || total <= 1 || isFocused) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const cards = el.querySelectorAll('.workspace-card');
        if (!cards.length) { ticking = false; return; }
        const center = el.scrollLeft + el.clientWidth / 2;
        let closest = 0;
        let closestDist = Infinity;
        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const dist = Math.abs(center - cardCenter);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setActiveIndex(closest);
        ticking = false;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [total, isFocused]);

  // Escape key exits focus mode
  useEffect(() => {
    if (!isFocused) return;
    const onKey = (e) => { if (e.key === 'Escape') setFocusedIndex(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFocused]);

  // Exit focus when new card arrives (user sent a new query)
  useEffect(() => {
    if (isFocused && total > prevCountRef.current) setFocusedIndex(null);
  }, [total, isFocused]);

  const navigateTo = (i) => {
    if (isFocused) { setFocusedIndex(i); return; }
    const el = scrollContainerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('.workspace-card');
    if (cards[i]) cards[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    setActiveIndex(i);
  };

  const handleFocus = (i) => {
    if (isFocused && focusedIndex === i) { setFocusedIndex(null); return; }
    setFocusedIndex(i);
    setActiveIndex(i);
  };

  if (!total) return null;

  // === SINGLE CARD — full-width, centered, no scroll ===
  if (total === 1) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <WorkspaceCard
          workspace={workspaces[0]} isSingleCard={true}
          isStreamingThis={!!lastNeedsStreaming}
          streamingContent={lastNeedsStreaming ? streamingContent : ''}
          streamingCitations={lastNeedsStreaming ? streamingCitations : []}
          isLoadingThis={!!lastNeedsLoading}
          theme={theme} isDark={isDark} isMobile={isMobile}
          onShowCitations={onShowCitations}
          inputBarHeight={inputBarHeight}
        />
      </div>
    );
  }

  // === FOCUSED MODE — one card fills the screen, rest faded ===
  if (isFocused && focusedIndex < total) {
    const ws = workspaces[focusedIndex];
    const isLast = focusedIndex === total - 1;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        {/* Dimmed backdrop — click to exit */}
        <div
          onClick={() => setFocusedIndex(null)}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)',
            transition: 'background-color 0.3s ease',
          }}
        />
        {/* Focused card */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
          position: 'relative', zIndex: 1,
          animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <WorkspaceCard
            workspace={ws} isSingleCard={true}
            isStreamingThis={isLast && !!lastNeedsStreaming}
            streamingContent={isLast && lastNeedsStreaming ? streamingContent : ''}
            streamingCitations={isLast && lastNeedsStreaming ? streamingCitations : []}
            isLoadingThis={isLast && !!lastNeedsLoading}
            theme={theme} isDark={isDark} isMobile={isMobile}
            onShowCitations={onShowCitations}
            inputBarHeight={inputBarHeight}
            onFocus={() => handleFocus(focusedIndex)}
            isFocusedCard={true}
          />
        </div>
        {/* Nav — still works in focus mode to switch focused card */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <WorkspaceNav total={total} activeIndex={focusedIndex} onNavigate={navigateTo} theme={theme} />
        </div>
      </div>
    );
  }

  // === MULTI-CARD — horizontal scroll, 2-up on desktop ===
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        ref={scrollContainerRef}
        className="workspace-scroll"
        style={{
          flex: 1, display: 'flex', gap: GAP,
          overflowX: 'auto', overflowY: 'hidden',
          scrollSnapType: 'x proximity',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          minHeight: 0,
          padding: isMobile ? '0' : '0 16px',
        }}
      >
        {workspaces.map((ws, i) => {
          const isLast = i === total - 1;
          const w = isMobile ? '100vw' : 'calc(50% - 8px)';
          return (
            <div key={ws.id} className="workspace-card"
              onDoubleClick={() => handleFocus(i)}
              style={{
                width: w, minWidth: w, maxWidth: isMobile ? '100vw' : 'min(calc(50% - 8px), 700px)',
                flexShrink: 0, scrollSnapAlign: isMobile ? 'center' : 'start',
                display: 'flex', flexDirection: 'column', height: '100%',
                cursor: 'default',
              }}>
              <WorkspaceCard
                workspace={ws} isSingleCard={false}
                isStreamingThis={isLast && !!lastNeedsStreaming}
                streamingContent={isLast && lastNeedsStreaming ? streamingContent : ''}
                streamingCitations={isLast && lastNeedsStreaming ? streamingCitations : []}
                isLoadingThis={isLast && !!lastNeedsLoading}
                theme={theme} isDark={isDark} isMobile={isMobile}
                onShowCitations={onShowCitations}
                inputBarHeight={inputBarHeight}
                onFocus={() => handleFocus(i)}
              />
            </div>
          );
        })}
      </div>
      <WorkspaceNav total={total} activeIndex={activeIndex} onNavigate={navigateTo} theme={theme} />
    </div>
  );
};

/* Legacy MessageBubble - kept for compatibility but redirects to workspace system */
const MessageBubble = ({ message, theme, invertMarkdown, onShowCitations, isMobile }) => null;

/* Streaming shell - integrated into WorkspaceCard */
const StreamingResponse = ({ content, theme, invert = false, citations = [], isMobile }) => null;

const LoadingIndicator = ({ theme, isMobile }) => null;

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
  onShowClinicalArticles,
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
                icon={BookOpen}
                label="Clinical Articles"
                theme={theme}
                onClick={() => {
                  onShowClinicalArticles?.();
                  onClose();
                }}
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
                icon={BookOpen}
                label="Clinical Articles"
                theme={theme}
                onClick={() => {
                  onShowClinicalArticles?.();
                  onClose();
                }}
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
  isMobile,
  // Image upload props
  selectedImages,
  onAddImages,
  onRemoveImage,
  onClearImages,
  // Drag state props
  isDragActive,
  onSetDragActive,
  imageError,
  onClearError,
  onSetError
}) => {
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(32);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(null); // { current: 1, total: 5 }
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

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = '';
      return;
    }

    // Separate PDFs from images
    const pdfFiles = [];
    const imageFiles = [];
    for (const file of files) {
      if (file.type === 'application/pdf') {
        pdfFiles.push(file);
      } else {
        imageFiles.push(file);
      }
    }

    // Process images first (if any)
    if (imageFiles.length > 0) {
      await onAddImages(imageFiles);
    }

    // Process PDFs (if any)
    for (const pdfFile of pdfFiles) {
      // Check available slots before processing
      const availableSlots = MAX_IMAGES - (selectedImages?.length || 0);
      if (availableSlots <= 0) {
        onClearError?.();
        setTimeout(() => {
          onSetDragActive?.(false);
          // Use onAddImages to trigger the error through validation
          onAddImages([pdfFile]);
        }, 0);
        break;
      }

      setIsPdfProcessing(true);
      setPdfProgress(null);

      try {
        const onProgress = (current, total) => setPdfProgress({ current, total });
        const convertedImages = await processPdfToImages(pdfFile, availableSlots, onProgress);

        if (convertedImages.length > 0) {
          await onAddImages(convertedImages);
        }
      } catch (error) {
        console.error('PDF processing error:', error);
        // Provide user-friendly error messages
        let errorMessage = 'Failed to process PDF';
        if (error.name === 'PasswordException' || error.message?.includes('password')) {
          errorMessage = 'PDF is password protected';
        } else if (error.message?.includes('Invalid PDF') || error.message?.includes('corrupt')) {
          errorMessage = 'Could not read PDF file';
        } else if (error.message) {
          errorMessage = `Failed to process PDF: ${error.message}`;
        }
        // Display error using the existing error mechanism
        onSetError?.(errorMessage);
      } finally {
        setIsPdfProcessing(false);
        setPdfProgress(null);
      }
    }

    // Reset input to allow selecting same file again
    event.target.value = '';
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSetDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow drop
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the container entirely
    // Check if relatedTarget is outside the container to prevent flickering
    if (!e.currentTarget.contains(e.relatedTarget)) {
      onSetDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSetDragActive(false);

    // Separate images and PDFs from dropped items
    const imageFiles = [];
    const pdfFiles = [];
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else if (file.type === 'application/pdf') {
        pdfFiles.push(file);
      }
    }

    // Process images first
    if (imageFiles.length > 0) {
      await onAddImages(imageFiles);
    }

    // Process PDFs
    for (const pdfFile of pdfFiles) {
      const availableSlots = MAX_IMAGES - (selectedImages?.length || 0);
      if (availableSlots <= 0) {
        onSetError?.(`Maximum ${MAX_IMAGES} images already attached`);
        break;
      }

      setIsPdfProcessing(true);
      setPdfProgress(null);

      try {
        const onProgress = (current, total) => setPdfProgress({ current, total });
        const convertedImages = await processPdfToImages(pdfFile, availableSlots, onProgress);

        if (convertedImages.length > 0) {
          await onAddImages(convertedImages);
        }
      } catch (error) {
        console.error('PDF processing error:', error);
        let errorMessage = 'Failed to process PDF';
        if (error.name === 'PasswordException' || error.message?.includes('password')) {
          errorMessage = 'PDF is password protected';
        } else if (error.message?.includes('Invalid PDF') || error.message?.includes('corrupt')) {
          errorMessage = 'Could not read PDF file';
        } else if (error.message) {
          errorMessage = `Failed to process PDF: ${error.message}`;
        }
        onSetError?.(errorMessage);
      } finally {
        setIsPdfProcessing(false);
        setPdfProgress(null);
      }
    }

    // If neither images nor PDFs, pass through for validation error
    if (imageFiles.length === 0 && pdfFiles.length === 0 && e.dataTransfer.files.length > 0) {
      onAddImages(e.dataTransfer.files);
    }
  };

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

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (imageError) {
      const timer = setTimeout(() => {
        onClearError?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [imageError, onClearError]);

  const getPlaceholder = () => (
    speechRecognition.isRecording ? 'Listening...' :
    currentMode === 'reason' ? 'Present your case' :
    currentMode === 'write' ? 'Outline your plan' : 'Ask anything'
  );

  const isDisabled = isStreaming || isLoading;

  return (
    <>
    <div
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        border: isDragActive
          ? `2px dashed ${theme.accentSoftBlue}`
          : `1px solid ${theme.textSecondary}25`,
        boxShadow: isDragActive
          ? `0 0 0 4px ${theme.accentSoftBlue}20, 0 8px 32px rgba(0,0,0,0.12)`
          : `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)`,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        {/* HIPAA Badge */}
        <div style={{
          position: 'absolute',
          top: isMobile ? -10 : -12,
          right: isMobile ? 14 : 18,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: isMobile ? '3px 8px' : '4px 10px',
          borderRadius: 20,
          background: `${theme.backgroundSurface}F8`,
          border: `1px solid ${theme.accentSoftBlue}25`,
          fontSize: isMobile ? 9 : 10,
          fontWeight: 600,
          color: theme.accentSoftBlue,
          letterSpacing: '0.04em',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 5,
          boxShadow: `0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px ${theme.accentSoftBlue}10`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
          pointerEvents: 'none',
        }}>
          <ShieldCheck size={isMobile ? 10 : 11} strokeWidth={2.2} />
          HIPAA
        </div>

        {/* Image Preview Strip - shows above input when images selected */}
        {selectedImages && selectedImages.length > 0 && (
          <ImagePreviewStrip
            images={selectedImages}
            onRemove={onRemoveImage}
            theme={theme}
            isMobile={isMobile}
            maxImages={MAX_IMAGES}
          />
        )}

        {/* Error Message Display */}
        {imageError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '8px 10px' : '10px 12px',
              backgroundColor: `${theme.errorColor}10`,
              borderBottom: `1px solid ${theme.errorColor}20`,
              color: theme.errorColor,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 500,
              lineHeight: 1.4
            }}
            role="alert"
          >
            <span style={{ flex: 1 }}>{imageError}</span>
            <button
              onClick={onClearError}
              aria-label="Dismiss error"
              style={{
                padding: 4,
                borderRadius: 4,
                border: 'none',
                backgroundColor: 'transparent',
                color: theme.errorColor,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* PDF Processing Indicator */}
        {isPdfProcessing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '8px 10px' : '10px 12px',
              backgroundColor: `${theme.accentSoftBlue}10`,
              borderBottom: `1px solid ${theme.accentSoftBlue}20`,
              color: theme.textSecondary,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 500,
              lineHeight: 1.4
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: theme.accentSoftBlue,
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
            <span>
              Processing PDF{pdfProgress ? `: page ${pdfProgress.current} of ${pdfProgress.total}` : '...'}
            </span>
          </div>
        )}

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
            {/* Image Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || isPdfProcessing || (selectedImages && selectedImages.length >= MAX_IMAGES)}
              aria-label="Attach images or PDF"
              style={{
                padding: isMobile ? 8 : 10,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: (isDisabled || isPdfProcessing || (selectedImages && selectedImages.length >= MAX_IMAGES)) ? 'not-allowed' : 'pointer',
                color: theme.textSecondary,
                opacity: (isDisabled || isPdfProcessing || (selectedImages && selectedImages.length >= MAX_IMAGES)) ? 0.4 : 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isPdfProcessing && !(selectedImages && selectedImages.length >= MAX_IMAGES)) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = `${theme.textSecondary}10`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = (isDisabled || isPdfProcessing || (selectedImages && selectedImages.length >= MAX_IMAGES)) ? '0.4' : '0.7';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={isMobile ? 18 : 20} />
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              multiple
              onChange={handleFileSelect}
              disabled={isPdfProcessing}
              style={{ display: 'none' }}
            />


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
              disabled={!isStreaming && !query.trim() && (!selectedImages || selectedImages.length === 0)}
              aria-label={isStreaming ? 'Stop response' : 'Send'}
              style={{
                padding: isMobile ? 8 : 10,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: (isStreaming || query.trim() || (selectedImages && selectedImages.length > 0)) ? theme.accentSoftBlue : `${theme.textSecondary}20`,
                cursor: 'pointer',
                color: '#fff',
                opacity: (!isStreaming && !query.trim() && (!selectedImages || selectedImages.length === 0)) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: (isStreaming || query.trim() || (selectedImages && selectedImages.length > 0)) ? '0 2px 8px rgba(74, 107, 125, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (isStreaming || query.trim() || (selectedImages && selectedImages.length > 0)) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 107, 125, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = (isStreaming || query.trim() || (selectedImages && selectedImages.length > 0)) ? '0 2px 8px rgba(74, 107, 125, 0.3)' : 'none';
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

    </>
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

const GlobalChromeStyles = ({ theme, isDark }) => (
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
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
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
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Workspace scroll */
.workspace-scroll::-webkit-scrollbar { display: none; }
.workspace-card::-webkit-scrollbar { width: 4px; }
.workspace-card::-webkit-scrollbar-thumb { background: ${theme.textSecondary}25; border-radius: 2px; }

.markdown-body {
  color: ${theme.textPrimary};
  line-height: 1.65;
  font-size: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  letter-spacing: -0.011em;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* prevent first/last child margins from leaking out of the bubble */
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child  { margin-bottom: 0; }

/* Headings — blue container */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: ${theme.textPrimary};
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
  line-height: 1.3;
  letter-spacing: -0.015em;
  margin: 1.25em 0 0.6em;
  padding: 0;
}

.markdown-body h1 { font-size: 1.45em; font-weight: 700; }
.markdown-body h2 { font-size: 1.22em; font-weight: 650; }
.markdown-body h3 { font-size: 1.08em; font-weight: 600; }

/* Paragraphs */
.markdown-body p {
  margin: 0.7em 0;
  line-height: 1.65;
}

/* Bold — subtle blue tint */
.markdown-body strong {
  font-weight: 650;
  color: ${isDark ? theme.accentSoftBlue : theme.textPrimary};
  letter-spacing: -0.005em;
}

/* Horizontal rule — blue divider */
.markdown-body hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${theme.accentSoftBlue}35, ${theme.accentSoftBlue}45, ${theme.accentSoftBlue}35, transparent);
  margin: 1.5rem 0;
}

/* Blockquotes — near-white with blue accent */
.markdown-body blockquote {
  position: relative;
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: none;
  background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'};
  border-radius: 12px;
  border-left: 3px solid ${theme.accentSoftBlue};
  font-size: 0.95em;
  color: ${theme.textPrimary};
  box-shadow: ${isDark ? 'none' : `0 1px 6px ${theme.accentSoftBlue}0A`};
}

.markdown-body blockquote p {
  margin: 0;
  line-height: 1.6;
  font-weight: 450;
}

.markdown-body blockquote p:not(:last-child) {
  margin-bottom: 0.6rem;
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

/* Favicon citation buttons */
.markdown-body .cite-wrap {
  position: relative;
  display: inline;
}
.markdown-body .cite-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 4px;
  margin: 0 2px;
  border-radius: 20px;
  background: ${isDark ? `${theme.accentSoftBlue}15` : `${theme.accentSoftBlue}0C`};
  border: 1px solid ${theme.accentSoftBlue}20;
  text-decoration: none;
  color: ${theme.accentSoftBlue};
  font-size: 12px;
  font-weight: 550;
  line-height: 1;
  vertical-align: middle;
  transition: all 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
}
.markdown-body .cite-btn:hover {
  background: ${isDark ? `${theme.accentSoftBlue}25` : `${theme.accentSoftBlue}18`};
  border-color: ${theme.accentSoftBlue}40;
  box-shadow: 0 2px 8px ${theme.accentSoftBlue}15;
}
.markdown-body .cite-btn-favicon {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  flex-shrink: 0;
}
.markdown-body .cite-btn-label {
  letter-spacing: -0.01em;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.markdown-body .cite-btn-count {
  font-size: 10px;
  font-weight: 700;
  background: ${theme.accentSoftBlue};
  color: #fff;
  border-radius: 8px;
  padding: 1px 5px;
  margin-left: 1px;
  line-height: 1.3;
  letter-spacing: 0;
}
/* Hover card — appended to document.body via JS, NOT inside markdown */
.cite-hover {
  position: fixed;
  z-index: 9999;
  background: ${isDark ? theme.backgroundSurface : '#fff'};
  border: 1px solid ${isDark ? `${theme.accentSoftBlue}30` : `${theme.accentSoftBlue}20`};
  border-radius: 12px;
  padding: 10px;
  min-width: 260px;
  max-width: 380px;
  box-shadow: 0 8px 30px rgba(0,0,0,${isDark ? '0.4' : '0.12'}), 0 2px 8px rgba(0,0,0,0.06);
  pointer-events: auto;
  flex-direction: column;
  gap: 0;
  white-space: normal;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif;
}
.cite-hover-multi {
  max-height: 340px;
  overflow-y: auto;
  gap: 0;
}
.cite-hover-multi::-webkit-scrollbar { width: 3px; }
.cite-hover-multi::-webkit-scrollbar-thumb { background: ${theme.textSecondary}30; border-radius: 2px; }
.cite-hover-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  text-decoration: none;
  color: ${theme.textPrimary};
  padding: 6px 4px;
  border-radius: 8px;
  transition: background 0.12s ease;
}
.cite-hover-entry {
  border-bottom: 1px solid ${theme.textSecondary}10;
}
.cite-hover-entry:last-child {
  border-bottom: none;
}
.cite-hover-row:hover {
  background: ${isDark ? `${theme.accentSoftBlue}10` : `${theme.accentSoftBlue}08`};
}
.cite-hover-favicon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid ${theme.accentSoftBlue}15;
  flex-shrink: 0;
  margin-top: 2px;
}
.cite-hover-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.cite-hover-journal {
  font-size: 11px;
  font-weight: 650;
  color: ${theme.accentSoftBlue};
  letter-spacing: -0.01em;
}
.cite-hover-title {
  font-size: 12.5px;
  font-weight: 550;
  color: ${theme.textPrimary};
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cite-hover-authors {
  font-size: 11px;
  font-weight: 450;
  color: ${theme.textSecondary};
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}
.cite-hover-snippet {
  font-size: 11px;
  font-weight: 400;
  color: ${isDark ? `${theme.textSecondary}CC` : theme.textSecondary};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 1px;
}
.cite-hover-meta {
  font-size: 10px;
  font-weight: 500;
  color: ${theme.accentSoftBlue};
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  letter-spacing: 0.02em;
  margin-top: 1px;
}

/* Images */
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Code — blue-tinted */
.markdown-body code {
  background-color: ${isDark ? `${theme.accentSoftBlue}15` : `${theme.accentSoftBlue}0E`};
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 0.92em;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.markdown-body pre {
  background-color: ${isDark ? `${theme.accentSoftBlue}10` : `${theme.accentSoftBlue}08`};
  border: 1px solid ${theme.accentSoftBlue}15;
  border-radius: 12px;
  padding: 16px;
  margin: 1em 0;
  overflow-x: auto;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
  font-size: 0.9em;
}

/* Lists */
.markdown-body ol,
.markdown-body ul {
  margin: 0.6em 0;
  padding-left: 1.6em;
  list-style-position: outside;
}

/* List items — enough spacing to scan clinical lists */
.markdown-body li {
  margin: 0.35em 0;
  padding-top: 0.05em;
  padding-bottom: 0.05em;
  line-height: 1.6;
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

/* ===== Tables: soft blue tint, clean medical feel ===== */
.markdown-body .table-wrapper,
.markdown-body table {
  max-width: 100%;
}
.markdown-body table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  margin: 0.75rem 0 1rem;
  border-radius: 12px;
  overflow: hidden;
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid ${theme.accentSoftBlue}18;
  background: ${isDark ? `${theme.accentSoftBlue}08` : `${theme.accentSoftBlue}05`};
}

.markdown-body thead th {
  background: ${isDark ? `${theme.accentSoftBlue}20` : `${theme.accentSoftBlue}14`};
  color: ${theme.textPrimary};
  font-weight: 600;
  font-size: 0.82em;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-align: left;
  white-space: nowrap;
}

.markdown-body th,
.markdown-body td {
  padding: 10px 14px;
  border-bottom: 1px solid ${theme.accentSoftBlue}14;
  vertical-align: top;
  font-size: 0.92em;
  line-height: 1.55;
}

.markdown-body tbody tr:nth-child(even) td {
  background: ${isDark ? `${theme.accentSoftBlue}0E` : `${theme.accentSoftBlue}0A`};
}

.markdown-body tbody tr:last-child td {
  border-bottom: none;
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

  // Image upload state management
  const {
    selectedImages,
    addImages,
    removeImage,
    clearAllImages,
    isDragActive,
    setIsDragActive,
    error: imageError,
    setError: setImageError,
    clearError: clearImageError
  } = useImageInputManager();

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
  const [showClinicalArticles, setShowClinicalArticles] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Auth-related state
  const [showPaywall, setShowPaywall] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
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
    return { remaining: 5, used: 0, resetAt: null };
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

      // Also update accountProfile with fresh user data including manual subscription fields
      if (result?.user) {
        console.log('🔄 Updating accountProfile with fresh user data:', result.user);
        setAccountProfile(result.user);
      }

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

  // Periodically refresh subscription to detect manual grants
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Refresh every 60 seconds to detect manual subscription changes
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing subscription status...');
      refreshSubscription(false); // false = no loading spinner
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, user, refreshSubscription]);

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

  // Initialize chat limits for anonymous users - fetch from backend
  useEffect(() => {
    if (isAuthenticated) {
      // For authenticated users, limits will be loaded by updateChatLimit
      // Don't reset here to avoid race conditions
      return;
    }

    // For anonymous users, fetch actual usage from backend
    const ANONYMOUS_LIMIT = 5;

    const fetchAnonymousLimit = async () => {
      try {
        console.log('📊 Fetching anonymous limit from backend...');
        const limit = await authService.checkAnonymousLimit();
        console.log('📊 Anonymous limit from backend:', limit);

        const used = limit.used ?? 0;
        const remaining = Math.max(0, ANONYMOUS_LIMIT - used);

        setChatLimit({
          remaining,
          used,
          resetAt: limit.reset_at
        });

        // Cache in localStorage for faster initial display next time
        authService.setCachedAnonymousLimitState({
          used,
          remaining,
          reset_at: limit.reset_at
        });

        console.log('📊 Anonymous limit set:', { used, remaining });
      } catch (error) {
        console.error('❌ Failed to fetch anonymous limit from backend:', error);

        // Fallback to localStorage cache
        const cached = authService.getCachedAnonymousLimitState();
        if (cached && cached.reset_at) {
          const resetTime = new Date(cached.reset_at);
          if (resetTime > new Date()) {
            setChatLimit({
              remaining: cached.remaining ?? Math.max(0, ANONYMOUS_LIMIT - (cached.used ?? 0)),
              used: cached.used ?? 0,
              resetAt: cached.reset_at
            });
            return;
          }
        }

        // No valid cache - initialize fresh limit
        const resetAt = authService.getDefaultAnonymousResetTimestamp();
        setChatLimit({ remaining: ANONYMOUS_LIMIT, used: 0, resetAt });
        authService.setCachedAnonymousLimitState({ used: 0, remaining: ANONYMOUS_LIMIT, reset_at: resetAt });
      }
    };

    fetchAnonymousLimit();
  }, [isAuthenticated]);

  // Update chat limit for authenticated users only (anonymous users fetch from backend)
  const updateChatLimit = useCallback(async () => {
    if (isAuthenticated) {
      console.log('📊 updateChatLimit called for authenticated user:', {
        userId: user?.id,
        accountProfileLoaded: !!accountProfile,
        subscriptionStatus: accountProfile?.subscription_status
      });

      // Check for manual subscription first (takes precedence)
      const hasManualSubscription = accountProfile?.manual_subscription_enabled;
      const manualPlan = accountProfile?.manual_subscription_plan;
      const manualExpiresAt = accountProfile?.manual_subscription_expires_at;

      // Check if manual subscription is valid (not expired)
      const isManualSubscriptionValid = hasManualSubscription &&
        (!manualExpiresAt || new Date(manualExpiresAt) > new Date());

      // Check for regular Stripe subscription
      const subscriptionStatus = accountProfile?.subscription_status;
      const subscriptionPlan = accountProfile?.subscription?.plan_key || accountProfile?.subscription_plan;

      // Check if user has an active paid subscription (manual grant OR Stripe subscription)
      const hasActiveSubscription =
        isManualSubscriptionValid ||
        ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') &&
        (subscriptionPlan === 'pro' || subscriptionPlan === 'plus'));

      if (hasActiveSubscription) {
        // Determine which plan the user has
        const activePlan = isManualSubscriptionValid ? manualPlan : subscriptionPlan;
        const isPro = activePlan === 'pro';

        if (isPro) {
          // Pro users get unlimited chats
          setChatLimit({ remaining: 999, used: 0, resetAt: null });
          console.log('🚀 Pro user - unlimited chats');
        } else {
          // Plus users get 30 chats/day - need to track usage
          try {
            const limit = await authService.checkUserLimit(user?.id);
            const maxChats = 30;
            const used = limit.used ?? 0;
            setChatLimit({
              remaining: Math.max(0, maxChats - used),
              used: used,
              resetAt: limit.reset_at
            });
            console.log('📊 Plus user - loaded usage:', { used, remaining: maxChats - used });
          } catch (error) {
            console.error('❌ Failed to load Plus user usage:', error);
            // Fallback to full limit
            setChatLimit({ remaining: 30, used: 0, resetAt: null });
          }
        }

        // Log manual subscription info for debugging
        if (isManualSubscriptionValid) {
          console.log('🎁 User has manual subscription:', manualPlan);
        }
      } else {
        // Free-tier authenticated users: 10 chats/day
        const FREE_TIER_LIMIT = 10;
        try {
          const limit = await authService.checkUserLimit(user?.id);
          console.log('📊 Raw backend response for free user:', limit);

          // Always calculate remaining on frontend to ensure consistency
          const used = limit.used ?? 0;
          const remaining = Math.max(0, FREE_TIER_LIMIT - used);

          setChatLimit({
            remaining,
            used,
            resetAt: limit.reset_at
          });
          console.log('📊 Free user limit calculated:', { used, remaining, maxChats: FREE_TIER_LIMIT });
        } catch (error) {
          console.error('❌ Failed to load user usage limit:', error);
          console.warn('⚠️ Unable to verify your usage limits. Using default limits. If this persists, please refresh the page.');

          // Retry once after a delay
          setTimeout(async () => {
            try {
              console.log('🔄 Retrying usage limit check...');
              const limit = await authService.checkUserLimit(user?.id);
              const used = limit.used ?? 0;
              const remaining = Math.max(0, FREE_TIER_LIMIT - used);
              setChatLimit({
                remaining,
                used,
                resetAt: limit.reset_at
              });
              console.log('✅ Retry successful - Free user limit:', { used, remaining });
            } catch (retryError) {
              console.error('❌ Retry failed:', retryError);
            }
          }, 2000);

          // Set fallback limits to allow usage while retrying
          setChatLimit({ remaining: FREE_TIER_LIMIT, used: 0, resetAt: null });
        }
      }
    }
    // For anonymous users, do nothing - localStorage is the single source of truth
  }, [isAuthenticated, accountProfile, user]);

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

  const handleOpenClinicalArticles = useCallback(() => {
    setShowClinicalArticles(true);
  }, []);

  const handleCloseClinicalArticles = useCallback(() => {
    setShowClinicalArticles(false);
  }, []);

  const handleSelectArticle = useCallback((article) => {
    setSelectedArticle(article);
    setShowClinicalArticles(false);
    setShowSidebar(false);
  }, []);

  const handleCloseArticle = useCallback(() => {
    setSelectedArticle(null);
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
      if ((currentMode === 'search') && citations.length === 0) {
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
    // Allow sending if there's text OR images (or both)
    if ((!query.trim() && (!selectedImages || selectedImages.length === 0)) || isLoading || isStreaming) return;

    // Check if user has active subscription (for authenticated users)
    const subscriptionStatus = accountProfile?.subscription_status;
    const subscriptionPlan = accountProfile?.subscription?.plan_key || accountProfile?.subscription_plan;

    // Check for manual subscription
    const hasManualSubscription = accountProfile?.manual_subscription_enabled;
    const manualExpiresAt = accountProfile?.manual_subscription_expires_at;
    const isManualSubscriptionValid = hasManualSubscription && (!manualExpiresAt || new Date(manualExpiresAt) > new Date());
    const manualPlan = accountProfile?.manual_subscription_plan;

    const hasActiveSubscription =
      isManualSubscriptionValid ||
      ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') &&
      (subscriptionPlan === 'pro' || subscriptionPlan === 'plus'));

    // Determine active plan
    const activePlan = isManualSubscriptionValid ? manualPlan : subscriptionPlan;
    const isPro = hasActiveSubscription && activePlan === 'pro';
    const isPlus = hasActiveSubscription && activePlan === 'plus';

    // Check limits based on user type
    if (!isAuthenticated) {
      // Anonymous users: 5 chats/day
      if (chatLimit.remaining <= 0) {
        setShowPaywall(true);
        return;
      }

      // Increment usage in backend for anonymous users
      try {
        await authService.incrementAnonymousUsage();
        console.log('✅ Incremented anonymous user usage in backend');
      } catch (error) {
        console.error('Failed to increment anonymous usage:', error);
      }

      // Update local state (optimistic update)
      setChatLimit(prev => {
        const resetAt = prev.resetAt || authService.getDefaultAnonymousResetTimestamp();
        const nextUsed = Math.min(5, (prev.used || 0) + 1);
        const nextRemaining = Math.max(0, 5 - nextUsed);
        const nextState = {
          remaining: nextRemaining,
          used: nextUsed,
          resetAt
        };
        authService.setCachedAnonymousLimitState({ used: nextUsed, remaining: nextRemaining, reset_at: resetAt });
        if (nextRemaining <= 0) {
          setShowPaywall(true);
        }
        return nextState;
      });
    } else if (isPro) {
      // Pro users: Unlimited - no limit check needed
      console.log('🚀 Pro user - unlimited chats');
    } else if (isPlus) {
      // Plus users: 30 chats/day
      if (chatLimit.remaining <= 0) {
        setShowPaywall(true);
        return;
      }

      // Increment usage in backend
      try {
        if (!user?.id) {
          console.error('❌ Cannot increment usage: authenticated user missing ID', user);
          throw new Error('User ID is required for authenticated users');
        }
        await authService.incrementUserUsage(user.id);
        console.log('✅ Incremented Plus user usage in backend');
      } catch (error) {
        console.error('Failed to increment Plus user usage:', error);
      }

      // Update local state (optimistic update)
      setChatLimit(prev => {
        const maxChats = 30;
        const nextUsed = Math.min(maxChats, (prev.used || 0) + 1);
        const nextRemaining = Math.max(0, maxChats - nextUsed);
        if (nextRemaining <= 0) {
          setShowPaywall(true);
        }
        return {
          remaining: nextRemaining,
          used: nextUsed,
          resetAt: prev.resetAt
        };
      });
    } else if (!hasActiveSubscription) {
      // Free-tier authenticated users: 10 chats/day
      if (chatLimit.remaining <= 0) {
        setShowPaywall(true);
        return;
      }

      // Increment usage in backend for authenticated free users
      try {
        if (!user?.id) {
          console.error('❌ Cannot increment usage: authenticated user missing ID', user);
          throw new Error('User ID is required for authenticated users');
        }
        await authService.incrementUserUsage(user.id);
        console.log('✅ Incremented free user usage in backend');
      } catch (error) {
        console.error('Failed to increment user usage:', error);
      }

      // Update local state (optimistic update)
      setChatLimit(prev => {
        const maxChats = 10;
        const nextUsed = Math.min(maxChats, (prev.used || 0) + 1);
        const nextRemaining = Math.max(0, maxChats - nextUsed);
        if (nextRemaining <= 0) {
          setShowPaywall(true);
        }
        return {
          remaining: nextRemaining,
          used: nextUsed,
          resetAt: prev.resetAt
        };
      });
    }

    // Capture images before clearing for both display and API request
    const imagesToSend = selectedImages ? [...selectedImages] : [];

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query.trim(),
      // Include images for display in chat (will be stripped on persistence)
      images: imagesToSend.length > 0 ? imagesToSend.map(img => ({
        id: img.id,
        data: img.data,
        type: img.type
      })) : undefined,
      wasInReasonMode: currentMode === 'reason',
      wasInWriteMode: currentMode === 'write',
      mode: currentMode,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const queryToSend = query.trim();
    setQuery('');
    clearAllImages(); // Clear images after sending
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
      // Build request body - include images when present
      const requestBody = {
        query: queryToSend,
        isClinical: false,
        isReason: currentMode === 'reason',
        isWrite: currentMode === 'write',
        mode: currentMode,
        stream: true
      };

      // Add images to request if present
      if (imagesToSend.length > 0) {
        requestBody.images = imagesToSend.map(img => ({
          data: img.data,
          type: img.type
        }));
      }

      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_API_KEY,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody),
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
            // Reorder citations by appearance for search and reason modes
            const shouldReorder = currentMode === 'search' || currentMode === 'reason';
            const { reorderedCitations, updatedContent } = shouldReorder
              ? reorderCitationsByAppearance(trimmedAssistantContent, collectedCitations)
              : { reorderedCitations: collectedCitations, updatedContent: trimmedAssistantContent };

            const inlineCitations = buildInlineCitations(updatedContent, reorderedCitations);
            const assistantMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: updatedContent,
              citations: reorderedCitations,
              inlineCitations,
              mode: currentMode,
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

          // Check for image quality issues in Vision API responses
          if (imagesToSend && imagesToSend.length > 0 && trimmedAssistantContent) {
            const qualityIndicators = [
              'blurry', 'unclear', 'low resolution', 'hard to see',
              'cannot make out', 'cannot clearly see', 'difficult to read',
              'image quality', 'too dark', 'too bright', 'out of focus',
              'partially visible', 'not visible', 'obscured'
            ];

            const responseLower = trimmedAssistantContent.toLowerCase();
            const hasQualityIssue = qualityIndicators.some(
              indicator => responseLower.includes(indicator)
            );

            if (hasQualityIssue) {
              setImageError('Tip: The image quality may affect analysis accuracy. Consider uploading a clearer image if needed.');
            }
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
        // Reorder citations by appearance for search and reason modes
        const shouldReorder = currentMode === 'search' || currentMode === 'reason';
        const { reorderedCitations, updatedContent } = shouldReorder
          ? reorderCitationsByAppearance(streamingContent, streamingCitations)
          : { reorderedCitations: streamingCitations, updatedContent: streamingContent };

        const inlineCitations = buildInlineCitations(updatedContent, reorderedCitations);
        const assistantMessage = {
          id: Date.now(),
          role: 'assistant',
          content: updatedContent,
          citations: reorderedCitations,
          inlineCitations,
          mode: currentMode,
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
    setTimeout(() => {
      handleSend();
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
        {/* Conversation / Workspace Area */}
        <div
          ref={scrollRef}
          style={{
            position: 'relative',
            zIndex: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            outline: 'none',
          }}
          onClick={() => { if (speechRecognition.isRecording) speechRecognition.toggleRecording(); }}
          tabIndex={-1}
        >
          {/* Empty State — input bar rendered inline */}
          {messages.length === 0 && !isLoading && !isStreaming && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: isMobile ? 12 : 16,
              paddingLeft: isMobile ? 12 : 16,
              WebkitOverflowScrolling: 'touch',
            }}>
              <div style={{ maxWidth: '100%', margin: '0 auto', padding: isMobile ? '12px 0' : '16px 0', minHeight: '100%', display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
                <EmptyState
                  currentMode={currentMode}
                  onSampleTapped={handleSampleTapped}
                  onModeChange={setCurrentMode}
                  theme={theme}
                  isMobile={isMobile}
                  inputBarSlot={
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
                      selectedImages={selectedImages}
                      onAddImages={addImages}
                      onRemoveImage={removeImage}
                      onClearImages={clearAllImages}
                      isDragActive={isDragActive}
                      onSetDragActive={setIsDragActive}
                      imageError={imageError}
                      onClearError={clearImageError}
                      onSetError={setImageError}
                    />
                  }
                />
              </div>
            </div>
          )}

          {/* Workspace System */}
          {messages.length > 0 && (
            <WorkspaceContainer
              messages={messages}
              currentMode={currentMode}
              isLoading={isLoading}
              isStreaming={isStreaming}
              hasFirstToken={hasFirstToken}
              streamingContent={streamingContent}
              streamingCitations={streamingCitations}
              theme={theme}
              isDark={isDark}
              isMobile={isMobile}
              inputBarHeight={inputBarHeight}
              onShowCitations={(citations) => {
                if (!Array.isArray(citations) || citations.length === 0) return;
                setCitationSheetCitations(citations);
                setShowCitationSheet(true);
              }}
            />
          )}
        </div>


{/* Fixed Input Bar — only during conversation */}
{(messages.length > 0 || isLoading || isStreaming) && (
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
      selectedImages={selectedImages}
      onAddImages={addImages}
      onRemoveImage={removeImage}
      onClearImages={clearAllImages}
      isDragActive={isDragActive}
      onSetDragActive={setIsDragActive}
      imageError={imageError}
      onClearError={clearImageError}
      onSetError={setImageError}
    />
  </div>
</div>
)}
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        theme={theme}
        chatLimit={chatLimit}
        isAuthenticated={isAuthenticated}
        onUpgrade={() => setShowBilling(true)}
      />

      <BillingModal
        isOpen={showBilling}
        onClose={handleCloseBilling}
        theme={theme}
        subscription={subscriptionInfo}
        accountProfile={accountProfile}
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
        chatLimit={chatLimit}
        isPaidUser={(() => {
          // Check manual subscription
          const hasManualSubscription = accountProfile?.manual_subscription_enabled;
          const manualExpiresAt = accountProfile?.manual_subscription_expires_at;
          const isManualSubscriptionValid = hasManualSubscription && (!manualExpiresAt || new Date(manualExpiresAt) > new Date());

          // Check Stripe subscription
          const subscriptionStatus = accountProfile?.subscription_status;
          const subscriptionPlan = accountProfile?.subscription?.plan_key || accountProfile?.subscription_plan;

          return isManualSubscriptionValid ||
                 ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') &&
                  (subscriptionPlan === 'pro' || subscriptionPlan === 'plus'));
        })()}
        onUpgrade={() => setShowBilling(true)}
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
        onShowClinicalArticles={handleOpenClinicalArticles}
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

      {/* Clinical Articles Modal */}
      {showClinicalArticles && (
        <ClinicalArticlesModal
          isPresented={showClinicalArticles}
          onDismiss={handleCloseClinicalArticles}
          onSelectArticle={handleSelectArticle}
          theme={theme}
        />
      )}

      {/* Selected Article View */}
      {selectedArticle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: theme.backgroundPrimary,
            overflowY: 'auto'
          }}
        >
          <RemoteArticleView
            slug={selectedArticle.slug}
            theme={theme}
            onBack={handleCloseArticle}
          />
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
        theme={theme}
      />

      <GlobalChromeStyles theme={theme} isDark={isDark} />
    </div>
  );
};

export default AstraApp;
