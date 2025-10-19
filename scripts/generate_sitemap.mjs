import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBaseUrl } from './siteConfig.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
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
  const urls = manifest.map((entry) => {
    if (!entry?.slug) return null;
    const lastmod = entry.generatedAt || new Date().toISOString();
    return `  <url>\n    <loc>${normalizedBase}/articles/${entry.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  }).filter(Boolean).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log('🗺️  sitemap.xml generated');
}

buildSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exitCode = 1;
});
