import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-600.css';
import { normalizeClinicalArticle } from '../articles/articleSchema.js';
import './ClinicalArticleView.css';

const ArticleCitationContext = createContext([]);

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
  'uptodate.com': 'UpToDate'
};

const getCitationHost = (citation) => {
  if (citation?.host || citation?.hostname) return String(citation.host || citation.hostname).replace(/^www\./, '');
  try { return new URL(citation?.url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

const getJournalName = (hostname) => {
  const clean = String(hostname || '').replace(/^www\./, '');
  const match = Object.entries(domainToJournal).find(([domain]) => clean === domain || clean.endsWith(`.${domain}`));
  return match?.[1] || clean.replace(/\.org$|\.com$|\.gov$|\.int$|\.edu$/, '').replace(/\./g, ' ') || 'Source';
};

const buildFaviconUrl = (host) => host ? `https://www.google.com/s2/favicons?sz=128&domain=${host}` : '';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

const withCitationLinks = (text = '', references = []) => {
  const available = new Set(references.map((reference) => String(reference.number)));
  const citationSequence = /(?:\[\d+\](?!\()(?:[,\s]*\[\d+\](?!\())+)|\[\d+(?:\s*,\s*\d+)+\](?!\()|\[\d+\](?!\()/g;
  return String(text).replace(citationSequence, (match) => {
    const numbers = [...new Set(match.match(/\d+/g) || [])].filter((number) => available.has(number));
    return numbers.length ? `[citation](#citations-${numbers.join(',')})` : match;
  });
};

const ResearchCitationPill = ({ numbers, references }) => {
  const citations = numbers.map((number) => references.find((reference) => String(reference.number) === number)).filter(Boolean);
  const wrapperRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const clearCloseTimer = () => window.clearTimeout(closeTimerRef.current);
  const openPopover = () => {
    clearCloseTimer();
    setIsOpen(true);
  };
  const closePopover = () => {
    clearCloseTimer();
    setIsOpen(false);
  };
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), 240);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const wrapper = wrapperRef.current;
    const trigger = wrapper?.querySelector('.cite-btn');
    const popover = wrapper?.querySelector('.cite-hover');

    const positionPopover = () => {
      if (!trigger || !popover) return;
      if (window.innerWidth <= 680) {
        popover.style.removeProperty('left');
        popover.style.removeProperty('top');
        return;
      }

      const viewportPadding = 12;
      const gap = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      let left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverRect.width - viewportPadding));

      let top = triggerRect.top - popoverRect.height - gap;
      if (top < viewportPadding) top = triggerRect.bottom + gap;
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - popoverRect.height - viewportPadding));

      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    };

    const handlePointerDown = (event) => {
      if (!wrapper?.contains(event.target)) closePopover();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePopover();
    };

    const animationFrame = window.requestAnimationFrame(positionPopover);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', positionPopover, { passive: true });
    window.addEventListener('scroll', positionPopover, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover);
    };
  }, [isOpen]);

  useEffect(() => () => clearCloseTimer(), []);

  if (!citations.length) return null;
  const firstCitation = citations[0];
  const host = getCitationHost(firstCitation);
  const journal = getJournalName(host);

  return (
    <span
      className={`cite-wrap${isOpen ? ' is-cite-open' : ''}`}
      ref={wrapperRef}
      onPointerEnter={openPopover}
      onPointerLeave={scheduleClose}
      onFocus={openPopover}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) scheduleClose();
      }}
    >
      <a
        className="cite-btn"
        href={firstCitation.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Show ${journal} source${citations.length > 1 ? ` and ${citations.length - 1} more sources` : ''}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearCloseTimer();
          setIsOpen(true);
        }}
      >
        <img className="cite-btn-favicon" src={buildFaviconUrl(host)} alt="" aria-hidden="true" />
        <span className="cite-btn-label">{journal}</span>
        {citations.length > 1 && <span className="cite-btn-count">+{citations.length - 1}</span>}
      </a>
      <span className={`cite-hover${citations.length > 1 ? ' cite-hover-multi' : ''}`} role="dialog" aria-label="Citation sources">
        {citations.map((citation) => {
          const citationHost = getCitationHost(citation);
          return (
            <a className={`cite-hover-row${citations.length > 1 ? ' cite-hover-entry' : ''}`} href={citation.url} target="_blank" rel="noopener noreferrer" key={`${citation.number}-${citation.url}`}>
              <img className="cite-hover-favicon" src={buildFaviconUrl(citationHost)} alt="" aria-hidden="true" />
              <span className="cite-hover-body">
                <span className="cite-hover-journal">{getJournalName(citationHost)}</span>
                {citation.title && <span className="cite-hover-title">{citation.title}</span>}
                {citation.authors && citation.authors !== citationHost && <span className="cite-hover-authors">{citation.authors}</span>}
                {(citation.snippet || citation.summary) && <span className="cite-hover-snippet">{citation.snippet || citation.summary}</span>}
                {(citation.year || citation.doi) && <span className="cite-hover-meta">{[citation.year, citation.doi ? `DOI: ${citation.doi}` : ''].filter(Boolean).join(' · ')}</span>}
              </span>
            </a>
          );
        })}
      </span>
    </span>
  );
};

