import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBaseUrl } from './siteConfig.mjs';
import { articleToMarkdown } from './articleContent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const publicDir = path.join(projectRoot, 'public');
const manifestFile = path.join(projectRoot, 'generated_articles', 'index.json');

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const toIso = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const writePublicArtifact = async (relativePath, content) => {
  for (const root of [distDir, publicDir]) {
    const target = path.join(root, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }
};

const buildDiscoveryFiles = async () => {
  const articles = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  if (!Array.isArray(articles)) throw new Error('generated_articles/index.json must be an array');

  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const staticPaths = ['/', '/articles', '/about', '/sources', '/qbank', '/editorial-policy.html', '/privacy.html', '/terms.html'];
  const staticEntries = staticPaths.map((pathname) => ({
    loc: `${baseUrl}${pathname}`,
    lastmod: new Date().toISOString()
  }));
  const articleEntries = articles.filter((article) => article?.slug).map((article) => ({
    loc: `${baseUrl}/articles/${article.slug}`,
    lastmod: toIso(article.updatedAt || article.generatedAt || article.publishedAt)
  }));
  const sitemapEntries = [...staticEntries, ...articleEntries]
    .map((entry) => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`)
    .join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;

  const recentArticles = [...articles]
    .filter((article) => article?.slug)
    .sort((a, b) => new Date(b.updatedAt || b.generatedAt || 0) - new Date(a.updatedAt || a.generatedAt || 0))
    .slice(0, 50);
  const rssItems = recentArticles.map((article) => `    <item>\n      <title>${escapeXml(article.title)}</title>\n      <link>${baseUrl}/articles/${escapeXml(article.slug)}</link>\n      <guid isPermaLink="true">${baseUrl}/articles/${escapeXml(article.slug)}</guid>\n      <pubDate>${new Date(toIso(article.updatedAt || article.generatedAt || article.publishedAt)).toUTCString()}</pubDate>\n      <description>${escapeXml(article.summary)}</description>\n    </item>`).join('\n');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Astra Clinical Library</title>\n    <link>${baseUrl}/articles</link>\n    <description>Evidence-based clinical guides from Astra MD.</description>\n${rssItems}\n  </channel>\n</rss>\n`;

  const articleLinks = articles.filter((article) => article?.slug).map((article) =>
    `- [${article.title}](${baseUrl}/articles/${article.slug}): ${article.summary || 'Evidence-based clinical guide.'} [Markdown](${baseUrl}/articles/${article.slug}/article.md) · [JSON](${baseUrl}/articles/${article.slug}/article.json)`
  ).join('\n');
  const llms = `# Astra MD\n\n> Astra is a clinical research, reasoning, documentation, and medical education platform.\n\n## Clinical Library\n\nThe canonical library index is ${baseUrl}/articles. Articles are educational, cite their sources, and do not replace clinical judgment.\n\n${articleLinks}\n`;

  const fullArticles = [];
  for (const metadata of articles.filter((article) => article?.slug)) {
    const sourcePath = metadata.source
      ? path.join(projectRoot, metadata.source)
      : path.join(projectRoot, 'generated_articles', `${metadata.slug}.json`);
    const article = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    fullArticles.push(articleToMarkdown({ ...article, slug: metadata.slug }));
  }
  const llmsFull = `# Astra MD Clinical Library\n\n> Full-text, evidence-based clinical guides from Astra MD. Canonical HTML: ${baseUrl}/articles\n\n${fullArticles.join('\n---\n\n')}`;

  await Promise.all([
    writePublicArtifact('sitemap.xml', sitemap),
    writePublicArtifact('articles/feed.xml', rss),
    writePublicArtifact('llms.txt', llms),
    writePublicArtifact('llms-full.txt', llmsFull)
  ]);
  console.log(`Generated sitemap, RSS, and llms.txt for ${articles.length} clinical articles.`);
};

buildDiscoveryFiles().catch((error) => {
  console.error('Failed to generate article discovery files:', error);
  process.exitCode = 1;
});
