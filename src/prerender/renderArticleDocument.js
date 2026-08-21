import React from 'react';
import { renderToString } from 'react-dom/server';
import ClinicalArticleView from '../components/ClinicalArticleView.jsx';
import ArticlesIndexPage from '../routes/ArticlesIndexPage.jsx';
import { normalizeClinicalArticle } from '../articles/articleSchema.js';
import { ThemeProvider } from '../components/Themes+Styles.jsx';

const escapeAttribute = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const plainText = (value = '') => String(value)
  .replace(/\[(\d+)(?:\s*[,–-]\s*\d+)*\]/g, '')
  .replace(/[*_~`>#]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const metaDescription = (article, maxLength = 160) => {
  const preferred = plainText(article.seoDescription);
  if (preferred) return preferred.length <= maxLength ? preferred : `${preferred.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;

  const summary = plainText(article.summary);
  if (summary.length <= maxLength) return summary;
  const sentence = summary.slice(0, maxLength + 1).match(/^(.{80,160}?[.!?])(?:\s|$)/)?.[1];
  return sentence || `${summary.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
};

const articleImageUrls = (baseUrl, imageSlug) => {
  const root = baseUrl.replace(/\/$/, '');
  if (!imageSlug) return { openGraph: `${root}/og-image.png`, schema: [`${root}/og-image.png`] };
  const imageRoot = `${root}/articles/images/${imageSlug}`;
  return {
    openGraph: `${imageRoot}-open-graph.jpg`,
    schema: [
      `${imageRoot}-1x1.jpg`,
      `${imageRoot}-4x3.jpg`,
      `${imageRoot}-16x9.jpg`
    ]
  };
};

const renderAssets = (assets) => (assets.css || [])
  .map((href) => `<link rel="stylesheet" href="/${href}" />`)
  .join('\n');

const renderDocument = ({ title, description, canonicalUrl, jsonLd, markup, assets, pageType = 'website', image, imageAlt = '', alternateFormats = [], clientScript = '' }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeAttribute(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="author" content="Astra MD" />
    <link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />
    <link rel="alternate" type="application/rss+xml" title="Astra Clinical Library" href="/articles/feed.xml" />
    ${alternateFormats.map(({ type, href, title: alternateTitle }) => `<link rel="alternate" type="${escapeAttribute(type)}" href="${escapeAttribute(href)}"${alternateTitle ? ` title="${escapeAttribute(alternateTitle)}"` : ''} />`).join('\n    ')}
    <meta property="og:type" content="${pageType}" />
    <meta property="og:site_name" content="Astra MD" />
    <meta property="og:title" content="${escapeAttribute(title)}" />
    <meta property="og:description" content="${escapeAttribute(description)}" />
    <meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />
    <meta property="og:image" content="${escapeAttribute(image)}" />
    <meta property="og:image:alt" content="${escapeAttribute(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(title)}" />
    <meta name="twitter:description" content="${escapeAttribute(description)}" />
    <meta name="twitter:image" content="${escapeAttribute(image)}" />
    <meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}" />
    <meta name="theme-color" content="#fbfbf9" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#121417" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
    <style>
      html, body, #root { min-height: 100%; background: #fbfbf9; color: #20201f; }
      @media (prefers-color-scheme: dark) { html, body, #root { background: #121417; color: #f2f3f4; } }
    </style>
    ${renderAssets(assets)}
  </head>
  <body style="margin:0">
    <div id="root">${markup}</div>
    <script src="/article-theme.js" defer></script>
    ${clientScript ? `<script src="${escapeAttribute(clientScript)}" defer></script>` : ''}
  </body>
</html>`;

export const renderArticleDocument = ({ article: sourceArticle, relatedArticles = [], baseUrl, assets }) => {
  const article = normalizeClinicalArticle(sourceArticle);
  const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/articles/${article.slug}`;
  const title = `${article.title} — Astra MD`;
  const description = metaDescription(article);
  const images = articleImageUrls(baseUrl, article.imageSlug);
  const publishedAt = article.publishedAt || article.updatedAt || undefined;
  const modifiedAt = article.updatedAt || article.publishedAt || undefined;
  const references = article.references.filter((reference) => reference.url);
  const organizationId = `${baseUrl.replace(/\/$/, '')}/#organization`;
  const editorialPolicyUrl = `${baseUrl.replace(/\/$/, '')}/editorial-policy.html`;
  const faqEntities = article.faq.map((item) => ({
    '@type': 'Question',
    name: plainText(item.question),
    acceptedAnswer: { '@type': 'Answer', text: plainText(item.answer) }
  }));
  const reviewers = article.reviewers.map((reviewer) => ({
    '@type': 'Person',
    name: reviewer.name,
    ...(reviewer.url ? { url: reviewer.url } : {}),
    ...(reviewer.jobTitle ? { jobTitle: reviewer.jobTitle } : {})
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Astra MD',
        url: baseUrl,
        logo: { '@type': 'ImageObject', url: `${baseUrl.replace(/\/$/, '')}/apple-touch-icon.png` },
        publishingPrinciples: editorialPolicyUrl
      },
      {
        '@type': 'MedicalWebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: article.title,
        description,
        ...(article.reviewedAt ? { lastReviewed: article.reviewedAt } : {}),
        medicalAudience: { '@type': 'MedicalAudience', audienceType: article.audience },
        mainEntity: { '@id': `${canonicalUrl}#article` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` }
      },
      {
        '@type': 'Article',
        '@id': `${canonicalUrl}#article`,
        mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
        headline: article.title,
        description,
        image: images.schema,
        inLanguage: 'en-US',
        isAccessibleForFree: true,
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(modifiedAt ? { dateModified: modifiedAt } : {}),
        author: { '@id': organizationId },
        publisher: { '@id': organizationId },
        ...(reviewers.length ? { reviewedBy: reviewers } : {}),
        ...(article.specialty ? { about: { '@type': 'Thing', name: article.specialty } } : {}),
        ...(references.length ? { citation: references.map((reference) => ({
          '@type': 'CreativeWork',
          name: reference.title,
          url: reference.url
        })) } : {})
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Astra', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Clinical Library', item: `${baseUrl.replace(/\/$/, '')}/articles` },
          { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl }
        ]
      },
      ...(faqEntities.length ? [{ '@type': 'FAQPage', '@id': `${canonicalUrl}#faq`, mainEntity: faqEntities }] : [])
    ]
  };

  return renderDocument({
    title,
    description,
    canonicalUrl,
    jsonLd,
    markup: renderToString(React.createElement(ThemeProvider, null, React.createElement(ClinicalArticleView, { article: sourceArticle, relatedArticles }))),
    assets,
    pageType: 'article',
    image: images.openGraph,
    imageAlt: `${article.title} clinical guide from Astra MD`,
    alternateFormats: [
      { type: 'text/markdown', href: `${canonicalUrl}/article.md`, title: `${article.title} in Markdown` },
      { type: 'application/json', href: `${canonicalUrl}/article.json`, title: `${article.title} structured data` }
    ],
    clientScript: '/article-page.js'
  });
};

export const renderArticleIndexDocument = ({ articles, baseUrl, assets }) => {
  const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/articles`;
  const title = 'Astra Clinical Library — Evidence-Based Medical Guides';
  const description = 'Evidence-based clinical guides for physicians and medical trainees, with practical recommendations and direct links to primary sources.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Astra Clinical Library',
    url: canonicalUrl,
    description,
    isPartOf: { '@type': 'WebSite', name: 'Astra MD', url: baseUrl },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: article.title,
        url: `${canonicalUrl}/${article.slug}`
      }))
    }
  };

  return renderDocument({
    title,
    description,
    canonicalUrl,
    jsonLd,
    markup: renderToString(React.createElement(ThemeProvider, null, React.createElement(ArticlesIndexPage, { initialArticles: articles }))),
    assets,
    image: `${baseUrl.replace(/\/$/, '')}/og-image.png`,
    imageAlt: 'Astra MD clinical research and reasoning',
    clientScript: '/article-library.js'
  });
};
