/**
 * Carousel State Management
 */

import type { CarouselState } from './types';

/** Factory function to create initial carousel state */
export function createCarouselState(slideCount: number): CarouselState {
  return {
    currentIndex: 0,
    slideCount,
    isDragging: false,
    wasDragging: false,
    startX: 0,
    currentX: 0,
    adjacentIndex: null,
    scrollStartY: 0,
    isScrollDismissing: false,
    expandedTrackHeight: 0,
    lastWheelTime: 0,
  };
}
