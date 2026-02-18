import type { CarouselElements, CarouselState, NavigationActions, CarouselConfig, CleanupFn } from './types';
import {
  addEventListenerWithCleanup,
  composeCleanup,
  isExpanded,
  disableSlideTransitions,
  enableSlideTransitions,
  resetSlideStyles,
  getSnapThreshold,
} from './utils';

const DEFAULT_ANIMATION_DURATION = 0.25;

/** Setup drag/swipe gesture handling */
export function setupDragSwipe(
  elements: CarouselElements,
  state: CarouselState,
  navigation: NavigationActions,
  config: CarouselConfig = {}
): CleanupFn {
  const { carousel, track, slides } = elements;
  const animationDuration = config.animationDuration ?? DEFAULT_ANIMATION_DURATION;
  const animationMs = animationDuration * 1000;
  const cleanups: CleanupFn[] = [];

  function handleDragStart(clientX: number): void {
    if (!isExpanded(carousel)) return;
    state.isDragging = true;
    state.wasDragging = true;
    state.adjacentIndex = null;
    state.startX = clientX;
    state.currentX = clientX;
    track.style.cursor = 'grabbing';

    // Reset all slide styles and disable transitions during drag
    disableSlideTransitions(slides);
    slides.forEach(slide => {
      // Only reset visibility for non-active slides
      if (!slide.classList.contains('active')) {
        slide.style.visibility = '';
      }
    });
  }

  function handleDragMove(clientX: number): void {
    if (!state.isDragging) return;
    state.currentX = clientX;

    const deltaX = state.currentX - state.startX;
    const currentSlide = slides[state.currentIndex];
    const threshold = getSnapThreshold(track);
    const absDelta = Math.abs(deltaX);
    const progress = Math.min(1, absDelta / threshold);

    // Determine which adjacent slide to show based on drag direction
    // Dragging left (deltaX < 0) = show next slide (from right)
    // Dragging right (deltaX > 0) = show previous slide (from left)
    let targetIndex: number | null = null;
    let adjacentStartPos: number = 0; // Starting position of adjacent slide (100 or -100)

    if (deltaX < 0 && state.currentIndex < state.slideCount - 1) {
      // Dragging left -> next slide comes from right
      targetIndex = state.currentIndex + 1;
      adjacentStartPos = 100;
    } else if (deltaX > 0 && state.currentIndex > 0) {
      // Dragging right -> previous slide comes from left
      targetIndex = state.currentIndex - 1;
      adjacentStartPos = -100;
    }

    // Hide previous adjacent slide if direction changed
    if (state.adjacentIndex !== null && state.adjacentIndex !== targetIndex) {
      const oldAdjacent = slides[state.adjacentIndex];
      oldAdjacent.classList.remove('sliding-in-from-left', 'sliding-in-from-right');
      oldAdjacent.style.visibility = '';
      oldAdjacent.style.opacity = '';
      oldAdjacent.style.transform = '';
      oldAdjacent.style.zIndex = '';
    }

    // Edge resistance if no adjacent slide
    if (targetIndex === null) {
      state.adjacentIndex = null;
      currentSlide.style.transform = `translateX(${deltaX * 0.15}px)`;
      currentSlide.style.opacity = '1';
      return;
    }

    state.adjacentIndex = targetIndex;
    const adjacentSlide = slides[targetIndex];

    // Current slide: moves with drag and fades out (behind)
    currentSlide.style.transform = `translateX(${deltaX}px)`;
    currentSlide.style.opacity = `${1 - progress}`;
    currentSlide.style.zIndex = '1';

    // Adjacent slide: fully visible, moves from its start position toward center (on top)
    adjacentSlide.style.visibility = 'visible';
    adjacentSlide.style.opacity = '1';
    adjacentSlide.style.zIndex = '2';

    // Add sliding indicator class to adjacent slide
    adjacentSlide.classList.remove('sliding-in-from-left', 'sliding-in-from-right');
    if (adjacentStartPos < 0) {
      // Coming from left
      adjacentSlide.classList.add('sliding-in-from-left');
    } else {
      // Coming from right
      adjacentSlide.classList.add('sliding-in-from-right');
    }

    // Move from adjacentStartPos (100 or -100) toward 0 based on progress
    const adjacentOffset = adjacentStartPos * (1 - progress);
    adjacentSlide.style.transform = `translateX(${adjacentOffset}%)`;
  }

  function completeSnap(): void {
    if (state.adjacentIndex === null) return;

    const currentSlide = slides[state.currentIndex];
    const adjacentSlide = slides[state.adjacentIndex];
    const direction = state.adjacentIndex > state.currentIndex ? 'left' : 'right';

    // Ensure adjacent slide is visible for animation
    adjacentSlide.style.visibility = 'visible';
    adjacentSlide.style.zIndex = '2';
    currentSlide.style.zIndex = '1';

    // Animate current slide out
    currentSlide.style.transform = direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
    currentSlide.style.opacity = '0';

    // Animate adjacent slide to center
    adjacentSlide.style.transform = 'translateX(0)';
    adjacentSlide.style.opacity = '1';

    // After animation, update state
    const newIndex = state.adjacentIndex;
    setTimeout(() => {
      resetSlideStyles(slides);

      // Update active slide without animation
      slides.forEach(slide => slide.classList.remove('active', 'slide-from-left', 'slide-from-right', 'sliding-in-from-left', 'sliding-in-from-right'));
      adjacentSlide.classList.add('active');
      state.currentIndex = newIndex;
      navigation.updateDots(state.currentIndex);
      navigation.updateArrows();
      state.adjacentIndex = null;
    }, animationMs);
  }

  function revertSlides(): void {
    const currentSlide = slides[state.currentIndex];

    // Animate current slide back to center and full opacity
    currentSlide.style.transform = 'translateX(0)';
    currentSlide.style.opacity = '1';

    // Animate adjacent slide back to where it came from
    if (state.adjacentIndex !== null) {
      const adjacentSlide = slides[state.adjacentIndex];
      const adjacentStartPos = state.adjacentIndex > state.currentIndex ? 100 : -100;
      adjacentSlide.style.transform = `translateX(${adjacentStartPos}%)`;
      adjacentSlide.style.opacity = '0';
    }

    // Clean up after animation
    setTimeout(() => {
      resetSlideStyles(slides);
      state.adjacentIndex = null;
    }, animationMs);
  }

  function handleDragEnd(): void {
    if (!state.isDragging) return;
    state.isDragging = false;
    track.style.cursor = '';

    // Remove sliding indicator classes from adjacent slide
    if (state.adjacentIndex !== null) {
      slides[state.adjacentIndex].classList.remove('sliding-in-from-left', 'sliding-in-from-right');
    }

    // Reset wasDragging after a short delay to allow click events to be ignored
    setTimeout(() => {
      state.wasDragging = false;
    }, 100);

    const deltaX = state.currentX - state.startX;
    const absDelta = Math.abs(deltaX);
    const threshold = getSnapThreshold(track);

    // Re-enable transitions for smooth animation
    enableSlideTransitions(slides, animationDuration);

    // Snap when adjacent slide crosses the carousel midpoint (50% position)
    // This happens when we've dragged 25% of the width (threshold / 2)
    const snapThreshold = threshold / 2;
    if (absDelta >= snapThreshold && state.adjacentIndex !== null) {
      // Snap: adjacent slide becomes active
      completeSnap();
    } else {
      // Revert: current stays active, adjacent goes back
      revertSlides();
    }
  }

  // Mouse events
  cleanups.push(
    addEventListenerWithCleanup(track, 'mousedown', (e: MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX);
    })
  );

  cleanups.push(
    addEventListenerWithCleanup(document, 'mousemove', (e: MouseEvent) => {
      handleDragMove(e.clientX);
    })
  );

  cleanups.push(
    addEventListenerWithCleanup(document, 'mouseup', () => {
      handleDragEnd();
    })
  );

  // Touch events
  cleanups.push(
    addEventListenerWithCleanup(track, 'touchstart', (e: TouchEvent) => {
      handleDragStart(e.touches[0].clientX);
    }, { passive: true })
  );

  cleanups.push(
    addEventListenerWithCleanup(track, 'touchmove', (e: TouchEvent) => {
      handleDragMove(e.touches[0].clientX);
    }, { passive: true })
  );

  cleanups.push(
    addEventListenerWithCleanup(track, 'touchend', () => {
      handleDragEnd();
    })
  );

  return composeCleanup(...cleanups);
}
