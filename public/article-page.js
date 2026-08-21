(() => {
  const initializeActions = () => {
    const status = document.querySelector('.article-share-status');
    const copyButton = document.querySelector('[data-article-copy]');
    const shareButton = document.querySelector('[data-article-share]');
    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setStatus('Link copied');
      } catch {
        window.prompt('Copy this article link', window.location.href);
        setStatus('Link ready to copy');
      }
    };

    if (copyButton && !copyButton.dataset.articleActionReady) {
      copyButton.dataset.articleActionReady = 'true';
      copyButton.addEventListener('click', copyLink);
    }

    if (shareButton && !shareButton.dataset.articleActionReady) {
      shareButton.dataset.articleActionReady = 'true';
      shareButton.addEventListener('click', async () => {
        if (!navigator.share) {
          await copyLink();
          return;
        }

        try {
          await navigator.share({
            title: document.querySelector('h1')?.textContent || document.title,
            text: document.querySelector('meta[name="description"]')?.content || '',
            url: window.location.href
          });
          setStatus('Article shared');
        } catch (error) {
          if (error?.name !== 'AbortError') await copyLink();
        }
      });
    }
  };

  const initializeCitations = () => {
    const wrappers = Array.from(document.querySelectorAll('.cite-wrap'));
    let activeWrapper = null;
    let closeTimer = null;

    const close = (wrapper = activeWrapper) => {
      window.clearTimeout(closeTimer);
      if (wrapper) {
        wrapper.classList.remove('is-cite-open');
        wrapper.querySelector('.cite-btn')?.setAttribute('aria-expanded', 'false');
      }
      if (activeWrapper === wrapper) activeWrapper = null;
    };

    const position = (wrapper) => {
      const trigger = wrapper.querySelector('.cite-btn');
      const popover = wrapper.querySelector('.cite-hover');
      if (!trigger || !popover || window.innerWidth <= 680) return;

      const viewportPadding = 12;
      const gap = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      let left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverRect.width - viewportPadding));

      let top = triggerRect.top - popoverRect.height - gap;
      if (top < viewportPadding) top = triggerRect.bottom + gap;
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - popoverRect.height - viewportPadding));

      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    };

    const open = (wrapper) => {
      window.clearTimeout(closeTimer);
      if (activeWrapper && activeWrapper !== wrapper) close(activeWrapper);
      activeWrapper = wrapper;
      wrapper.classList.add('is-cite-open');
      wrapper.querySelector('.cite-btn')?.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(() => position(wrapper));
    };

    const scheduleClose = (wrapper) => {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => close(wrapper), 240);
    };

    wrappers.forEach((wrapper) => {
      if (wrapper.dataset.citationReady) return;
      wrapper.dataset.citationReady = 'true';
      const trigger = wrapper.querySelector('.cite-btn');
      const popover = wrapper.querySelector('.cite-hover');
      if (!trigger || !popover) return;
      trigger.setAttribute('aria-expanded', 'false');

      wrapper.addEventListener('pointerenter', () => open(wrapper));
      wrapper.addEventListener('pointerleave', () => scheduleClose(wrapper));
      popover.addEventListener('pointerenter', () => open(wrapper));
      popover.addEventListener('pointerleave', () => scheduleClose(wrapper));
      trigger.addEventListener('focus', () => open(wrapper));
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        open(wrapper);
      });
      wrapper.addEventListener('focusout', (event) => {
        if (!wrapper.contains(event.relatedTarget)) scheduleClose(wrapper);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    document.addEventListener('pointerdown', (event) => {
      if (activeWrapper && !activeWrapper.contains(event.target)) close();
    });
    window.addEventListener('resize', () => activeWrapper && position(activeWrapper), { passive: true });
    window.addEventListener('scroll', () => activeWrapper && position(activeWrapper), { passive: true });
  };

  const initializeTableOfContents = () => {
    const toc = document.querySelector('[data-article-toc]');
    if (!toc || toc.dataset.articleTocReady) return;
    toc.dataset.articleTocReady = 'true';

    const details = toc.querySelector('.article-toc-details');
    const links = Array.from(toc.querySelectorAll('[data-article-toc-link]'));
    const targets = links.map((link) => {
      const id = decodeURIComponent(link.getAttribute('href')?.slice(1) || '');
      return { link, target: document.getElementById(id) };
    }).filter((item) => item.target);
    const scroller = document.querySelector('.article-page') || document.documentElement;
    const desktopQuery = window.matchMedia('(min-width: 1021px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = null;

    const update = () => {
      animationFrame = null;
      const isDocumentScroller = scroller === document.documentElement;
      const clientHeight = isDocumentScroller ? window.innerHeight : scroller.clientHeight;
      const scrollerTop = isDocumentScroller ? 0 : scroller.getBoundingClientRect().top;
      const marker = scrollerTop + Math.min(180, clientHeight * 0.24);
      let active = targets[0];
      targets.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= marker) active = item;
      });
      targets.forEach((item) => {
        if (item === active) item.link.setAttribute('aria-current', 'location');
        else item.link.removeAttribute('aria-current');
      });
    };

    const scrollToTarget = (target) => {
      const isDocumentScroller = scroller === document.documentElement;
      const scrollerTop = isDocumentScroller ? 0 : scroller.getBoundingClientRect().top;
      const currentScroll = isDocumentScroller ? window.scrollY : scroller.scrollTop;
      const top = Math.max(0, currentScroll + target.getBoundingClientRect().top - scrollerTop - 24);
      const options = { top, behavior: reducedMotion.matches ? 'auto' : 'smooth' };
      if (isDocumentScroller) window.scrollTo(options);
      else scroller.scrollTo(options);
    };

    const scheduleUpdate = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(update);
    };

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        const id = decodeURIComponent(link.getAttribute('href')?.slice(1) || '');
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
        if (details && !desktopQuery.matches) {
          details.open = false;
          window.requestAnimationFrame(() => scrollToTarget(target));
        } else {
          scrollToTarget(target);
        }
      });
    });

    scroller.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    if (details) details.open = true;
    update();

    const hashId = decodeURIComponent(window.location.hash.slice(1));
    const hashTarget = hashId ? document.getElementById(hashId) : null;
    if (hashTarget) {
      const alignHash = () => window.requestAnimationFrame(() => scrollToTarget(hashTarget));
      if (document.fonts?.ready) document.fonts.ready.then(alignHash, alignHash);
      else alignHash();
    }
  };

  const initialize = () => {
    initializeActions();
    initializeCitations();
    initializeTableOfContents();
  };

  window.__initializeAstraArticle = initialize;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
