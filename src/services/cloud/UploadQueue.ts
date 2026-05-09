/**
 * UploadQueue
 * Background service untuk proses antrian upload ke Cloudinary
 * - Retry otomatis dengan exponential backoff
 * - Pause jika offline, resume saat online
 * - Max concurrent uploads: AppConfig.uploadBatchSize
 */

import { UploadJobRepository } from '@database/repositories/UploadJobRepository';
import { PhotoRepository } from '@database/repositories/PhotoRepository';
import { EventRepository } from '@database/repositories/EventRepository';
import { CloudinaryService } from './CloudinaryService';
import { AppConfig } from '@constants/config';
import { useAppStore } from '@store/useAppStore';

class UploadQueueClass {
  private isProcessing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.intervalId) return;

    // Process queue setiap 5 detik
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, 5000);

    console.log('[UploadQueue] Started ✓');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async processQueue(): Promise<void> {
    // Skip jika offline
    const { isOnline } = useAppStore.getState();
    if (!isOnline) return;

    // Skip jika sedang proses
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const jobs = await UploadJobRepository.getReadyToUpload();
      if (jobs.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Process max N jobs concurrent
      const batch = jobs.slice(0, AppConfig.uploadBatchSize);

      await Promise.all(
        batch.map((job) => this.processJob(job.id, job.photoId))
      );

      // Update badge count
      const pending = await UploadJobRepository.getPendingCount();
      useAppStore.getState().setPendingUploadCount(pending);

    } catch (error) {
      console.error('[UploadQueue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(jobId: string, photoId: string): Promise<void> {
    try {
      // Mark as uploading
      await UploadJobRepository.markUploading(jobId);
      await PhotoRepository.updateUploadStatus(photoId, 'uploading');

      // Get photo & event info
      const photo = await PhotoRepository.getById(photoId);
      if (!photo || !photo.processedPath) {
        await UploadJobRepository.markFailed(jobId, 'File foto tidak ditemukan');
        await PhotoRepository.updateUploadStatus(photoId, 'failed');
        return;
      }

      const event = await EventRepository.getById(photo.eventId);
      if (!event) {
        await UploadJobRepository.markFailed(jobId, 'Event tidak ditemukan');
        await PhotoRepository.updateUploadStatus(photoId, 'failed');
        return;
      }

      // Upload ke Cloudinary
      const result = await CloudinaryService.uploadPhoto(photo.processedPath, {
        eventId: event.id,
        eventName: event.name,
        sessionId: photo.sessionId,
        photoId: photo.id,
      });

      if (result.success && result.cloudUrl) {
        await UploadJobRepository.markDone(jobId, result.cloudUrl);
        await PhotoRepository.updateUploadStatus(photoId, 'done', result.cloudUrl);

        // Auto-delete local file setelah upload sukses
        await this.cleanupLocalFile(photo.processedPath);
        await this.cleanupLocalFile(photo.rawPath);

        console.log(`[UploadQueue] ✓ Upload sukses: ${photo.sessionId}`);
      } else {
        await UploadJobRepository.markFailed(jobId, result.error ?? 'Unknown error');
        await PhotoRepository.updateUploadStatus(photoId, 'failed');
        console.warn(`[UploadQueue] ✗ Upload gagal: ${result.error}`);
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await UploadJobRepository.markFailed(jobId, msg);
      await PhotoRepository.updateUploadStatus(photoId, 'failed');
      console.error('[UploadQueue] Job error:', msg);
    }
  }

  private async cleanupLocalFile(filePath?: string): Promise<void> {
    if (!filePath) return;
    try {
      const { deleteAsync } = await import('expo-file-system');
      await deleteAsync(filePath, { idempotent: true });
    } catch {
      // ignore cleanup errors
    }
  }

  // Trigger manual (misal saat internet kembali)
  async triggerNow(): Promise<void> {
    await this.processQueue();
  }
}

export const UploadQueue = new UploadQueueClass();
