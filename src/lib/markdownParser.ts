/**
 * Simple Markdown Parser
 * Converts basic markdown to HTML for carousel slides
 */

export interface ParsedSection {
  html: string;
  hasImage: boolean;
}

/**
 * Parse a markdown section into HTML
 * Supports: headings, lists, images with captions, bold, italic
 */
export function parseMarkdownSection(section: string): ParsedSection {
  let html = section.trim();
  let hasImage = false;

  // Check if section has an image
  if (/!\[.*?\]\(.*?\)/.test(html)) {
    hasImage = true;
  }

  // Convert ## headings to styled headers
  html = html.replace(/^## (.+)$/gm, '<h3 class="slide-heading">$1</h3>');

  // Convert ### subheadings
  html = html.replace(/^### (.+)$/gm, '<h4 class="slide-subheading">$1</h4>');

  // Convert bullet lists
  const listRegex = /^((?:- .+\n?)+)/gm;
  html = html.replace(listRegex, (match) => {
    const items = match.split('\n')
      .filter(l => l.trim().startsWith('- '))
      .map(l => `<li>${l.replace(/^- /, '').trim()}</li>`)
      .join('');
    return `<ul class="slide-list">${items}</ul>`;
  });

  // Convert images: ![alt](src) -> figure with optional caption
  // Look for image followed by italic text as caption
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)\n?\*([^*]+)\*/g, (_, alt, src, caption) => {
    return `<figure class="slide-figure">
      <img src="${src}" alt="${alt}" loading="lazy" />
      <figcaption>${caption}</figcaption>
    </figure>`;
  });

  // Convert remaining images without captions
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return `<figure class="slide-figure">
      <img src="${src}" alt="${alt}" loading="lazy" />
    </figure>`;
  });

  // Convert **bold** text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* text (but not already converted captions)
  html = html.replace(/(?<!\<)\*([^*]+)\*(?!\>)/g, '<em>$1</em>');

  // Convert remaining lines to paragraphs (skip already converted elements)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    return `<p>${trimmed}</p>`;
  });

  html = processedLines.filter(l => l).join('\n');

  return { html, hasImage };
}

export interface Slide {
  html: string;
  hasImage: boolean;
}

/**
 * Parse markdown content into slides (separated by ---)
 */
export function parseMarkdownSlides(rawBody: string): Slide[] {
  const sections = rawBody.split(/\n---\n/).filter(s => s.trim());
  const slides: Slide[] = [];

  for (const section of sections) {
    const { html, hasImage } = parseMarkdownSection(section);

    // Wrap in appropriate container based on content
    let slideHtml = '';
    if (hasImage) {
      slideHtml = `<div class="slide-content slide-with-media">${html}</div>`;
    } else {
      slideHtml = `<div class="slide-content slide-text-only">${html}</div>`;
    }

    slides.push({ html: slideHtml, hasImage });
  }

  return slides;
}

/**
 * Extract first paragraph text from parsed slide HTML
 */
export function extractFirstSlideText(slides: Slide[]): string {
  if (slides.length === 0) return '';

  const firstHtml = slides[0].html;
  const textMatch = firstHtml.match(/<p>([^<]+)<\/p>/);
  return textMatch ? textMatch[1] : '';
}
