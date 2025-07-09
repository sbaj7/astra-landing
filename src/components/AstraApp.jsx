import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Send, Square, Copy, Check, Edit3, Sparkles, FileText, Search, Stethoscope, X, ExternalLink, Menu } from 'lucide-react';

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

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 100); // Delay for orientation change
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return { isMobile, isLandscape };
};

// Viewport height hook for mobile browsers
const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return viewportHeight;
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

// Proper markdown renderer with correct list handling and consistent rendering
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
      // Only add line break if we're not at the start and previous wasn't a break
      if (result.length > 0 && result[result.length - 1] !== '<br>') {
        result.push('<br>');
      }
      i++;
      continue;
    }
    
    // Headers
    if (line.match(/^#{1,3}\s/)) {
      const level = line.match(/^(#{1,3})/)[1].length;
      const text = line.replace(/^#{1,3}\s+/, '');
      result.push(`<h${level}>${processInline(text)}</h${level}>`);
      i++;
      continue;
    }
    
    // Numbered items (don't use <ol> to avoid browser renumbering)
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
    if (line.match(/^[•*+\-]\s/)) {
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
        result.push(lines[i]);
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

// Process inline formatting (keep this the same)
const processInline = (text) => {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Citations
    .replace(/\[(\d+)]/g, '<sup data-citation="$1" class="md-citation">[$1]</sup>');
};

// Citation overlay component (enhanced but same appearance)
const CitationPillOverlay = ({ citation, isPresented, onDismiss, theme, isMobile }) => {
  if (!isPresented || !citation) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const handleVisitLink = () => {
    if (citation.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '20px'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: theme.backgroundSurface,
          borderRadius: isMobile ? '16px 16px 0 0' : '16px',
          padding: '24px',
          maxWidth: isMobile ? '100%' : '500px',
          width: '100%',
          maxHeight: isMobile ? '80vh' : '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isMobile ? 'translateY(0)' : 'translateY(0)',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'none'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div style={{
            backgroundColor: theme.accentSoftBlue,
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {citation.number}
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.textSecondary,
              padding: '4px',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: theme.textPrimary,
            lineHeight: '1.4'
          }}>
            {citation.title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: theme.textSecondary
          }}>
            {citation.authors}
          </p>
        </div>

        {citation.url && (
          <button
            onClick={handleVisitLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: theme.accentSoftBlue,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              width: '100%',
              justifyContent: 'center',
              minHeight: '44px'
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

const ToolbarView = ({ onNewChat, onToggleSidebar, theme, isMobile }) => {
  const [newChatCooldown, setNewChatCooldown] = useState(false);

  const handleNewChat = () => {
    if (newChatCooldown) return;
    setNewChatCooldown(true);
    onNewChat();
    setTimeout(() => setNewChatCooldown(false), 300);
  };

  return (
    <div style={{
      height: isMobile ? '60px' : '52px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 20px' : '0 16px',
      backgroundColor: theme.backgroundSurface,
      borderBottomLeftRadius: '20px',
      borderBottomRightRadius: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      zIndex: 10,
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0'
    }}>
      <button
        onClick={onToggleSidebar}
        style={{
          padding: isMobile ? '12px' : '8px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '44px',
          minWidth: '44px'
        }}
      >
        {isMobile ? <Menu size={20} color={theme.textPrimary} /> : <Stethoscope size={18} color={theme.textPrimary} />}
      </button>

      <h1 style={{
        color: theme.textPrimary,
        fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
        fontSize: isMobile ? '32px' : '28px',
        margin: 0,
        fontWeight: 'normal',
        transform: 'translateY(-2px)'
      }}>
        Astra
      </h1>

      <button
        onClick={handleNewChat}
        disabled={newChatCooldown}
        style={{
          padding: isMobile ? '12px' : '8px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          opacity: newChatCooldown ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '44px',
          minWidth: '44px'
        }}
      >
        <Edit3 size={isMobile ? 20 : 18} color={theme.textPrimary} />
      </button>
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
    <div style={{ 
      display: 'flex', 
      gap: isMobile ? '8px' : '6px',
      flexWrap: isMobile ? 'wrap' : 'nowrap'
    }}>
      {modes.map(({ key, title, icon: Icon }) => {
        const isSelected = currentMode === key;
        return (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            disabled={isDisabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: isMobile ? '8px 12px' : '6px 10px',
              borderRadius: '50px',
              border: `1px solid ${theme.textSecondary}50`,
              backgroundColor: isSelected ? theme.accentSoftBlue : 'transparent',
              color: isSelected ? '#ffffff' : theme.textPrimary,
              fontSize: isMobile ? '14px' : '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: isDisabled ? 0.5 : 1,
              minHeight: isMobile ? '44px' : 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            <Icon size={isMobile ? 12 : 10} />
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
      padding: isMobile ? '20px 16px' : '32px 16px',
      height: '100%',
      gap: isMobile ? '20px' : '24px'
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* Custom four-pointed star logo */}
        <div style={{
          width: isMobile ? '32px' : '36px',
          height: isMobile ? '32px' : '36px',
          margin: isMobile ? '0 auto 12px' : '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg 
            width={isMobile ? "32" : "36"} 
            height={isMobile ? "32" : "36"} 
            viewBox="0 0 36 36" 
            fill="none"
          >
            <path 
              d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" 
              fill={`${theme.grayPrimary}40`}
            />
          </svg>
        </div>
        <h2 style={{
          color: `${theme.grayPrimary}60`,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
          fontSize: isMobile ? '28px' : '36px',
          lineHeight: '1.1',
          margin: 0,
          maxWidth: isMobile ? '280px' : '220px',
          fontWeight: '300'
        }}>
          Uncertainty ends here.
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '8px' : '6px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '448px',
        padding: isMobile ? '0 16px' : '0 32px'
      }}>
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onSampleTapped(query)}
            style={{
              width: '100%',
              padding: isMobile ? '12px 20px' : '10px 20px',
              borderRadius: '50px',
              fontSize: isMobile ? '14px' : '12px',
              fontWeight: '500',
              textAlign: 'center',
              lineHeight: '1.4',
              backgroundColor: `${theme.grayPrimary}08`,
              border: `0.5px solid ${theme.grayPrimary}20`,
              color: `${theme.grayPrimary}70`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: isMobile ? '44px' : 'auto'
            }}
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, theme, onTapCitation, isMobile }) => {
  const [showCopied, setShowCopied] = useState(false);
  const containerRef = useRef(null);

  const handleCopy = async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (target.tagName === 'SUP' && target.dataset.citation) {
        const number = parseInt(target.dataset.citation, 10);
        const citation = message.citations?.find(c => c.number === number);
        if (citation && onTapCitation) {
          onTapCitation(citation);
        }
      }
    };

    const container = containerRef.current;
    if (container) container.addEventListener('click', handler);
    return () => {
      if (container) container.removeEventListener('click', handler);
    };
  }, [message.citations, onTapCitation]);

  if (message.role === 'user') {
    const getQueryLabel = () => {
      if (message.wasInWriteMode) return 'Write Request:';
      if (message.wasInReasonMode) return 'Reason Request:';
      return 'Search Query:';
    };

    return (
      <div style={{ width: '100%', marginBottom: isMobile ? '20px' : '16px' }}>
        <div style={{
          display: 'flex',
          backgroundColor: `${theme.accentSoftBlue}0D`,
          borderRadius: '6px'
        }}>
          <div style={{
            width: '3px',
            backgroundColor: theme.accentSoftBlue,
            flexShrink: 0
          }} />
          <div style={{
            flex: 1,
            padding: isMobile ? '12px 16px' : '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{
              fontSize: isMobile ? '12px' : '11px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: theme.textSecondary
            }}>
              {getQueryLabel()}
            </div>
            <div style={{
              fontSize: isMobile ? '16px' : '14px',
              color: theme.textPrimary,
              lineHeight: '1.5'
            }}>
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message - use streaming style for completed messages too
  return (
    <div style={{ width: '100%', marginBottom: isMobile ? '20px' : '16px', position: 'relative' }}>
      <div 
        style={{
          padding: isMobile ? '16px' : '16px',
          borderRadius: '12px',
          backgroundColor: theme.backgroundSurface,
          border: `1px solid ${theme.accentSoftBlue}33`
        }}
      >
        {/* Show "Response:" header for streaming-completed messages */}
        {message.isStreamingComplete && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: isMobile ? '12px' : '11px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
            fontSize: isMobile ? '16px' : '14px',
            lineHeight: '1.6',
            color: theme.textPrimary
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} 
        />

        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: isMobile ? '12px' : '8px',
            right: isMobile ? '12px' : '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.textSecondary,
            fontSize: isMobile ? '14px' : '13px',
            minHeight: isMobile ? '44px' : 'auto',
            minWidth: isMobile ? '44px' : 'auto',
            padding: isMobile ? '8px' : '4px'
          }}
        >
          {showCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

const StreamingResponse = ({ content, theme, isMobile }) => {
  return (
    <div style={{
      padding: isMobile ? '16px' : '16px',
      borderRadius: '12px',
      backgroundColor: theme.backgroundSurface,
      border: `1px solid ${theme.accentSoftBlue}33`,
      marginBottom: isMobile ? '20px' : '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <span style={{
          fontSize: isMobile ? '12px' : '11px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: theme.textSecondary
        }}>
          Response:
        </span>
        {!content && (
          <div style={{ display: 'flex', gap: '2px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: '4px',
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
          fontSize: isMobile ? '16px' : '14px',
          lineHeight: '1.6',
          color: theme.textPrimary
        }}
        dangerouslySetInnerHTML={{ 
          __html: content ? renderMarkdown(content) + '<span style="color: #4A6B7D; animation: blink 1s infinite;">▍</span>' : ''
        }}
      />
    </div>
  );
};

const LoadingIndicator = ({ theme, isMobile }) => {
  return (
    <div style={{
      padding: isMobile ? '16px' : '16px',
      borderRadius: '12px',
      backgroundColor: `${theme.backgroundSurface}80`,
      marginBottom: isMobile ? '20px' : '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: isMobile ? '12px' : '11px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: theme.textSecondary
        }}>
          Thinking...
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
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
};

const Sidebar = ({ isOpen, onClose, chatHistory, onSelectChat, onDeleteChat, onNewChat, theme, isMobile }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      display: 'flex'
    }}>
      <div
        style={{
          flex: isMobile ? 0 : 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          width: isMobile ? '0' : 'auto'
        }}
        onClick={onClose}
      />
      <div style={{
        width: isMobile ? '100%' : '320px',
        height: '100%',
        padding: isMobile ? '24px 20px' : '24px',
        paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 24px)' : '24px',
        paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 24px)' : '24px',
        overflowY: 'auto',
        backgroundColor: theme.backgroundSurface,
        transform: isMobile && !isOpen ? 'translateX(100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease-out'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '18px',
            fontWeight: '600',
            color: theme.textPrimary,
            margin: 0
          }}>
            Chat History
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onNewChat}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit3 size={16} color={theme.textPrimary} />
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} color={theme.textPrimary} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '8px' }}>
          {chatHistory.map((chat) => (
            <div key={chat.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <button
                onClick={() => onSelectChat(chat)}
                style={{
                  flex: 1,
                  padding: isMobile ? '16px 12px' : '12px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  backgroundColor: `${theme.textSecondary}0A`,
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: isMobile ? '60px' : 'auto'
                }}
              >
                <div style={{
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: '500',
                  color: theme.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: '4px'
                }}>
                  {chat.title}
                </div>
                <div style={{ 
                  fontSize: isMobile ? '14px' : '12px', 
                  color: theme.textSecondary 
                }}>
                  {new Date(chat.timestamp).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={() => onDeleteChat(chat)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
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
  theme,
  isMobile
}) => {
  const textareaRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(isMobile ? 44 : 32);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Handle virtual keyboard on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      // Detect if keyboard is open on mobile
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardVisible = viewportHeight < windowHeight * 0.8;
      setIsKeyboardVisible(keyboardVisible);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const minHeight = isMobile ? 44 : 32;
    const maxHeight = isMobile ? 120 : 64;
    
    textarea.style.height = `${minHeight}px`;
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${scrollHeight}px`;
    setTextareaHeight(scrollHeight);
  }, [isMobile]);

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
      if (query.trim()) {
        onSend();
      }
    }
  };

  const handlePaste = (e) => {
    // Allow default paste behavior
    // The textarea will automatically handle the paste
  };

  const isDisabled = isStreaming || isLoading;

  return (
    <div style={{
      padding: isMobile ? '16px 20px' : '16px',
      paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : 'max(16px, env(safe-area-inset-bottom))',
      backgroundColor: theme.backgroundSurface,
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      position: isKeyboardVisible && isMobile ? 'static' : 'relative'
    }}>
      {/* Text Input Area */}
      <div style={{ position: 'relative', marginBottom: isMobile ? '12px' : '0px' }}>
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
            padding: isMobile ? '12px 16px' : '6px',
            borderRadius: isMobile ? '12px' : '6px',
            resize: 'none',
            border: isMobile ? `2px solid ${theme.textSecondary}20` : 'none',
            outline: 'none',
            fontSize: isMobile ? '16px' : '16px', // 16px prevents zoom on iOS
            lineHeight: '1.5',
            backgroundColor: isMobile ? theme.backgroundPrimary : 'transparent',
            color: theme.textPrimary,
            height: `${textareaHeight}px`,
            minHeight: isMobile ? '44px' : '8px',
            maxHeight: isMobile ? '120px' : '88px',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />

        {speechRecognition.isRecording && (
          <div style={{
            position: 'absolute',
            right: isMobile ? '16px' : '12px',
            top: isMobile ? '12px' : '0px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: isMobile ? '14px' : '12px', color: theme.accentSoftBlue }}>
              Listening
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: theme.accentSoftBlue,
                    animation: `pulse 1.5s ease-in-out infinite ${i * 0.15}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '12px' : '0px',
        gap: isMobile ? '12px' : '8px'
      }}>
        <ModeSwitcher
          currentMode={currentMode}
          onModeChange={onModeChange}
          isDisabled={isDisabled}
          theme={theme}
          isMobile={isMobile}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '8px' }}>
          {/* Microphone Button */}
          <button
            onClick={speechRecognition.toggleRecording}
            disabled={!speechRecognition.isAvailable || isDisabled}
            style={{
              padding: isMobile ? '12px' : '8px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transform: speechRecognition.isRecording ? 'scale(1.1)' : 'scale(1)',
              color: speechRecognition.isRecording ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!speechRecognition.isAvailable || isDisabled) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              minWidth: '44px'
            }}
          >
            {speechRecognition.isRecording ? (
              <Square size={isMobile ? 24 : 28} fill="currentColor" />
            ) : (
              <Mic size={isMobile ? 24 : 28} />
            )}
          </button>

          {/* Send/Stop Button */}
          <button
            onClick={isStreaming ? onStop : onSend}
            disabled={!isStreaming && !query.trim()}
            style={{
              padding: isMobile ? '12px' : '8px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: isStreaming ? theme.errorColor : theme.accentSoftBlue,
              opacity: (!isStreaming && !query.trim()) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              minWidth: '44px'
            }}
          >
            {isStreaming ? (
              <Square size={isMobile ? 24 : 28} fill="currentColor" />
            ) : (
              <Send size={isMobile ? 24 : 28} />
            )}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: isMobile ? '14px' : '12px',
          color: theme.textSecondary,
          margin: 0,
          lineHeight: '1.4'
        }}>
          Astra can make mistakes. Check critical info.
        </p>
      </div>
    </div>
  );
};

const AstraApp = () => {
  const { colors: theme } = useTheme();
  const speechRecognition = useSpeechRecognition();
  const { isMobile, isLandscape } = useIsMobile();
  const viewportHeight = useViewportHeight();

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
    // Abort any ongoing request
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

    if (speechRecognition.isRecording) {
      speechRecognition.toggleRecording();
    }
    speechRecognition.setRecognizedText('');

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Note: You'll need to replace these with your actual API endpoints
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

      console.log(`🚀 Sending ${currentMode} query: ${queryToSend}`);
      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
            
            if (done) {
              console.log('✅ Stream completed');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            console.log(`📥 Received chunk: ${chunk.substring(0, 100)}...`);
            
            buffer += chunk;
            
            // Process buffer for complete lines
            const lines = buffer.split(/\r?\n/);
            const endsWithNewline = buffer.endsWith('\n') || buffer.endsWith('\r\n');

            if (endsWithNewline) {
              lines.forEach(line => {
                if (line.trim()) {
                  processStreamLine(line.trim(), collectedCitations, (content) => {
                    finalContent += content;
                    setStreamingContent(finalContent);
                  });
                }
              });
              buffer = '';
            } else if (lines.length > 1) {
              lines.slice(0, -1).forEach(line => {
                if (line.trim()) {
                  processStreamLine(line.trim(), collectedCitations, (content) => {
                    finalContent += content;
                    setStreamingContent(finalContent);
                  });
                }
              });
              buffer = lines[lines.length - 1] || '';
            }
          }

          // Create final assistant message to preserve the content
          if (finalContent.trim()) {
            const assistantMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: finalContent.trim(),
              citations: collectedCitations,
              timestamp: new Date(),
              isStreamingComplete: true // Flag to show this was from streaming
            };

            setMessages(prev => [...prev, assistantMessage]);
            
            // Save to chat history
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
          if (streamError.name === 'AbortError') {
            console.log('🛑 Request aborted');
            return;
          }
          
          console.error('❌ Stream reading error:', streamError);
          setIsStreaming(false);
          setIsLoading(false);
          
          // Add error message
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
      if (error.name === 'AbortError') {
        console.log('🛑 Request aborted');
        return;
      }
      
      console.error('❌ Request failed:', error);
      setIsLoading(false);
      setIsStreaming(false);
      
      // Add error message
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
  const processStreamLine = (line, citations, onContent) => {
    if (!line.startsWith('data:')) {
      console.log(`🔍 Skipping non-data line: ${line.substring(0, 50)}`);
      return;
    }

    const payload = line.substring(5).trim();
    
    if (payload === '[DONE]') {
      console.log('✅ Received [DONE] marker');
      return;
    }

    if (!payload) {
      console.log('⚠️ Empty payload, continuing...');
      return;
    }

    try {
      const json = JSON.parse(payload);

      // Handle citations (only for search mode)
      if (currentMode === 'search' && citations.length === 0) {
        if (json.citations && Array.isArray(json.citations)) {
          console.log(`📚 Processing ${json.citations.length} citations`);
          
          if (typeof json.citations[0] === 'object') {
            // Structured citations
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
            // URL array fallback
            json.citations.forEach((urlString, i) => {
              try {
                const url = new URL(urlString);
                citations.push({
                  number: i + 1,
                  title: extractTitle(url),
                  url: urlString,
                  authors: url.hostname || 'Unknown'
                });
              } catch (e) {
                console.warn('Invalid URL in citations:', urlString);
              }
            });
          }
          console.log(`✅ Collected ${citations.length} citations`);
        }
      }

      // Extract content
      let content = null;
      
      if (json.choices?.[0]?.delta?.content) {
        content = json.choices[0].delta.content;
      } else if (json.choices?.[0]?.message?.content) {
        content = json.choices[0].message.content;
      } else if (json.content) {
        content = json.content;
      } else if (json.text) {
        content = json.text;
      }

      if (content && content.length > 0) {
        console.log(`📝 Extracted content: ${content.substring(0, 50)}...`);
        onContent(content);
      }

    } catch (error) {
      console.log(`❌ JSON parsing error: ${error}`);
    }
  };

  // Helper function to extract title from URL
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
      height: viewportHeight,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.backgroundPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Toolbar */}
      <ToolbarView
        onNewChat={resetChat}
        onToggleSidebar={() => setShowSidebar(true)}
        theme={theme}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Conversation Area */}
        <div
          ref={scrollRef}
          style={{
            position:'relative', 
            zIndex:0,
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '0 20px' : '0 16px',
            WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
          }}
          onClick={() => {
            if (speechRecognition.isRecording) {
              speechRecognition.toggleRecording();
            }
          }}
        >
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: isMobile ? '20px 0' : '16px 0'
          }}>
            {/* Empty State */}
            {messages.length === 0 && !isLoading && !isStreaming && (
              <EmptyState
                currentMode={currentMode}
                onSampleTapped={handleSampleTapped}
                theme={theme}
                isMobile={isMobile}
              />
            )}

            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                theme={theme}
                isMobile={isMobile}
                onTapCitation={(citation) => {
                  setSelectedCitation(citation);
                  setShowCitationOverlay(true);
                }}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && <LoadingIndicator theme={theme} isMobile={isMobile} />}

            {/* Streaming Response */}
            {isStreaming && (
              <StreamingResponse
                content={streamingContent}
                theme={theme}
                isMobile={isMobile}
              />
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div
          style={{
            maxWidth: '900px',   
            margin: '0 auto',    
            padding: isMobile ? '0' : '0 24px',   
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
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
            isMobile={isMobile}
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
        onNewChat={() => {
          resetChat();
          setShowSidebar(false);
        }}
        theme={theme}
        isMobile={isMobile}
      />

      {/* Citation Overlay */}
      {showCitationOverlay && selectedCitation && (
        <CitationPillOverlay
          citation={selectedCitation}
          isPresented={showCitationOverlay}
          onDismiss={() => setShowCitationOverlay(false)}
          theme={theme}
          isMobile={isMobile}
        />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          overflow: hidden;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        #root {
          height: 100vh;
          height: calc(var(--vh, 1vh) * 100);
          width: 100vw;
        }
        
        /* Mobile-optimized scrollbars */
        ::-webkit-scrollbar {
          width: ${isMobile ? '2px' : '6px'};
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.textSecondary}40;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.textSecondary}60;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: ${theme.textSecondary}40 transparent;
        }
        
        /* Mobile input optimizations */
        textarea::placeholder {
          color: ${theme.textSecondary};
          opacity: 1;
        }
        textarea {
          font-family: inherit;
          line-height: inherit;
          border: none;
          outline: none;
          resize: none;
          background: transparent;
          -webkit-appearance: none;
          -webkit-border-radius: 0;
        }
        
        /* Button touch targets */
        button {
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        button:not(:disabled):hover {
          transform: translateY(-1px);
        }
        button:not(:disabled):active {
          transform: translateY(0);
        }
        
        /* Animations */
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        /* Focus styles */
        button:focus-visible, textarea:focus-visible {
          outline: 2px solid ${theme.accentSoftBlue};
          outline-offset: 2px;
        }
        
        /* Typography */
        h1, h2, h3, strong, em, code, ul, ol, li {
          color: ${theme.textPrimary} !important;
        }
        pre {
          background-color: ${theme.textSecondary}15 !important;
        }
        sup {
          color: ${theme.accentSoftBlue} !important;
        }
        
        /* Markdown Styling - Mobile optimized */
        .md {
          line-height: ${isMobile ? '1.6' : '1.5'};
        }
        
        .md h1, .md h2, .md h3, 
        .md strong, .md em, .md code, 
        .md ul, .md ol, .md li {
          color: ${theme.textPrimary} !important;
        }
        
        .md h1 { 
          margin: ${isMobile ? '0.6rem 0 0.3rem' : '0.5rem 0 0.25rem'}; 
          font-size: ${isMobile ? '1.6rem' : '1.5rem'}; 
          font-weight: 700; 
        }
        
        .md h2 { 
          margin: ${isMobile ? '0.5rem 0 0.25rem' : '0.4rem 0 0.2rem'}; 
          font-size: ${isMobile ? '1.35rem' : '1.25rem'}; 
          font-weight: 600; 
        }
        
        .md h3 { 
          margin: ${isMobile ? '0.4rem 0 0.2rem' : '0.3rem 0 0.15rem'}; 
          font-size: ${isMobile ? '1.2rem' : '1.1rem'}; 
          font-weight: 600; 
        }
        
        .md p { 
          margin: ${isMobile ? '0.2rem 0' : '0.15rem 0'}; 
          line-height: ${isMobile ? '1.5' : '1.4'}; 
        }
        
        /* Custom numbered items - mobile optimized */
        .md .numbered-item {
          margin: ${isMobile ? '0.3rem 0' : '0.25rem 0'};
          display: flex;
          align-items: baseline;
          gap: ${isMobile ? '0.5rem' : '0.25rem'};
        }
        
        .md .numbered-item .number {
          font-weight: 600;
          flex-shrink: 0;
          min-width: auto;
        }
        
        .md .numbered-item .content {
          flex: 1;
          line-height: ${isMobile ? '1.5' : '1.4'};
        }
        
        .md ul { 
          margin: ${isMobile ? '0.2rem 0 0.2rem 1.5rem' : '0.1rem 0 0.1rem 1.25rem'}; 
          padding-left: 0;
          list-style-type: disc;
          list-style-position: outside;
        }
        
        .md li { 
          margin: ${isMobile ? '0.1rem 0' : '0.05rem 0'}; 
          line-height: ${isMobile ? '1.4' : '1.3'};
          padding-left: 0;
        }
        
        .md ul ul, .md ol ol, .md ul ol, .md ol ul { 
          margin: ${isMobile ? '0.15rem 0' : '0.1rem 0'}; 
        }
        
        .md strong { 
          font-weight: 600; 
        }
        
        .md em { 
          font-style: italic; 
        }
        
        .md pre {
          background-color: ${theme.textSecondary}15 !important;
          border-radius: 8px;
          padding: ${isMobile ? '16px' : '12px'};
          margin: ${isMobile ? '0.6rem 0' : '0.5rem 0'};
          overflow-x: auto;
          font-size: ${isMobile ? '14px' : '13px'};
        }
        
        .md code {
          background-color: ${theme.textSecondary}15 !important;
          border-radius: 4px;
          padding: ${isMobile ? '3px 8px' : '2px 6px'};
          font-size: ${isMobile ? '0.9em' : '0.9em'};
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
        }
        
        .md pre code {
          background: none !important;
          border: none;
          padding: 0;
        }
        
        .md blockquote {
          margin: ${isMobile ? '0.3rem 0' : '0.2rem 0'};
          padding-left: ${isMobile ? '1rem' : '0.75rem'};
          border-left: 3px solid ${theme.accentSoftBlue};
          font-style: italic;
        }
        
        .md hr {
          border: none;
          height: 1px;
          background-color: ${theme.textSecondary}40;
          margin: ${isMobile ? '1.5rem 0' : '1rem 0'};
        }
        
        .md a {
          color: ${theme.accentSoftBlue} !important;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }
        
        .md a:hover {
          border-bottom-color: ${theme.accentSoftBlue};
        }
        
        .md sup.md-citation {
          color: ${theme.accentSoftBlue} !important;
          cursor: pointer;
          font-weight: 600;
          padding: ${isMobile ? '2px 4px' : '0'};
          border-radius: 4px;
          transition: all 0.2s ease;
          margin: 0;
          min-height: ${isMobile ? '24px' : 'auto'};
          min-width: ${isMobile ? '24px' : 'auto'};
          display: ${isMobile ? 'inline-flex' : 'inline'};
          align-items: ${isMobile ? 'center' : 'baseline'};
          justify-content: ${isMobile ? 'center' : 'flex-start'};
        }
        
        .md sup.md-citation:hover {
          background-color: ${theme.accentSoftBlue}20;
          transform: translateY(-1px);
        }
        
        .md br {
          line-height: 0.3;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 768px) {
          /* Prevent zoom on focus */
          input, textarea, select {
            font-size: 16px !important;
          }
          
          /* Optimize touch targets */
          button {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Smooth scrolling */
          * {
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Landscape mobile optimizations */
        @media (max-width: 768px) and (orientation: landscape) {
          .md h1 { font-size: 1.4rem; margin: 0.4rem 0 0.2rem; }
          .md h2 { font-size: 1.2rem; margin: 0.3rem 0 0.15rem; }
          .md h3 { font-size: 1.1rem; margin: 0.25rem 0 0.1rem; }
          .md p { margin: 0.1rem 0; }
        }
      `}</style>
    </div>
  );
};

export default AstraApp;
