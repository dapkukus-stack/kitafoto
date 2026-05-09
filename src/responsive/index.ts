/**
 * @responsive — barrel export
 * ─────────────────────────────────────────────────────────────
 * Import semua yang dibutuhkan dari satu tempat:
 *
 *   import {
 *     useTokens, useResponsive, useBreakpoint,
 *     bpValue, calcGridItem, Fonts,
 *   } from '@responsive';
 */

// Core hook
export { useResponsive, useBreakpoint, useLayoutMode, useIsTablet, useOrientation } from './useResponsive';
export type { ResponsiveState } from './useResponsive';

// Breakpoints
export { getBreakpoint, getLayoutMode, isTablet, isWide, bpValue, BREAKPOINTS } from './breakpoints';
export type { Breakpoint, LayoutMode } from './breakpoints';

// Tokens
export { useTokens, Fonts } from './tokens';
export type { Tokens, SpacingTokens, FontTokens, TouchTokens, GridTokens } from './tokens';

// Grid helpers
export {
  calcGridItem,
  calcOptimalCols,
  makeGetItemLayout,
  chunkArray,
  shouldShowSidebar,
  adminMenuCols,
  maxContentStyle,
} from './grid';
export type { GridConfig, GridItemDimensions } from './grid';
