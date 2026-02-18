/**
 * Date formatting utilities
 * Centralized date formatting to avoid duplication across components
 */

const locale = 'en-US';

/**
 * Long format: "January 15, 2026"
 * Used in: BlogPost header
 */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Short format: "Jan 15, 2026"
 * Used in: PostCard, navigation
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Compact format: "Jan 15"
 * Used in: Latest post widget, tight spaces
 */
export function formatDateCompact(date: Date): string {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * ISO format for datetime attributes
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}
