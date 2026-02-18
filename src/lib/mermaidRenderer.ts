// Store render function for re-rendering on theme change
let renderMermaidFn: (() => Promise<void>) | null = null;
let modalInitialized = false;

function setupMermaidModal(): void {
  if (modalInitialized) return;
  modalInitialized = true;

  const modal = document.createElement('div');
  modal.id = 'mermaid-modal';
  modal.innerHTML = `
    <div class="mermaid-modal-backdrop"></div>
    <div class="mermaid-modal-content">
      <button class="mermaid-modal-close" aria-label="Close">&times;</button>
      <div class="mermaid-modal-diagram"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const backdrop = modal.querySelector('.mermaid-modal-backdrop')!;
  const closeBtn = modal.querySelector('.mermaid-modal-close')!;

  function closeModal() {
    modal.classList.remove('open');
  }

  backdrop.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

function openMermaidModal(diagramEl: Element): void {
  const modal = document.getElementById('mermaid-modal');
  if (!modal) return;

  const content = modal.querySelector('.mermaid-modal-content') as HTMLElement;
  const container = modal.querySelector('.mermaid-modal-diagram') as HTMLElement;
  if (!content || !container) return;

  const svg = diagramEl.querySelector('svg');
  if (!svg) return;

  const svgRect = svg.getBoundingClientRect();
  const originalWidth = svgRect.width;
  const originalHeight = svgRect.height;
  const aspectRatio = originalWidth / originalHeight;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 60;
  const maxW = vw - margin * 2;
  const maxH = vh - margin * 2;

  let scaledWidth: number;
  let scaledHeight: number;

  if (aspectRatio >= 1) {
    scaledWidth = maxW * 0.9;
    scaledHeight = scaledWidth / aspectRatio;
    if (scaledHeight > maxH) {
      scaledHeight = maxH;
      scaledWidth = scaledHeight * aspectRatio;
    }
  } else {
    scaledHeight = maxH * 0.9;
    scaledWidth = scaledHeight * aspectRatio;
    if (scaledWidth > maxW) {
      scaledWidth = maxW;
      scaledHeight = scaledWidth / aspectRatio;
    }
  }

  container.innerHTML = '';
  const clonedSvg = svg.cloneNode(true) as SVGElement;
  clonedSvg.removeAttribute('width');
  clonedSvg.removeAttribute('height');
  clonedSvg.removeAttribute('style');
  clonedSvg.style.width = `${scaledWidth}px`;
  clonedSvg.style.height = `${scaledHeight}px`;
  container.appendChild(clonedSvg);

  modal.classList.add('open');
}

export async function initMermaidRenderer(): Promise<void> {
  const mermaidBlocks = document.querySelectorAll('pre[data-language="mermaid"]');

  if (mermaidBlocks.length === 0) {
    if (renderMermaidFn && document.querySelectorAll('.mermaid').length > 0) {
      await renderMermaidFn();
    }
    return;
  }

  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');

  function getThemeVars() {
    const styles = getComputedStyle(document.documentElement);
    const get = (name: string) => styles.getPropertyValue(name).trim();

    return {
      // Flowchart
      primaryColor: get('--mermaid-node-bg'),
      primaryTextColor: get('--mermaid-node-text'),
      primaryBorderColor: get('--mermaid-node-border'),
      lineColor: get('--mermaid-edge'),
      secondaryColor: get('--bg'),
      tertiaryColor: get('--bg'),
      background: get('--bg'),
      mainBkg: get('--mermaid-node-bg'),
      nodeBorder: get('--mermaid-node-border'),
      clusterBkg: get('--bg'),
      clusterBorder: get('--mermaid-node-border'),
      titleColor: get('--text'),
      edgeLabelBackground: get('--bg-secondary'),
      // Sequence diagrams
      actorBkg: get('--mermaid-node-bg'),
      actorBorder: get('--mermaid-node-border'),
      actorTextColor: get('--mermaid-node-text'),
      actorLineColor: get('--mermaid-edge'),
      signalColor: get('--text'),
      signalTextColor: get('--text'),
      labelBoxBkgColor: get('--mermaid-node-bg'),
      labelBoxBorderColor: get('--mermaid-node-border'),
      labelTextColor: get('--mermaid-node-text'),
      loopTextColor: get('--text'),
      noteBorderColor: get('--mermaid-node-border'),
      noteTextColor: get('--text'),
      noteBkgColor: get('--bg-secondary'),
      activationBorderColor: get('--mermaid-node-border'),
      activationBkgColor: get('--bg-secondary'),
    };
  }

  mermaidBlocks.forEach((pre, index) => {
    const code = pre.textContent || '';
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.id = `mermaid-${index}`;
    div.setAttribute('data-mermaid-source', code);
    div.textContent = code;
    pre.replaceWith(div);
  });

  async function renderMermaid() {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      flowchart: {
        padding: 20,
        subGraphTitleMargin: { top: 10, bottom: 10 },
        nodeSpacing: 30,
        rankSpacing: 40,
      },
      themeVariables: getThemeVars()
    });

    document.querySelectorAll('.mermaid').forEach((div) => {
      const source = div.getAttribute('data-mermaid-source');
      if (source) {
        div.removeAttribute('data-processed');
        div.innerHTML = source;
      }
    });

    await mermaid.run();

    document.querySelectorAll('.mermaid').forEach((div) => {
      div.setAttribute('data-processed', 'true');

      if (!div.hasAttribute('data-clickable')) {
        div.setAttribute('data-clickable', 'true');
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          openMermaidModal(div);
        });
      }
    });
  }

  setupMermaidModal();
  renderMermaidFn = renderMermaid;
  await renderMermaid();

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTimeout(renderMermaid, 50);
    });
  }

  // also re-render on palette swap
  const paletteObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-palette' || mutation.attributeName === 'data-theme')) {
        setTimeout(renderMermaid, 50);
        break;
      }
    }
  });
  paletteObserver.observe(document.documentElement, { attributes: true });
}
