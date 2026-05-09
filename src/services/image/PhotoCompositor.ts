/**
 * PhotoCompositor
 * ─────────────────────────────────────────────────────────────
 * Composite foto + frame overlay menggunakan Skia offscreen canvas.
 * GPU-accelerated, non-blocking JS thread, AI-ready.
 *
 * Why Skia:
 *   • GPU compositing via Metal/Vulkan
 *   • ColorMatrix untuk filter (bright, sweet, B&W)
 *   • Offscreen canvas — tidak perlu render ke layar
 *   • Mudah tambah AI layer nanti (blur, face mesh, dll)
 *   • Hemat RAM: tidak ada bitmap besar di JS heap
 *
 * Layout engine:
 *   strip_vertical   — foto disusun vertikal, frame overlay di atas
 *   strip_horizontal — foto disusun horizontal
 *   single           — 1 foto besar + frame
 *   grid_2x2         — 4 foto dalam grid 2×2
 *   two_photos       — 2 foto side-by-side
 *
 * Output: JPEG di outputPath, compressed sesuai config.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem       from 'expo-file-system';
import type { LayoutType, FilterType } from '@constants/config';

// ── Skia lazy import ──────────────────────────────────────────
// Tidak import di module level agar:
//   1. Tree-shakeable saat testing
//   2. Tidak crash di environment tanpa native Skia
let SkiaModule: typeof import('@shopify/react-native-skia') | null = null;

async function loadSkia() {
  if (SkiaModule) return SkiaModule;
  try {
    SkiaModule = await import('@shopify/react-native-skia');
    return SkiaModule;
  } catch {
    console.warn('[PhotoCompositor] Skia tidak tersedia, fallback ke ImageManipulator');
    return null;
  }
}

// ── Canvas dimensions ─────────────────────────────────────────
// Strip photobooth 4R landscape (6×4") @ 200dpi = 1200×800
// Kita pakai dimensi virtual, output di-resize ke target size
const STRIP_W  = 800;   // px — lebar strip
const STRIP_H_PER_PHOTO = 560;  // px per foto dalam strip
const STRIP_PADDING     = 16;   // px padding antar foto + tepi
const WATERMARK_H       = 40;   // px area watermark bawah

// ─────────────────────────────────────────────────────────────

export interface CompositorInput {
  photoPaths: string[];     // 1–4 compressed photo paths
  framePath:  string;       // Local PNG transparent frame
  outputPath: string;       // Target JPEG output
  layout:     LayoutType;
  filter:     FilterType;
  /** Optional: nama event untuk watermark */
  eventName?: string;
  /** Optional: tampilkan tanggal */
  showDate?:  boolean;
}

// ─────────────────────────────────────────────────────────────

class PhotoCompositorClass {

