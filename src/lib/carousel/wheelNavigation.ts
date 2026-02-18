import type { CarouselElements, CarouselState, NavigationActions, CarouselConfig, CleanupFn } from './types';
import { addEventListenerWithCleanup, isExpanded } from './utils';

const DEFAULT_GESTURE_GAP = 200; // ms between gestures

/** Setup wheel navigation for the carousel */
export function setupWheelNavigation(
  elements: CarouselElements,
  state: CarouselState,
  navigation: NavigationActions,
  config: CarouselConfig = {}
): CleanupFn {
  const { carousel, expandedSection } = elements;
  const gestureGap = config.gestureGap ?? DEFAULT_GESTURE_GAP;

  if (!expandedSection) {
    return () => {};
  }

  function handleWheel(e: WheelEvent): void {
    if (!isExpanded(carousel)) return;

    const now = Date.now();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

    const canGoNext = state.currentIndex < state.slideCount - 1;
    const canGoPrev = state.currentIndex > 0;

    // At boundary - allow page scroll
    if ((delta > 0 && !canGoNext) || (delta < 0 && !canGoPrev)) {
      return;
    }

    e.preventDefault();

    // Only respond to first event of a new gesture
    if (now - state.lastWheelTime < gestureGap) return;
    state.lastWheelTime = now;

    if (delta > 0 && canGoNext) {
      navigation.goToSlide(state.currentIndex + 1, 'left');
    } else if (delta < 0 && canGoPrev) {
      navigation.goToSlide(state.currentIndex - 1, 'right');
    }
  }

  return addEventListenerWithCleanup(expandedSection, 'wheel', handleWheel, { passive: false });
}
