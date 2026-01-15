/**
 * Description toggle functionality for expandable text sections
 */

import { setupClickOutside } from './domUtils';

export interface DescriptionToggleConfig {
  description: string;
  extendedDescription?: string;
  previewWords?: number;
}

export function initDescriptionToggle(
  containerId: string,
  config: DescriptionToggleConfig
) {
  const { description, extendedDescription = '', previewWords = 21 } = config;

  const descContainer = document.getElementById(containerId);
  const previewEl = descContainer?.querySelector('.description-preview');
  const fullEl = descContainer?.querySelector('.description-full');
  const moreBtn = descContainer?.querySelector('.toggle-more');
  const lessBtn = descContainer?.querySelector('.toggle-less');

  if (!descContainer || !previewEl || !fullEl || !moreBtn || !lessBtn) {
    return;
  }

  const fullText = extendedDescription
    ? `${description} ${extendedDescription.replace(/\n\n/g, ' ')}`
    : description;
  const words = fullText.split(/\s+/);

  if (words.length > previewWords) {
    previewEl.textContent = words.slice(0, previewWords).join(' ') + ' ';
    fullEl.textContent = words.slice(previewWords).join(' ') + ' ';
  } else {
    previewEl.textContent = fullText;
    (moreBtn as HTMLElement).style.display = 'none';
    (lessBtn as HTMLElement).style.display = 'none';
  }

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    descContainer.classList.add('expanded');
  });

  lessBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    descContainer.classList.remove('expanded');
    // Clear hash when collapsing
    if (window.location.hash === '#expanded') {
      history.replaceState(null, '', window.location.pathname);
    }
  });

  // Auto-expand if #expanded hash is present (e.g., from chatbot links)
  if (window.location.hash === '#expanded') {
    descContainer.classList.add('expanded');
  }

  setupClickOutside(descContainer, 'expanded');
}
