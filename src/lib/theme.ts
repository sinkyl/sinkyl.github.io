/**
 * Centralized theme configuration
 * All colors, gradients, shadows, and design tokens
 */

// =============================================================================
// BRAND COLORS (One Dark inspired palette)
// =============================================================================

export const COLORS = {
  // Primary palette
  blue: '#61afef',
  purple: '#c678dd',
  orange: '#d19a66',
  green: '#98c379',
  red: '#e06c75',
  cyan: '#56b6c2',
  yellow: '#e5c07b',

  // Neutral palette
  slate: '#64748b',
  muted: '#9ca3af',
  mutedLight: '#656d76',

  // Background colors (dark theme)
  bgDark: '#151719',
  bgSecondaryDark: '#1e2227',
  bgCardDark: 'rgba(30, 34, 39, 0.95)',
  textDark: '#e6edf3',
  borderDark: '#2e3339',

  // Background colors (light theme)
  bgLight: '#f8f7f4',
  bgSecondaryLight: '#fdfcfa',
  bgCardLight: 'rgba(253, 252, 250, 0.95)',
  textLight: '#1f2328',
  borderLight: '#e0ddd8',

  // Accent colors
  accentDark: '#60a5fa',
  accentLight: '#0969da',
} as const;

// =============================================================================
// GRADIENTS
// =============================================================================

export const GRADIENTS = {
  // Primary gradients
  primary: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.purple})`,
  secondary: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.blue})`,
  warm: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
  cool: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`,

  // Text gradient (animated)
  heroText: `linear-gradient(135deg, ${COLORS.slate}, ${COLORS.blue}, ${COLORS.orange}, ${COLORS.green}, ${COLORS.blue}, ${COLORS.slate})`,

  // Philosophy card gradients
  philosophy: {
    detail: [COLORS.red, COLORS.orange],
    ship: [COLORS.blue, COLORS.purple],
    dream: [COLORS.purple, COLORS.blue],
    code: [COLORS.green, COLORS.blue],
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 20px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 32px rgba(0, 0, 0, 0.2)',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const RADIUS = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// =============================================================================
// Z-INDEX HIERARCHY
// =============================================================================

export const Z_INDEX = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  modal: 500,
  chat: 1000,
  tooltip: 1100,
} as const;

// =============================================================================
// SPACING SCALE
// =============================================================================

export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const FONT_SIZE = {
  xs: '0.65rem',
  sm: '0.75rem',
  base: '0.85rem',
  md: '0.9rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const TRANSITIONS = {
  fast: '0.15s ease-out',
  base: '0.2s ease-out',
  slow: '0.3s ease-out',
  slower: '0.5s ease-out',
} as const;

export const TIMING = {
  fast: '0.15s',
  base: '0.2s',
  slow: '0.3s',
  slower: '0.5s',
} as const;

// =============================================================================
// ANIMATION DELAYS (for staggered animations)
// =============================================================================

export const STAGGER_DELAY = {
  fast: 0.05,
  base: 0.08,
  slow: 0.1,
} as const;

// =============================================================================
// CSS VARIABLE HELPERS
// Generate CSS custom properties from theme values
// =============================================================================

export const getCSSVariables = (theme: 'dark' | 'light' = 'dark') => {
  const isDark = theme === 'dark';
  return {
    '--bg': isDark ? COLORS.bgDark : COLORS.bgLight,
    '--bg-secondary': isDark ? COLORS.bgSecondaryDark : COLORS.bgSecondaryLight,
    '--bg-card': isDark ? COLORS.bgCardDark : COLORS.bgCardLight,
    '--text': isDark ? COLORS.textDark : COLORS.textLight,
    '--text-muted': isDark ? COLORS.muted : COLORS.mutedLight,
    '--accent': isDark ? COLORS.accentDark : COLORS.accentLight,
    '--border': isDark ? COLORS.borderDark : COLORS.borderLight,
  };
};

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/** Get color with alpha transparency */
export const withAlpha = (color: string, alpha: number): string => {
  // For hex colors, convert to rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
};

/** Create a color-mix for hover states */
export const hoverMix = (color: string, amount: number = 0.2): string => {
  return `color-mix(in srgb, ${color} ${amount * 100}%, transparent)`;
};
