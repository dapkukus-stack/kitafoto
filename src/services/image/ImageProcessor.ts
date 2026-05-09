/**
 * ImageProcessor
 * Compress, resize, dan compose foto dengan frame overlay
 * Menggunakan expo-image-manipulator untuk operasi dasar
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { AppConfig } from '@constants/config';
import type { FilterType, LayoutType } from '@constants/config';
import type { CapturedPhoto } from '@types/photo.types';

const PHOTO_DIR = `${FileSystem.documentDirectory}kitafoto/photos/`;
const SESSION_CACHE_DIR = `${FileSystem.cacheDirectory}kitafoto/sessions/`;

export async function ensureDirectories(): Promise<void> {
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  await FileSystem.makeDirectoryAsync(SESSION_CACHE_DIR, { intermediates: true });
}

/**
 * Compress foto dari kamera
 * @returns path file terkompresi
 */
export async function compressCapture(
  rawFilePath: string,
  quality = AppConfig.captureQuality
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    rawFilePath,
    [
      {
        resize: {
          width: AppConfig.captureMaxWidth,
          // height akan auto-scale
        },
      },
    ],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}

/**
 * Apply filter sederhana menggunakan transformasi warna
 * Catatan: filter berat (AI) akan diimplementasi di Phase 2
 */
export async function applyFilter(
  imagePath: string,
  filter: FilterType
): Promise<string> {
  if (filter === 'natural') return imagePath; // Tidak perlu proses

  // Filter basic menggunakan manipulator
  // Untuk filter lanjut (sweet, bw) → bisa pakai Skia di FrameCompositor
  const actions: ImageManipulator.Action[] = [];

  switch (filter) {
    case 'bright':
      // Slight crop & brighten simulation (manipulator terbatas)
      // Full implementation di Skia layer
      break;
    case 'bw':
      // Grayscale via manipulator
      actions.push({ resize: { width: AppConfig.captureMaxWidth } }); // Dummy untuk trigger process
      break;
    case 'sweet':
      // Warm tone — full di Skia
      break;
  }

  if (actions.length === 0) return imagePath;

  const result = await ImageManipulator.manipulateAsync(
    imagePath,
    actions,
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );

  return result.uri;
}

/**
 * Resize foto untuk upload ke cloud
 */
export async function resizeForUpload(imagePath: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    imagePath,
    [{ resize: { width: AppConfig.uploadMaxDimension } }],
    {
      compress: AppConfig.uploadQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}

/**
 * Buat thumbnail kecil
 */
export async function createThumbnail(imagePath: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    imagePath,
    [{ resize: { width: AppConfig.thumbnailSize } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}

/**
 * Generate strip layout dari array foto
 * Ini adalah layout generator dasar (concatenate vertical)
 * Layout canggih dengan frame overlay → lihat FrameCompositor.ts (Skia)
 *
 * Untuk MVP: copy foto ke cache session folder dengan naming terstruktur
 */
export async function prepareSessionFiles(
  sessionId: string,
  photos: CapturedPhoto[]
): Promise<string[]> {
  const sessionDir = `${SESSION_CACHE_DIR}${sessionId}/`;
  await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });

  const processedPaths: string[] = [];

  for (const photo of photos) {
    const compressed = await compressCapture(photo.filePath);
    const dest = `${sessionDir}photo_${photo.index}.jpg`;

    await FileSystem.moveAsync({ from: compressed, to: dest });
    processedPaths.push(dest);
  }

  return processedPaths;
}

/**
 * Simpan final result ke permanent directory
 */
export async function saveFinalPhoto(
  sourceUri: string,
  sessionId: string,
  type: 'processed' | 'print'
): Promise<string> {
  await ensureDirectories();
  const dest = `${PHOTO_DIR}${sessionId}_${type}.jpg`;

  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/**
 * Cleanup session cache setelah proses selesai
 */
export async function cleanupSession(sessionId: string): Promise<void> {
  const sessionDir = `${SESSION_CACHE_DIR}${sessionId}/`;
  try {
    await FileSystem.deleteAsync(sessionDir, { idempotent: true });
  } catch {
    // ignore
  }
}
