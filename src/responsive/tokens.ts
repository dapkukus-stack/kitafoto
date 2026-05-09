/**
 * KitaFoto Responsive Tokens
 * ─────────────────────────────────────────────────────────────
 * Single source of truth untuk semua nilai desain yang adaptive.
 * Tidak ada magic numbers di component — semuanya dari sini.
 *
 * Cara pakai:
 *   import { useTokens } from '@responsive/tokens';
 *   const T = useTokens();
 *   // T.spacing.md, T.font.heroTitle, T.grid.cols, T.touch.minTarget
 *
 * PERFORMA:
 *   useTokens() memanggil useResponsive() yang hanya re-render
 *   saat dimensi berubah. Object tokens di-memoize per breakpoint.
 */

import { useMemo } from 'react';
import { useResponsive, type ResponsiveState } from './useResponsive';
import { bpValue, type Breakpoint } from './breakpoints';
import { Fonts } from '@constants/typography';

// ═══════════════════════════════════════════════════════════════
// TOKEN TYPES
// ═══════════════════════════════════════════════════════════════

export interface SpacingTokens {
  xs:   number;  // 2–4
  sm:   number;  // 4–8
  md:   number;  // 12–16
  lg:   number;  // 20–28
  xl:   number;  // 28–40
  xxl:  number;  // 40–56
  xxxl: number;  // 56–72
  /** Safe area padding horizontal */
  screenH: number;
  /** Safe area padding vertical */
  screenV: number;
}

export interface FontTokens {
  // User-facing (harus besar & mudah dibaca anak SD)
  heroTitle:   number;
  heroSubtitle:number;
  bigButton:   number;
  medButton:   number;
  countdown:   number;
  screenTitle: number;
  bodyLarge:   number;
  body:        number;
  label:       number;
  caption:     number;

  // Admin panel
  adminPageTitle:   number;
  adminSection:     number;
  adminBody:        number;
  adminSmall:       number;
  adminCaption:     number;
  adminButton:      number;
}

export interface TouchTokens {
  /** Minimum tap target size (dp) — WCAG recommends 44, Material 48 */
  minTarget: number;
  /** Hero button height */
  heroBtn:   number;
  /** Large button height */
  largeBtn:  number;
  /** Small button height */
  smallBtn:  number;
  /** Admin button height */
  adminBtn:  number;
  /** Icon button size */
  iconBtn:   number;
}

export interface RadiusTokens {
  sm:     number;
  md:     number;
  lg:     number;
  xl:     number;
  pill:   number;
  circle: number;
}

export interface GridTokens {
  /** Frame picker grid columns */
  frameCols:    number;
  /** Admin stat cards per row */
  statCols:     number;
  /** Card gap */
  cardGap:      number;
  /** Admin menu columns */
  adminMenuCols: number;
}

export interface MascotTokens {
  /** Mascot size untuk layar utama */
  home:       number;
  /** Mascot kecil di corner */
  corner:     number;
  /** Mascot di processing/done screen */
  full:       number;
  /** Mascot di screen kosong/error */
  placeholder: number;
}

export interface LayoutTokens {
  /** Admin sidebar width (hanya di tablet) */
  sidebarW:   number;
  /** Admin header height */
  headerH:    number;
  /** Action bar height bawah */
  actionBarH: number;
  /** Max content width (centering di layar sangat lebar) */
  maxContentW: number;
}

