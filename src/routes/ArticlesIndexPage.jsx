import React, { useEffect, useMemo, useState } from 'react';
import { ArticleHeader } from '../components/ClinicalArticleView.jsx';
import { useTheme } from '../components/Themes+Styles.jsx';
import useDocumentChromeTheme from '../hooks/useDocumentChromeTheme.js';
import '../components/ClinicalArticleView.css';
import './ArticlesIndexPage.css';

const ArticlesIndexPage = ({ initialArticles }) => {
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
    if (!needle) return articles;
    return articles.filter((article) =>
      [article.title, article.summary, ...(article.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [articles, query]);

  return (
    <div className="article-page article-library-page" data-theme={articleTheme.themePreference}>
      <a className="article-skip-link" href="#article-library">Skip to library</a>
      <ArticleHeader isDark={articleTheme.isDark} onToggleTheme={articleTheme.toggleTheme} showLibraryLink={false} />
      <main className="article-library" id="article-library">
        <header className="article-library-hero">
          <p className="article-eyebrow">Astra Clinical Library</p>
          <h1>Evidence, made usable.</h1>
          <p>Clear clinical guides built from primary literature, major guidelines, and the decisions clinicians face in practice.</p>
        </header>

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
