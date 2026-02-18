interface PaginationConfig {
  totalPages: number;
  postsPerPage: number;
}

function getPageFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get('page') || '1');
  return isNaN(page) || page < 1 ? 1 : page;
}

function setPageInUrl(page: number, replace = false) {
  const url = new URL(window.location.href);
  if (page === 1) {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', String(page));
  }

  if (replace) {
    history.replaceState({ page }, '', url.toString());
  } else {
    history.pushState({ page }, '', url.toString());
  }
}

export function initPagination(containerId: string) {
  const config = (window as any).__paginationConfig?.[containerId] as PaginationConfig | undefined;
  if (!config) return;

  const { totalPages, postsPerPage } = config;

  const container = document.getElementById(containerId);
  const postItems = container?.querySelectorAll('.post-item');
  const weekHeaders = container?.querySelectorAll('.week-header');
  const pagination = document.getElementById(`pagination-${containerId}`);
  const prevBtn = document.getElementById(`prev-btn-${containerId}`) as HTMLButtonElement;
  const nextBtn = document.getElementById(`next-btn-${containerId}`) as HTMLButtonElement;
  const pageIndicator = document.getElementById(`page-indicator-${containerId}`) as HTMLInputElement;

  // Initialize from URL
  let currentPage = Math.min(getPageFromUrl(), totalPages);

  function getIndicatorText() {
    return currentPage === totalPages ? `${currentPage}` : `${currentPage} . . ${totalPages}`;
  }

  function updatePagination() {
    if (!postItems) return;

    // If only one page or no pagination UI, show all posts
    if (totalPages <= 1 || !pageIndicator) {
      postItems.forEach(post => post.classList.add('visible'));
      weekHeaders?.forEach(header => header.classList.add('visible'));
      return;
    }

    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;

    const visibleWeeks = new Set<string>();

    postItems.forEach((post, index) => {
      if (index >= startIndex && index < endIndex) {
        post.classList.add('visible');
        const weekKey = post.getAttribute('data-week');
        if (weekKey) visibleWeeks.add(weekKey);
      } else {
        post.classList.remove('visible');
      }
    });

    let firstVisibleHeader = true;
    weekHeaders?.forEach(header => {
      header.classList.remove('first-visible');
      const weekKey = header.getAttribute('data-week');
      const headerIndex = parseInt(header.getAttribute('data-index') || '0');

      let shouldShow = false;
      if (weekKey && visibleWeeks.has(weekKey) && headerIndex >= startIndex && headerIndex < endIndex) {
        shouldShow = true;
      } else if (weekKey && visibleWeeks.has(weekKey)) {
        const firstPostOfWeek = container?.querySelector(`.post-item[data-week="${weekKey}"].visible`);
        const firstPostIndex = firstPostOfWeek ? parseInt(firstPostOfWeek.getAttribute('data-index') || '0') : -1;
        if (firstPostIndex === startIndex || (headerIndex < startIndex && firstPostIndex >= startIndex)) {
          shouldShow = true;
        }
      }

      if (shouldShow) {
        header.classList.add('visible');
        if (firstVisibleHeader) {
          header.classList.add('first-visible');
          firstVisibleHeader = false;
        }
      } else {
        header.classList.remove('visible');
      }
    });

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    pageIndicator.value = getIndicatorText();
    pageIndicator.readOnly = true;
  }

  function goToPage(page: number, updateUrl = true) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      currentPage = page;
      if (updateUrl) {
        setPageInUrl(currentPage);
      }
      // Scroll to top of page first
      window.scrollTo(0, 0);
      updatePagination();
      // Re-check float visibility after content changes
      requestAnimationFrame(updateFloatVisibility);
    }
  }

  function goToPrevPage() {
    goToPage(currentPage - 1);
  }

  function goToNextPage() {
    goToPage(currentPage + 1);
  }

  // Disable browser's automatic scroll restoration
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || getPageFromUrl();
    goToPage(Math.min(page, totalPages), false);
  });

  prevBtn?.addEventListener('click', goToPrevPage);
  nextBtn?.addEventListener('click', goToNextPage);

  pageIndicator?.addEventListener('click', () => {
    pageIndicator.readOnly = false;
    pageIndicator.value = String(currentPage);
    // Explicit focus needed for mobile keyboard
    pageIndicator.focus();
    pageIndicator.select();
  });

  pageIndicator?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = parseInt(pageIndicator.value);
      if (!isNaN(value) && value >= 1 && value <= totalPages) {
        goToPage(value);
      } else {
        updatePagination();
      }
      pageIndicator.blur();
    } else if (e.key === 'Escape') {
      updatePagination();
      pageIndicator.blur();
    }
  });

  pageIndicator?.addEventListener('blur', () => {
    pageIndicator.value = getIndicatorText();
    pageIndicator.readOnly = true;
  });

  function updateFloatVisibility() {
    if (!pagination || !container) return;

    const isFloating = pagination.classList.contains('floating');
    const containerRect = container.getBoundingClientRect();
    const containerBottom = containerRect.bottom;
    const paginationHeight = pagination.offsetHeight;

    // Hysteresis: different thresholds for floating vs sticking
    // Float when top-mid of pagination area goes below viewport
    // Stick when bottom-mid of pagination area is visible
    const topMidThreshold = containerBottom - paginationHeight / 2;
    const bottomMidThreshold = containerBottom + paginationHeight / 2;

    let shouldFloat: boolean;
    if (isFloating) {
      // Currently floating - stick when bottom-mid is visible
      shouldFloat = bottomMidThreshold > window.innerHeight;
    } else {
      // Currently stuck - float when top-mid goes below viewport
      shouldFloat = topMidThreshold > window.innerHeight;
    }

    pagination.classList.toggle('floating', shouldFloat);
  }

  window.addEventListener('scroll', updateFloatVisibility, { passive: true });
  window.addEventListener('resize', updateFloatVisibility, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (document.activeElement?.tagName === 'INPUT') return;

    if (e.key === 'ArrowLeft') {
      goToPrevPage();
    } else if (e.key === 'ArrowRight') {
      goToNextPage();
    }
  });

  if (postItems && postItems.length > 0) {
    // Set initial state in history (replace, don't push)
    if (currentPage > 1) {
      setPageInUrl(currentPage, true);
    }
    updatePagination();
    updateFloatVisibility();
  }
}
