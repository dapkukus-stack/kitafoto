/**
 * MemoryCleanupService
 * ─────────────────────────────────────────────────────────────
 * Menjaga RAM dan storage tetap stabil selama 6–10 jam event.
 *
 * Responsibilities:
 *   1. Storage watchdog — monitor penggunaan disk setiap 10 menit
 *   2. Session cleanup — hapus temp files setelah sesi selesai
 *   3. Auto-delete lokal setelah N hari (file sudah upload)
 *   4. Old health logs cleanup (provider_health_logs > 30 hari)
 *   5. Memory pressure hint — InteractionManager.runAfterInteractions
 *   6. Upload history cleanup (> 7 hari)
 *
 * Memory leak prevention:
 *   • Semua interval di-register dan di-cleanup saat stop()
 *   • Tidak ada global bitmap reference
 *   • Camera ref released on screen unmount (WebcamService)
 *   • Skia surfaces disposed setelah composite (PhotoCompositor)
 *
 * Targets (Samsung Galaxy Tab A9):
 *   • Steady-state RAM: < 200MB
 *   • Disk cache: < 2GB
 *   • No ANR selama operasi cleanup
 */

import * as FileSystem        from 'expo-file-system';
import { InteractionManager }  from 'react-native';
import { db }                  from '@database/DatabaseService';
import { PhotoRepository }     from '@database/repositories/PhotoRepository';
import { UploadJobRepository } from '@database/repositories/UploadJobRepository';
import { useAppStore }         from '@store/useAppStore';
import { AppConfig }           from '@constants/config';

// ── Directories ───────────────────────────────────────────────
const SESSION_CACHE = `${FileSystem.cacheDirectory}kitafoto/sessions/`;
const PHOTO_DIR     = `${FileSystem.documentDirectory}kitafoto/photos/`;
const PRINT_TEMP    = `${FileSystem.documentDirectory}kitafoto/print_temp.jpg`;

// ── Cleanup intervals ─────────────────────────────────────────
const STORAGE_CHECK_MS      = 10 * 60 * 1000;  // 10 menit
const SESSION_CLEANUP_MS    =  2 * 60 * 1000;  //  2 menit
const DEEP_CLEANUP_HOUR_MS  = 60 * 60 * 1000;  //  1 jam

// ── Storage thresholds (MB) ───────────────────────────────────
const WARN_MB      = AppConfig.warnCacheMB;
const AUTO_CLEAN_MB = AppConfig.autocleanCacheMB;
const EMERGENCY_MB  = AppConfig.emergencyCleanMB;

interface CleanupStats {
  deletedFiles:    number;
  freedMB:         number;
  currentUsageMB:  number;
  timestamp:       string;
}

// ─────────────────────────────────────────────────────────────

class MemoryCleanupServiceClass {
  private intervals: ReturnType<typeof setInterval>[] = [];
  private isRunning = false;
  private lastDeepCleanAt = 0;

  // ── Start / Stop ───────────────────────────────────────────

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Watchdog: cek storage berkala
    this.intervals.push(
      setInterval(() => this.runStorageWatchdog(), STORAGE_CHECK_MS)
    );

    // Session cleanup: hapus orphan temp files
    this.intervals.push(
      setInterval(() => this.cleanSessionCache(), SESSION_CLEANUP_MS)
    );

    // Deep cleanup per jam: DB logs, old uploads
    this.intervals.push(
      setInterval(() => this.runDeepCleanup(), DEEP_CLEANUP_HOUR_MS)
    );

    // Run segera di background (tidak block startup)
    InteractionManager.runAfterInteractions(() => {
      this.runStorageWatchdog();
      this.cleanSessionCache();
    });

