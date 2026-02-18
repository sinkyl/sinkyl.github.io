import type { CarouselElements, CarouselState, NavigationActions, ExpandCollapseActions, CleanupFn } from './types';
import { addEventListenerWithCleanup, composeCleanup, isExpanded } from './utils';

/** Setup keyboard navigation for the carousel */
export function setupKeyboardNavigation(
  elements: CarouselElements,
  state: CarouselState,
  navigation: NavigationActions,
  expandCollapseActions: ExpandCollapseActions
): CleanupFn {
  const { carousel } = elements;
  const cleanups: CleanupFn[] = [];

  // Escape key to collapse (document level)
  cleanups.push(
    addEventListenerWithCleanup(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded(carousel)) {
        expandCollapseActions.collapse();
      }
    })
  );

  // Arrow keys for navigation (carousel level)
  cleanups.push(
    addEventListenerWithCleanup(carousel, 'keydown', (e: KeyboardEvent) => {
      if (!isExpanded(carousel)) return;

      if (e.key === 'ArrowLeft' && state.currentIndex > 0) {
        e.preventDefault();
        navigation.goToSlide(state.currentIndex - 1);
      } else if (e.key === 'ArrowRight' && state.currentIndex < state.slideCount - 1) {
        e.preventDefault();
        navigation.goToSlide(state.currentIndex + 1);
      }
    })
  );

  return composeCleanup(...cleanups);
}
