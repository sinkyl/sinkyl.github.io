/**
 * Check if current device is mobile/tablet based on viewport width
 */
export function isMobile(breakpoint: number = 768): boolean {
  return window.innerWidth <= breakpoint;
}

/**
 * Lock or unlock body scroll (useful for modals/overlays on mobile)
 */
export function setBodyScroll(enable: boolean, mobileOnly: boolean = true) {
  if (mobileOnly && !isMobile()) return;
  document.body.style.overflow = enable ? '' : 'hidden';
}

/**
 * Setup click-outside-to-close behavior for an element
 */
export function setupClickOutside(
  element: HTMLElement | null,
  className: string,
  onClose?: () => void
) {
  if (!element) return;

  document.addEventListener('click', (e) => {
    if (element.classList.contains(className) && !element.contains(e.target as Node)) {
      element.classList.remove(className);
      onClose?.();
    }
  });
}

/**
 * Setup a toggle button that adds/removes a class on an element
 */
export function setupToggle(
  trigger: HTMLElement | null,
  target: HTMLElement | null,
  className: string,
  options?: {
    stopPropagation?: boolean;
    closeOnClickOutside?: boolean;
  }
) {
  if (!trigger || !target) return;

  trigger.addEventListener('click', (e) => {
    if (options?.stopPropagation) {
      e.stopPropagation();
    }
    target.classList.toggle(className);
  });

  if (options?.closeOnClickOutside) {
    setupClickOutside(target, className);
  }
}

/**
 * Initialize theme toggle functionality
 */
export function initThemeToggle(toggleId: string = 'theme-toggle') {
  const toggle = document.getElementById(toggleId);

  toggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';

    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    localStorage.setItem('theme', next);
  });
}

/**
 * Initialize dropdown toggle with click-outside-to-close
 */
export function initDropdown(dropdownId: string, toggleSelector: string = '.dropdown-toggle') {
  const dropdown = document.getElementById(dropdownId);
  const toggle = dropdown?.querySelector(toggleSelector) as HTMLElement | null;

  setupToggle(toggle, dropdown, 'open', {
    stopPropagation: true,
    closeOnClickOutside: true
  });
}
