/**
 * Carousel TypeScript Interfaces
 */

/** DOM element references for the carousel */
export interface CarouselElements {
  carousel: HTMLElement;
  track: HTMLElement;
  slides: NodeListOf<HTMLElement>;
  dotsContainer: HTMLElement | null;
  dots: NodeListOf<HTMLElement> | null;
  prevBtn: HTMLButtonElement | null;
  nextBtn: HTMLButtonElement | null;
  expandTrigger: HTMLButtonElement | null;
  collapseTrigger: HTMLButtonElement | null;
  expandedSection: HTMLElement | null;
}

/** All state variables for the carousel */
export interface CarouselState {
  currentIndex: number;
  slideCount: number;
  isDragging: boolean;
  wasDragging: boolean;
  startX: number;
  currentX: number;
  adjacentIndex: number | null;
  scrollStartY: number;
  isScrollDismissing: boolean;
  expandedTrackHeight: number;
  lastWheelTime: number;
}

/** Optional configuration for the carousel */
export interface CarouselConfig {
  gestureGap?: number;
  animationDuration?: number;
}

/** Cleanup function type */
export type CleanupFn = () => void;

/** Slide transition direction */
export type SlideDirection = 'left' | 'right' | 'fade';

/** Navigation actions returned by createNavigation */
export interface NavigationActions {
  goToSlide: (index: number, direction?: SlideDirection) => void;
  goToNext: () => void;
  goToPrev: () => void;
  updateDots: (index: number) => void;
  updateArrows: () => void;
}

/** Expand/collapse actions */
export interface ExpandCollapseActions {
  expand: () => void;
  collapse: () => void;
}

/** Result from createExpandCollapse */
export interface ExpandCollapseResult {
  actions: ExpandCollapseActions;
  cleanup: CleanupFn;
}
