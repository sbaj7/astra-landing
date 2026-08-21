import React, { useState, useEffect } from 'react';
import { X, Search, BookOpen, ExternalLink } from 'lucide-react';

const escapeHtml = (input = '') =>
  String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttribute = (input = '') =>
  String(input)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const normalizeUrl = (input = '') => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '';

  try {
    if (/^\/\//.test(trimmed)) {
      return new URL(`https:${trimmed}`).toString();
    }
    if (/^www\./i.test(trimmed)) {
      return new URL(`https://${trimmed}`).toString();
    }
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // fall through to pattern-based normalization
  }

  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return '';
};

const applyBasicFormatting = (input = '') => {
  let output = input;
  output = output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/__(.+?)__/g, '<strong>$1</strong>');
  output = output.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
  output = output.replace(/_(?!\s)(.+?)(?<!\s)_/g, '<em>$1</em>');
  return output;
};

const applyMarkdownLinks = (input = '') =>
  input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    const trimmedHref = href.trim();
    const normalizedHref = normalizeUrl(trimmedHref);
    const finalHref = normalizedHref || (trimmedHref.startsWith('mailto:') ? trimmedHref : '');
    if (!finalHref) return text;
    return `<a href="${escapeAttribute(finalHref)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

const formatSummary = (summary = '') => {
  const escaped = escapeHtml(summary);
  const withLinks = applyMarkdownLinks(escaped);
  const formatted = applyBasicFormatting(withLinks);
  return formatted.replace(/\n/g, '<br />');
};

const ClinicalArticlesModal = ({ isPresented, onDismiss, onSelectArticle, theme }) => {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load articles from index.json
  useEffect(() => {
    const loadArticles = async () => {
      try {
        setIsLoading(true);
        const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || 'https://shwitfgtpfszjjoczbxp.supabase.co';

        // Try Supabase first
        const supabaseIndexUrl = `${supabaseUrl}/storage/v1/object/public/articles/index.json`;
        console.log('🔍 Fetching articles from Supabase:', supabaseIndexUrl);

        let response = await fetch(supabaseIndexUrl);
        console.log('📡 Supabase response status:', response.status, response.statusText);

        // If Supabase fails, try local fallback
        if (!response.ok) {
          console.log('⚠️ Supabase fetch failed, trying local fallback...');
          const localIndexUrl = '/generated_articles/index.json';
          console.log('🔍 Fetching articles from local:', localIndexUrl);
          response = await fetch(localIndexUrl);
          console.log('📡 Local response status:', response.status, response.statusText);

          if (!response.ok) {
            throw new Error(`Failed to load articles from both Supabase and local (HTTP ${response.status})`);
          }
        }

        const data = await response.json();
        console.log('✅ Loaded articles:', data.length, 'articles');

        setArticles(data);
        setFilteredArticles(data);
        setError(null);
      } catch (err) {
        console.error('❌ Failed to load articles:', err);
        setError(err.message || 'Failed to load articles');
      } finally {
        setIsLoading(false);
      }
    };

    if (isPresented) {
      loadArticles();
    }
  }, [isPresented]);

  // Filter articles based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArticles(articles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = articles.filter(article => {
      const titleMatch = article.title?.toLowerCase().includes(query);
      const summaryMatch = article.summary?.toLowerCase().includes(query);
      const tagsMatch = article.tags?.some(tag => tag.toLowerCase().includes(query));
      return titleMatch || summaryMatch || tagsMatch;
    });

    setFilteredArticles(filtered);
  }, [searchQuery, articles]);

  if (!isPresented) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        padding: '20px'
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          backgroundColor: theme.backgroundSurface,
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: `1px solid ${theme.textSecondary}15`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: `${theme.accentSoftBlue}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BookOpen size={22} color={theme.accentSoftBlue} strokeWidth={2} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 700,
                    color: theme.textPrimary
                  }}
                >
                  Clinical Articles
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: theme.textSecondary }}>
                  {isLoading ? 'Loading...' : `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <button
              onClick={onDismiss}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: `${theme.textSecondary}12`,
                color: theme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.textSecondary}20`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${theme.textSecondary}12`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '14px',
              backgroundColor: `${theme.textSecondary}08`,
              border: `1.5px solid ${theme.textSecondary}15`
            }}
          >
            <Search size={18} color={theme.textSecondary} />
            <input
              type="text"
              placeholder="Search by title, topic, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '15px',
                color: theme.textPrimary,
                fontFamily: 'inherit'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: `${theme.textSecondary}15`,
                  color: theme.textSecondary,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 28px 28px'
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
                color: theme.textSecondary
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: `3px solid ${theme.textSecondary}20`,
                  borderTopColor: theme.accentSoftBlue,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <p style={{ marginTop: '16px', fontSize: '14px' }}>Loading articles...</p>
              <style>
                {`@keyframes spin { to { transform: rotate(360deg); } }`}
              </style>
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: theme.errorColor || '#ef4444'
              }}
            >
              <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Failed to load articles</p>
              <p style={{ fontSize: '13px', opacity: 0.8 }}>{error}</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: theme.textSecondary
              }}
            >
              <Search size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                {searchQuery ? `No articles found for "${searchQuery}"` : 'No articles available'}
              </p>
              <p style={{ fontSize: '13px', opacity: 0.7 }}>
                {searchQuery && 'Try a different search term'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}
            >
              {filteredArticles.map((article) => (
                <a
                  key={article.slug}
                  href={`/articles/${article.slug}`}
                  style={{
                    textAlign: 'left',
                    padding: '20px',
                    borderRadius: '16px',
                    border: `1px solid ${theme.textSecondary}12`,
                    backgroundColor: theme.backgroundPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${theme.textSecondary}20`;
                    e.currentTarget.style.borderColor = `${theme.accentSoftBlue}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = `${theme.textSecondary}12`;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        lineHeight: 1.4,
                        color: theme.textPrimary,
                        flex: 1
                      }}
                    >
                      {article.title}
                    </h3>
                    <ExternalLink
                      size={16}
                      color={theme.accentSoftBlue}
                      style={{ flexShrink: 0, marginTop: '2px', opacity: 0.6 }}
                    />
                  </div>

                  {article.summary && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: theme.textSecondary,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                      dangerouslySetInnerHTML={{ __html: formatSummary(article.summary) }}
                    />
                  )}

                  {article.tags && article.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            color: theme.accentSoftBlue,
                            backgroundColor: `${theme.accentSoftBlue}12`
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            color: theme.textSecondary,
                            backgroundColor: `${theme.textSecondary}12`
                          }}
                        >
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalArticlesModal;
