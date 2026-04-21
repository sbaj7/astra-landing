import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { reorderArticleCitations } from '../src/utils/reorderArticleCitations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const targetDir = args.find((arg) => !arg.startsWith('--')) || 'generated_articles';
const dryRun = args.includes('--dry');

const resolvePath = (input) =>
  path.isAbsolute(input) ? input : path.join(__dirname, '..', input);

const formatDiffLabel = (changed, total) => `${changed}/${total} updated${dryRun ? ' (dry-run)' : ''}`;

const main = async () => {
  const articlesDir = resolvePath(targetDir);

  let entries;
  try {
    entries = await fs.readdir(articlesDir, { withFileTypes: true });
  } catch (error) {
    console.error(`Unable to read directory: ${articlesDir}`);
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

  let updatedCount = 0;

  for (const file of jsonFiles) {
    const fullPath = path.join(articlesDir, file.name);
    const originalRaw = await fs.readFile(fullPath, 'utf-8');
    let parsed;

    try {
      parsed = JSON.parse(originalRaw);
    } catch (error) {
      console.warn(`⚠️ Skipping invalid JSON: ${file.name}`);
      continue;
    }

    const reordered = reorderArticleCitations(parsed);
    const before = JSON.stringify(parsed);
    const after = JSON.stringify(reordered);

    if (before === after) {
      continue;
    }

    updatedCount += 1;

    if (!dryRun) {
      const formatted = JSON.stringify(reordered, null, 2);
      await fs.writeFile(fullPath, `${formatted}\n`, 'utf-8');
    }
  }

  const total = jsonFiles.length;
  console.log(`Citation renumbering complete: ${formatDiffLabel(updatedCount, total)} across ${articlesDir}`);
};

main().catch((error) => {
  console.error('Renumbering failed:', error);
  process.exitCode = 1;
});
