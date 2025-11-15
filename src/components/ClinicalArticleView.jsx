import React from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  ExternalLink,
  Pill,
  ChevronRight
} from 'lucide-react';

const TYPOGRAPHY_REPLACEMENTS = [
  [/â€“/g, '–'],
  [/â€”/g, '—'],
  [/â€¢/g, '•'],
  [/â€˜/g, '‘'],
  [/â€™/g, '’'],
  [/â€œ/g, '“'],
  [/â€�/g, '”'],
  [/â€¦/g, '…'],
  [/Â/g, '']
];

const escapeHtml = (input = '') =>
  input
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

const buildCitationTooltip = (citation) => {
  if (!citation) return '';

  const segments = [];
  const pushUnique = (value) => {
    if (!value) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    if (segments.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) return;
    segments.push(normalized);
  };

  pushUnique(citation.title);
  pushUnique(citation.journal || citation.publisher || citation.source || citation.hostname);
  pushUnique(citation.year);
  pushUnique(citation.authors);
  pushUnique(citation.detail);

  return segments.join(' • ');
};

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

const parseUrl = (input = '') => {
  try {
    return input ? new URL(input) : null;
  } catch {
    return null;
  }
};

const buildDisplayUrl = (parsedUrl) => {
  if (!parsedUrl) return '';
  const { hostname, pathname } = parsedUrl;
  if (!pathname || pathname === '/') return hostname;
  const cleanPath = pathname.length > 60 ? `${pathname.slice(0, 57)}…` : pathname;
  return `${hostname}${cleanPath}`;
};

const isPlaceholderUrl = (url = '') => {
  if (!url) return false;
  const urlStr = String(url).toLowerCase();
  return /xxx+|placeholder|example\.com|\/xx\/|\.xx\.|12345|99999/.test(urlStr);
};

const normalizeReference = (reference = {}, index = 0) => {
  const candidates = [
    reference.url,
    reference.link,
    reference.href,
    reference.fullUrl,
    reference.sourceUrl
  ];

  let resolvedUrl = '';
  let parsedUrl = null;
  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized && !isPlaceholderUrl(normalized)) {
      resolvedUrl = normalized;
      parsedUrl = parseUrl(normalized);
      break;
    }
  }

  if (!resolvedUrl && candidates.length > 0) {
    const candidateUrl = candidates.find(Boolean) || '';
    if (!isPlaceholderUrl(candidateUrl)) {
      resolvedUrl = candidateUrl;
      parsedUrl = parseUrl(resolvedUrl);
    }
  }

  const hostname = reference.hostname || reference.host || parsedUrl?.hostname || '';
  const displayUrl = reference.displayUrl || buildDisplayUrl(parsedUrl) || resolvedUrl;
  const faviconUrl = reference.faviconUrl || (hostname ? `https://www.google.com/s2/favicons?sz=64&domain=${hostname}` : '');

  return {
    ...reference,
    number: reference.number ?? index + 1,
    url: resolvedUrl,
    hostname,
    displayUrl,
    faviconUrl
  };
};

const normalizeTypography = (text = '') => {
  let output = text;
  TYPOGRAPHY_REPLACEMENTS.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, replacement);
  });
  return output;
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

const linkifyBareUrls = (input = '') =>
  input.replace(/(^|[^"'>])((?:https?:\/\/|www\.)[^\s<]+)/gi, (match, prefix, url) => {
    let linkText = url;
    let trailing = '';
    const trailingMatch = url.match(/[).,;:!?]+$/);
    if (trailingMatch) {
      trailing = trailingMatch[0];
      linkText = url.slice(0, -trailing.length);
    }

    const normalizedHref = normalizeUrl(linkText) || linkText;
    if (!normalizedHref) {
      return `${prefix}${url}`;
    }

    return `${prefix}<a href="${escapeAttribute(normalizedHref)}" target="_blank" rel="noopener noreferrer">${linkText}</a>${trailing}`;
  });

const applyCitations = (html, citations = []) =>
  html.replace(/\[(\d+)\]/g, (match, number) => {
    const citation = citations.find((item) => String(item.number) === number);
    const tooltipText = buildCitationTooltip(citation);
    const tooltipAttr = tooltipText ? ` data-tooltip="${escapeAttribute(tooltipText)}"` : '';
    const directHref = citation?.url ? escapeAttribute(citation.url) : `#ref-${number}`;
    const externalAttrs = citation?.url ? ' target="_blank" rel="noopener noreferrer"' : '';

    return `<sup class="md-citation" data-citation="${number}" data-reference="ref-${number}"${tooltipAttr}><a href="${directHref}"${externalAttrs} aria-label="Reference ${number}">[${number}]</a></sup>`;
  });

