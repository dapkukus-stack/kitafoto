/**
 * KitaFoto Dimension Constants — v2 (Responsive)
 * ─────────────────────────────────────────────────────────────
 * File ini sekarang berisi STATIC values saja (shadow, z-index, radius).
 * Nilai yang bergantung pada ukuran layar DIPINDAHKAN ke:
 *   → src/responsive/tokens.ts  (spacing, font, touch, grid, mascot)
 *   → src/responsive/grid.ts    (kalkulasi item width/height)
 *
 * Backward compat:
 *   Spacing, Radius, Shadow, ZIndex, ButtonSize, AdminDimensions
 *   masih diekspor agar kode lama tidak langsung error.
 *   Namun kode baru HARUS pakai useTokens() dari @responsive.
 *
 * @deprecated Spacing, ButtonSize, CardSize — gunakan useTokens()
 */

import { Dimensions } from 'react-native';

// ── Static screen snapshot (hanya untuk initial render) ─────
// Komponen yang butuh live update HARUS pakai useResponsive().
const _w = Dimensions.get('window').width;
const _h = Dimensions.get('window').height;

/** @deprecated Gunakan useResponsive() untuk live updates */
export const Screen = {
  width:       _w,
  height:      _h,
  isLandscape: _w > _h,
} as const;

// ── Static spacing fallback ──────────────────────────────────
// Nilai ini adalah nilai MEDIUM (sm breakpoint) sebagai default.
// Untuk nilai adaptive, gunakan useTokens().spacing
/** @deprecated Gunakan useTokens().spacing */
export const Spacing = {
  xs:   3,
  sm:   8,
  md:   12,
  lg:   20,
  xl:   28,
  xxl:  40,
  xxxl: 56,
} as const;

// ── Border Radius (static — tidak perlu responsive) ──────────
export const Radius = {
  sm:     8,
  md:     12,
  lg:     18,
  xl:     24,
  pill:   50,
  circle: 9999,
} as const;

// ── Shadow (static — elevation tidak berubah per device) ─────
export const Shadow = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  4,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  8,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ── Z-Index (static) ─────────────────────────────────────────
export const ZIndex = {
  base:    0,
  card:    10,
  overlay: 100,
  modal:   200,
  toast:   300,
  kiosk:   999,
} as const;

// ── Button sizes (static fallback — gunakan useTokens().touch) ─
/** @deprecated Gunakan useTokens().touch */
export const ButtonSize = {
  hero:  { height: 72, minWidth: 240, paddingHorizontal: 32, borderRadius: Radius.pill },
  large: { height: 60, minWidth: 180, paddingHorizontal: 28, borderRadius: Radius.pill },
  small: { height: 48, minWidth: 100, paddingHorizontal: 20, borderRadius: Radius.lg   },
  admin: { height: 48, minWidth: 120, paddingHorizontal: 20, borderRadius: Radius.md   },
  icon:  { size:   52, borderRadius: Radius.circle },
} as const;

// ── Admin Panel (static — hanya dipakai saat sidebar visible) ─
export const AdminDimensions = {
  sidebarWidth: 240,
  headerHeight: 60,
  itemHeight:   56,
} as const;

// ── CardSize: REMOVED hardcoded values ───────────────────────
// Gunakan calcGridItem() dari @responsive/grid untuk card dimensions.
// Contoh:
//   const T = useTokens();
//   const { width: cardW, height: cardH } = calcGridItem(screenW, {
//     cols: T.grid.frameCols,
//     gap: T.grid.cardGap,
//     paddingH: T.spacing.screenH,
//     aspectRatio: 1.4,
//   });
