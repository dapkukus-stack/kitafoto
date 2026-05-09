/**
 * KitaFoto Breakpoint System
 * ─────────────────────────────────────────────────────────────
 * Breakpoint berdasarkan LEBAR layar (dp/logical pixels).
 * Mengikuti Material Design 3 + React Native conventions.
 *
 * Catatan orientasi:
 *   - Kita cek width SETELAH rotasi, bukan device type.
 *   - Tablet landscape → width besar → "expanded"
 *   - Phone landscape  → width medium → "medium"
 *   - Ini otomatis correct tanpa cek Platform.OS.
 *
 * Device mapping (portrait, approximate):
 *   xs  < 360  → phone kecil lama (Galaxy A03, Redmi 9C)
 *   sm  360–599 → phone normal (Galaxy A55, Pixel 7)
 *   md  600–719 → phone besar / small tablet (Tab Active)
 *   lg  720–959 → tablet medium (Tab A7 Lite)
 *   xl  960–1279→ tablet besar (Samsung Tab A9, Tab S8)
 *   xxl ≥ 1280 → large tablet / foldable expanded
 */

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Layout mode berdasarkan breakpoint — digunakan untuk switch layout */
export type LayoutMode = 'compact' | 'medium' | 'expanded';

// ── Breakpoint boundaries (min width in dp) ───────────────────
export const BREAKPOINTS: Record<Breakpoint, number> = {
  xs:  0,
  sm:  360,
  md:  600,
  lg:  720,
  xl:  960,
  xxl: 1280,
} as const;

/** Tentukan breakpoint dari lebar layar */
export function getBreakpoint(widthDp: number): Breakpoint {
  if (widthDp >= BREAKPOINTS.xxl) return 'xxl';
  if (widthDp >= BREAKPOINTS.xl)  return 'xl';
  if (widthDp >= BREAKPOINTS.lg)  return 'lg';
  if (widthDp >= BREAKPOINTS.md)  return 'md';
  if (widthDp >= BREAKPOINTS.sm)  return 'sm';
  return 'xs';
}

/** Layout mode dari breakpoint */
export function getLayoutMode(bp: Breakpoint): LayoutMode {
  if (bp === 'xs' || bp === 'sm') return 'compact';
  if (bp === 'md' || bp === 'lg') return 'medium';
  return 'expanded';   // xl, xxl
}

/** Apakah breakpoint merupakan tablet (md+) */
export function isTablet(bp: Breakpoint): boolean {
  return BREAKPOINTS[bp] >= BREAKPOINTS.md;
}

/** Apakah breakpoint layar lebar (lg+) */
export function isWide(bp: Breakpoint): boolean {
  return BREAKPOINTS[bp] >= BREAKPOINTS.lg;
}

/**
 * Ambil nilai dari map breakpoint berdasarkan current breakpoint.
 * Fallback ke breakpoint lebih kecil jika nilai tidak ada.
 *
 * Contoh:
 *   bpValue({ sm: 2, md: 3, xl: 5 }, 'lg') → 3 (fallback ke md)
 *   bpValue({ sm: 2, md: 3, xl: 5 }, 'xl') → 5
 *   bpValue({ sm: 2, md: 3, xl: 5 }, 'xs') → 2 (fallback ke sm)
 */
export function bpValue<T>(
  map: Partial<Record<Breakpoint, T>>,
  current: Breakpoint
): T {
  const ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const idx = ORDER.indexOf(current);

  // Cari dari current turun ke bawah
  for (let i = idx; i >= 0; i--) {
    const key = ORDER[i];
    if (map[key] !== undefined) return map[key] as T;
  }

  // Cari ke atas jika tidak ada di bawah
  for (let i = idx + 1; i < ORDER.length; i++) {
    const key = ORDER[i];
    if (map[key] !== undefined) return map[key] as T;
  }

  throw new Error(`[bpValue] No value found in map: ${JSON.stringify(map)}`);
}
