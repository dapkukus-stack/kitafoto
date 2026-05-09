/**
 * PrintQueue
 * ─────────────────────────────────────────────────────────────
 * Background print job processor dengan persistent SQLite queue.
 *
 * Design principles:
 *   • Max 1 concurrent print job (printer physical constraint)
 *   • Exponential backoff: 5s → 10s → 30s → 60s → 120s
 *   • Printer disconnect = pause queue, reconnect = resume
 *   • Upload queue TIDAK diblock oleh print failure
 *   • Print failure = status 'failed' di DB, admin bisa retry
 *   • Zero memory leak: timer cleanup saat stop()
 *
 * Retry strategy:
 *   - Attempt 1 → wait 5s
 *   - Attempt 2 → wait 10s
 *   - Attempt 3 → wait 30s
 *   - Attempt 4 → wait 60s
 *   - Attempt 5 → FINAL FAILED → masuk admin panel notification
 */

import { PrintJobRepository } from '@database/repositories/PrintJobRepository';
import { PhotoRepository }    from '@database/repositories/PhotoRepository';
import { PrintService }       from './PrintService';
import { useAppStore }        from '@store/useAppStore';
import { AppConfig }          from '@constants/config';
import type { PrintQueueEvent } from '@kitafoto-types/print.types';

// ── Retry delays per attempt number ──────────────────────────
const RETRY_DELAYS_MS = [5_000, 10_000, 30_000, 60_000, 120_000];

// ── Poll interval ─────────────────────────────────────────────
const POLL_INTERVAL_MS = 5_000;

// ── Printer check interval ────────────────────────────────────
const PRINTER_CHECK_MS = 30_000;

type QueueListener = (event: PrintQueueEvent) => void;

class PrintQueueClass {
  private intervalId:      ReturnType<typeof setInterval> | null = null;
  private printerCheckId:  ReturnType<typeof setInterval> | null = null;
  private isProcessing     = false;
  private isPaused         = false;
  private listeners        = new Set<QueueListener>();

