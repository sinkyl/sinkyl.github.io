interface PaginationConfig {
  totalPages: number;
  postsPerPage: number;
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

  const paginationFloat = document.getElementById(`pagination-float-${containerId}`);
  const prevBtnFloat = document.getElementById(`prev-btn-float-${containerId}`) as HTMLButtonElement;
  const nextBtnFloat = document.getElementById(`next-btn-float-${containerId}`) as HTMLButtonElement;
  const pageIndicatorFloat = document.getElementById(`page-indicator-float-${containerId}`);

  let currentPage = 1;

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

    if (prevBtnFloat) prevBtnFloat.disabled = currentPage === 1;
    if (nextBtnFloat) nextBtnFloat.disabled = currentPage === totalPages;
    if (pageIndicatorFloat) pageIndicatorFloat.textContent = getIndicatorText();
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      updatePagination();
    }
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      updatePagination();
    }
  }

  prevBtn?.addEventListener('click', goToPrevPage);
  nextBtn?.addEventListener('click', goToNextPage);
  prevBtnFloat?.addEventListener('click', goToPrevPage);
  nextBtnFloat?.addEventListener('click', goToNextPage);

  pageIndicator?.addEventListener('click', () => {
    pageIndicator.readOnly = false;
    pageIndicator.value = String(currentPage);
    pageIndicator.select();
  });

  pageIndicator?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = parseInt(pageIndicator.value);
      if (!isNaN(value) && value >= 1 && value <= totalPages) {
        currentPage = value;
      }
      updatePagination();
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
    if (!pagination || !paginationFloat) return;
    const rect = pagination.getBoundingClientRect();
    const paginationHeight = rect.height;
    const viewportBottom = window.innerHeight;

    const visibleAmount = Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, 0);
    const isHalfVisible = visibleAmount > paginationHeight / 2;

    paginationFloat.classList.toggle('visible', !isHalfVisible);
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
    updatePagination();
    updateFloatVisibility();
  }
}
