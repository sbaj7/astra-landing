(() => {
  const input = document.querySelector('#article-search');
  const count = document.querySelector('#article-library-count');
  const articles = Array.from(document.querySelectorAll('[data-article-search]'));
  if (!input || !articles.length) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;

    articles.forEach((article) => {
      const matches = !query || article.dataset.articleSearch.includes(query);
      article.hidden = !matches;
      if (matches) visible += 1;
    });

    if (count) count.textContent = `${visible} ${visible === 1 ? 'guide' : 'guides'}`;
  });
})();
