/**
 * PhotoCapturePipeline
 * ─────────────────────────────────────────────────────────────
 * Orchestrates the full post-capture flow:
 *   raw files → compress → composite + frame → strip → save
 *
 * Memory contract:
 *   1. Raw files masuk dari SESSION_DIR (kecil, sudah di-disk)
 *   2. Compress di-proses satu per satu (tidak semua sekaligus)
 *   3. Composite dilakukan sekali ke Skia offscreen canvas
 *   4. Raw files di-delete segera setelah composite sukses
 *   5. Hanya simpan 2 output: processed + print version
 *   6. Tidak ada bitmap besar di React state
 *
 * Pipeline stages:
 *   [RAW files] → compress → [COMPRESSED] → composite+strip →
 *   [PROCESSED jpg] → resize-for-print → [PRINT jpg] →
 *   db record → enqueue print → enqueue upload → cleanup raws
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { PhotoRepository }   from '@database/repositories/PhotoRepository';
import { PrintJobRepository } from '@database/repositories/PrintJobRepository';
import { UploadQueue }        from '@services/storage/UploadQueue';
import { PhotoCompositor }    from './PhotoCompositor';
import { AppConfig }          from '@constants/config';
import { useSessionStore }    from '@store/useSessionStore';
import { useEventStore }      from '@store/useEventStore';
import { v4 as uuidv4 }       from 'react-native-uuid';
import type { LayoutType, FilterType } from '@constants/config';
import type { CapturedPhoto }          from '@kitafoto-types/photo.types';

// ── Output directory (permanent, bukan cache) ─────────────────
const PHOTO_DIR = `${FileSystem.documentDirectory}kitafoto/photos/`;

export interface PipelineInput {
  sessionId:      string;
  eventId:        string;
  frameId:        string;
  capturedPhotos: CapturedPhoto[];   // Raw file paths dari camera
  layoutType:     LayoutType;
  filterType:     FilterType;
  photoCount:     number;
  framePath:      string;            // Local path frame PNG
}

export interface PipelineResult {
  success:       boolean;
  photoId?:      string;            // ID di SQLite
  processedPath?: string;           // Composite result (untuk preview + upload)
  printPath?:    string;            // Ukuran kecil untuk print
  error?:        string;
  durationMs?:   number;
}

export interface PipelineProgress {
  stage: 'compress' | 'composite' | 'strip' | 'save' | 'cleanup';
  percent: number;   // 0–100
}

type ProgressCallback = (p: PipelineProgress) => void;

// ─────────────────────────────────────────────────────────────

class PhotoCapturePipelineClass {
  private isProcessing = false;

  async run(
    input: PipelineInput,
    onProgress?: ProgressCallback
  ): Promise<PipelineResult> {
    if (this.isProcessing) {
      return { success: false, error: 'Pipeline sedang berjalan' };
    }

    this.isProcessing = true;
    const startTime  = Date.now();
    const compressed: string[] = [];

    try {
      await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });

      // ── Stage 1: Compress raw photos satu per satu ──────────
      onProgress?.({ stage: 'compress', percent: 0 });

      for (let i = 0; i < input.capturedPhotos.length; i++) {
        const raw = input.capturedPhotos[i];
        const compressedPath = await this.compressRaw(raw.filePath, i);
        compressed.push(compressedPath);
        onProgress?.({
          stage: 'compress',
          percent: Math.round(((i + 1) / input.capturedPhotos.length) * 30),
        });
      }

      // ── Stage 2: Composite foto + frame ─────────────────────
      onProgress?.({ stage: 'composite', percent: 30 });

      const processedPath = `${PHOTO_DIR}${input.sessionId}_processed.jpg`;
      const compositeOk = await PhotoCompositor.compose({
        photoPaths: compressed,
        framePath:  input.framePath,
        outputPath: processedPath,
        layout:     input.layoutType,
        filter:     input.filterType,
      });

      if (!compositeOk) {
        throw new Error('Compositing gagal');
      }

      onProgress?.({ stage: 'strip', percent: 65 });

      // ── Stage 3: Generate print version (resize + hemat tinta) ─
      const printPath = `${PHOTO_DIR}${input.sessionId}_print.jpg`;
      await this.generatePrintVersion(processedPath, printPath);

      onProgress?.({ stage: 'save', percent: 80 });

      // ── Stage 4: Simpan ke DB ────────────────────────────────
      const photo = await PhotoRepository.create({
        eventId:        input.eventId,
        frameId:        input.frameId,
        sessionId:      input.sessionId,
        processedPath,
        printPath,
        filterApplied:  input.filterType,
        layoutType:     input.layoutType,
        photoCount:     input.photoCount,
        uploadStatus:   'pending',
        printStatus:    'pending',
      });

      // Update session store dengan hasil
      useSessionStore.getState().setProcessedPaths(processedPath, printPath);
      useSessionStore.getState().setPhotoDbId(photo.id);
      useEventStore.getState().incrementTodayCount();

      onProgress?.({ stage: 'cleanup', percent: 90 });

      // ── Stage 5: Enqueue print & upload (non-blocking) ──────
      this.enqueuePrintAndUpload(photo.id, input.eventId);

      // ── Stage 6: Cleanup raws + compressed ──────────────────
      await this.cleanupRaws(input.capturedPhotos, compressed);

      onProgress?.({ stage: 'cleanup', percent: 100 });

      const durationMs = Date.now() - startTime;
      console.log(`[Pipeline] ✓ ${input.sessionId} in ${durationMs}ms`);

      return {
        success:       true,
        photoId:       photo.id,
        processedPath,
        printPath,
        durationMs,
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Pipeline] Error:', msg);

      // Cleanup on failure — jangan tinggalkan file orphan
      await this.cleanupRaws(input.capturedPhotos, compressed);

      return { success: false, error: msg };
    } finally {
      this.isProcessing = false;
    }
  }

  // ── Stage helpers ─────────────────────────────────────────

  /** Compress satu raw photo — hemat space, cepat */
  private async compressRaw(rawPath: string, _index: number): Promise<string> {
    const compressedPath = rawPath.replace('.jpg', '_c.jpg');

    try {
      const result = await ImageManipulator.manipulateAsync(
        rawPath,
        [{ resize: { width: AppConfig.captureMaxWidth } }],
        {
          compress: AppConfig.captureQuality,
          format:   ImageManipulator.SaveFormat.JPEG,
          base64:   false,  // PENTING: jangan base64, hemat RAM
        }
      );

      // Move ke path baru (manipulateAsync menghasilkan temp file)
      await FileSystem.moveAsync({ from: result.uri, to: compressedPath });
      return compressedPath;

    } catch {
      // Gagal compress → pakai raw saja
      return rawPath;
    }
  }

  /** Generate versi print — lebih kecil dari processed */
  private async generatePrintVersion(sourcePath: string, outputPath: string): Promise<void> {
    // Print Canon MP287 4R (4x6") @ 300dpi = 1200x1800px
    // Strip vertikal 3 foto: 1200 x 3600 — terlalu besar
    // Kita target 900px wide, hemat tinta, tetap terlihat bagus
    const PRINT_MAX_WIDTH = 900;

    try {
      const result = await ImageManipulator.manipulateAsync(
        sourcePath,
        [{ resize: { width: PRINT_MAX_WIDTH } }],
        {
          compress: AppConfig.printQuality,
          format:   ImageManipulator.SaveFormat.JPEG,
          base64:   false,
        }
      );
      await FileSystem.moveAsync({ from: result.uri, to: outputPath });
    } catch {
      // Fallback: copy as-is
      await FileSystem.copyAsync({ from: sourcePath, to: outputPath });
    }
  }

  /** Hapus raw + compressed files setelah composite sukses */
  private async cleanupRaws(
    originals: CapturedPhoto[],
    compressed: string[]
  ): Promise<void> {
    const allPaths = [
      ...originals.map(p => p.filePath),
      ...compressed,
    ];

    for (const p of allPaths) {
      try {
        await FileSystem.deleteAsync(p, { idempotent: true });
      } catch { /* non-critical */ }
    }
  }

  /** Enqueue print + upload — fire and forget, tidak await */
  private enqueuePrintAndUpload(photoId: string, _eventId: string): void {
    // Print job
    PrintJobRepository.create({
      photoId,
      status:      'pending',
      attempts:    0,
      maxAttempts: AppConfig.printMaxRetries,
    }).catch(e => console.warn('[Pipeline] enqueue print error:', e));

    // Upload job
    UploadQueue.enqueue(photoId).catch(e =>
      console.warn('[Pipeline] enqueue upload error:', e)
    );
  }
}

export const PhotoCapturePipeline = new PhotoCapturePipelineClass();
