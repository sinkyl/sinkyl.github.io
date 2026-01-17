/**
 * Carousel Expand/Collapse Functionality
 * Handles expand/collapse states and scroll-to-dismiss behavior
 */

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
    // Capture height after expansion
    requestAnimationFrame(() => {
      state.expandedTrackHeight = track.offsetHeight;
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

  // Click outside to collapse (but not during drag operations)
  function handleClickOutside(e: MouseEvent): void {
    // Ignore if we just finished dragging
    if (state.wasDragging) return;

    if (isExpanded(carousel)) {
      const expandedSection = carousel.querySelector('[data-carousel-expanded]');
      if (expandedSection && !expandedSection.contains(e.target as Node)) {
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
