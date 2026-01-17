/**
 * Carousel Reusable Utilities
 */

import type { CleanupFn } from './types';

/** Reset all inline styles on slides */
export function resetSlideStyles(slides: NodeListOf<HTMLElement>): void {
  slides.forEach(slide => {
    slide.style.transform = '';
    slide.style.opacity = '';
    slide.style.visibility = '';
    slide.style.transition = '';
    slide.style.zIndex = '';
  });
}

/** Disable transitions on slides for drag operations */
export function disableSlideTransitions(slides: NodeListOf<HTMLElement>): void {
  slides.forEach(slide => {
    slide.style.transition = 'none';
    slide.style.transform = '';
    slide.style.opacity = '';
    slide.style.zIndex = '';
  });
}

/** Enable transitions on slides with specified duration */
export function enableSlideTransitions(slides: NodeListOf<HTMLElement>, duration: number = 0.25): void {
  slides.forEach(slide => {
    slide.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
  });
}

/** Add event listener and return cleanup function */
export function addEventListenerWithCleanup<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | Document | Window,
  type: K,
  listener: (ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): CleanupFn {
  element.addEventListener(type, listener as EventListener, options);
  return () => element.removeEventListener(type, listener as EventListener, options);
}

/** Wrapper that stops event propagation */
export function withStopPropagation<E extends Event>(handler: (e: E) => void): (e: E) => void {
  return (e: E) => {
    e.stopPropagation();
    handler(e);
  };
}

/** Combine multiple cleanup functions into one */
export function composeCleanup(...fns: CleanupFn[]): CleanupFn {
  return () => {
    fns.forEach(fn => fn());
  };
}

/** Check if carousel is expanded */
export function isExpanded(carousel: HTMLElement): boolean {
  return carousel.classList.contains('expanded');
}

/** Get the snap threshold (half carousel width) */
export function getSnapThreshold(track: HTMLElement): number {
  return track.offsetWidth / 2;
}