const MarkdownText = ({ children, className = '', inline = false }) => {
  const references = useContext(ArticleCitationContext);
  const Wrapper = inline ? 'span' : 'div';
  return (
    <Wrapper className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: inline
            ? ({ children: paragraphChildren }) => <>{paragraphChildren}</>
            : ({ children: paragraphChildren }) => <p>{paragraphChildren}</p>,
          a: ({ href, children: linkChildren }) => {
            if (href?.startsWith('#citations-')) {
              return <ResearchCitationPill numbers={href.replace('#citations-', '').split(',')} references={references} />;
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{linkChildren}</a>;
          }
        }}
      >
        {withCitationLinks(children, references)}
      </ReactMarkdown>
    </Wrapper>
  );
};

const ArticleHeader = () => (
  <header className="article-site-header">
    <a className="article-brand" href="/" aria-label="Astra MD home">
      <img src="/Astra-Mark-Material.svg" alt="" aria-hidden="true" />
      <span>Astra</span>
    </a>
    <nav className="article-header-nav" aria-label="Article navigation">
      <a className="article-header-link article-library-label" href="/articles">Clinical library</a>
      <a className="article-header-link" href="/">Open Astra</a>
    </nav>
  </header>
);

const ArticleTable = ({ table }) => {
  if (!table?.columns?.length || !table?.rows?.length) return null;
  return (
    <div className="article-table-wrap" role="region" aria-label={table.caption || 'Clinical comparison'} tabIndex="0">
      <table className="article-table">
        {table.caption && <caption><MarkdownText inline>{table.caption}</MarkdownText></caption>}
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th scope="col" key={column}><MarkdownText inline>{column}</MarkdownText></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.join('-')}`}>
              {row.map((cell, cellIndex) => (
                cellIndex === 0
                  ? <th scope="row" key={`${cellIndex}-${cell}`}><MarkdownText inline>{cell}</MarkdownText></th>
                  : <td key={`${cellIndex}-${cell}`}><MarkdownText inline>{cell}</MarkdownText></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ArticleSection = ({ section }) => (
  <section className="article-section" id={section.id} aria-labelledby={`${section.id}-heading`}>
    {section.eyebrow && <p className="article-section-eyebrow">{section.eyebrow}</p>}
    <h2 id={`${section.id}-heading`}>{section.heading}</h2>
    {section.intro && <MarkdownText className="article-section-intro">{section.intro}</MarkdownText>}
    {section.paragraphs.map((paragraph, index) => (
      <MarkdownText className="article-prose" key={`${section.id}-paragraph-${index}`}>{paragraph}</MarkdownText>
    ))}
    {section.bullets.length > 0 && (
      <ul>{section.bullets.map((bullet, index) => <li key={`${section.id}-bullet-${index}`}><MarkdownText>{bullet}</MarkdownText></li>)}</ul>
    )}
    <ArticleTable table={section.table} />
    {section.subsections.map((subsection, index) => (
      <div key={`${section.id}-subsection-${index}`}>
        {subsection.heading && <h3>{subsection.heading}</h3>}
        {subsection.paragraphs.map((paragraph, paragraphIndex) => (
          <MarkdownText className="article-prose" key={`${section.id}-${index}-${paragraphIndex}`}>{paragraph}</MarkdownText>
        ))}
        {subsection.bullets.length > 0 && (
          <ul>{subsection.bullets.map((bullet, bulletIndex) => <li key={`${section.id}-${index}-bullet-${bulletIndex}`}><MarkdownText>{bullet}</MarkdownText></li>)}</ul>
        )}
      </div>
    ))}
  </section>
);

const ArticleTableOfContents = ({ article }) => {
  const items = [
    ...(article.keyTakeaways.length > 0 ? [{ id: 'article-takeaways', label: 'What matters in practice' }] : []),
    ...article.sections.map((section) => ({ id: section.id, label: section.eyebrow || section.heading })),
    ...(article.faq.length > 0 ? [{ id: 'article-faq', label: 'Common questions' }] : [])
  ];

  if (items.length < 2) return null;

  return (
    <aside className="article-toc" aria-label="Table of contents" data-article-toc>
      <details className="article-toc-details" open>
        <summary>
          <span>Contents</span>
          <span className="article-toc-chevron" aria-hidden="true" />
        </summary>
        <nav aria-label="Article sections">
          <ol className="article-toc-list">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} data-article-toc-link>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>
      </details>
    </aside>
  );
};

const ClinicalArticleView = ({ article: sourceArticle, relatedArticles = [] }) => {
  const [shareStatus, setShareStatus] = useState('');
  useEffect(() => {
    if (typeof window.__initializeAstraArticle === 'function') {
      window.__initializeAstraArticle();
      return undefined;
    }

    if (document.querySelector('script[data-astra-article-enhancements]')) return undefined;
    const script = document.createElement('script');
    script.src = '/article-page.js';
    script.defer = true;
    script.dataset.astraArticleEnhancements = 'true';
    document.body.appendChild(script);
    return undefined;
  }, []);

  if (!sourceArticle) return null;
  const article = normalizeClinicalArticle(sourceArticle);
  const date = formatDate(article.reviewedAt || article.updatedAt || article.publishedAt);
  const dateLabel = article.reviewedAt ? 'Clinically reviewed' : 'Updated';

  const copyArticleLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Link copied');
    } catch {
      window.prompt('Copy this article link', url);
      setShareStatus('Link ready to copy');
    }
  };

  const shareArticle = async () => {
    if (!navigator.share) {
      await copyArticleLink();
      return;
    }
    try {
      await navigator.share({ title: article.title, text: article.summary, url: window.location.href });
      setShareStatus('Article shared');
    } catch (error) {
      if (error?.name !== 'AbortError') await copyArticleLink();
    }
  };

  return (
    <ArticleCitationContext.Provider value={article.references}>
    <div className="article-page">
      <a className="article-skip-link" href="#article-content">Skip to article</a>
      <ArticleHeader />
      <main className="article-main" id="article-content">
        <nav className="article-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Astra</a></li><li aria-hidden="true">/</li>
            <li><a href="/articles">Clinical library</a></li><li aria-hidden="true">/</li>
            <li aria-current="page">{article.title}</li>
          </ol>
        </nav>

        <article className="article-document">
          <header className="article-hero">
            <p className="article-eyebrow">{article.eyebrow}</p>
            <h1 className="article-title">{article.title}</h1>
            {article.summary && <MarkdownText className="article-summary">{article.summary}</MarkdownText>}
            {article.clinicalQuestion && <div className="article-question"><strong>Clinical question:</strong> {article.clinicalQuestion}</div>}
            <div className="article-meta" aria-label="Article details">
              {date && <span>{dateLabel} {date}</span>}
              {article.readingMinutes && <span>{article.readingMinutes} minute read</span>}
              {article.specialty && <span>{article.specialty}</span>}
            </div>
            <div className="article-actions" aria-label="Article actions">
              <button type="button" data-article-share onClick={shareArticle}>Share</button>
              <button type="button" data-article-copy onClick={copyArticleLink}>Copy link</button>
              <span className="article-share-status" role="status" aria-live="polite">{shareStatus}</span>
            </div>
          </header>

          <div className="article-body-layout">
            <ArticleTableOfContents article={article} />
            <div className="article-body-column">
              {article.keyTakeaways.length > 0 && (
                <aside className="article-takeaways" id="article-takeaways" aria-labelledby="article-takeaways-title">
                  <h2 id="article-takeaways-title">What matters in practice</h2>
                  <ul>{article.keyTakeaways.map((takeaway, index) => <li key={`takeaway-${index}`}><MarkdownText>{takeaway}</MarkdownText></li>)}</ul>
                </aside>
              )}

              <div className="article-content">{article.sections.map((section) => <ArticleSection key={section.id} section={section} />)}</div>

              {article.faq.length > 0 && (
                <section className="article-faq" id="article-faq" aria-labelledby="article-faq-title">
                  <h2 id="article-faq-title">Common questions</h2>
                  {article.faq.map((item) => <div className="article-faq-item" key={item.question}><h3>{item.question}</h3><MarkdownText className="article-prose">{item.answer}</MarkdownText></div>)}
                </section>
              )}

              {article.references.length > 0 && (
                <section className="article-references" id="article-references" aria-labelledby="article-references-title">
                  <h2 id="article-references-title">References</h2>
                  <ol className="article-reference-list">
                    {article.references.map((reference) => (
                      <li className="article-reference" id={`reference-${reference.number}`} key={`${reference.number}-${reference.url || reference.title}`}>
                        {reference.url ? (
                          <a className="article-reference-link" href={reference.url} target="_blank" rel="noopener noreferrer">
                            <span className="article-reference-title">{reference.title}</span>
                            {(reference.journal || reference.year || reference.detail) && <span> — {[reference.journal, reference.year, reference.detail].filter(Boolean).join(' · ')}</span>}
                          </a>
                        ) : (
                          <>
                            <span className="article-reference-title">{reference.title}</span>
                            {(reference.journal || reference.year || reference.detail) && <span> — {[reference.journal, reference.year, reference.detail].filter(Boolean).join(' · ')}</span>}
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <aside className="article-editorial" aria-label="Editorial information"><strong>Editorial note.</strong> {article.editorialNote} <a href="/editorial-policy.html">Read our editorial standards.</a></aside>

              {relatedArticles.length > 0 && (
                <nav className="article-related" aria-labelledby="related-articles-title">
                  <h2 id="related-articles-title">Continue reading</h2>
                  <ul>{relatedArticles.map((related) => <li key={related.slug}><a href={`/articles/${related.slug}`}>{related.title}</a></li>)}</ul>
                </nav>
              )}

              <footer className="article-cta">
                <p>Search the literature, reason through clinical decisions, and create structured notes with Astra.</p>
                <a href="/">Open Astra</a>
              </footer>
            </div>
          </div>
        </article>
      </main>
    </div>
    </ArticleCitationContext.Provider>
  );
};

export default ClinicalArticleView;
