const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const asParagraphs = (...values) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => typeof value === 'string' && value.trim());

const normalizeSubsection = (subsection = {}) => ({
  heading: subsection.heading || subsection.title || '',
  paragraphs: asParagraphs(subsection.paragraphs, subsection.body, subsection.content),
  bullets: asArray(subsection.bullets || subsection.items).map((item) =>
    typeof item === 'string' ? item : item?.text || item?.body || ''
  ).filter(Boolean)
});

const normalizeSection = (section = {}, index) => {
  const subsections = asArray(section.subsections).map(normalizeSubsection);

  if (section.type === 'steps') subsections.push(...asArray(section.steps).map(normalizeSubsection));
  if (section.type === 'checklists') subsections.push(...asArray(section.cards).map(normalizeSubsection));
  if (section.type === 'highlights') subsections.push(...asArray(section.highlights).map(normalizeSubsection));

  return {
    id: section.id || `section-${index + 1}`,
    eyebrow: section.eyebrow || section.kicker || '',
    heading: section.heading || section.title || `Section ${index + 1}`,
    intro: section.intro || section.blurb || '',
    paragraphs: asParagraphs(section.paragraphs, section.body, section.content),
    bullets: asArray(section.bullets || section.items).map((item) =>
      typeof item === 'string' ? item : item?.text || item?.body || ''
    ).filter(Boolean),
    subsections,
    table: section.table && Array.isArray(section.table.columns) && Array.isArray(section.table.rows)
      ? section.table
      : null
  };
};

const normalizeReference = (reference = {}, index) => ({
  number: Number(reference.number) || index + 1,
  title: reference.title || 'Untitled source',
  journal: reference.journal || reference.source || reference.authors || '',
  year: reference.year || reference.published_date || '',
  detail: reference.detail || '',
  doi: reference.doi || '',
  url: reference.url || ''
});

export const normalizeClinicalArticle = (article = {}) => {
  const keyTakeaways = asArray(article.keyTakeaways).length
    ? asArray(article.keyTakeaways)
    : asArray(article.keyMoments).map((moment) => {
        const title = moment?.title?.trim();
        const body = moment?.body?.trim();
        return title && body ? `**${title}:** ${body}` : body || title;
      }).filter(Boolean);

  return {
    ...article,
    schemaVersion: Number(article.schemaVersion) || 1,
    slug: article.slug || '',
    eyebrow: article.eyebrow || article.heroLabel || 'Astra Clinical Guide',
    title: article.title || 'Clinical article',
    summary: article.summary || article.description || '',
    seoDescription: article.seoDescription || '',
    clinicalQuestion: article.clinicalQuestion || '',
    specialty: article.specialty || article.medicalSpecialty || '',
    audience: article.audience || 'Clinicians and medical trainees',
    publishedAt: article.publishedAt || article.createdAt || article.generatedAt || '',
    updatedAt: article.updatedAt || article.generatedAt || article.updated || '',
    reviewedAt: article.reviewedAt || '',
    reviewers: asArray(article.reviewers).map((reviewer) => ({
      name: reviewer?.name || '',
      url: reviewer?.url || '',
      jobTitle: reviewer?.jobTitle || reviewer?.title || ''
    })).filter((reviewer) => reviewer.name),
    readingMinutes: Number(article.readingMinutes) || null,
    tags: asArray(article.tags || article.keywords),
    keyTakeaways,
    sections: asArray(article.sections).map(normalizeSection),
    faq: asArray(article.faq).map((item) => ({
      question: item?.question || '',
      answer: item?.answer || ''
    })).filter((item) => item.question && item.answer),
    references: asArray(article.references || article.citations).map(normalizeReference),
    editorialNote: article.editorialNote || 'Prepared from cited clinical literature using Astra’s research workflow. Verify recommendations against current guidance and patient-specific factors.'
  };
};
