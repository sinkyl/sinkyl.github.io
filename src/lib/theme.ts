// brand colors (one dark inspired)

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

// gradients

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

// shadows

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 20px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 32px rgba(0, 0, 0, 0.2)',
} as const;

// border radius

export const RADIUS = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// z-index

export const Z_INDEX = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  modal: 500,
  chat: 1000,
  tooltip: 1100,
} as const;

// spacing

export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
} as const;

// typography

export const FONT_SIZE = {
  xs: '0.65rem',    // 10.4px - tiny labels
  sm: '0.7rem',     // 11.2px - small labels, badges
  'sm-md': '0.75rem', // 12px - slightly larger small text
  base: '0.85rem',  // 13.6px - default body text
  md: '0.9rem',     // 14.4px - emphasized text
  'md-lg': '0.95rem', // 15.2px - descriptions, indicators
  lg: '1rem',       // 16px - large text
  xl: '1.25rem',    // 20px - h3
  '2xl': '1.5rem',  // 24px - h2
  '3xl': '2rem',    // 32px - h1
  '4xl': '2.5rem',  // 40px - hero h1
} as const;

// opacity

export const OPACITY = {
  disabled: 0.3,
  muted: 0.5,
  soft: 0.6,
  medium: 0.7,
  high: 0.8,
  full: 1,
} as const;

// transitions

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

// stagger delays

export const STAGGER_DELAY = {
  fast: 0.05,
  base: 0.08,
  slow: 0.1,
} as const;