    console.log('[MemoryCleanup] Started ✓');
  }

  stop(): void {
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
    this.isRunning = false;
  }

  // ── Storage Watchdog ───────────────────────────────────────

  async runStorageWatchdog(): Promise<CleanupStats> {
    const stats: CleanupStats = {
      deletedFiles:   0,
      freedMB:        0,
      currentUsageMB: 0,
      timestamp:      new Date().toISOString(),
    };

    try {
      const totalMB = await this.getTotalUsageMB();
      stats.currentUsageMB = totalMB;

      if (totalMB > EMERGENCY_MB) {
        console.warn(`[MemoryCleanup] EMERGENCY cleanup! ${totalMB.toFixed(1)}MB`);
        const freed = await this.performCleanup({ aggressive: true });
        stats.deletedFiles = freed.deletedFiles;
        stats.freedMB      = freed.freedMB;
        useAppStore.getState().setStorageWarning(true);

      } else if (totalMB > AUTO_CLEAN_MB) {
        console.warn(`[MemoryCleanup] Auto cleanup: ${totalMB.toFixed(1)}MB`);
        const freed = await this.performCleanup({ aggressive: false });
        stats.deletedFiles = freed.deletedFiles;
        stats.freedMB      = freed.freedMB;
        useAppStore.getState().setStorageWarning(true);

      } else if (totalMB > WARN_MB) {
        useAppStore.getState().setStorageWarning(true);

      } else {
        useAppStore.getState().setStorageWarning(false);
      }

    } catch (error) {
      console.error('[MemoryCleanup] Watchdog error:', error);
    }

    return stats;
  }

  /** Hapus file lokal yang sudah upload & expired */
  private async performCleanup(opts: { aggressive: boolean }): Promise<{ deletedFiles: number; freedMB: number }> {
    let deletedFiles = 0;
    let freedBytes   = 0;

    const daysThreshold = opts.aggressive ? 1 : AppConfig.autoDeleteDays;
    const candidates = await PhotoRepository.getEligibleForDeletion(daysThreshold);

    for (const photo of candidates) {
      const paths = [
        photo.processedPath,
        photo.printPath,
        photo.rawPath,
      ].filter(Boolean) as string[];

      for (const p of paths) {
        const size = await this.safeDelete(p);
        if (size > 0) {
          deletedFiles++;
          freedBytes += size;
        }
      }
    }

    console.log(
      `[MemoryCleanup] Deleted ${deletedFiles} files, freed ${(freedBytes / 1024 / 1024).toFixed(1)}MB`
    );

    return { deletedFiles, freedMB: freedBytes / 1024 / 1024 };
  }

  // ── Session cache cleanup ──────────────────────────────────

  async cleanSessionCache(): Promise<void> {
    try {
      const sessionDir = await FileSystem.getInfoAsync(SESSION_CACHE);
      if (!sessionDir.exists) return;

      // Baca semua subdirektori sesi
      const entries = await FileSystem.readDirectoryAsync(SESSION_CACHE);

      for (const entry of entries) {
        const fullPath = `${SESSION_CACHE}${entry}/`;
        const info     = await FileSystem.getInfoAsync(fullPath);

        if (!info.exists) continue;

        // Cek apakah direktori sesi ini sudah lama (> 10 menit)
        // Gunakan modificationTime sebagai proxy umur sesi
        const ageSecs = info.modificationTime
          ? (Date.now() / 1000) - info.modificationTime
          : 999999;

        if (ageSecs > 600) { // > 10 menit
          await FileSystem.deleteAsync(fullPath, { idempotent: true });
        }
      }
    } catch { /* non-critical */ }
  }

  // ── Deep cleanup (per jam) ─────────────────────────────────

  private async runDeepCleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastDeepCleanAt < DEEP_CLEANUP_HOUR_MS) return;
    this.lastDeepCleanAt = now;

    // Jalankan di background, tidak block UI
    InteractionManager.runAfterInteractions(async () => {
      try {
        // 1. Hapus print temp file
        await FileSystem.deleteAsync(PRINT_TEMP, { idempotent: true });

        // 2. Cleanup DB: upload_queue records yang sudah done > 7 hari
        await UploadJobRepository.cleanupOldDone(7);

        // 3. Cleanup DB: provider_health_logs > 30 hari
        await UploadJobRepository.cleanupOldHealthLogs(30);

        // 4. Cleanup DB: upload_history > 30 hari
        await db.run(
          "DELETE FROM upload_history WHERE created_at < datetime('now', '-30 days')"
        );

        console.log('[MemoryCleanup] Deep cleanup done ✓');
      } catch (error) {
        console.error('[MemoryCleanup] Deep cleanup error:', error);
      }
    });
  }

  // ── Manual cleanup (dari admin panel) ─────────────────────

  async manualCleanAll(): Promise<CleanupStats> {
    // Force aggressive cleanup
    const totalMB  = await this.getTotalUsageMB();
    const freed    = await this.performCleanup({ aggressive: true });
    await this.cleanSessionCache();

    return {
      deletedFiles:   freed.deletedFiles,
      freedMB:        freed.freedMB,
      currentUsageMB: totalMB - freed.freedMB,
      timestamp:      new Date().toISOString(),
    };
  }

  /** Hapus satu sesi secara manual (setelah user done) */
  async cleanupSession(sessionId: string): Promise<void> {
    const path = `${SESSION_CACHE}${sessionId}/`;
    await FileSystem.deleteAsync(path, { idempotent: true });
  }

  // ── Storage usage ──────────────────────────────────────────

  async getTotalUsageMB(): Promise<number> {
    const [cacheSize, dataSize] = await Promise.all([
      this.getDirSizeMB(`${FileSystem.cacheDirectory}kitafoto/`),
      this.getDirSizeMB(PHOTO_DIR),
    ]);
    return cacheSize + dataSize;
  }

  async getDetailedUsage(): Promise<{
    cacheMB:     number;
    photosMB:    number;
    totalMB:     number;
    limitMB:     number;
    percentUsed: number;
  }> {
    const cacheMB  = await this.getDirSizeMB(`${FileSystem.cacheDirectory}kitafoto/`);
    const photosMB = await this.getDirSizeMB(PHOTO_DIR);
    const totalMB  = cacheMB + photosMB;
    const limitMB  = AppConfig.maxCacheMB;

    return {
      cacheMB,
      photosMB,
      totalMB,
      limitMB,
      percentUsed: Math.round((totalMB / limitMB) * 100),
    };
  }

  // ── Helpers ────────────────────────────────────────────────

  private async getDirSizeMB(dirUri: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(dirUri, { size: true });
      if (!info.exists) return 0;
      const sizeBytes = (info as { size?: number }).size ?? 0;
      return sizeBytes / (1024 * 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Hapus file, return bytes yang dibebaskan.
   * Return 0 jika file tidak ada atau gagal hapus.
   */
  private async safeDelete(filePath: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(filePath, { size: true });
      if (!info.exists) return 0;

      const size = (info as { size?: number }).size ?? 0;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      return size;
    } catch {
      return 0;
    }
  }
}

export const MemoryCleanupService = new MemoryCleanupServiceClass();
