/**
 * useResponsive — Core responsive hook
 * ─────────────────────────────────────────────────────────────
 * Memberikan informasi layout real-time.
 * RE-RENDER hanya saat dimensi BENAR-BENAR berubah (orientasi rotate,
 * split-screen, dll). Tidak ada re-render saat scroll/animate.
 *
 * Performance contract:
 *   • Dimensi di-cache di module level, bukan state
 *   • Listener Dimensions.onChange di-register SEKALI per app lifecycle
 *   • Component yang pakai hook hanya re-render saat layout berubah
 *   • Tidak ada expensive recalculation pada setiap render
 *
 * Usage:
 *   const { bp, lm, isTablet, width, height, isLandscape } = useResponsive();
 *   const cols = bpValue({ sm: 2, md: 3, xl: 5 }, bp);
 */

import { useState, useEffect, useCallback } from 'react';
import { Dimensions, type ScaledSize } from 'react-native';
import {
  getBreakpoint,
  getLayoutMode,
  isTablet as checkTablet,
  isWide as checkWide,
  type Breakpoint,
  type LayoutMode,
} from './breakpoints';

// ── Module-level cache — shared across all hook instances ─────
// Ini mencegah setiap komponen re-compute hal yang sama.
let _cachedDims = Dimensions.get('window');

function buildState(dims: ScaledSize) {
  const w  = dims.width;
  const h  = dims.height;
  const bp = getBreakpoint(w);
  const lm = getLayoutMode(bp);
  return {
    width:       w,
    height:      h,
    bp,
    lm,
    isLandscape: w > h,
    isTablet:    checkTablet(bp),
    isWide:      checkWide(bp),
    fontScale:   dims.fontScale ?? 1,
  };
}

// ── Shared state subscribers ──────────────────────────────────
// Semua hook instance subscribe ke satu Dimensions listener.
// Ini menghindari N listeners untuk N component yang pakai hook.
let _listeners = new Set<() => void>();
let _registered = false;

function registerGlobalListener() {
  if (_registered) return;
  _registered = true;

  Dimensions.addEventListener('change', ({ window }) => {
    const prev = _cachedDims;
    _cachedDims = window;

    // Hanya notify jika dimensi benar-benar berubah
    if (prev.width !== window.width || prev.height !== window.height) {
      _listeners.forEach(fn => fn());
    }
  });
}

// ── Hook ──────────────────────────────────────────────────────

export interface ResponsiveState {
  width:       number;
  height:      number;
  bp:          Breakpoint;
  lm:          LayoutMode;
  isLandscape: boolean;
  isTablet:    boolean;
  isWide:      boolean;
  fontScale:   number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() =>
    buildState(_cachedDims)
  );

  const handleChange = useCallback(() => {
    const next = buildState(_cachedDims);
    setState(prev => {
      // Structural equality check — jangan trigger re-render kalau sama
      if (
        prev.width       === next.width  &&
        prev.height      === next.height &&
        prev.isLandscape === next.isLandscape
      ) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    registerGlobalListener();
    _listeners.add(handleChange);
    return () => { _listeners.delete(handleChange); };
  }, [handleChange]);

  return state;
}

/**
 * useBreakpoint — lighter version, hanya return breakpoint string.
 * Pakai ini jika hanya butuh breakpoint tanpa info lain.
 */
export function useBreakpoint(): Breakpoint {
  const { bp } = useResponsive();
  return bp;
}

/**
 * useLayoutMode — hanya return 'compact' | 'medium' | 'expanded'
 */
export function useLayoutMode(): LayoutMode {
  const { lm } = useResponsive();
  return lm;
}

/**
 * useIsTablet — boolean saja
 */
export function useIsTablet(): boolean {
  const { isTablet } = useResponsive();
  return isTablet;
}

/**
 * useOrientation — hanya return orientasi
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const { isLandscape } = useResponsive();
  return isLandscape ? 'landscape' : 'portrait';
}
