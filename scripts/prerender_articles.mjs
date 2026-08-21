import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { getBaseUrl } from './siteConfig.mjs';
import { articleToMarkdown, toPublicArticle } from './articleContent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const articlesDir = path.join(projectRoot, 'generated_articles');
const manifestFile = path.join(distDir, '.vite', 'manifest.json');
const articleIndexFile = path.join(articlesDir, 'index.json');

const loadAssets = async () => {
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  const entry = manifest['index.html'];
  if (!entry) throw new Error('Expected Vite manifest to contain index.html');
  return { main: entry.file, css: entry.css || [] };
};

const loadArticles = async () => {
  const index = JSON.parse(await fs.readFile(articleIndexFile, 'utf8'));
  if (!Array.isArray(index)) throw new Error('generated_articles/index.json must be an array');

  const loaded = [];
  for (const metadata of index) {
    if (!metadata?.slug) continue;
    const sourcePath = metadata.source
      ? path.join(projectRoot, metadata.source)
      : path.join(articlesDir, `${metadata.slug}.json`);
    try {
      const article = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
      loaded.push({
        metadata: { ...metadata, tags: article.tags || [], specialty: article.specialty || '' },
        article: { ...article, slug: metadata.slug }
      });
    } catch (error) {
      console.error(`Failed to load article ${metadata.slug}:`, error.message);
    }
  }
  return loaded;
};

const relatedFor = (current, all) => {
  const tags = new Set((current.article.tags || []).map((tag) => String(tag).toLowerCase()));
  return all
    .filter((candidate) => candidate.metadata.slug !== current.metadata.slug)
    .map((candidate) => ({
      ...candidate.metadata,
      score: (candidate.article.tags || []).filter((tag) => tags.has(String(tag).toLowerCase())).length
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map(({ score: _score, ...candidate }) => candidate);
};

const renderArticles = async () => {
  const vite = await createServer({ root: projectRoot, server: { middlewareMode: true }, logLevel: 'error', appType: 'custom' });
  try {
    const { renderArticleDocument, renderArticleIndexDocument } = await vite.ssrLoadModule('/src/prerender/renderArticleDocument.js');
    const [assets, loadedArticles] = await Promise.all([loadAssets(), loadArticles()]);
    const baseUrl = getBaseUrl();
    const articleMetadata = loadedArticles.map(({ metadata }) => metadata);

    const libraryDir = path.join(distDir, 'articles');
    await fs.mkdir(libraryDir, { recursive: true });
    await fs.writeFile(path.join(libraryDir, 'index.html'), renderArticleIndexDocument({ articles: articleMetadata, baseUrl, assets }), 'utf8');

    for (const entry of loadedArticles) {
      const outputDir = path.join(libraryDir, entry.metadata.slug);
      await fs.mkdir(outputDir, { recursive: true });
      const canonicalArticle = { ...entry.article, slug: entry.metadata.slug };
      await Promise.all([
        fs.writeFile(path.join(outputDir, 'index.html'), renderArticleDocument({
          article: canonicalArticle,
          relatedArticles: relatedFor(entry, loadedArticles),
          baseUrl,
          assets
        }), 'utf8'),
        fs.writeFile(path.join(outputDir, 'article.md'), articleToMarkdown(canonicalArticle), 'utf8'),
        fs.writeFile(path.join(outputDir, 'article.json'), `${JSON.stringify(toPublicArticle(canonicalArticle), null, 2)}\n`, 'utf8')
      ]);
    }

    console.log(`Prerendered the clinical library and ${loadedArticles.length} article pages.`);
  } finally {
    await vite.close();
  }
};

renderArticles().catch((error) => {
  console.error('Article prerender failed:', error);
  process.exitCode = 1;
});
