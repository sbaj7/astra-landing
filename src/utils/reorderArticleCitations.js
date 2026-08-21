// Reorder citations by order of appearance in the article text content.
export const reorderArticleCitations = (articleData) => {
  if (!articleData || !articleData.references || articleData.references.length === 0) {
    return articleData;
  }

  // Collect all text content from the article
  const textParts = [];

  if (articleData.summary) textParts.push(articleData.summary);
  if (articleData.clinicalQuestion) textParts.push(articleData.clinicalQuestion);

  if (articleData.heroStats) {
    articleData.heroStats.forEach((stat) => {
      if (stat.value) textParts.push(stat.value);
      if (stat.label) textParts.push(stat.label);
    });
  }

  if (articleData.keyMoments) {
    articleData.keyMoments.forEach((moment) => {
      if (moment.title) textParts.push(moment.title);
      if (moment.body) textParts.push(moment.body);
    });
  }

  if (articleData.sections) {
    articleData.sections.forEach((section) => {
      if (section.title) textParts.push(section.title);
      if (section.blurb) textParts.push(section.blurb);
      if (section.body) textParts.push(section.body);
      if (section.content) textParts.push(section.content);

      if (section.steps) {
        section.steps.forEach((step) => {
          if (step.title) textParts.push(step.title);
          if (step.body) textParts.push(step.body);
        });
      }
      if (section.highlights) {
        section.highlights.forEach((highlight) => {
          if (highlight.title) textParts.push(highlight.title);
          if (highlight.body) textParts.push(highlight.body);
        });
      }
      if (section.cards) {
        section.cards.forEach((card) => {
          if (card.title) textParts.push(card.title);
          if (card.items) textParts.push(...card.items);
        });
      }
    });
  }

  const allContent = textParts.join(' ');

  // Find all citations in order of first appearance
  const appearanceOrder = [];
  const seen = new Set();
  const regex = /\[((?:\d+\s*,\s*)*\d+)\]/g;
  let match;

  while ((match = regex.exec(allContent)) !== null) {
    (match[1].match(/\d+/g) || []).forEach((number) => {
      const num = Number.parseInt(number, 10);
      if (!seen.has(num)) {
        appearanceOrder.push(num);
        seen.add(num);
      }
    });
  }

  // Create mapping from old numbers to new sequential numbers
  const numberMap = {};
  appearanceOrder.forEach((oldNum, index) => {
    numberMap[oldNum] = index + 1;
  });

  // Function to renumber text
  const renumberText = (text) => {
    if (!text) return text;
    return text.replace(/\[((?:\d+\s*,\s*)*\d+)\]/g, (full, numberList) => {
      const replacements = (numberList.match(/\d+/g) || []).map((numStr) => {
        const oldNum = Number.parseInt(numStr, 10);
        const newNum = numberMap[oldNum];
        return newNum !== undefined ? `[${newNum}]` : `[${oldNum}]`;
      });
      return replacements.length ? replacements.join('') : full;
    });
  };

  // Create reordered article with renumbered citations in text
  const reorderedArticle = { ...articleData };

  if (reorderedArticle.summary) reorderedArticle.summary = renumberText(reorderedArticle.summary);
  if (reorderedArticle.clinicalQuestion) reorderedArticle.clinicalQuestion = renumberText(reorderedArticle.clinicalQuestion);

  if (reorderedArticle.heroStats) {
    reorderedArticle.heroStats = reorderedArticle.heroStats.map((stat) => ({
      ...stat,
      value: renumberText(stat.value),
      label: renumberText(stat.label)
    }));
  }

  if (reorderedArticle.keyMoments) {
    reorderedArticle.keyMoments = reorderedArticle.keyMoments.map((moment) => ({
      ...moment,
      title: renumberText(moment.title),
      body: renumberText(moment.body)
    }));
  }

  if (reorderedArticle.sections) {
    reorderedArticle.sections = reorderedArticle.sections.map((section) => {
      const newSection = {
        ...section,
        title: renumberText(section.title),
        blurb: renumberText(section.blurb),
        body: renumberText(section.body),
        content: renumberText(section.content)
      };

      if (section.steps) {
        newSection.steps = section.steps.map((step) => ({
          ...step,
          title: renumberText(step.title),
          body: renumberText(step.body)
        }));
      }
      if (section.highlights) {
        newSection.highlights = section.highlights.map((highlight) => ({
          ...highlight,
          title: renumberText(highlight.title),
          body: renumberText(highlight.body)
        }));
      }
      if (section.cards) {
        newSection.cards = section.cards.map((card) => ({
          ...card,
          title: renumberText(card.title),
          items: card.items ? card.items.map((item) => renumberText(item)) : []
        }));
      }

      return newSection;
    });
  }

  // Reorder references array
  const reorderedReferences = articleData.references
    .filter((ref) => seen.has(ref.number))
    .map((ref) => ({
      ...ref,
      number: numberMap[ref.number]
    }))
    .sort((a, b) => a.number - b.number);

  // Add unreferenced citations at the end, preserving their relative order
  const unreferencedRefs = articleData.references
    .filter((ref) => !seen.has(ref.number))
    .map((ref, index) => ({
      ...ref,
      number: appearanceOrder.length + index + 1
    }));

  reorderedArticle.references = [...reorderedReferences, ...unreferencedRefs];

  return reorderedArticle;
};
