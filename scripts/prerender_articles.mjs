import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { getBaseUrl } from './siteConfig.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'generated_articles');
const MANIFEST_FILE = path.join(DIST_DIR, '.vite', 'manifest.json');
const ARTICLES_MANIFEST_FILE = path.join(ARTICLES_DIR, 'index.json');

async function loadViteAssets() {
  const manifestRaw = await fs.readFile(MANIFEST_FILE, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const entry = manifest['index.html'];
  if (!entry) {
    throw new Error('Expected manifest to contain "index.html" entry. Enable build.manifest in Vite config.');
  }

  return {
    main: entry.file,
    css: entry.css || []
  };
}

async function loadArticlesManifest() {
  const manifestRaw = await fs.readFile(ARTICLES_MANIFEST_FILE, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  if (!Array.isArray(manifest)) {
    throw new Error('generated_articles/index.json must be an array');
  }
  return manifest;
}

async function renderArticles() {
  const vite = await createServer({
    root: PROJECT_ROOT,
    server: { middlewareMode: 'ssr' },
    logLevel: 'error',
    appType: 'custom'
  });

  const { renderArticleDocument } = await vite.ssrLoadModule('/src/prerender/renderArticleDocument.js');

  const baseUrl = getBaseUrl();
  const assets = await loadViteAssets();
  const articlesManifest = await loadArticlesManifest();

  console.log(`\n⚙️  Prerendering ${articlesManifest.length} articles...`);

  try {
    for (const meta of articlesManifest) {
      const slug = meta.slug;
      if (!slug) {
        console.warn('Skipping manifest entry without slug', meta);
        continue;
      }
    const sourcePath = meta.source
      ? path.join(__dirname, '..', meta.source)
      : path.join(ARTICLES_DIR, `${slug}.json`);

    let article;
    try {
      const raw = await fs.readFile(sourcePath, 'utf8');
      article = JSON.parse(raw);
    } catch (error) {
      console.error(`Failed to read article JSON for slug "${slug}":`, error);
      continue;
    }

    try {
      const html = renderArticleDocument({
        article,
        baseUrl,
        assets
      });

      const outDir = path.join(DIST_DIR, 'articles', slug);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
      console.log(`  • ${slug}`);
    } catch (error) {
      console.error(`Failed to prerender slug "${slug}":`, error);
    }
  }
  } finally {
    await vite.close();
  }

  console.log('✅ Prerender complete');
}

renderArticles().catch((error) => {
  console.error('Prerender failed:', error);
  process.exitCode = 1;
});