export interface Tokens {
  spacing: SpacingTokens;
  font:    FontTokens;
  touch:   TouchTokens;
  radius:  RadiusTokens;
  grid:    GridTokens;
  mascot:  MascotTokens;
  layout:  LayoutTokens;
  /** Current breakpoint info */
  _bp:  Breakpoint;
  _w:   number;
  _h:   number;
  _isTablet:    boolean;
  _isLandscape: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TOKEN BUILDER — pure function, memo-safe
// ═══════════════════════════════════════════════════════════════

function buildTokens(rs: ResponsiveState): Tokens {
  const { bp, width: w, height: h, isTablet, isLandscape } = rs;

  // ── Spacing ─────────────────────────────────────────────────
  // Scale up dengan device lebih besar, tapi tidak linear agar
  // tidak terasa terlalu longgar di tablet.
  const spacing: SpacingTokens = {
    xs:      bpValue({ xs: 2,  sm: 3,  md: 4,  lg: 4,  xl: 4  }, bp),
    sm:      bpValue({ xs: 6,  sm: 8,  md: 8,  lg: 10, xl: 10 }, bp),
    md:      bpValue({ xs: 10, sm: 12, md: 14, lg: 16, xl: 16 }, bp),
    lg:      bpValue({ xs: 16, sm: 20, md: 22, lg: 24, xl: 28 }, bp),
    xl:      bpValue({ xs: 22, sm: 28, md: 32, lg: 36, xl: 40 }, bp),
    xxl:     bpValue({ xs: 32, sm: 40, md: 44, lg: 48, xl: 56 }, bp),
    xxxl:    bpValue({ xs: 48, sm: 56, md: 60, lg: 64, xl: 72 }, bp),
    screenH: bpValue({ xs: 16, sm: 20, md: 24, lg: 28, xl: 32 }, bp),
    screenV: bpValue({ xs: 12, sm: 16, md: 20, lg: 24, xl: 28 }, bp),
  };

  // ── Font sizes ───────────────────────────────────────────────
  // User fonts harus besar (anak SD baca dari jarak agak jauh).
  // Tablet besar TIDAK harus lebih besar, tapi lebih proporsional.
  const font: FontTokens = {
    // User screens
    heroTitle:    bpValue({ xs: 36, sm: 42, md: 48, lg: 52, xl: 56, xxl: 60 }, bp),
    heroSubtitle: bpValue({ xs: 18, sm: 20, md: 22, lg: 26, xl: 28         }, bp),
    bigButton:    bpValue({ xs: 18, sm: 22, md: 24, lg: 28, xl: 30         }, bp),
    medButton:    bpValue({ xs: 16, sm: 18, md: 20, lg: 22, xl: 24         }, bp),
    countdown:    bpValue({ xs: 80, sm: 110,md: 130,lg: 150,xl: 160        }, bp),
    screenTitle:  bpValue({ xs: 20, sm: 24, md: 26, lg: 30, xl: 32         }, bp),
    bodyLarge:    bpValue({ xs: 15, sm: 17, md: 19, lg: 21, xl: 22         }, bp),
    body:         bpValue({ xs: 13, sm: 15, md: 16, lg: 17, xl: 18         }, bp),
    label:        bpValue({ xs: 12, sm: 13, md: 14, lg: 15, xl: 16         }, bp),
    caption:      bpValue({ xs: 10, sm: 11, md: 11, lg: 12, xl: 12         }, bp),

    // Admin screens
    adminPageTitle: bpValue({ xs: 16, sm: 18, md: 20, lg: 22, xl: 22 }, bp),
    adminSection:   bpValue({ xs: 14, sm: 15, md: 16, lg: 18, xl: 18 }, bp),
    adminBody:      bpValue({ xs: 13, sm: 13, md: 14, lg: 15, xl: 15 }, bp),
    adminSmall:     bpValue({ xs: 11, sm: 12, md: 12, lg: 13, xl: 13 }, bp),
    adminCaption:   bpValue({ xs: 10, sm: 10, md: 11, lg: 11, xl: 11 }, bp),
    adminButton:    bpValue({ xs: 13, sm: 14, md: 15, lg: 16, xl: 16 }, bp),
  };

  // ── Touch targets ────────────────────────────────────────────
  // WCAG 2.5.5: minimum 44×44dp. Material 3: 48dp.
  // Untuk tablet, naikan sedikit agar finger friendly.
  const touch: TouchTokens = {
    minTarget: bpValue({ xs: 48, sm: 48, md: 52, lg: 56, xl: 56 }, bp),
    heroBtn:   bpValue({ xs: 64, sm: 72, md: 80, lg: 88, xl: 88 }, bp),
    largeBtn:  bpValue({ xs: 52, sm: 60, md: 68, lg: 72, xl: 72 }, bp),
    smallBtn:  bpValue({ xs: 44, sm: 48, md: 48, lg: 52, xl: 52 }, bp),
    adminBtn:  bpValue({ xs: 44, sm: 44, md: 48, lg: 48, xl: 48 }, bp),
    iconBtn:   bpValue({ xs: 48, sm: 52, md: 56, lg: 56, xl: 56 }, bp),
  };

  // ── Radius ───────────────────────────────────────────────────
  const radius: RadiusTokens = {
    sm:     bpValue({ xs: 6,   sm: 8,   md: 8,   lg: 10, xl: 10 }, bp),
    md:     bpValue({ xs: 10,  sm: 12,  md: 14,  lg: 16, xl: 16 }, bp),
    lg:     bpValue({ xs: 14,  sm: 18,  md: 20,  lg: 22, xl: 24 }, bp),
    xl:     bpValue({ xs: 20,  sm: 24,  md: 28,  lg: 32, xl: 32 }, bp),
    pill:   50,
    circle: 9999,
  };

  // ── Grid ─────────────────────────────────────────────────────
  const grid: GridTokens = {
    frameCols:     bpValue({ xs: 2, sm: 3, md: 4, lg: 5, xl: 6, xxl: 6 }, bp),
    statCols:      bpValue({ xs: 2, sm: 2, md: 3, lg: 4, xl: 4         }, bp),
    cardGap:       bpValue({ xs: 8, sm: 10,md: 12,lg: 12,xl: 14         }, bp),
    adminMenuCols: bpValue({ xs: 1, sm: 1, md: 2, lg: 2, xl: 3         }, bp),
  };

  // ── Mascot sizes ─────────────────────────────────────────────
  const mascot: MascotTokens = {
    home:        bpValue({ xs: 100, sm: 120, md: 140, lg: 160, xl: 180 }, bp),
    corner:      bpValue({ xs: 60,  sm: 70,  md: 80,  lg: 90,  xl: 100 }, bp),
    full:        bpValue({ xs: 120, sm: 140, md: 160, lg: 180, xl: 200 }, bp),
    placeholder: bpValue({ xs: 80,  sm: 100, md: 120, lg: 130, xl: 140 }, bp),
  };

  // ── Layout ───────────────────────────────────────────────────
  const layout: LayoutTokens = {
    sidebarW:    bpValue({ md: 220, lg: 240, xl: 260, xxl: 280 }, bp),
    headerH:     bpValue({ xs: 52, sm: 56, md: 60, lg: 64, xl: 64 }, bp),
    actionBarH:  bpValue({ xs: 100, sm: 110, md: 120, lg: 120, xl: 120 }, bp),
    maxContentW: bpValue({ xs: 9999, sm: 9999, md: 680, lg: 900, xl: 1100, xxl: 1200 }, bp),
  };

  return {
    spacing, font, touch, radius, grid, mascot, layout,
    _bp: bp, _w: w, _h: h,
    _isTablet: isTablet, _isLandscape: isLandscape,
  };
}

// ── Cache per breakpoint string key ──────────────────────────
// Menghindari rekonstruksi object yang sama berulang kali.
const _cache = new Map<string, Tokens>();

function getCachedTokens(rs: ResponsiveState): Tokens {
  // Cache key: "bp-landscape" — cukup granular
  const key = `${rs.bp}-${rs.isLandscape ? 'l' : 'p'}`;
  if (_cache.has(key)) return _cache.get(key)!;
  const t = buildTokens(rs);
  _cache.set(key, t);
  return t;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * useTokens() — primary hook untuk akses semua design tokens.
 *
 * @example
 *   const T = useTokens();
 *   <View style={{ padding: T.spacing.md }}>
 *   <Text style={{ fontSize: T.font.heroTitle, fontFamily: Fonts.extraBold }}>
 */
export function useTokens(): Tokens {
  const rs = useResponsive();
  // useMemo dengan deps yang stabil — hanya rebuild saat bp/orientation berubah
  return useMemo(() => getCachedTokens(rs), [rs.bp, rs.isLandscape]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Convenience re-exports ────────────────────────────────────
export { Fonts };
