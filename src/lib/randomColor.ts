/**
 * Random color utility for consistent accent colors
 * Used for chat icon, guest bubbles, content indicators, etc.
 */

// Muted color palette
const ACCENT_COLORS = ['#5c7a8a', '#8a7265', '#7a6580'] as const;

/**
 * Get a random accent color from the palette
 */
export function getRandomAccentColor(): string {
  return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
}

/**
 * Apply random accent color to elements matching a selector
 */
export function applyRandomColor(selector: string, property = 'color'): string {
  const color = getRandomAccentColor();
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    (el as HTMLElement).style[property as any] = color;
  });
  return color;
}

/**
 * Set a CSS custom property with a random accent color
 */
export function setRandomColorProperty(element: HTMLElement, propertyName: string): string {
  const color = getRandomAccentColor();
  element.style.setProperty(propertyName, color);
  return color;
}
