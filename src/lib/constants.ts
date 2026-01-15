/**
 * Shared constants across the application
 */

// Re-export theme tokens for convenience
export {
  COLORS,
  GRADIENTS,
  SHADOWS,
  RADIUS,
  Z_INDEX,
  SPACING,
  FONT_SIZE,
  TRANSITIONS,
  TIMING,
  STAGGER_DELAY,
} from './theme';

// =============================================================================
// APPLICATION CONSTANTS
// =============================================================================

export const POSTS_PER_PAGE = 6;

export const CONTAINER_IDS = {
  posts: 'posts-container',
  chat: 'chat-panel',
} as const;

// =============================================================================
// BREAKPOINTS (in pixels)
// =============================================================================

export const BREAKPOINTS = {
  xs: 400,
  sm: 480,
  md: 600,
  lg: 768,
  xl: 900,
  xxl: 1200,
} as const;

// =============================================================================
// ANIMATION DURATIONS (in seconds)
// =============================================================================

export const ANIMATION_DURATION = {
  instant: 0,
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  slower: 0.5,
  gradient: 10,
  colorCycle: 16,
} as const;

// =============================================================================
// SITE METADATA
// =============================================================================

export const SITE = {
  title: 'sinkyl Devlog',
  titleSuffix: ' — sinkyl Devlog',
  author: 'Sinan',
} as const;

// =============================================================================
// TECH STACK
// =============================================================================

export const TECH_STACK = [
  'C',
  'C#',
  'Rust',
  'Python',
  'TypeScript',
  '.NET',
  'Tauri',
  'gRPC',
  'Docker',
  'Kubernetes',
  'SQL',
  'NoSQL',
  'VHDL',
] as const;
