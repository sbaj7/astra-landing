import React, { useEffect, useState } from 'react';
import ClinicalArticleView from './ClinicalArticleView.jsx';

const resolveSupabaseUrl = () => {
  return (
    import.meta?.env?.VITE_SUPABASE_URL ||
    'https://shwitfgtpfszjjoczbxp.supabase.co'
  );
};

const RemoteArticleView = ({
  slug,
  theme,
  onBack,
  bucket = 'articles',
  objectPath
}) => {
  const preloadedArticle =
    typeof window !== 'undefined'
      ? (() => {
          const payload = window.__PRERENDERED_ARTICLE__;
          return payload && payload.slug === slug ? payload.article : null;
        })()
      : null;

  const [article, setArticle] = useState(preloadedArticle);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!preloadedArticle);
  const hasPreloaded = Boolean(preloadedArticle);

  useEffect(() => {
    if (!slug && !objectPath) {
      setError('Article slug or object path required');
      setIsLoading(false);
      return;
    }

    if (hasPreloaded) {
      setIsLoading(false);
      if (typeof window !== 'undefined' && window.__PRERENDERED_ARTICLE__?.slug === slug) {
        delete window.__PRERENDERED_ARTICLE__;
      }
      return;
    }

    const supabaseUrl = resolveSupabaseUrl();
    const path = objectPath || `${bucket}/${slug}/article.json`;
    const url = `${supabaseUrl}/storage/v1/object/public/${path}`;

    let isCancelled = false;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load article (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) return;
        setArticle(data);
        setError(null);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to fetch article:', err);
        setError(err.message || 'Failed to load article.');
        setArticle(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [slug, bucket, objectPath, hasPreloaded]);

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: theme?.textSecondary || '#555' }}>
        Loading article…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: theme?.errorColor || '#b91c1c' }}>
        {error}
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ padding: 32, color: theme?.textSecondary || '#555' }}>
        Article not available.
      </div>
    );
  }

  return <ClinicalArticleView article={article} theme={theme} onBack={onBack} />;
};

export default RemoteArticleView;
