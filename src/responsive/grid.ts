/**
 * KitaFoto Responsive Grid Helpers
 * ─────────────────────────────────────────────────────────────
 * Pure functions untuk kalkulasi grid layout.
 * Tidak ada state, tidak ada hooks — bisa dipanggil di mana saja.
 *
 * Semua kalkulasi berdasarkan width yang di-pass, bukan
 * Dimensions.get() langsung — membuat fungsi testable dan
 * bebas dari Dimensions side-effects.
 */

export interface GridConfig {
  cols:        number;
  gap:         number;
  paddingH:    number;
  aspectRatio: number;   // height = width * aspectRatio
}

export interface GridItemDimensions {
  width:  number;
  height: number;
}

/**
 * Hitung dimensi tiap item dalam grid N kolom.
 *
 * @param containerWidth  Lebar container dalam dp
 * @param config          Grid configuration
 * @returns               { width, height } tiap item
 *
 * @example
 *   // Container 800dp, 4 kolom, gap 12, padding 24, ratio 1.4
 *   calcGridItem(800, { cols: 4, gap: 12, paddingH: 24, aspectRatio: 1.4 })
 *   // → { width: 178, height: 249 }
 */
export function calcGridItem(
  containerWidth: number,
  config: GridConfig
): GridItemDimensions {
  const { cols, gap, paddingH, aspectRatio } = config;
  const totalGap   = gap * (cols - 1);
  const usableW    = containerWidth - paddingH * 2 - totalGap;
  const itemW      = Math.floor(usableW / cols);
  const itemH      = Math.floor(itemW * aspectRatio);
  return { width: itemW, height: itemH };
}

/**
 * Hitung berapa kolom yang optimal berdasarkan lebar container
 * dan minimum item width yang diinginkan.
 *
 * @example
 *   calcOptimalCols(800, 150, 12, 24)  → 5 (800 bisa muat 5 item 142dp)
 *   calcOptimalCols(360, 150, 10, 16)  → 2
 */
export function calcOptimalCols(
  containerWidth: number,
  minItemWidth:   number,
  gap:            number,
  paddingH:       number
): number {
  const usable = containerWidth - paddingH * 2;
  // cols * minItemWidth + (cols-1) * gap <= usable
  // cols * (minItemWidth + gap) <= usable + gap
  const cols = Math.floor((usable + gap) / (minItemWidth + gap));
  return Math.max(1, cols);
}

/**
 * Hitung FlatList getItemLayout helper.
 * Memoize function ini di luar component untuk mencegah re-create.
 */
export function makeGetItemLayout(
  itemH: number,
  gap:   number,
  cols:  number
) {
  const rowH = itemH + gap;
  return (_: unknown, index: number) => ({
    length: rowH,
    offset: rowH * Math.floor(index / cols),
    index,
  });
}

/**
 * Bagi array menjadi chunks untuk rendering grid manual.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Tentukan apakah perlu admin sidebar berdasarkan lebar.
 * Sidebar muncul di md+.
 */
export function shouldShowSidebar(widthDp: number): boolean {
  return widthDp >= 600;
}

/**
 * Tentukan column count untuk admin menu cards.
 */
export function adminMenuCols(widthDp: number): number {
  if (widthDp >= 960) return 3;
  if (widthDp >= 600) return 2;
  return 1;
}

/**
 * Safe max width centering — content tidak terlalu meregang
 * di layar sangat lebar (foldable expanded, 13" tablet).
 */
export function maxContentStyle(maxW: number, currentW: number) {
  if (currentW <= maxW) return {};
  return {
    maxWidth: maxW,
    alignSelf: 'center' as const,
    width: '100%' as const,
  };
}
