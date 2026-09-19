import React, { useEffect, useMemo, useState } from 'react';
import { specialtyHubs, hubsForArticle } from '../articles/articleDiscovery.js';
import { ArticleHeader } from '../components/ClinicalArticleView.jsx';
import { useTheme } from '../components/Themes+Styles.jsx';
import useDocumentChromeTheme from '../hooks/useDocumentChromeTheme.js';
import '../components/ClinicalArticleView.css';
import './ArticlesIndexPage.css';

const ArticlesIndexPage = ({ initialArticles, specialtySlug }) => {
  const browserSpecialty = typeof window !== 'undefined' ? window.location.pathname.match(/^\/articles\/specialty\/([^/]+)/)?.[1] : undefined;
  const selectedSlug = specialtySlug || browserSpecialty;
  const hub = specialtyHubs.find((item) => item.slug === selectedSlug);
  const preloaded = initialArticles || (typeof window !== 'undefined' ? window.__PRERENDERED_ARTICLE_INDEX__ : null);
  const [articles, setArticles] = useState(Array.isArray(preloaded) ? preloaded : []);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const articleTheme = useTheme();
  useDocumentChromeTheme(articleTheme.isDark ? '#121417' : '#fbfbf9', articleTheme.isDark);

  useEffect(() => {
    if (articles.length) {
      if (typeof window !== 'undefined') delete window.__PRERENDERED_ARTICLE_INDEX__;
      return;
    }
    fetch('/generated_articles/index.json')
      .then((response) => {
        if (!response.ok) throw new Error('The clinical library could not be loaded.');
        return response.json();
      })
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch((loadError) => setError(loadError.message));
  }, [articles.length]);

  const filteredArticles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const collection = selectedSlug ? articles.filter((article) => hubsForArticle(article).some((item) => item.slug === selectedSlug)) : articles;
    if (!needle) return collection;
    return collection.filter((article) =>
      [article.title, article.summary, ...(article.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [articles, query, selectedSlug]);

  return (
    <div className="article-page article-library-page" data-theme={articleTheme.themePreference}>
      <a className="article-skip-link" href="#article-library">Skip to library</a>
      <ArticleHeader isDark={articleTheme.isDark} onToggleTheme={articleTheme.toggleTheme} showLibraryLink={false} />
      <main className="article-library" id="article-library">
        <header className="article-library-hero">
          <p className="article-eyebrow">Astra Clinical Library</p>
          <h1>{hub ? hub.title : selectedSlug ? 'Specialty unavailable' : 'Evidence, made usable.'}</h1>
          <p>{hub ? `Practical ${hub.title.toLowerCase()} guides for clinical decisions, with cited evidence, testing strategies, and actionable next steps.` : 'Clear clinical guides built from primary literature, major guidelines, and the decisions clinicians face in practice.'}</p>
        </header>
        <nav className="article-specialty-links" aria-label="Browse by specialty">
          <a href="/articles" aria-current={!selectedSlug ? 'page' : undefined}>All guides</a>
          {specialtyHubs.filter((item) => articles.some((article) => hubsForArticle(article).some((match) => match.slug === item.slug))).map((item) => <a key={item.slug} href={`/articles/specialty/${item.slug}`} aria-current={item.slug === selectedSlug ? 'page' : undefined}>{item.title}</a>)}
        </nav>

        <div className="article-library-search">
          <label htmlFor="article-search">Search clinical guides</label>
          <input id="article-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try atrial fibrillation, stroke, or sepsis" />
          <p id="article-library-count" aria-live="polite">{filteredArticles.length} {filteredArticles.length === 1 ? 'guide' : 'guides'}</p>
        </div>

        {error && <p role="alert">{error}</p>}
        <section className="article-library-list" aria-label="Clinical guides">
          {filteredArticles.map((article) => (
            <article className="article-library-item" data-article-search={[article.title, article.summary, article.specialty, ...(article.tags || [])].filter(Boolean).join(' ').toLowerCase()} key={article.slug}>
              <div>
                <p>{article.specialty || article.tags?.[0] || 'Clinical guide'}</p>
                <h2><a href={`/articles/${article.slug}`}>{article.title}</a></h2>
                <span>{article.summary}</span>
              </div>
              <a className="article-library-read" href={`/articles/${article.slug}`} aria-label={`Read ${article.title}`}>Read guide</a>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default ArticlesIndexPage;
