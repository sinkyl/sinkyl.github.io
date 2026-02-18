export function initNavIndicator() {
  const navLinksContainer = document.querySelector('.nav-links') as HTMLElement;
  if (!navLinksContainer) return;

  const links = Array.from(document.querySelectorAll('.nav-link')) as HTMLElement[];
  const textSpans = Array.from(document.querySelectorAll('.nav-text')) as HTMLElement[];
  const indicators = textSpans.map(span => span.querySelector('.link-indicator') as HTMLElement);
  const activeIndex = links.findIndex(link => link.classList.contains('active'));

  let lastMouseX = 0;
  let lastHoveredIndex = activeIndex;

  function getOffsetLeft(el: HTMLElement): number {
    const containerRect = navLinksContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return elRect.left - containerRect.left;
  }

  function setIndicatorAnchor(ind: HTMLElement, anchor: 'left' | 'right') {
    if (anchor === 'left') {
      ind.style.left = '0';
      ind.style.right = 'auto';
    } else {
      ind.style.left = 'auto';
      ind.style.right = '0';
    }
  }

  function resetToActive(animate = true) {
    indicators.forEach((ind, i) => {
      if (!ind) return;
      ind.style.transition = animate ? 'width 0.25s ease-out' : 'none';

      if (i === activeIndex) {
        if (lastHoveredIndex < activeIndex) {
          setIndicatorAnchor(ind, 'left');
        } else {
          setIndicatorAnchor(ind, 'right');
        }
        ind.style.width = '100%';
      } else {
        ind.style.width = '0';
      }
    });

    lastHoveredIndex = activeIndex;
  }

  resetToActive(false);

  navLinksContainer.addEventListener('mousemove', (e) => {
    if (links.length < 2) return;
    if ((e.target as HTMLElement).closest?.('.dropdown-menu')) return;

    const containerRect = navLinksContainer.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    lastMouseX = mouseX;

    const firstLink = links[0];
    const lastLink = links[links.length - 1];
    const firstLinkStart = getOffsetLeft(firstLink);
    const lastLinkEnd = getOffsetLeft(lastLink) + lastLink.offsetWidth;

    if (mouseX < firstLinkStart && activeIndex !== 0) {
      const edgeZoneWidth = firstLinkStart;
      const distanceIntoZone = firstLinkStart - mouseX;
      const squeezeProgress = Math.min(distanceIntoZone / edgeZoneWidth, 1);
      const squeezeWidth = (1 - squeezeProgress) * 100;
      const activeWidth = squeezeProgress * 100;

      indicators.forEach((ind, j) => {
        if (!ind) return;
        ind.style.transition = 'none';
        if (j === 0) {
          setIndicatorAnchor(ind, 'right');
          ind.style.width = `${squeezeWidth}%`;
        } else if (j === activeIndex) {
          setIndicatorAnchor(ind, 'left');
          ind.style.width = `${activeWidth}%`;
        } else {
          ind.style.width = '0';
        }
      });

      lastHoveredIndex = squeezeProgress >= 0.5 ? activeIndex : 0;
      return;
    }

    if (mouseX > lastLinkEnd && activeIndex !== links.length - 1) {
      const containerWidth = navLinksContainer.offsetWidth;
      const edgeZoneWidth = containerWidth - lastLinkEnd;
      const distanceIntoZone = mouseX - lastLinkEnd;
      const squeezeProgress = Math.min(distanceIntoZone / edgeZoneWidth, 1);
      const squeezeWidth = (1 - squeezeProgress) * 100;
      const activeWidth = squeezeProgress * 100;

      indicators.forEach((ind, j) => {
        if (!ind) return;
        ind.style.transition = 'none';
        if (j === links.length - 1) {
          setIndicatorAnchor(ind, 'left');
          ind.style.width = `${squeezeWidth}%`;
        } else if (j === activeIndex) {
          setIndicatorAnchor(ind, 'right');
          ind.style.width = `${activeWidth}%`;
        } else {
          ind.style.width = '0';
        }
      });

      lastHoveredIndex = squeezeProgress >= 0.5 ? activeIndex : links.length - 1;
      return;
    }

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const textSpan = textSpans[i];

      const linkStart = getOffsetLeft(link);
      const linkEnd = linkStart + link.offsetWidth;
      const textStart = getOffsetLeft(textSpan);
      const textEnd = textStart + textSpan.offsetWidth;

      if (mouseX >= linkStart && mouseX <= linkEnd) {
        indicators.forEach((ind, j) => {
          if (!ind) return;
          ind.style.transition = 'width 0.15s ease-out';

          if (j === i) {
            if (i < activeIndex) {
              setIndicatorAnchor(ind, 'right');
            } else {
              setIndicatorAnchor(ind, 'left');
            }
            ind.style.width = '100%';
          } else if (j === activeIndex) {
            if (i < activeIndex) {
              setIndicatorAnchor(ind, 'left');
            } else {
              setIndicatorAnchor(ind, 'right');
            }
            ind.style.width = '0';
          } else {
            ind.style.width = '0';
          }
        });

        lastHoveredIndex = i;
        return;
      }

      if (i < links.length - 1) {
        const nextLink = links[i + 1];
        const nextTextSpan = textSpans[i + 1];
        const nextLinkStart = getOffsetLeft(nextLink);
        const nextTextStart = getOffsetLeft(nextTextSpan);

        const gapStart = textEnd;
        const gapEnd = nextTextStart;

        if (mouseX > linkEnd && mouseX < nextLinkStart) {
          const progress = (mouseX - gapStart) / (gapEnd - gapStart);
          const clampedProgress = Math.max(0, Math.min(1, progress));

          const leftWidth = clampedProgress > 0.95 ? 0 : (1 - clampedProgress) * 100;
          const rightWidth = clampedProgress < 0.05 ? 0 : clampedProgress * 100;

          indicators.forEach((ind, j) => {
            if (!ind) return;
            ind.style.transition = 'none';

            if (j === i) {
              setIndicatorAnchor(ind, 'right');
              ind.style.width = `${leftWidth}%`;
            } else if (j === i + 1) {
              setIndicatorAnchor(ind, 'left');
              ind.style.width = `${rightWidth}%`;
            } else {
              ind.style.width = '0';
            }
          });

          lastHoveredIndex = clampedProgress >= 0.5 ? i + 1 : i;
          return;
        }
      }
    }
  });

  navLinksContainer.addEventListener('mouseleave', () => {
    resetToActive(true);
  });
}
