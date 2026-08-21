import { useEffect } from 'react';

const useDocumentChromeTheme = (backgroundColor, isDark) => {
  useEffect(() => {
    const root = document.getElementById('root');
    const themeColorMetas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    const elements = [document.documentElement, document.body, root].filter(Boolean);
    const previousBackgrounds = elements.map((element) => element.style.backgroundColor);
    const previousColorScheme = document.documentElement.style.colorScheme;
    const previousThemeColors = themeColorMetas.map((meta) => ({
      content: meta.getAttribute('content'),
      media: meta.getAttribute('media')
    }));

    elements.forEach((element) => {
      element.style.backgroundColor = backgroundColor;
    });
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    themeColorMetas.forEach((meta) => {
      meta.setAttribute('content', backgroundColor);
      meta.removeAttribute('media');
    });

    return () => {
      elements.forEach((element, index) => {
        element.style.backgroundColor = previousBackgrounds[index];
      });
      document.documentElement.style.colorScheme = previousColorScheme;
      themeColorMetas.forEach((meta, index) => {
        const previous = previousThemeColors[index];
        if (previous.content) meta.setAttribute('content', previous.content);
        else meta.removeAttribute('content');
        if (previous.media) meta.setAttribute('media', previous.media);
        else meta.removeAttribute('media');
      });
    };
  }, [backgroundColor, isDark]);
};

export default useDocumentChromeTheme;
