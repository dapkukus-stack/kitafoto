/**
 * KitaFoto Dimension Constants
 * Dioptimasi untuk Samsung Galaxy Tab A9 (11 inch, landscape)
 * Tab A9: 1340 x 800 dp
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Screen ──────────────────────────────────────────────
export const Screen = {
  width: SCREEN_W,
  height: SCREEN_H,
  isLandscape: SCREEN_W > SCREEN_H,
};

// ── Spacing System ──────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ── Border Radius ───────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 50,       // Tombol pill
  circle: 9999,   // Circle
} as const;

// ── Button Sizes (child-friendly = BESAR) ───────────────
export const ButtonSize = {
  // Tombol utama user (layar Yuk Foto, Pilih Frame, dll)
  hero: {
    height: 88,
    minWidth: 280,
    paddingHorizontal: 40,
    borderRadius: Radius.pill,
  },
  // Tombol medium user
  large: {
    height: 72,
    minWidth: 200,
    paddingHorizontal: 32,
    borderRadius: Radius.pill,
  },
  // Tombol back/cancel kecil
  small: {
    height: 48,
    minWidth: 100,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
  },
  // Tombol admin normal
  admin: {
    height: 48,
    minWidth: 120,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
  },
  // Tombol icon saja
  icon: {
    size: 56,
    borderRadius: Radius.circle,
  },
} as const;

// ── Card Sizes ──────────────────────────────────────────
export const CardSize = {
  frameCard: {
    width: (SCREEN_W - Spacing.lg * 2 - Spacing.md * 3) / 4, // 4 kolom
    height: ((SCREEN_W - Spacing.lg * 2 - Spacing.md * 3) / 4) * 1.5, // 3:2 ratio
    borderRadius: Radius.lg,
  },
  statCard: {
    width: (SCREEN_W - Spacing.lg * 2 - Spacing.md * 2) / 3, // 3 kolom
    height: 100,
    borderRadius: Radius.md,
  },
} as const;

// ── Shadow ──────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ── Z-Index ─────────────────────────────────────────────
export const ZIndex = {
  base: 0,
  card: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
  kiosk: 999,
} as const;

// ── Admin Panel ─────────────────────────────────────────
export const AdminDimensions = {
  sidebarWidth: 240,
  headerHeight: 60,
  itemHeight: 56,
} as const;