  /**
   * Entry point — pilih engine berdasarkan ketersediaan Skia.
   * Returns true jika berhasil, false jika gagal.
   */
  async compose(input: CompositorInput): Promise<boolean> {
    const skia = await loadSkia();

    if (skia) {
      return this.composeWithSkia(skia, input);
    } else {
      // Fallback: ImageManipulator based compose
      return this.composeWithManipulator(input);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SKIA COMPOSITOR (primary path)
  // ═══════════════════════════════════════════════════════════

  private async composeWithSkia(
    skia: typeof import('@shopify/react-native-skia'),
    input: CompositorInput
  ): Promise<boolean> {
    const { Skia, Canvas, Image: SkiaImage, Paint, makeImageFromEncoded } = skia;

    try {
      const dims   = this.getCanvasDimensions(input.layout, input.photoPaths.length);
      const surface = Skia.Surface.Make(dims.width, dims.height);
      if (!surface) throw new Error('Skia surface creation failed');

      const canvas = surface.getCanvas();

      // 1. Background putih
      canvas.drawColor(Skia.Color('white'));

      // 2. Gambar foto sesuai layout
      const photoRects = this.getPhotoRects(input.layout, input.photoPaths.length, dims);

      for (let i = 0; i < input.photoPaths.length; i++) {
        const rect      = photoRects[i];
        if (!rect) continue;

        const imgBytes  = await FileSystem.readAsStringAsync(
          input.photoPaths[i],
          { encoding: FileSystem.EncodingType.Base64 }
        );
        const data      = Skia.Data.fromBase64(imgBytes);
        const skImg     = makeImageFromEncoded(data);

        if (!skImg) continue;

        const paint = Skia.Paint();

        // Apply color filter
        const colorFilter = this.buildColorFilter(skia, input.filter);
        if (colorFilter) paint.setColorFilter(colorFilter);

        // Draw foto dengan clipping rounded corners
        const rrect = Skia.RRectXY(
          Skia.XYWHRect(rect.x, rect.y, rect.w, rect.h),
          8, 8
        );
        canvas.save();
        canvas.clipRRect(rrect, skia.ClipOp.Intersect, true);
        canvas.drawImageRect(
          skImg,
          Skia.XYWHRect(0, 0, skImg.width(), skImg.height()),
          Skia.XYWHRect(rect.x, rect.y, rect.w, rect.h),
          paint
        );
        canvas.restore();
      }

      // 3. Frame overlay (PNG transparan di atas semua foto)
      try {
        const frameBytes = await FileSystem.readAsStringAsync(
          input.framePath,
          { encoding: FileSystem.EncodingType.Base64 }
        );
        const frameData  = Skia.Data.fromBase64(frameBytes);
        const frameImg   = makeImageFromEncoded(frameData);

        if (frameImg) {
          canvas.drawImageRect(
            frameImg,
            Skia.XYWHRect(0, 0, frameImg.width(), frameImg.height()),
            Skia.XYWHRect(0, 0, dims.width, dims.height),
            Skia.Paint()
          );
        }
      } catch (e) {
        console.warn('[Compositor] Frame overlay failed:', e);
        // Non-fatal — lanjut tanpa frame
      }

      // 4. Watermark KitaFoto + optional event name + tanggal
      this.drawWatermark(skia, canvas, input, dims);

      // 5. Export ke JPEG bytes
      const image   = surface.makeImageSnapshot();
      const encoded = image.encodeToBytes(skia.ImageFormat.JPEG, 90);

      if (!encoded) throw new Error('Skia encode failed');

      // 6. Tulis ke file
      const base64 = this.uint8ToBase64(encoded);
      await FileSystem.writeAsStringAsync(input.outputPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Release GPU resources
      surface.dispose?.();
      image.dispose?.();

      return true;

    } catch (error) {
      console.error('[Compositor] Skia error:', error);
      return this.composeWithManipulator(input);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FALLBACK COMPOSITOR (ImageManipulator based)
  // Dipakai saat Skia tidak tersedia / error
  // ═══════════════════════════════════════════════════════════

  private async composeWithManipulator(input: CompositorInput): Promise<boolean> {
    try {
      // Untuk fallback: pakai foto pertama saja (sangat simplified)
      // Production: implementasi strip dengan manipulator chaining
      if (input.photoPaths.length === 0) return false;

      const source = input.photoPaths[0];

      // Apply basic filter via manipulator
      const actions: ImageManipulator.Action[] = [];
      if (input.filter === 'bw') {
        // Grayscale via rotate trick tidak tersedia di manipulator
        // Simpan as-is, filter diterapkan visual di preview
      }

      const result = await ImageManipulator.manipulateAsync(
        source,
        actions.length ? actions : [{ resize: { width: 900 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );

      await FileSystem.moveAsync({ from: result.uri, to: input.outputPath });
      return true;

    } catch (error) {
      console.error('[Compositor] Fallback error:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LAYOUT ENGINE
  // ═══════════════════════════════════════════════════════════

  private getCanvasDimensions(layout: LayoutType, photoCount: number) {
    const n = photoCount;

    switch (layout) {
      case 'single':
        return { width: STRIP_W, height: STRIP_H_PER_PHOTO + WATERMARK_H };

      case 'strip_vertical':
        return {
          width:  STRIP_W,
          height: STRIP_PADDING
            + n * STRIP_H_PER_PHOTO
            + (n - 1) * STRIP_PADDING
            + WATERMARK_H
            + STRIP_PADDING,
        };

      case 'strip_horizontal':
        return {
          width:  STRIP_PADDING + n * (STRIP_W / n) + (n - 1) * STRIP_PADDING + STRIP_PADDING,
          height: STRIP_H_PER_PHOTO + WATERMARK_H,
        };

      case 'grid_2x2':
        // 4 foto dalam 2 baris 2 kolom
        return {
          width:  STRIP_W,
          height: STRIP_PADDING
            + 2 * STRIP_H_PER_PHOTO
            + STRIP_PADDING
            + WATERMARK_H,
        };

      case 'two_photos':
        // 2 foto side-by-side
        return {
          width:  STRIP_W,
          height: STRIP_H_PER_PHOTO + WATERMARK_H,
        };

      default:
        return { width: STRIP_W, height: STRIP_H_PER_PHOTO * n + WATERMARK_H };
    }
  }

  private getPhotoRects(
    layout: LayoutType,
    photoCount: number,
    dims: { width: number; height: number }
  ): Array<{ x: number; y: number; w: number; h: number }> {
    const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
    const n   = photoCount;
    const pad = STRIP_PADDING;

    switch (layout) {
      case 'single': {
        rects.push({ x: pad, y: pad, w: dims.width - pad * 2, h: dims.height - WATERMARK_H - pad * 2 });
        break;
      }

      case 'strip_vertical': {
        const photoH = (dims.height - WATERMARK_H - pad * (n + 1)) / n;
        for (let i = 0; i < n; i++) {
          rects.push({
            x: pad,
            y: pad + i * (photoH + pad),
            w: dims.width - pad * 2,
            h: photoH,
          });
        }
        break;
      }

      case 'strip_horizontal': {
        const photoW = (dims.width - pad * (n + 1)) / n;
        for (let i = 0; i < n; i++) {
          rects.push({
            x: pad + i * (photoW + pad),
            y: pad,
            w: photoW,
            h: dims.height - WATERMARK_H - pad * 2,
          });
        }
        break;
      }

      case 'grid_2x2': {
        const photoW = (dims.width - pad * 3) / 2;
        const photoH = (dims.height - WATERMARK_H - pad * 3) / 2;
        const positions = [
          { col: 0, row: 0 }, { col: 1, row: 0 },
          { col: 0, row: 1 }, { col: 1, row: 1 },
        ];
        for (let i = 0; i < Math.min(n, 4); i++) {
          const pos = positions[i];
          rects.push({
            x: pad + pos.col * (photoW + pad),
            y: pad + pos.row * (photoH + pad),
            w: photoW,
            h: photoH,
          });
        }
        break;
      }

      case 'two_photos': {
        const photoW = (dims.width - pad * 3) / 2;
        for (let i = 0; i < Math.min(n, 2); i++) {
          rects.push({
            x: pad + i * (photoW + pad),
            y: pad,
            w: photoW,
            h: dims.height - WATERMARK_H - pad * 2,
          });
        }
        break;
      }
    }

    return rects;
  }

  // ═══════════════════════════════════════════════════════════
  // COLOR FILTERS
  // ═══════════════════════════════════════════════════════════

  private buildColorFilter(
    skia: typeof import('@shopify/react-native-skia'),
    filter: FilterType
  ) {
    if (filter === 'natural') return null;

    // Skia ColorMatrix: 4×5 matrix [R,G,B,A multipliers + offset]
    // Format: [r_r, r_g, r_b, r_a, r_off,  g_r, g_g, ...]

    switch (filter) {
      case 'bright':
        // Naikkan brightness +15%, sedikit lebih vivid
        return skia.Skia.ColorFilter.MakeMatrix([
          1.15, 0,    0,    0, 0.05,
          0,    1.15, 0,    0, 0.05,
          0,    0,    1.15, 0, 0.05,
          0,    0,    0,    1, 0,
        ]);

      case 'sweet':
        // Warm pink tone — naikkan merah sedikit, kurangi biru
        return skia.Skia.ColorFilter.MakeMatrix([
          1.1,  0.05, 0,    0, 0.02,
          0,    1.0,  0.05, 0, 0,
          0,    0,    0.85, 0, 0,
          0,    0,    0,    1, 0,
        ]);

      case 'bw':
        // Grayscale via luminance weights
        return skia.Skia.ColorFilter.MakeMatrix([
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0,     0,     0,     1, 0,
        ]);

      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WATERMARK
  // ═══════════════════════════════════════════════════════════

  private drawWatermark(
    skia: typeof import('@shopify/react-native-skia'),
    canvas: import('@shopify/react-native-skia').SkCanvas,
    input: CompositorInput,
    dims: { width: number; height: number }
  ): void {
    try {
      const y = dims.height - WATERMARK_H + 8;

      // Background strip bawah
      const bgPaint = skia.Skia.Paint();
      bgPaint.setColor(skia.Skia.Color('#4FC3F7'));
      canvas.drawRect(
        skia.Skia.XYWHRect(0, dims.height - WATERMARK_H, dims.width, WATERMARK_H),
        bgPaint
      );

      // Text "KitaFoto"
      const font = skia.Skia.Font(null, 18);
      const textPaint = skia.Skia.Paint();
      textPaint.setColor(skia.Skia.Color('white'));

      const brandText = '📸 KitaFoto';
      canvas.drawText(brandText, 12, y + 16, textPaint, font);

      // Event name (kanan)
      if (input.eventName) {
        const evText = input.eventName.substring(0, 25);
        const textW  = font.measureText(evText).width;
        canvas.drawText(evText, dims.width - textW - 12, y + 16, textPaint, font);
      }

      // Tanggal (tengah) jika diaktifkan
      if (input.showDate) {
        const dateStr  = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const dateW    = font.measureText(dateStr).width;
        canvas.drawText(dateStr, (dims.width - dateW) / 2, y + 16, textPaint, font);
      }
    } catch { /* watermark gagal = non-fatal */ }
  }

  // ═══════════════════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════════════════

  /** Convert Uint8Array ke base64 string (untuk FileSystem.writeAsStringAsync) */
  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len  = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export const PhotoCompositor = new PhotoCompositorClass();
