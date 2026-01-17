/**
 * Header Carousel Controller
 * Handles expand/collapse and fade transitions between slides
 */

export function initHeaderCarousel(carousel: HTMLElement) {
  const track = carousel.querySelector('[data-carousel-track]') as HTMLElement;
  const dotsContainer = carousel.querySelector('[data-carousel-dots]') as HTMLElement;
  const dots = dotsContainer?.querySelectorAll('.dot') as NodeListOf<HTMLElement>;
  const prevBtn = carousel.querySelector('[data-carousel-prev]') as HTMLButtonElement;
  const nextBtn = carousel.querySelector('[data-carousel-next]') as HTMLButtonElement;
  const expandTrigger = carousel.querySelector('[data-expand-trigger]') as HTMLButtonElement;
  const collapseTrigger = carousel.querySelector('[data-collapse-trigger]') as HTMLButtonElement;

  if (!track) return;

  const slides = track.querySelectorAll('.carousel-slide') as NodeListOf<HTMLElement>;
  let currentIndex = 0;
  const slideCount = slides.length;

  // Update active dot
  function updateDots(index: number) {
    if (!dots) return;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  // Update arrow button states
  function updateArrows() {
    if (prevBtn) {
      prevBtn.disabled = currentIndex === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = currentIndex === slideCount - 1;
    }
  }

  // Go to slide with transition
  // direction: 'left' | 'right' | 'fade' (default)
  function goToSlide(index: number, direction: 'left' | 'right' | 'fade' = 'fade') {
    if (index < 0 || index >= slideCount) return;

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

    currentIndex = index;
    updateDots(index);
    updateArrows();
  }

  // Expand/collapse functions
  function expand() {
    carousel.classList.add('expanded');
    goToSlide(0);
  }

  function collapse() {
    carousel.classList.remove('expanded');
  }

  // Handle expand trigger
  expandTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    expand();
  });

  // Handle collapse trigger
  collapseTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    collapse();
  });

  // Click outside to collapse (but not during drag operations)
  let wasDragging = false;

  function handleClickOutside(e: MouseEvent) {
    // Ignore if we just finished dragging
    if (wasDragging) return;

    if (carousel.classList.contains('expanded')) {
      const expandedSection = carousel.querySelector('[data-carousel-expanded]');
      if (expandedSection && !expandedSection.contains(e.target as Node)) {
        collapse();
      }
    }
  }

  document.addEventListener('click', handleClickOutside);

  // Escape key to collapse
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && carousel.classList.contains('expanded')) {
      collapse();
    }
  });

  // Handle dot clicks
  dots?.forEach((dot, index) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(index);
    });
  });

  // Handle arrow clicks
  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    goToSlide(currentIndex - 1);
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    goToSlide(currentIndex + 1);
  });

  // Handle keyboard navigation
  carousel.addEventListener('keydown', (e) => {
    if (!carousel.classList.contains('expanded')) return;

    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      goToSlide(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && currentIndex < slideCount - 1) {
      e.preventDefault();
      goToSlide(currentIndex + 1);
    }
  });

  // Drag/swipe navigation
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let adjacentIndex: number | null = null;

  // Threshold is half the carousel width
  function getSnapThreshold() {
    return track.offsetWidth / 2;
  }

  function handleDragStart(clientX: number) {
    if (!carousel.classList.contains('expanded')) return;
    isDragging = true;
    wasDragging = true;
    adjacentIndex = null;
    startX = clientX;
    currentX = clientX;
    track.style.cursor = 'grabbing';

    // Reset all slide styles and disable transitions during drag
    slides.forEach(slide => {
      slide.style.transition = 'none';
      slide.style.transform = '';
      slide.style.opacity = '';
      slide.style.zIndex = '';
      // Only reset visibility for non-active slides
      if (!slide.classList.contains('active')) {
        slide.style.visibility = '';
      }
    });
  }

  function handleDragMove(clientX: number) {
    if (!isDragging) return;
    currentX = clientX;

    const deltaX = currentX - startX;
    const currentSlide = slides[currentIndex];
    const threshold = getSnapThreshold();
    const absDelta = Math.abs(deltaX);
    const progress = Math.min(1, absDelta / threshold);

    // Determine which adjacent slide to show based on drag direction
    // Dragging left (deltaX < 0) = show next slide (from right)
    // Dragging right (deltaX > 0) = show previous slide (from left)
    let targetIndex: number | null = null;
    let adjacentStartPos: number = 0; // Starting position of adjacent slide (100 or -100)

    if (deltaX < 0 && currentIndex < slideCount - 1) {
      // Dragging left -> next slide comes from right
      targetIndex = currentIndex + 1;
      adjacentStartPos = 100;
    } else if (deltaX > 0 && currentIndex > 0) {
      // Dragging right -> previous slide comes from left
      targetIndex = currentIndex - 1;
      adjacentStartPos = -100;
    }

    // Hide previous adjacent slide if direction changed
    if (adjacentIndex !== null && adjacentIndex !== targetIndex) {
      const oldAdjacent = slides[adjacentIndex];
      oldAdjacent.style.visibility = '';
      oldAdjacent.style.opacity = '';
      oldAdjacent.style.transform = '';
      oldAdjacent.style.zIndex = '';
    }

    // Edge resistance if no adjacent slide
    if (targetIndex === null) {
      adjacentIndex = null;
      currentSlide.style.transform = `translateX(${deltaX * 0.15}px)`;
      currentSlide.style.opacity = '1';
      return;
    }

    adjacentIndex = targetIndex;
    const adjacentSlide = slides[targetIndex];

    // Current slide: moves with drag and fades out (behind)
    currentSlide.style.transform = `translateX(${deltaX}px)`;
    currentSlide.style.opacity = `${1 - progress}`;
    currentSlide.style.zIndex = '1';

    // Adjacent slide: fully visible, moves from its start position toward center (on top)
    adjacentSlide.style.visibility = 'visible';
    adjacentSlide.style.opacity = '1';
    adjacentSlide.style.zIndex = '2';
    // Move from adjacentStartPos (100 or -100) toward 0 based on progress
    const adjacentOffset = adjacentStartPos * (1 - progress);
    adjacentSlide.style.transform = `translateX(${adjacentOffset}%)`;
  }

  function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.style.cursor = '';

    // Reset wasDragging after a short delay to allow click events to be ignored
    setTimeout(() => {
      wasDragging = false;
    }, 100);

    const deltaX = currentX - startX;
    const absDelta = Math.abs(deltaX);
    const threshold = getSnapThreshold();

    // Re-enable transitions for smooth animation
    slides.forEach(slide => {
      slide.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    });

    // Snap when adjacent slide crosses the carousel midpoint (50% position)
    // This happens when we've dragged 25% of the width (threshold / 2)
    const snapThreshold = threshold / 2;
    if (absDelta >= snapThreshold && adjacentIndex !== null) {
      // Snap: adjacent slide becomes active
      completeSnap();
    } else {
      // Revert: current stays active, adjacent goes back
      revertSlides();
    }
  }

  function completeSnap() {
    if (adjacentIndex === null) return;

    const currentSlide = slides[currentIndex];
    const adjacentSlide = slides[adjacentIndex];
    const direction = adjacentIndex > currentIndex ? 'left' : 'right';

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
    setTimeout(() => {
      slides.forEach(slide => {
        slide.style.transform = '';
        slide.style.opacity = '';
        slide.style.visibility = '';
        slide.style.transition = '';
        slide.style.zIndex = '';
      });

      // Update active slide without animation
      slides.forEach(slide => slide.classList.remove('active', 'slide-from-left', 'slide-from-right'));
      adjacentSlide.classList.add('active');
      currentIndex = adjacentIndex!;
      updateDots(currentIndex);
      updateArrows();
      adjacentIndex = null;
    }, 250);
  }

  function revertSlides() {
    const currentSlide = slides[currentIndex];

    // Animate current slide back to center and full opacity
    currentSlide.style.transform = 'translateX(0)';
    currentSlide.style.opacity = '1';

    // Animate adjacent slide back to where it came from
    if (adjacentIndex !== null) {
      const adjacentSlide = slides[adjacentIndex];
      const adjacentStartPos = adjacentIndex > currentIndex ? 100 : -100;
      adjacentSlide.style.transform = `translateX(${adjacentStartPos}%)`;
      adjacentSlide.style.opacity = '0';
    }

    // Clean up after animation
    setTimeout(() => {
      slides.forEach(slide => {
        slide.style.transform = '';
        slide.style.opacity = '';
        slide.style.visibility = '';
        slide.style.transition = '';
        slide.style.zIndex = '';
      });
      adjacentIndex = null;
    }, 250);
  }

  // Mouse events
  track.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  });

  document.addEventListener('mousemove', (e) => {
    handleDragMove(e.clientX);
  });

  document.addEventListener('mouseup', () => {
    handleDragEnd();
  });

  // Touch events
  track.addEventListener('touchstart', (e) => {
    handleDragStart(e.touches[0].clientX);
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    handleDragMove(e.touches[0].clientX);
  }, { passive: true });

  track.addEventListener('touchend', () => {
    handleDragEnd();
  });

  carousel.setAttribute('tabindex', '0');
  updateArrows();
}
