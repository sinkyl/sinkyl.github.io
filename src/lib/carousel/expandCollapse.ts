import type { CarouselElements, CarouselState, NavigationActions, ExpandCollapseResult, CleanupFn } from './types';
import { addEventListenerWithCleanup, withStopPropagation, composeCleanup, isExpanded } from './utils';

/** Create expand/collapse functionality for the carousel */
export function createExpandCollapse(
  elements: CarouselElements,
  state: CarouselState,
  navigation: NavigationActions
): ExpandCollapseResult {
  const { carousel, track, expandTrigger, collapseTrigger } = elements;
  const cleanups: CleanupFn[] = [];

  function expand(): void {
    carousel.classList.add('expanded');
    navigation.goToSlide(0);
    state.scrollStartY = window.scrollY;
    state.isScrollDismissing = false;
    track.style.height = '';
    // Capture height after expansion and focus for keyboard nav
    requestAnimationFrame(() => {
      state.expandedTrackHeight = track.offsetHeight;
      carousel.focus();
      // Dispatch event for mermaid and other lazy renderers
      carousel.dispatchEvent(new CustomEvent('carousel:expanded', { bubbles: true }));
    });
  }

  function collapse(): void {
    carousel.classList.remove('expanded');
    track.classList.remove('dismissing');
    state.isScrollDismissing = false;
    track.style.height = '';
    // Scroll to top after layout settles (sticky navbar makes this cleaner)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  // Scroll-to-dismiss: shrink carousel-track as user scrolls
  function handleScrollDismiss(): void {
    if (!isExpanded(carousel)) return;
    if (!state.expandedTrackHeight) return;

    const scrolled = window.scrollY - state.scrollStartY;
    if (scrolled <= 0) {
      // Scrolled up or no scroll - reset
      track.style.height = '';
      track.classList.remove('dismissing');
      state.isScrollDismissing = false;
      return;
    }

    state.isScrollDismissing = true;
    track.classList.add('dismissing');
    const threshold = state.expandedTrackHeight / 2; // Mid of carousel-track

    if (scrolled >= threshold) {
      // Reached mid - collapse completely (collapse() handles scroll back)
      track.style.height = '';
      collapse();
      return;
    }

    // Reduce height proportionally
    const newHeight = state.expandedTrackHeight - scrolled;
    track.style.height = `${newHeight}px`;
  }

  // Click outside to collapse (but not during drag operations, modal or UI interactions)
  function handleClickOutside(e: MouseEvent): void {
    // Ignore if we just finished dragging
    if (state.wasDragging) return;

    const target = e.target as Node;

    // Ignore clicks on mermaid modal (it's outside carousel but shouldn't trigger collapse)
    const mermaidModal = document.getElementById('mermaid-modal');
    if (mermaidModal?.contains(target)) return;

    // Ignore clicks on palette switcher (it's outside carousel but shouldn't trigger collapse)
    const paletteSwitcher = document.getElementById('palette-switcher');
    if (paletteSwitcher?.contains(target)) return;

    // Ignore clicks on theme toggle (it's outside carousel but shouldn't trigger collapse)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle?.contains(target)) return;

    if (isExpanded(carousel)) {
      const expandedSection = carousel.querySelector('[data-carousel-expanded]');
      if (expandedSection && !expandedSection.contains(target)) {
        collapse();
      }
    }
  }

  // Setup event listeners
  cleanups.push(
    addEventListenerWithCleanup(window, 'scroll', handleScrollDismiss, { passive: true })
  );

  if (expandTrigger) {
    cleanups.push(
      addEventListenerWithCleanup(expandTrigger, 'click', withStopPropagation(expand))
    );
  }

  if (collapseTrigger) {
    cleanups.push(
      addEventListenerWithCleanup(collapseTrigger, 'click', withStopPropagation(collapse))
    );
  }

  cleanups.push(
    addEventListenerWithCleanup(document, 'click', handleClickOutside as EventListener)
  );

  return {
    actions: { expand, collapse },
    cleanup: composeCleanup(...cleanups),
  };
}
