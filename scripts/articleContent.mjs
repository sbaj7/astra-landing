const asArray = (value) => Array.isArray(value) ? value : [];

const line = (value = '') => String(value).trim();
const tableCell = (value = '') => line(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');

export const toPublicArticle = (article) => ({
  ...article,
  references: asArray(article.references || article.citations).map(({ snippet: _snippet, score: _score, raw_content: _rawContent, ...reference }) => reference)
});

export const articleToMarkdown = (sourceArticle) => {
  const article = toPublicArticle(sourceArticle);
  const output = [`# ${line(article.title)}`];

  if (article.summary) output.push('', line(article.summary));
  if (article.clinicalQuestion) output.push('', `**Clinical question:** ${line(article.clinicalQuestion)}`);
  if (article.updatedAt) output.push('', `Updated: ${line(article.updatedAt)}`);
  if (article.reviewedAt) output.push(`Clinically reviewed: ${line(article.reviewedAt)}`);

  if (asArray(article.keyTakeaways).length) {
    output.push('', '## What matters in practice', ...article.keyTakeaways.map((item) => `- ${line(item)}`));
  }

  asArray(article.sections).forEach((section) => {
    output.push('', `## ${line(section.heading || section.title)}`);
    if (section.intro) output.push('', line(section.intro));
    asArray(section.paragraphs || section.body).forEach((paragraph) => output.push('', line(paragraph)));
    asArray(section.bullets || section.items).forEach((item) => output.push(`- ${line(typeof item === 'string' ? item : item?.text)}`));

    asArray(section.subsections).forEach((subsection) => {
      output.push('', `### ${line(subsection.heading || subsection.title)}`);
      asArray(subsection.paragraphs || subsection.body).forEach((paragraph) => output.push('', line(paragraph)));
      asArray(subsection.bullets || subsection.items).forEach((item) => output.push(`- ${line(typeof item === 'string' ? item : item?.text)}`));
    });

    const columns = asArray(section.table?.columns);
    const rows = asArray(section.table?.rows);
    if (columns.length && rows.length) {
      if (section.table.caption) output.push('', `*${line(section.table.caption)}*`);
      output.push(
        '',
        `| ${columns.map(tableCell).join(' | ')} |`,
        `| ${columns.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${asArray(row).map(tableCell).join(' | ')} |`)
      );
    }
  });

  if (asArray(article.faq).length) {
    output.push('', '## Common questions');
    article.faq.forEach((item) => output.push('', `### ${line(item.question)}`, '', line(item.answer)));
  }

  if (asArray(article.references || article.citations).length) {
    output.push('', '## References');
    asArray(article.references || article.citations).forEach((reference, index) => {
      const details = [reference.title, reference.journal || reference.source || reference.authors, reference.year, reference.url].filter(Boolean).map(line);
      output.push(`${reference.number || index + 1}. ${details.join(' — ')}`);
    });
  }

  if (article.editorialNote) output.push('', '## Editorial note', '', line(article.editorialNote));
  return `${output.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
};
