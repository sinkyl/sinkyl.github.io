export interface ModalOptions {
  lockScroll?: boolean;
  openClass?: string;
  ariaHidden?: boolean;
}

const defaultOptions: ModalOptions = {
  lockScroll: true,
  openClass: 'open',
  ariaHidden: true,
};

export function createModalManager(elementId: string, options: ModalOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  function getElement(): HTMLElement | null {
    return document.getElementById(elementId);
  }

  function open() {
    const element = getElement();
    if (!element) return;

    element.classList.add(opts.openClass!);

    if (opts.ariaHidden) {
      element.setAttribute('aria-hidden', 'false');
    }

    if (opts.lockScroll) {
      document.body.style.overflow = 'hidden';
    }
  }

  function close() {
    const element = getElement();
    if (!element) return;

    element.classList.remove(opts.openClass!);

    if (opts.ariaHidden) {
      element.setAttribute('aria-hidden', 'true');
    }

    if (opts.lockScroll) {
      document.body.style.overflow = '';
    }
  }

  function toggle() {
    const element = getElement();
    if (!element) return;

    if (element.classList.contains(opts.openClass!)) {
      close();
    } else {
      open();
    }
  }

  function isOpen(): boolean {
    const element = getElement();
    return element?.classList.contains(opts.openClass!) ?? false;
  }

  return {
    open,
    close,
    toggle,
    isOpen,
    getElement,
  };
}

export function initModal(
  modalId: string,
  triggerId: string,
  options: ModalOptions = {}
) {
  const manager = createModalManager(modalId, options);
  const modal = manager.getElement();
  const trigger = document.getElementById(triggerId);
  const closeBtn = modal?.querySelector('.modal-close');
  const backdrop = modal?.querySelector('.modal-backdrop');

  trigger?.addEventListener('click', manager.open);
  closeBtn?.addEventListener('click', manager.close);
  backdrop?.addEventListener('click', manager.close);

  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && manager.isOpen()) {
      manager.close();
    }
  };

  document.addEventListener('keydown', escapeHandler);

  return {
    ...manager,
    destroy() {
      trigger?.removeEventListener('click', manager.open);
      closeBtn?.removeEventListener('click', manager.close);
      backdrop?.removeEventListener('click', manager.close);
      document.removeEventListener('keydown', escapeHandler);
    },
  };
}

// lightweight toggle for panels/dropdowns
export function createPanelToggle(elementId: string, openClass = 'open') {
  return createModalManager(elementId, {
    lockScroll: false,
    ariaHidden: false,
    openClass,
  });
}
