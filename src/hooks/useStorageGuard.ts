/**
 * useStorageGuard
 * Monitor penggunaan storage & auto-cleanup
 */

import { useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import { useAppStore } from '@store/useAppStore';
import { AppConfig } from '@constants/config';
import { PhotoRepository } from '@database/repositories/PhotoRepository';

const CACHE_DIR = `${FileSystem.cacheDirectory}kitafoto/`;
const DATA_DIR = `${FileSystem.documentDirectory}kitafoto/photos/`;

async function getDirSizeMB(dirUri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(dirUri, { size: true });
    if (!info.exists) return 0;
    // expo-file-system size property
    const sizeBytes = (info as { size?: number }).size ?? 0;
    return sizeBytes / (1024 * 1024);
  } catch {
    return 0;
  }
}

async function deleteLocalPhoto(photo: {
  rawPath?: string;
  processedPath?: string;
  printPath?: string;
}) {
  const paths = [photo.rawPath, photo.processedPath, photo.printPath].filter(Boolean) as string[];
  for (const path of paths) {
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch {
      // ignore
    }
  }
}

export function useStorageGuard() {
  const { setStorageWarning } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCheck = async () => {
    const cacheMB = await getDirSizeMB(CACHE_DIR);
    const dataMB = await getDirSizeMB(DATA_DIR);
    const totalMB = cacheMB + dataMB;

    console.log(`[StorageGuard] Cache: ${cacheMB.toFixed(1)}MB, Data: ${dataMB.toFixed(1)}MB, Total: ${totalMB.toFixed(1)}MB`);

    if (totalMB >= AppConfig.emergencyCleanMB) {
      console.warn('[StorageGuard] EMERGENCY cleanup!');
      await performCleanup(true);
    } else if (totalMB >= AppConfig.autocleanCacheMB) {
      console.warn('[StorageGuard] Auto cleanup...');
      await performCleanup(false);
    }

    setStorageWarning(totalMB >= AppConfig.warnCacheMB);
  };

  const performCleanup = async (aggressive: boolean) => {
    try {
      // 1. Hapus file yang sudah diupload dan lewat batas hari
      const eligibleDays = aggressive ? 1 : AppConfig.autoDeleteDays;
      const eligiblePhotos = await PhotoRepository.getEligibleForDeletion(eligibleDays);

      console.log(`[StorageGuard] Deleting ${eligiblePhotos.length} old photos...`);

      for (const photo of eligiblePhotos) {
        await deleteLocalPhoto(photo);
        await PhotoRepository.updatePaths(photo.id, {});
      }

      // 2. Bersihkan cache directory sesi
      const sessionCacheDir = `${CACHE_DIR}sessions/`;
      try {
        await FileSystem.deleteAsync(sessionCacheDir, { idempotent: true });
      } catch {
        // ignore
      }

    } catch (error) {
      console.error('[StorageGuard] Cleanup error:', error);
    }
  };

  useEffect(() => {
    // Check saat startup
    runCheck();

    // Check berkala setiap 10 menit
    intervalRef.current = setInterval(runCheck, AppConfig.cacheCheckIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { runCheck };
}