const buildHtml = (text = '', citations = []) => {
  const normalized = normalizeTypography(text);
  const escaped = escapeHtml(normalized);
  const withMarkdownLinks = applyMarkdownLinks(escaped);
  const formatted = applyBasicFormatting(withMarkdownLinks);
  const linkified = linkifyBareUrls(formatted);
  const withBreaks = linkified.replace(/\n/g, '<br />');
  return applyCitations(withBreaks, citations);
};

const RichText = ({ text, citations, as: Element = 'span', className, style }) => {
  const html = buildHtml(text, citations);
  const combinedStyle = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    hyphens: 'auto',
    ...style
  };
  const combinedClassName = className ? `markdown-body ${className}` : 'markdown-body';

  return React.createElement(Element, {
    className: combinedClassName,
    style: combinedStyle,
    dangerouslySetInnerHTML: { __html: html }
  });
};

const renderHeroKeyPoints = (moments = [], theme, citations) => {
  if (!Array.isArray(moments) || moments.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: `${theme.textSecondary}AA` }}>
        Key points
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {moments.map((moment, idx) => (
          <div
            key={moment?.title || moment?.body || idx}
            style={{
              padding: '16px 18px',
              borderRadius: 18,
              border: `1px solid ${theme.textSecondary}24`,
              backgroundColor: `${theme.backgroundSurface}FA`,
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            {moment?.title && (
              <div style={{ fontWeight: 600, color: theme.textPrimary }}>{moment.title}</div>
            )}
            {moment?.body && (
              <RichText
                as="div"
                text={moment.body}
                citations={citations}
                style={{ color: theme.textSecondary }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const renderHeroStats = (stats = [], theme, citations) => {
  if (!Array.isArray(stats) || stats.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: `${theme.textSecondary}AA` }}>
        Evidence highlights
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stats.map((stat, idx) => (
          <div
            key={`${stat?.label || 'stat'}-${idx}`}
            style={{
              padding: '16px 18px',
              borderRadius: 18,
              border: `1px solid ${theme.textSecondary}24`,
              backgroundColor: `${theme.backgroundSurface}FA`,
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            {stat?.value && (
              <RichText
                as="div"
                text={stat.value}
                citations={citations}
                style={{ color: theme.textPrimary, fontWeight: 600 }}
              />
            )}
            {stat?.label && (
              <div style={{ fontSize: 13, color: `${theme.textSecondary}CC` }}>{stat.label}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const renderHighlightsContent = (highlights = [], theme, citations) => {
  if (!Array.isArray(highlights) || highlights.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {highlights.map((highlight, idx) => (
        <div key={highlight?.title || highlight?.body || idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {highlight?.title && (
            <div style={{ fontWeight: 600, color: theme.textPrimary }}>{highlight.title}</div>
          )}
          {highlight?.body && (
            <RichText as="div" text={highlight.body} citations={citations} style={{ color: theme.textSecondary }} />
          )}
        </div>
      ))}
    </div>
  );
};

const renderChecklistContent = (cards = [], theme, citations) => {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {cards.map((card, idx) => (
        <div
          key={card?.title || idx}
          style={{
            padding: '16px 18px',
            borderRadius: 18,
            border: `1px solid ${theme.textSecondary}24`,
            backgroundColor: `${theme.backgroundSurface}FA`,
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          {card?.title && (
            <div style={{ fontWeight: 600, color: theme.textPrimary }}>{card.title}</div>
          )}
          {(card?.items || []).map((item, itemIdx) => (
            <RichText
              key={`${card?.title || 'item'}-${itemIdx}`}
              as="div"
              text={item}
              citations={citations}
              style={{ color: theme.textSecondary }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const renderStepsContent = (steps = [], theme, citations) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {steps.map((step, idx) => (
        <div
          key={step?.title || step?.body || idx}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            padding: '14px 18px',
            borderRadius: 18,
            border: `1px solid ${theme.textSecondary}24`,
            backgroundColor: `${theme.backgroundSurface}FA`,
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)'
          }}
        >
          <span
            style={{
              minWidth: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: `${theme.accentSoftBlue}22`,
              color: theme.accentSoftBlue,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {idx + 1}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: theme.textSecondary }}>
            {step?.title && (
              <div style={{ fontWeight: 600, color: theme.textPrimary }}>{step.title}</div>
            )}
            {step?.body && (
              <RichText as="div" text={step.body} citations={citations} style={{ color: theme.textSecondary }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderArticleSection = (section, index, theme, citations) => {
  if (!section) return null;

  const key = `${section?.type || 'section'}-${index}`;
  let content = null;

  switch (section?.type) {
    case 'steps':
      content = renderStepsContent(section.steps, theme, citations);
      break;
    case 'checklists':
      content = renderChecklistContent(section.cards, theme, citations);
      break;
    case 'highlights':
      content = renderHighlightsContent(section.highlights, theme, citations);
      break;
    default:
      if (section?.body) {
        content = <RichText as="div" text={section.body} citations={citations} style={{ color: theme.textSecondary }} />;
      } else if (section?.content) {
        content = <RichText as="div" text={section.content} citations={citations} style={{ color: theme.textSecondary }} />;
      }
      break;
  }

  if (!content) return null;

  return (
    <section key={key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {section?.eyebrow && (
        <span style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: `${theme.textSecondary}AA` }}>
          {section.eyebrow}
        </span>
      )}
      {section?.title && (
        <div style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>{section.title}</div>
      )}
      {section?.blurb && (
        <RichText as="div" text={section.blurb} citations={citations} style={{ color: theme.textSecondary }} />
      )}
      {content}
    </section>
  );
};

const PillTag = ({ label, theme }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 14px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.accentSoftBlue,
      backgroundColor: `${theme.accentSoftBlue}18`,
      border: `1px solid ${theme.accentSoftBlue}33`,
      boxShadow: '0 6px 12px rgba(15, 23, 42, 0.18)'
    }}
  >
    <Pill size={14} />
    {label}
  </span>
);

const ReferenceCard = ({ reference, theme }) => {
  const targetUrl = reference?.url;
  const hostname = reference?.hostname || parseUrl(targetUrl)?.hostname || '';
  const faviconUrl = reference?.faviconUrl || (hostname ? `https://www.google.com/s2/favicons?sz=64&domain=${hostname}` : '');
  const displayUrl = reference?.displayUrl || (targetUrl ? targetUrl.replace(/^https?:\/\//, '') : '');
  const wrapperStyle = {
    width: '100%',
    textAlign: 'left',
    backgroundColor: `${theme.backgroundSurface}F6`,
    borderRadius: 22,
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    cursor: targetUrl ? 'pointer' : 'default',
    borderBottom: `1px solid ${theme.textSecondary}16`,
    boxShadow: '0 18px 30px rgba(15, 23, 42, 0.12)',
    textDecoration: 'none',
    color: theme.textPrimary
  };

  const content = (
    <>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: `${theme.textSecondary}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt={hostname || 'source'}
            style={{ width: 24, height: 24 }}
          />
        ) : (
          <ExternalLink size={18} color={theme.accentSoftBlue} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>{reference.title}</h4>
        {reference.detail && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: theme.textSecondary }}>{reference.detail}</p>}
        {(displayUrl || targetUrl) && (
          <span
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: theme.accentSoftBlue,
              maxWidth: '100%'
            }}
          >
            <ExternalLink size={14} color={theme.accentSoftBlue} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(displayUrl || targetUrl || '').replace(/^https?:\/\//, '')}
            </span>
          </span>
        )}
      </div>
      <ChevronRight size={18} color={theme.textSecondary} />
    </>
  );

  if (targetUrl) {
    return (
      <a
        id={`ref-${reference?.number ?? ''}`}
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={wrapperStyle}
      >
        {content}
      </a>
    );
  }

  return (
    <div id={`ref-${reference?.number ?? ''}`} style={wrapperStyle}>
      {content}
    </div>
  );
};

const buildMarkdownStyles = (theme) => `
.markdown-body {
  color: ${theme.textPrimary};
  font-size: 15.5px;
  line-height: 1.7;
}

.markdown-body p {
  margin: 0.75rem 0;
}

.markdown-body strong {
  font-weight: 600;
  color: ${theme.textPrimary};
}

.markdown-body em {
  font-style: italic;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 1.1rem 0 0.6rem;
  color: ${theme.textPrimary};
}

.markdown-body ul,
.markdown-body ol {
  margin: 0.6rem 0;
  padding-left: 1.4rem;
}

.markdown-body li {
  margin: 0.25rem 0;
}

.markdown-body a {
  color: ${theme.accentSoftBlue};
  text-decoration: underline;
}

.markdown-body sup.md-citation {
  color: ${theme.accentSoftBlue};
  cursor: pointer;
  font-weight: 600;
  border-radius: 4px;
  transition: all .15s ease;
  position: relative;
}

.markdown-body sup.md-citation:hover {
  background-color: ${theme.accentSoftBlue}20;
  transform: translateY(-1px);
}

.markdown-body sup.md-citation a {
  color: inherit;
  text-decoration: none;
}

.markdown-body sup.md-citation a:hover {
  text-decoration: underline;
}

.markdown-body sup.md-citation[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translate(-50%, 0);
  background-color: ${theme.backgroundSurface};
  color: ${theme.textPrimary};
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: normal;
  max-width: 320px;
  min-width: 180px;
  line-height: 1.5;
  text-align: left;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.18);
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease, transform .15s ease;
  z-index: 5;
}

.markdown-body sup.md-citation[data-tooltip]::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 7px;
  border-style: solid;
  border-color: ${theme.backgroundSurface} transparent transparent transparent;
  opacity: 0;
  transition: opacity .15s ease;
  pointer-events: none;
  z-index: 5;
}

.markdown-body sup.md-citation[data-tooltip]:hover::after {
  opacity: 1;
  transform: translate(-50%, -8px);
}

.markdown-body sup.md-citation[data-tooltip]:hover::before {
  opacity: 1;
}
`;

const MarkdownStyles = ({ theme }) => (
  <style dangerouslySetInnerHTML={{ __html: buildMarkdownStyles(theme) }} />
);

const ClinicalArticleView = ({ article, theme, onBack }) => {
  if (!article) return null;

  const {
    heroLabel = 'Clinical article',
    title,
    summary,
    updated,
    clinicalQuestion,
    tags = [],
    heroStats = [],
    keyMoments = [],
    sections = [],
    references = [],
    slug,
    createdAt,
    updatedAt
  } = article;

  const enrichedReferences = Array.isArray(references)
    ? references.map((reference, index) => normalizeReference(reference, index))
    : [];

  const citations = enrichedReferences.map((reference) => reference);

  // Update document metadata for SEO
  React.useEffect(() => {
    if (!title) return;

    // Update page title
    document.title = `${title} - Astra MD`;

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      if (!content) return;
      const attribute = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', summary);
    if (tags && tags.length > 0) {
      updateMetaTag('keywords', tags.join(', '));
    }

    // Open Graph tags
    updateMetaTag('og:type', 'article', true);
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', summary, true);
    updateMetaTag('og:image', 'https://astramd.org/og-image.png', true);
    if (slug) {
      updateMetaTag('og:url', `https://astramd.org/articles/${slug}`, true);
    }

    // Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', summary);
    updateMetaTag('twitter:image', 'https://astramd.org/og-image.png');

    // Add Schema.org JSON-LD
    let schemaScript = document.getElementById('article-schema');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'article-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      mainEntity: {
        '@type': 'MedicalScholarlyArticle',
        headline: title,
        description: summary,
        ...(tags && tags.length > 0 && { keywords: tags.join(', ') }),
        datePublished: createdAt || new Date().toISOString(),
        dateModified: updatedAt || createdAt || new Date().toISOString(),
        author: {
          '@type': 'Organization',
          name: 'Astra MD',
          url: 'https://astramd.org'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Astra MD',
          url: 'https://astramd.org',
          logo: {
            '@type': 'ImageObject',
            url: 'https://astramd.org/Astraarticle.png'
          }
        },
        image: 'https://astramd.org/og-image.png',
        medicalAudience: {
          '@type': 'MedicalAudience',
          audienceType: 'Healthcare professionals'
        },
        ...(enrichedReferences && enrichedReferences.length > 0 && {
          citation: enrichedReferences.map(ref => ({
            '@type': 'CreativeWork',
            name: ref.title || 'Medical reference',
            url: ref.url
          }))
        })
      },
      about: {
        '@type': 'MedicalCondition',
        name: title
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://astramd.org'
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Articles',
            item: 'https://astramd.org/#articles'
          },
          ...(slug ? [{
            '@type': 'ListItem',
            position: 3,
            name: title,
            item: `https://astramd.org/articles/${slug}`
          }] : [])
        ]
      }
    };

    schemaScript.textContent = JSON.stringify(schemaData, null, 2);

    return () => {
      // Cleanup on unmount
      const script = document.getElementById('article-schema');
      if (script) {
        script.remove();
      }
    };
  }, [title, summary, tags, slug, createdAt, updatedAt, enrichedReferences]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: theme.backgroundPrimary,
        color: theme.textPrimary,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        minHeight: '100dvh',
        width: '100%',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1080,
          padding: '52px clamp(24px, 5vw, 48px) 96px',
          display: 'flex',
          flexDirection: 'column',
        gap: 52
      }}
    >
        <MarkdownStyles theme={theme} />
        <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              {onBack ? (
                <button
                  onClick={onBack}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 18px',
                    borderRadius: 999,
                    border: 'none',
                    backgroundColor: `${theme.textSecondary}18`,
                    color: theme.textPrimary,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to workspace
                </button>
              ) : (
                <div style={{ width: 1, height: 1 }} />
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src="/Astraarticle.png"
                alt="Astra logo"
                style={{ width: 160, maxWidth: '60%' }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {updated ? (
                <span style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: `${theme.textSecondary}B0` }}>
                  Updated {updated}
                </span>
              ) : (
                <div style={{ width: 1, height: 1 }} />
              )}
            </div>
          </div>
        </header>
        <div style={{ width: '100%', height: 1, backgroundColor: `${theme.textSecondary}10`, marginBottom: 12 }} />

        <section
          style={{
            borderRadius: 42,
            padding: '44px clamp(32px, 6vw, 48px)',
            background: `linear-gradient(160deg, ${theme.backgroundSurface}F9 0%, ${theme.backgroundPrimary}F4 70%, ${theme.accentSoftBlue}16 100%)`,
            border: `1px solid ${theme.textSecondary}26`,
            boxShadow: '0 36px 80px rgba(15, 23, 42, 0.28)',
            display: 'flex',
            flexDirection: 'column',
            gap: 32
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BookmarkCheck size={18} color={theme.accentSoftBlue} />
              <span style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: `${theme.textSecondary}BB` }}>{heroLabel}</span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 40,
                fontWeight: 700,
                letterSpacing: -0.4,
                color: theme.textPrimary
              }}
            >
              {title}
            </h1>

            {summary && (
              <RichText
                as="p"
                text={summary}
                citations={citations}
                style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: theme.textSecondary }}
              />
            )}

            {clinicalQuestion && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '20px 24px',
                  borderRadius: 22,
                  border: `1px solid ${theme.textSecondary}1F`,
                  backgroundColor: `${theme.backgroundSurface}FB`,
                  boxShadow: '0 20px 36px rgba(15, 23, 42, 0.12)',
                  maxWidth: 'min(100%, 520px)'
                }}
              >
                <span style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: `${theme.textSecondary}A0` }}>Clinical question</span>
                <RichText
                  as="div"
                  text={clinicalQuestion}
                  citations={citations}
                  style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.65 }}
                />
              </div>
            )}

            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {tags.map((tag) => (
                  <PillTag key={tag} label={tag} theme={theme} />
                ))}
              </div>
            )}
          </div>
          {renderHeroKeyPoints(keyMoments, theme, citations)}
          {renderHeroStats(heroStats, theme, citations)}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sections.map((section, index) => renderArticleSection(section, index, theme, citations))}
        </div>

        {enrichedReferences.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 24, borderTop: `1px solid ${theme.textSecondary}22` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: `${theme.textSecondary}AA` }}>
                {article.referencesEyebrow || 'References'}
              </span>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>
                {article.referencesTitle || 'Source material'}
              </div>
              <RichText
                as="div"
                text={article.referencesBlurb || 'Primary literature that informs this article.'}
                citations={citations}
                style={{ color: theme.textSecondary }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {enrichedReferences.map((reference, idx) => (
                <ReferenceCard key={reference?.title || idx} reference={reference} theme={theme} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ClinicalArticleView;
