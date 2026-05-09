/**
 * UploadJobRepository
 * ─────────────────────────────────────────────────────────────
 * Query helper untuk tabel upload_queue (v2).
 * Digunakan oleh UploadQueue service dan admin panel.
 *
 * Catatan: tabel upload_queue menggantikan upload_jobs dari v1.
 */

import { db }           from '../DatabaseService';
import type {
  UploadJob,
  UploadJobStatus,
  UploadErrorCode,
} from '@kitafoto-types/storage.types';
import { v4 as uuidv4 } from 'react-native-uuid';
import { AppConfig }    from '@constants/config';

// ── Row mapper ────────────────────────────────────────────────

function rowToJob(row: Record<string, unknown>): UploadJob {
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

// ── Backoff schedule ──────────────────────────────────────────

function getNextRetryAt(attempts: number): string {
  const delays = AppConfig.uploadRetryDelaysMs;
  const delay  = delays[Math.min(attempts, delays.length - 1)] ?? delays[delays.length - 1];
  return new Date(Date.now() + delay).toISOString();
}

// ═══════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════

export const UploadJobRepository = {

  async create(params: {
    photoId: string;
    providerId?: string;
    maxAttempts?: number;
    priority?: number;
  }): Promise<UploadJob> {
    const id  = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO upload_queue
        (id, photo_id, provider_id, status, attempts, max_attempts, priority, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 0, ?, ?, ?, ?)`,
      [
        id,
        params.photoId,
        params.providerId ?? null,
        params.maxAttempts ?? AppConfig.uploadMaxRetries,
        params.priority    ?? 0,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<UploadJob | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM upload_queue WHERE id = ?', [id]
    );
    return row ? rowToJob(row) : null;
  },

  async getByPhotoId(photoId: string): Promise<UploadJob | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      `SELECT * FROM upload_queue
       WHERE photo_id = ? AND status NOT IN ('cancelled')
       ORDER BY created_at DESC LIMIT 1`,
      [photoId]
    );
    return row ? rowToJob(row) : null;
  },

  async getReadyToUpload(limit = 10): Promise<UploadJob[]> {
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
    return rows.map(rowToJob);
  },

  async getPending(): Promise<UploadJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM upload_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC"
    );
    return rows.map(rowToJob);
  },

  async getFailed(): Promise<UploadJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM upload_queue WHERE status = 'failed' ORDER BY created_at DESC"
    );
    return rows.map(rowToJob);
  },

  async getAll(limit = 50): Promise<UploadJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM upload_queue ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(rowToJob);
  },

  async markUploading(id: string): Promise<void> {
    await db.run(
      "UPDATE upload_queue SET status = 'uploading', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id]
    );
  },

  async markDone(id: string, cloudUrl: string, succeededProviderId?: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE upload_queue
       SET status = 'done', cloud_url = ?, succeeded_provider_id = ?,
           uploaded_at = ?, updated_at = ?
       WHERE id = ?`,
      [cloudUrl, succeededProviderId ?? null, now, now, id]
    );
  },

  async markFailed(id: string, error: string, errorCode?: UploadErrorCode): Promise<void> {
    const now = new Date().toISOString();
    const job = await this.getById(id);
    if (!job) return;

    const newAttempts = job.attempts + 1;
    const isFinal     = newAttempts >= job.maxAttempts;
    const nextRetry   = isFinal ? null : getNextRetryAt(newAttempts);

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
        nextRetry,
        now,
        id,
      ]
    );
  },

  async cancel(id: string): Promise<void> {
    await db.run(
      "UPDATE upload_queue SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id]
    );
  },

  async retryFailed(id: string): Promise<void> {
    await db.run(
      `UPDATE upload_queue
       SET status = 'pending', attempts = 0, next_retry_at = NULL,
           last_error = NULL, last_error_code = NULL, updated_at = ?
       WHERE id = ? AND status = 'failed'`,
      [new Date().toISOString(), id]
    );
  },

  async retryAllFailed(): Promise<number> {
    const result = await db.run(
      `UPDATE upload_queue
       SET status = 'pending', attempts = 0, next_retry_at = NULL,
           last_error = NULL, last_error_code = NULL, updated_at = ?
       WHERE status = 'failed'`,
      [new Date().toISOString()]
    );
    return result.changes ?? 0;
  },

  async getPendingCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM upload_queue WHERE status IN ('pending', 'uploading')"
    );
    return row?.count ?? 0;
  },

  async getFailedCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM upload_queue WHERE status = 'failed'"
    );
    return row?.count ?? 0;
  },

  // ── Analytics ──────────────────────────────────────────────

  async getUploadStats(): Promise<{
    total: number;
    done: number;
    pending: number;
    failed: number;
    uploading: number;
  }> {
    const rows = await db.getAll<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM upload_queue GROUP BY status'
    );
    const map = Object.fromEntries(rows.map(r => [r.status, r.count]));
    return {
      total:     rows.reduce((s, r) => s + r.count, 0),
      done:      map['done']      ?? 0,
      pending:   map['pending']   ?? 0,
      failed:    map['failed']    ?? 0,
      uploading: map['uploading'] ?? 0,
    };
  },

  // ── Cleanup (hapus job lama yang sudah done) ───────────────

  async cleanupOldDone(olderThanDays = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await db.run(
      "DELETE FROM upload_queue WHERE status = 'done' AND uploaded_at < ?",
      [cutoff.toISOString()]
    );
    return result.changes ?? 0;
  },

  async cleanupOldHealthLogs(olderThanDays = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await db.run(
      'DELETE FROM provider_health_logs WHERE checked_at < ?',
      [cutoff.toISOString()]
    );
    return result.changes ?? 0;
  },
};
