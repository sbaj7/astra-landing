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

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${article.title ? `${article.title} | Astra` : 'Clinical Article | Astra'}</title>
    <meta name="description" content="${(article.summary || '').replace(/\s+/g, ' ').slice(0, 200)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${article.title || ''}" />
    <meta property="og:description" content="${(article.summary || '').replace(/\s+/g, ' ').slice(0, 200)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${cssLinks}
  </head>
  <body style="margin:0; background:${theme.backgroundPrimary}; color:${theme.textPrimary};">
    <div id="root">${markup}</div>
    <script>window.__PRERENDERED_ARTICLE__ = ${escapeForScriptTag({ slug: article.slug, article })};</script>
    <script type="module" src="/${assets.main}"></script>
  </body>
</html>`;
};
