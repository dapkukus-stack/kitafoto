/**
 * UploadQueue — Universal Background Upload Service
 * ─────────────────────────────────────────────────────────────
 * Provider-agnostic. Semua upload lewat sini, StorageManager
 * yang menentukan provider mana yang dipakai.
 *
 * Features:
 *   - Persistent queue di SQLite (survive crash/restart)
 *   - Exponential backoff retry
 *   - Pause otomatis saat offline, resume saat kembali online
 *   - Max concurrent uploads (throttled, hemat RAM)
 *   - FIFO processing dengan priority support
 *   - Auto cleanup file lokal setelah upload sukses
 *   - Upload analytics (durasi, ukuran, provider)
 *   - Listener pattern untuk UI update
 *   - Zero memory leak (proper interval cleanup)
 */

import * as FileSystem from 'expo-file-system';
import { StorageManager }     from './StorageManager';
import { db }                 from '@database/DatabaseService';
import { PhotoRepository }    from '@database/repositories/PhotoRepository';
import { EventRepository }    from '@database/repositories/EventRepository';
import { useAppStore }        from '@store/useAppStore';
import { AppConfig }          from '@constants/config';
import type {
  UploadJob,
  UploadJobStatus,
  UploadContext,
  UploadErrorCode,
} from '@types/storage.types';
import { v4 as uuidv4 } from 'react-native-uuid';

// ── Retry delay schedule (ms) ────────────────────────────────
const RETRY_DELAYS_MS = [
  2_000,   // 1st retry: 2 detik
  5_000,   // 2nd: 5 detik
  15_000,  // 3rd: 15 detik
  30_000,  // 4th: 30 detik
  60_000,  // 5th: 1 menit
  120_000, // 6th: 2 menit
  300_000, // 7th+: 5 menit
];

// Error codes yang tidak perlu retry
const NON_RETRYABLE_CODES: UploadErrorCode[] = [
  'FILE_NOT_FOUND',
  'INVALID_CREDENTIALS',
];

// Max concurrent uploads (hemat RAM + bandwidth di tablet low-end)
const MAX_CONCURRENT = AppConfig.uploadBatchSize; // default 3

// Poll interval (ms)
const POLL_INTERVAL_MS = 5_000;

// ── Queue Event Listener ─────────────────────────────────────

export type QueueEvent =
  | { type: 'job_started';   jobId: string; photoId: string }
  | { type: 'job_done';      jobId: string; photoId: string; cloudUrl: string; providerType: string }
  | { type: 'job_failed';    jobId: string; photoId: string; error: string; isFinal: boolean }
  | { type: 'job_retrying';  jobId: string; attempt: number; nextRetryAt: string }
  | { type: 'queue_empty' }
  | { type: 'queue_paused'; reason: 'offline' | 'manual' }
  | { type: 'queue_resumed' };

type QueueListener = (event: QueueEvent) => void;

// ═══════════════════════════════════════════════════════════════
// UPLOAD QUEUE
// ═══════════════════════════════════════════════════════════════

