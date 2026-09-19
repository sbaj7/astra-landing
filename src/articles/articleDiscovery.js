export const specialtyHubs = [
  ['cardiology', 'Cardiology', /cardio|heart|vascular medicine/i],
  ['nephrology', 'Nephrology', /nephro/i],
  ['emergency-medicine', 'Emergency medicine', /emergency|toxicology|trauma/i],
  ['critical-care', 'Critical care', /critical|intensive|burn/i],
  ['pulmonology', 'Pulmonology', /pulmon|respiratory|sleep/i],
  ['gastroenterology', 'Gastroenterology', /gastro|hepat|colorectal/i],
  ['endocrinology', 'Endocrinology', /endocrin|obesity/i],
  ['infectious-diseases', 'Infectious diseases', /infectious/i],
  ['neurology', 'Neurology', /neuro/i],
  ['hematology-oncology', 'Hematology and oncology', /hemat|oncol|transfusion/i],
  ['pediatrics', 'Pediatrics', /pediatr|neonat|child|developmental/i],
  ['psychiatry', 'Psychiatry', /psychiatr|addiction/i],
  ['obstetrics-gynecology', 'Obstetrics and gynecology', /obstetric|gynec|maternal/i],
  ['surgery', 'Surgery', /surgery|surgical|orthop|urology|otolaryng|ophthalm/i],
  ['rheumatology', 'Rheumatology', /rheumat/i],
  ['dermatology', 'Dermatology', /dermat|wound/i],
  ['general-medicine', 'General medicine', /internal|hospital|primary|preventive|family|nutrition/i]
].map(([slug, title, pattern]) => ({ slug, title, pattern }));

export const hubsForArticle = (article) => specialtyHubs.filter((hub) => hub.pattern.test(article.specialty || ''));

export const relatedArticleLinks = (article, candidates, limit = 4) => {
  const tags = new Set((article.tags || []).map((tag) => String(tag).toLowerCase()));
  const hubs = new Set(hubsForArticle(article).map((hub) => hub.slug));
  return candidates.filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => ({
      ...candidate,
      score: (candidate.tags || []).filter((tag) => tags.has(String(tag).toLowerCase())).length * 3
        + hubsForArticle(candidate).filter((hub) => hubs.has(hub.slug)).length
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((first, second) => second.score - first.score || first.title.localeCompare(second.title))
    .slice(0, limit)
    .map(({ score, ...candidate }) => candidate);
};
