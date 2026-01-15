/**
 * Initialize and render Mermaid diagrams with theme support
 * Must be called from an inline script since it dynamically imports from CDN
 */
export async function initMermaidRenderer(): Promise<void> {
  // Find all mermaid code blocks (Astro/Shiki uses data-language attribute)
  const mermaidBlocks = document.querySelectorAll('pre[data-language="mermaid"]');

  if (mermaidBlocks.length === 0) return;

  // Dynamically load Mermaid
  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');

  // Read CSS variables at runtime so Mermaid respects theme
  function getThemeVars() {
    const styles = getComputedStyle(document.documentElement);
    const get = (name: string) => styles.getPropertyValue(name).trim();

    return {
      primaryColor: get('--accent'),
      primaryTextColor: get('--text'),
      primaryBorderColor: get('--border'),
      lineColor: get('--text-muted'),
      secondaryColor: get('--bg'),
      tertiaryColor: get('--bg'),
      background: get('--bg'),
      mainBkg: get('--bg'),
      nodeBorder: get('--border'),
      clusterBkg: get('--bg'),
      clusterBorder: get('--border'),
      titleColor: get('--text'),
      edgeLabelBackground: get('--bg-secondary'),
    };
  }

  // Convert code blocks to mermaid divs
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
      themeVariables: getThemeVars()
    });

    // Reset all mermaid divs with source code
    document.querySelectorAll('.mermaid').forEach((div) => {
      const source = div.getAttribute('data-mermaid-source');
      if (source) {
        div.removeAttribute('data-processed');
        div.innerHTML = source;
      }
    });

    await mermaid.run();

    // Mark diagrams as processed for CSS transition
    document.querySelectorAll('.mermaid').forEach((div) => {
      div.setAttribute('data-processed', 'true');
    });
  }

  // Initial render
  await renderMermaid();

  // Listen for theme toggle clicks
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      // Small delay to let theme change apply
      setTimeout(renderMermaid, 50);
    });
  }
}