class UploadQueueService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private activeJobIds = new Set<string>();   // Job yang sedang diproses
  private isPaused     = false;               // Manual pause oleh admin
  private listeners    = new Set<QueueListener>();

  // ── Lifecycle ──────────────────────────────────────────────

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), POLL_INTERVAL_MS);
    // Langsung proses saat start (jangan tunggu interval pertama)
    setTimeout(() => this.tick(), 500);
    console.log('[UploadQueue] Started ✓');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[UploadQueue] Stopped');
  }

  pause(): void {
    this.isPaused = true;
    this.emit({ type: 'queue_paused', reason: 'manual' });
  }

  resume(): void {
    this.isPaused = false;
    this.emit({ type: 'queue_resumed' });
    this.tick();
  }

  // ── Enqueue ────────────────────────────────────────────────

  /**
   * Tambah foto ke antrian upload.
   * Idempotent: jika sudah ada job untuk photoId, tidak buat duplikat.
   */
  async enqueue(
    photoId: string,
    options: { providerId?: string; priority?: number } = {}
  ): Promise<UploadJob> {
    // Cek duplikat
    const existing = await this.getJobByPhotoId(photoId);
    if (existing && existing.status !== 'failed' && existing.status !== 'cancelled') {
      return existing;
    }

    const id  = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO upload_queue
        (id, photo_id, provider_id, status, attempts, max_attempts,
         priority, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 0, ?, ?, ?, ?)`,
      [
        id,
        photoId,
        options.providerId ?? null,
        AppConfig.uploadMaxRetries,
        options.priority ?? 0,
        now,
        now,
      ]
    );

    // Update badge
    this.refreshBadge();

    return (await this.getJobById(id))!;
  }

  /** Cancel job yang sedang menunggu (tidak bisa cancel yang sedang upload) */
  async cancel(jobId: string): Promise<void> {
    if (this.activeJobIds.has(jobId)) return; // Sedang upload, tidak bisa cancel
    await this.updateJobStatus(jobId, 'cancelled');
    this.refreshBadge();
  }

  /** Retry manual untuk job yang failed */
  async retryJob(jobId: string): Promise<void> {
    await db.run(
      `UPDATE upload_queue
       SET status = 'pending', attempts = 0, next_retry_at = NULL,
           last_error = NULL, last_error_code = NULL, updated_at = ?
       WHERE id = ? AND status = 'failed'`,
      [new Date().toISOString(), jobId]
    );
    this.tick();
  }

  /** Retry semua job yang failed */
  async retryAllFailed(): Promise<number> {
    const now = new Date().toISOString();
    const result = await db.run(
      `UPDATE upload_queue
       SET status = 'pending', attempts = 0, next_retry_at = NULL,
           last_error = NULL, last_error_code = NULL, updated_at = ?
       WHERE status = 'failed'`,
      [now]
    );
    this.refreshBadge();
    this.tick();
    return result.changes ?? 0;
  }

  // ── Queue Query ────────────────────────────────────────────

  async getPendingCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM upload_queue WHERE status IN ('pending', 'uploading')"
    );
    return row?.count ?? 0;
  }

  async getFailedCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM upload_queue WHERE status = 'failed'"
    );
    return row?.count ?? 0;
  }

  async getAllJobs(limit = 50): Promise<UploadJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM upload_queue ORDER BY priority DESC, created_at ASC LIMIT ?',
      [limit]
    );
    return rows.map(this.rowToJob);
  }

  async getJobById(id: string): Promise<UploadJob | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM upload_queue WHERE id = ?', [id]
    );
    return row ? this.rowToJob(row) : null;
  }

  async getJobByPhotoId(photoId: string): Promise<UploadJob | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      "SELECT * FROM upload_queue WHERE photo_id = ? AND status NOT IN ('cancelled') ORDER BY created_at DESC LIMIT 1",
      [photoId]
    );
    return row ? this.rowToJob(row) : null;
  }

  // ── Listener (untuk UI real-time update) ──────────────────

  addListener(fn: QueueListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn); // Return unsubscribe fn
  }

  private emit(event: QueueEvent): void {
    this.listeners.forEach(fn => {
      try { fn(event); } catch { /* listener error tidak boleh crash queue */ }
    });
  }

  // ── Core: Tick ────────────────────────────────────────────

  private async tick(): Promise<void> {
    // Skip jika offline
    const { isOnline } = useAppStore.getState();
    if (!isOnline) {
      this.emit({ type: 'queue_paused', reason: 'offline' });
      return;
    }

    // Skip jika paused manual
    if (this.isPaused) return;

    // Skip jika sudah max concurrent
    if (this.activeJobIds.size >= MAX_CONCURRENT) return;

    try {
      const slots     = MAX_CONCURRENT - this.activeJobIds.size;
      const readyJobs = await this.getReadyJobs(slots);

      if (readyJobs.length === 0) {
        const pending = await this.getPendingCount();
        if (pending === 0) {
          this.emit({ type: 'queue_empty' });
        }
        return;
      }

      // Proses semua job yang tersedia secara parallel
      await Promise.allSettled(
        readyJobs.map(job => this.processJob(job))
      );

      this.refreshBadge();

    } catch (error) {
      console.error('[UploadQueue] Tick error:', error);
    }
  }

  // ── Core: Process Single Job ───────────────────────────────

  private async processJob(job: UploadJob): Promise<void> {
    if (this.activeJobIds.has(job.id)) return;
    this.activeJobIds.add(job.id);

    const startTime = Date.now();

    try {
      // 1. Mark uploading
      await this.updateJobStatus(job.id, 'uploading');
      await PhotoRepository.updateUploadStatus(job.photoId, 'uploading');
      this.emit({ type: 'job_started', jobId: job.id, photoId: job.photoId });

      // 2. Ambil data foto & event
      const photo = await PhotoRepository.getById(job.photoId);
      if (!photo) {
        await this.markJobFailed(job, 'Foto tidak ditemukan di database', 'FILE_NOT_FOUND', true);
        return;
      }

      const filePath = photo.processedPath ?? photo.printPath;
      if (!filePath) {
        await this.markJobFailed(job, 'File foto tidak ada di storage lokal', 'FILE_NOT_FOUND', true);
        return;
      }

      // Cek file masih ada
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        await this.markJobFailed(job, `File tidak ditemukan: ${filePath}`, 'FILE_NOT_FOUND', true);
        return;
      }

      const event = await EventRepository.getById(photo.eventId);

      // 3. Bangun context upload
      const context: UploadContext = {
        photoId:        photo.id,
        sessionId:      photo.sessionId,
        eventId:        photo.eventId,
        eventName:      event?.name ?? 'Event',
        localFilePath:  filePath,
        remoteFileName: `photo_${photo.sessionId}`,
        mimeType:       'image/jpeg',
        tags:           ['kitafoto', photo.eventId],
        metadata: {
          filter:     photo.filterApplied,
          layout:     photo.layoutType,
          photoCount: String(photo.photoCount),
        },
      };

      // 4. Upload via StorageManager (provider-agnostic)
      const result = await StorageManager.upload(context);

      const durationMs = Date.now() - startTime;

      if (result.success && result.cloudUrl) {
        // ── SUKSES ─────────────────────────────────────
        await this.markJobDone(job, result.cloudUrl, result.usedProviderId);
        await PhotoRepository.updateUploadStatus(photo.id, 'done', result.cloudUrl);

        // Catat di upload_history dengan durasi
        await this.updateHistoryDuration(job.id, durationMs, (fileInfo as { size?: number }).size);

        this.emit({
          type: 'job_done',
          jobId: job.id,
          photoId: job.photoId,
          cloudUrl: result.cloudUrl,
          providerType: result.providerType ?? 'unknown',
        });

        // Auto-cleanup file lokal setelah berhasil upload
        await this.cleanupLocalFiles(photo);

        console.log(`[UploadQueue] ✓ ${photo.sessionId} → ${result.providerType} (${durationMs}ms)`);

      } else {
        // ── GAGAL ──────────────────────────────────────
        const isFatal    = result.errorCode
          ? NON_RETRYABLE_CODES.includes(result.errorCode)
          : false;
        const newAttempts = job.attempts + 1;
        const isFinal     = isFatal || newAttempts >= job.maxAttempts;

        await this.markJobFailed(job, result.error ?? 'Unknown error', result.errorCode, isFinal);
        await PhotoRepository.updateUploadStatus(photo.id, isFinal ? 'failed' : 'pending');

        this.emit({
          type: 'job_failed',
          jobId: job.id,
          photoId: job.photoId,
          error: result.error ?? 'Unknown error',
          isFinal,
        });

        console.warn(
          `[UploadQueue] ✗ ${photo.sessionId} attempt ${newAttempts}/${job.maxAttempts}` +
          ` code=${result.errorCode} fatal=${isFatal}`
        );
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const newAttempts = job.attempts + 1;
      const isFinal     = newAttempts >= job.maxAttempts;
      await this.markJobFailed(job, msg, 'NETWORK_ERROR', isFinal);
      console.error('[UploadQueue] Process error:', msg);

    } finally {
      this.activeJobIds.delete(job.id);
    }
  }

  // ── Job State Transitions ──────────────────────────────────

  private async markJobDone(
    job: UploadJob,
    cloudUrl: string,
    succeededProviderId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE upload_queue
       SET status = 'done', cloud_url = ?, succeeded_provider_id = ?,
           uploaded_at = ?, updated_at = ?
       WHERE id = ?`,
      [cloudUrl, succeededProviderId ?? null, now, now, job.id]
    );
  }

  private async markJobFailed(
    job: UploadJob,
    error: string,
    errorCode: UploadErrorCode | undefined,
    isFinal: boolean
  ): Promise<void> {
    const now         = new Date().toISOString();
    const newAttempts = job.attempts + 1;

    const nextRetryAt = isFinal
      ? null
      : new Date(
          Date.now() + (RETRY_DELAYS_MS[Math.min(newAttempts - 1, RETRY_DELAYS_MS.length - 1)] ?? 300_000)
        ).toISOString();

    await db.run(
      `UPDATE upload_queue
       SET status = ?, attempts = ?, last_error = ?, last_error_code = ?,
           next_retry_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        isFinal ? 'failed' : 'pending',
        newAttempts,
        error,
        errorCode ?? null,
        nextRetryAt,
        now,
        job.id,
      ]
    );

    if (nextRetryAt && !isFinal) {
      this.emit({ type: 'job_retrying', jobId: job.id, attempt: newAttempts, nextRetryAt });
    }
  }

  private async updateJobStatus(jobId: string, status: UploadJobStatus): Promise<void> {
    await db.run(
      'UPDATE upload_queue SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), jobId]
    );
  }

  // ── Query Helpers ──────────────────────────────────────────

  private async getReadyJobs(limit: number): Promise<UploadJob[]> {
    const now  = new Date().toISOString();
    const rows = await db.getAll<Record<string, unknown>>(
      `SELECT * FROM upload_queue
       WHERE status = 'pending'
         AND attempts < max_attempts
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [now, limit]
    );
    return rows.map(this.rowToJob);
  }

  private rowToJob(row: Record<string, unknown>): UploadJob {
    return {
      id:                   row.id as string,
      photoId:              row.photo_id as string,
      providerId:           row.provider_id as string | undefined,
      status:               row.status as UploadJobStatus,
      attempts:             row.attempts as number,
      maxAttempts:          row.max_attempts as number,
      nextRetryAt:          row.next_retry_at as string | undefined,
      lastError:            row.last_error as string | undefined,
      lastErrorCode:        row.last_error_code as UploadErrorCode | undefined,
      cloudUrl:             row.cloud_url as string | undefined,
      succeededProviderId:  row.succeeded_provider_id as string | undefined,
      createdAt:            row.created_at as string,
      updatedAt:            row.updated_at as string,
      uploadedAt:           row.uploaded_at as string | undefined,
    };
  }

  // ── Cleanup ────────────────────────────────────────────────

  private async cleanupLocalFiles(photo: {
    rawPath?: string;
    processedPath?: string;
    printPath?: string;
  }): Promise<void> {
    const paths = [photo.rawPath, photo.processedPath].filter(Boolean) as string[];
    // printPath TIDAK dihapus — masih diperlukan untuk print queue
    for (const path of paths) {
      try {
        await FileSystem.deleteAsync(path, { idempotent: true });
      } catch { /* ignore */ }
    }
  }

  private async updateHistoryDuration(
    jobId: string,
    durationMs: number,
    fileSize?: number
  ): Promise<void> {
    try {
      await db.run(
        'UPDATE upload_history SET duration_ms = ?, file_size = ? WHERE job_id = ?',
        [durationMs, fileSize ?? null, jobId]
      );
    } catch { /* non-critical */ }
  }

  // ── Badge Update ───────────────────────────────────────────

  private async refreshBadge(): Promise<void> {
    const count = await this.getPendingCount();
    useAppStore.getState().setPendingUploadCount(count);
  }

  // ── Trigger Manual ─────────────────────────────────────────

  /** Trigger langsung saat internet kembali online */
  triggerNow(): void {
    if (!this.isPaused) {
      this.tick();
    }
  }
}

// ── Singleton export ──────────────────────────────────────────
export const UploadQueue = new UploadQueueService();
