import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBaseUrl } from './siteConfig.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ARTICLES_MANIFEST_FILE = path.join(__dirname, '..', 'generated_articles', 'index.json');

const normalizeBaseUrl = (input) => input.endsWith('/') ? input.slice(0, -1) : input;

async function buildSitemap() {
  const manifestRaw = await fs.readFile(ARTICLES_MANIFEST_FILE, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  if (!Array.isArray(manifest)) {
    throw new Error('generated_articles/index.json must be an array');
  }

  const baseUrl = getBaseUrl();
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const now = new Date().toISOString();

  // Homepage
  const homeUrl = `  <url>\n    <loc>${normalizedBase}/</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`;

  // Article URLs
  const articleUrls = manifest.map((entry) => {
    if (!entry?.slug) return null;
    const lastmod = entry.generatedAt || now;
    return `  <url>\n    <loc>${normalizedBase}/articles/${entry.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  }).filter(Boolean).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${homeUrl}\n${articleUrls}\n</urlset>\n`;

  // Write to both dist/ and public/ (public/ for dev server)
  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf8');
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log(`🗺️  sitemap.xml generated (${manifest.length + 1} URLs)`);
}

buildSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exitCode = 1;
});
