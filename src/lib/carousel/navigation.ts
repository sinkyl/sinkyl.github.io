import type { CarouselElements, CarouselState, NavigationActions, SlideDirection, CleanupFn } from './types';
import { addEventListenerWithCleanup, withStopPropagation, composeCleanup } from './utils';

/** Create navigation actions for the carousel */
export function createNavigation(
  elements: CarouselElements,
  state: CarouselState
): NavigationActions {
  const { slides, dots, prevBtn, nextBtn } = elements;

  function updateDots(index: number): void {
    if (!dots) return;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function updateArrows(): void {
    if (prevBtn) {
      prevBtn.disabled = state.currentIndex === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = state.currentIndex === state.slideCount - 1;
    }
  }

  function goToSlide(index: number, direction: SlideDirection = 'fade'): void {
    if (index < 0 || index >= state.slideCount) return;

    // Remove entrance classes (keep exit classes for animation)
    slides.forEach(slide => {
      slide.classList.remove('active', 'slide-from-left', 'slide-from-right');
    });

    const nextSlide = slides[index];

    if (direction === 'left') {
      // Dragged left -> slide comes from right
      nextSlide.classList.add('active', 'slide-from-right');
    } else if (direction === 'right') {
      // Dragged right -> slide comes from left
      nextSlide.classList.add('active', 'slide-from-left');
    } else {
      // Fade transition (default)
      nextSlide.classList.add('active');
    }

    state.currentIndex = index;
    updateDots(index);
    updateArrows();
  }

  function goToNext(): void {
    if (state.currentIndex < state.slideCount - 1) {
      goToSlide(state.currentIndex + 1);
    }
  }

  function goToPrev(): void {
    if (state.currentIndex > 0) {
      goToSlide(state.currentIndex - 1);
    }
  }

  return {
    goToSlide,
    goToNext,
    goToPrev,
    updateDots,
    updateArrows,
  };
}

/** Setup navigation event listeners (dots, arrows) */
export function setupNavigationListeners(
  elements: CarouselElements,
  state: CarouselState,
  navigation: NavigationActions
): CleanupFn {
  const { dots, prevBtn, nextBtn } = elements;
  const cleanups: CleanupFn[] = [];

  // Handle dot clicks
  if (dots) {
    dots.forEach((dot, index) => {
      cleanups.push(
        addEventListenerWithCleanup(dot, 'click', withStopPropagation(() => {
          navigation.goToSlide(index);
        }))
      );
    });
  }

  // Handle arrow clicks
  if (prevBtn) {
    cleanups.push(
      addEventListenerWithCleanup(prevBtn, 'click', withStopPropagation(() => {
        navigation.goToSlide(state.currentIndex - 1);
      }))
    );
  }

  if (nextBtn) {
    cleanups.push(
      addEventListenerWithCleanup(nextBtn, 'click', withStopPropagation(() => {
        navigation.goToSlide(state.currentIndex + 1);
      }))
    );
  }

  return composeCleanup(...cleanups);
}
