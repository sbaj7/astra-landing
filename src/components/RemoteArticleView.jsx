import React, { useEffect, useState } from 'react';
import ClinicalArticleView from './ClinicalArticleView.jsx';
import { reorderArticleCitations } from '../utils/reorderArticleCitations.js';

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

  const [article, setArticle] = useState(
    preloadedArticle ? reorderArticleCitations(preloadedArticle) : null
  );
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
      setArticle(reorderArticleCitations(preloadedArticle));
      setIsLoading(false);
      if (typeof window !== 'undefined' && window.__PRERENDERED_ARTICLE__?.slug === slug) {
        delete window.__PRERENDERED_ARTICLE__;
      }
      return;
    }

    const supabaseUrl = resolveSupabaseUrl();
    const path = objectPath || `${bucket}/${slug}/article.json`;
    const supabaseArticleUrl = `${supabaseUrl}/storage/v1/object/public/${path}`;
    const localArticleUrl = `/generated_articles/${slug}.json`;

    let isCancelled = false;

    // Try Supabase first, then local fallback
    fetch(supabaseArticleUrl)
      .then((response) => {
        if (!response.ok) {
          console.log(`⚠️ Supabase article fetch failed, trying local: ${localArticleUrl}`);
          return fetch(localArticleUrl);
        }
        return response;
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load article (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) return;
        setArticle(reorderArticleCitations(data));
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

  // Dynamic SEO: update document head when article loads
  useEffect(() => {
    if (!article) return;

    const title = article.title || 'Clinical Article';
    const summary = (article.summary || '').replace(/\*\*/g, '').slice(0, 160);
    const tags = article.tags || [];
    const url = `https://astramd.org/articles/${slug}`;

    // Title
    document.title = `${title} — Astra MD`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', summary);

    // OG tags
    const ogMap = { 'og:title': title, 'og:description': summary, 'og:url': url, 'og:type': 'article' };
    Object.entries(ogMap).forEach(([prop, content]) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (el) el.setAttribute('content', content);
    });

    // Twitter tags
    const twMap = { 'twitter:title': title, 'twitter:description': summary, 'twitter:url': url };
    Object.entries(twMap).forEach(([name, content]) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (el) el.setAttribute('content', content);
    });

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);

    // JSON-LD structured data for the article
    let ldScript = document.getElementById('article-jsonld');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'article-jsonld';
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'MedicalScholarlyArticle',
      'name': title,
      'headline': title,
      'description': summary,
      'url': url,
      'dateModified': article.updated || article.generatedAt || undefined,
      'keywords': tags.join(', '),
      'about': tags.map(t => ({ '@type': 'MedicalCondition', 'name': t })),
      'medicalAudience': { '@type': 'MedicalAudience', 'audienceType': 'Clinician' },
      'publisher': { '@type': 'Organization', 'name': 'Astra MD', 'url': 'https://astramd.org/' },
      'isPartOf': { '@type': 'WebSite', 'name': 'Astra MD', 'url': 'https://astramd.org/' },
      ...(article.clinicalQuestion ? { 'mainEntity': { '@type': 'Question', 'name': article.clinicalQuestion } } : {}),
      ...(article.references ? { 'citation': article.references.slice(0, 10).filter(r => r.url).map(r => ({ '@type': 'CreativeWork', 'name': r.title, 'url': r.url })) } : {})
    });

    return () => {
      // Reset on unmount
      document.title = 'Astra MD — AI Clinical Decision Support for Healthcare Professionals';
      if (ldScript?.parentNode) ldScript.parentNode.removeChild(ldScript);
    };
  }, [article, slug]);

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
