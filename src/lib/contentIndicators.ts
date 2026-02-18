export interface ContentIndicators {
  hasImages: boolean;
  hasDiagrams: boolean;
  hasCode: boolean;
}

export function detectContentIndicators(rawContent: string): ContentIndicators {
  // Detect images: ![alt](url) or <img tags
  const hasImages = /!\[.*?\]\(.*?\)|<img\s/i.test(rawContent);

  // Detect mermaid diagrams
  const hasDiagrams = /```mermaid/i.test(rawContent);

  // Detect code blocks (excluding mermaid)
  const codeBlockMatches = rawContent.match(/```(\w*)/g) || [];
  const hasCode = codeBlockMatches.some(match => {
    const lang = match.replace('```', '').toLowerCase();
    return lang && lang !== 'mermaid';
  });

  return { hasImages, hasDiagrams, hasCode };
}
