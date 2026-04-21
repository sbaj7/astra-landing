import React from 'react';
import { renderToString } from 'react-dom/server';
import ClinicalArticleView from '../components/ClinicalArticleView.jsx';
import { colorDefinitions } from '../components/Themes+Styles.jsx';

const escapeForScriptTag = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export const renderArticleDocument = ({
  article,
  baseUrl,
  assets,
  theme = colorDefinitions.light
}) => {
  const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/articles/${article.slug}`;
  const markup = renderToString(
    React.createElement(ClinicalArticleView, {
      article,
      theme,
      onBack: null
    })
  );

  const cssLinks = (assets.css || [])
    .map((href) => `<link rel="stylesheet" href="/${href}" />`)
    .join('\n');

  const safeTitle = (article.title || 'Clinical Article').replace(/"/g, '&quot;');
  const safeDesc = (article.summary || '').replace(/\*\*/g, '').replace(/"/g, '&quot;').replace(/\s+/g, ' ').slice(0, 200);
  const tags = article.tags || [];
  const keywords = tags.length ? tags.join(', ') : '';
  const dateModified = article.generatedAt || article.updated || '';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'MedicalScholarlyArticle',
    'name': article.title,
    'headline': article.title,
    'description': safeDesc,
    'url': canonicalUrl,
    ...(dateModified ? { 'dateModified': dateModified } : {}),
    ...(keywords ? { 'keywords': keywords } : {}),
    ...(tags.length ? { 'about': tags.map(t => ({ '@type': 'MedicalCondition', 'name': t })) } : {}),
    'medicalAudience': { '@type': 'MedicalAudience', 'audienceType': 'Clinician' },
    'publisher': { '@type': 'Organization', 'name': 'Astra MD', 'url': baseUrl },
    'isPartOf': { '@type': 'WebSite', 'name': 'Astra MD', 'url': baseUrl },
    ...(article.clinicalQuestion ? { 'mainEntity': { '@type': 'Question', 'name': article.clinicalQuestion } } : {}),
    ...(article.references ? { 'citation': article.references.slice(0, 10).filter(r => r.url).map(r => ({ '@type': 'CreativeWork', 'name': r.title, 'url': r.url })) } : {})
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} — Astra MD</title>
    <meta name="description" content="${safeDesc}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    ${keywords ? `<meta name="keywords" content="${keywords}" />` : ''}
    <meta name="author" content="Astra MD" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Astra MD" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${baseUrl}/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${baseUrl}/og-image.png" />
    <meta name="theme-color" content="#4A6B7D" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <script type="application/ld+json">${jsonLd}</script>
    ${cssLinks}
  </head>
  <body style="margin:0; background:${theme.backgroundPrimary}; color:${theme.textPrimary};">
    <div id="root">${markup}</div>
    <script>window.__PRERENDERED_ARTICLE__ = ${escapeForScriptTag({ slug: article.slug, article })};</script>
    <script type="module" src="/${assets.main}"></script>
  </body>
</html>`;
};