  // ── Lifecycle ─────────────────────────────────────────────

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => this.tick(), POLL_INTERVAL_MS);

    // Cek koneksi printer berkala
    this.printerCheckId = setInterval(
      () => this.checkPrinter(),
      PRINTER_CHECK_MS
    );

    // Proses segera saat start
    setTimeout(() => this.tick(), 1000);
    console.log('[PrintQueue] Started ✓');
  }

  stop(): void {
    [this.intervalId, this.printerCheckId].forEach(id => {
      if (id) clearInterval(id);
    });
    this.intervalId     = null;
    this.printerCheckId = null;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.tick();
  }

  // ── Listener ──────────────────────────────────────────────

  addListener(fn: QueueListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(event: PrintQueueEvent): void {
    this.listeners.forEach(fn => {
      try { fn(event); } catch { /* non-fatal */ }
    });
  }

  // ── Enqueue (dipanggil dari PhotoCapturePipeline) ─────────

  async enqueue(photoId: string, copies = 1): Promise<void> {
    // Idempotent: cek duplikat
    const existing = await PrintJobRepository.getPendingForPhoto(photoId);
    if (existing) return;

    await PrintJobRepository.create({
      photoId,
      status:      'pending',
      attempts:    0,
      maxAttempts: AppConfig.printMaxRetries,
      copyNumber:  1,
      totalCopies: copies,
    });

    // Update badge
    const count = await PrintJobRepository.getPendingCount();
    useAppStore.getState().setPendingPrintCount(count);

    // Trigger segera
    this.tick();
  }

  // ── Core: Tick ────────────────────────────────────────────

  private async tick(): Promise<void> {
    if (this.isProcessing || this.isPaused) return;

    // Jika printer offline, skip (tapi jangan block upload)
    const printerReady = PrintService.isReady();
    if (!printerReady) return;

    try {
      // Ambil 1 job yang siap diproses (FIFO)
      const jobs = await PrintJobRepository.getRetryable();
      if (jobs.length === 0) {
        this.emit({ type: 'queue_empty' });
        return;
      }

      // Hanya proses 1 job sekaligus (printer satu-satu)
      await this.processJob(jobs[0]);

    } catch (error) {
      console.error('[PrintQueue] Tick error:', error);
    } finally {
      const count = await PrintJobRepository.getPendingCount();
      useAppStore.getState().setPendingPrintCount(count);
    }
  }

  // ── Core: Process Single Job ──────────────────────────────

  private async processJob(job: import('@kitafoto-types/print.types').PrintJob): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Mark printing
      await PrintJobRepository.updateStatus(job.id, 'printing');
      await PhotoRepository.updatePrintStatus(job.photoId, 'printing');
      this.emit({ type: 'job_started', jobId: job.id, photoId: job.photoId });

      // 2. Ambil path file dari DB
      const photo = await PhotoRepository.getById(job.photoId);
      if (!photo?.printPath) {
        await this.failJob(job, 'File foto tidak ditemukan', true);
        return;
      }

      // 3. Cek file masih ada di storage
      const { getInfoAsync } = await import('expo-file-system');
      const fileInfo = await getInfoAsync(photo.printPath);
      if (!fileInfo.exists) {
        await this.failJob(job, `File tidak ada: ${photo.printPath}`, true);
        return;
      }

      // 4. Print
      const copies = job.totalCopies ?? 1;
      const result = await PrintService.print(photo.printPath, copies);

      if (result.success) {
        // ── SUKSES ─────────────────────────────────────────
        await PrintJobRepository.updateStatus(job.id, 'done');
        await PhotoRepository.updatePrintStatus(job.photoId, 'done');

        this.emit({
          type:    'job_done',
          jobId:   job.id,
          photoId: job.photoId,
          copies,
        });

        console.log(`[PrintQueue] ✓ ${job.photoId} printed (${copies} copy)`);

      } else {
        // ── GAGAL ──────────────────────────────────────────
        const newAttempts = job.attempts + 1;
        const isFinal     = newAttempts >= job.maxAttempts;

        await this.failJob(job, result.error ?? 'Print gagal', isFinal);

        console.warn(
          `[PrintQueue] ✗ ${job.photoId} attempt ${newAttempts}/${job.maxAttempts}:`,
          result.error
        );
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.failJob(job, msg, job.attempts + 1 >= job.maxAttempts);
      console.error('[PrintQueue] Job error:', msg);

    } finally {
      this.isProcessing = false;
    }
  }

  private async failJob(
    job: import('@kitafoto-types/print.types').PrintJob,
    error: string,
    isFinal: boolean
  ): Promise<void> {
    await PrintJobRepository.incrementAttempts(job.id);
    await PrintJobRepository.updateStatus(
      job.id,
      isFinal ? 'failed' : 'pending',
      error
    );
    await PhotoRepository.updatePrintStatus(
      job.photoId,
      isFinal ? 'failed' : 'pending'
    );

    this.emit({
      type:    'job_failed',
      jobId:   job.id,
      photoId: job.photoId,
      error,
      isFinal,
    });
  }

  // ── Printer monitoring ─────────────────────────────────────

  private async checkPrinter(): Promise<void> {
    const wasConnected = PrintService.isReady();
    const isNowConnected = await PrintService.checkConnectivity();

    if (!wasConnected && isNowConnected) {
      this.emit({ type: 'printer_online' });
      this.isPaused = false;
      this.tick();
    } else if (wasConnected && !isNowConnected) {
      this.emit({ type: 'printer_offline' });
    }
  }

  // ── Admin actions ─────────────────────────────────────────

  async retryJob(jobId: string): Promise<void> {
    await PrintJobRepository.updateStatus(jobId, 'pending');
    await PrintJobRepository.resetAttempts(jobId);
    this.tick();
  }

  async retryAllFailed(): Promise<number> {
    const failed = await PrintJobRepository.getFailed();
    for (const job of failed) {
      await PrintJobRepository.updateStatus(job.id, 'pending');
      await PrintJobRepository.resetAttempts(job.id);
    }
    this.tick();
    return failed.length;
  }

  async cancelJob(jobId: string): Promise<void> {
    await PrintJobRepository.updateStatus(jobId, 'cancelled');
  }

  async getPendingJobs() {
    return PrintJobRepository.getPending();
  }

  async getFailedJobs() {
    return PrintJobRepository.getFailed();
  }

  triggerNow(): void {
    if (!this.isPaused) this.tick();
  }
}

export const PrintQueue = new PrintQueueClass();
