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
