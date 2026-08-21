import React, { useEffect, useState } from 'react';
import ClinicalArticleView from './ClinicalArticleView.jsx';
import { reorderArticleCitations } from '../utils/reorderArticleCitations.js';

const resolveSupabaseUrl = () => import.meta?.env?.VITE_SUPABASE_URL || 'https://shwitfgtpfszjjoczbxp.supabase.co';

const RemoteArticleView = ({ slug, bucket = 'articles', objectPath, themeMode }) => {
  const preloaded = typeof window !== 'undefined' && window.__PRERENDERED_ARTICLE__?.slug === slug ? window.__PRERENDERED_ARTICLE__ : null;
  const [article, setArticle] = useState(preloaded?.article ? reorderArticleCitations(preloaded.article) : null);
  const [relatedArticles, setRelatedArticles] = useState(preloaded?.relatedArticles || []);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!preloaded?.article);

  useEffect(() => {
    if (!slug && !objectPath) {
      setError('Article slug or object path required');
      setIsLoading(false);
      return undefined;
    }
    if (preloaded?.article) {
      delete window.__PRERENDERED_ARTICLE__;
      return undefined;
    }

    const path = objectPath || `${bucket}/${slug}/article.json`;
    const remoteUrl = `${resolveSupabaseUrl()}/storage/v1/object/public/${path}`;
    const localUrl = `/generated_articles/${slug}.json`;
    let cancelled = false;

    const loadArticle = async () => {
      try {
        setIsLoading(true);
        const manifestResponse = await fetch('/generated_articles/index.json');
        if (!manifestResponse.ok) throw new Error('The clinical article index could not be loaded.');
        const manifest = await manifestResponse.json();
        const manifestEntry = Array.isArray(manifest) ? manifest.find((entry) => entry.slug === slug) : null;
        if (!manifestEntry) {
          throw new Error('This article is no longer available.');
        }
        const manifestSource = manifestEntry.source
          ? `/${String(manifestEntry.source).replace(/^\//, '')}`
          : localUrl;
        let response = await fetch(manifestSource);
        if (!response.ok) response = await fetch(remoteUrl);
        if (!response.ok) throw new Error(`Unable to load article (status ${response.status})`);
        const data = await response.json();
        if (!cancelled) setArticle(reorderArticleCitations({ ...data, slug }));
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Failed to load article.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadArticle();
    return () => { cancelled = true; };
  }, [bucket, objectPath, preloaded, slug]);

  useEffect(() => {
    if (preloaded?.relatedArticles?.length || !article?.tags?.length) return undefined;
    let cancelled = false;
    fetch('/generated_articles/index.json')
      .then((response) => response.ok ? response.json() : [])
      .then((items) => {
        if (cancelled || !Array.isArray(items)) return;
        const tagSet = new Set(article.tags.map((tag) => tag.toLowerCase()));
        const related = items
          .filter((item) => item.slug !== slug)
          .map((item) => ({ ...item, score: (item.tags || []).filter((tag) => tagSet.has(String(tag).toLowerCase())).length }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setRelatedArticles(related);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [article, preloaded, slug]);

  if (isLoading) return <main className="article-main"><p>Loading article…</p></main>;
  if (error || !article) return <main className="article-main"><h1>Article unavailable</h1><p>{error}</p><a href="/articles">Browse the clinical library</a></main>;
  return <ClinicalArticleView article={article} relatedArticles={relatedArticles} themeMode={themeMode} />;
};

export default RemoteArticleView;
