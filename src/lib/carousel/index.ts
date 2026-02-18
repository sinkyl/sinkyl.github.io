import type { CarouselElements, CarouselConfig, CleanupFn } from './types';
import { createCarouselState } from './state';
import { composeCleanup } from './utils';
import { createNavigation, setupNavigationListeners } from './navigation';
import { createExpandCollapse } from './expandCollapse';
import { setupDragSwipe } from './dragSwipe';
import { setupWheelNavigation } from './wheelNavigation';
import { setupKeyboardNavigation } from './keyboardNavigation';

/** Query all carousel DOM elements */
function queryCarouselElements(carousel: HTMLElement): CarouselElements | null {
  const track = carousel.querySelector('[data-carousel-track]') as HTMLElement;
  if (!track) return null;

  const dotsContainer = carousel.querySelector('[data-carousel-dots]') as HTMLElement | null;
  const dots = dotsContainer?.querySelectorAll('.dot') as NodeListOf<HTMLElement> | null;
  const prevBtn = carousel.querySelector('[data-carousel-prev]') as HTMLButtonElement | null;
  const nextBtn = carousel.querySelector('[data-carousel-next]') as HTMLButtonElement | null;
  const expandTrigger = carousel.querySelector('[data-expand-trigger]') as HTMLButtonElement | null;
  const collapseTrigger = carousel.querySelector('[data-collapse-trigger]') as HTMLButtonElement | null;
  const expandedSection = carousel.querySelector('.carousel-expanded') as HTMLElement | null;
  const slides = track.querySelectorAll('.carousel-slide') as NodeListOf<HTMLElement>;

  return {
    carousel,
    track,
    slides,
    dotsContainer,
    dots,
    prevBtn,
    nextBtn,
    expandTrigger,
    collapseTrigger,
    expandedSection,
  };
}

/**
 * Initialize the header carousel with all functionality
 * @param carousel - The carousel container element
 * @param config - Optional configuration
 * @returns Cleanup function to remove all event listeners
 */
export function initHeaderCarousel(carousel: HTMLElement, config: CarouselConfig = {}): CleanupFn | undefined {
  const elements = queryCarouselElements(carousel);
  if (!elements) return;

  const state = createCarouselState(elements.slides.length);

  // Create navigation actions
  const navigation = createNavigation(elements, state);

  // Create expand/collapse functionality
  const { actions: expandCollapseActions, cleanup: expandCollapseCleanup } = createExpandCollapse(
    elements,
    state,
    navigation
  );

  // Setup all event listeners
  const navigationCleanup = setupNavigationListeners(elements, state, navigation);
  const dragSwipeCleanup = setupDragSwipe(elements, state, navigation, config);
  const wheelCleanup = setupWheelNavigation(elements, state, navigation, config);
  const keyboardCleanup = setupKeyboardNavigation(elements, state, navigation, expandCollapseActions);

  // Make carousel focusable
  carousel.setAttribute('tabindex', '0');

  // Initialize arrow states
  navigation.updateArrows();

  // Auto-expand if URL has #expanded hash
  if (window.location.hash === '#expanded') {
    requestAnimationFrame(() => {
      expandCollapseActions.expand();
    });
  }

  // Return combined cleanup function
  return composeCleanup(
    expandCollapseCleanup,
    navigationCleanup,
    dragSwipeCleanup,
    wheelCleanup,
    keyboardCleanup
  );
}

// Re-export types for consumers
export type { CarouselConfig, CleanupFn } from './types';
