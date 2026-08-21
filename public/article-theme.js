(() => {
  const page = document.querySelector('.article-page');
  const buttons = Array.from(document.querySelectorAll('[data-article-theme-toggle]'));
  if (!page) return;

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = window.localStorage.getItem('astra-article-theme');
  let preference = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system';

  const applyTheme = () => {
    const isDark = preference === 'dark' || (preference === 'system' && systemTheme.matches);
    const background = isDark ? '#121417' : '#fbfbf9';
    page.dataset.theme = preference;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
    document.getElementById('root')?.style.setProperty('background-color', background);
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.content = background;
      meta.removeAttribute('media');
    });
    buttons.forEach((button) => {
      const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const isDark = preference === 'dark' || (preference === 'system' && systemTheme.matches);
      preference = isDark ? 'light' : 'dark';
      window.localStorage.setItem('astra-article-theme', preference);
      applyTheme();
    });
  });

  systemTheme.addEventListener('change', () => {
    if (preference === 'system') applyTheme();
  });
  applyTheme();
})();
