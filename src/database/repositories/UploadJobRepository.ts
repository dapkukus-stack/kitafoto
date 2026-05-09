/**
 * UploadJobRepository — CRUD untuk upload_jobs
 */

import { db } from '../DatabaseService';
import type { UploadJob, CreateUploadJobPayload } from '@types/upload.types';
import { v4 as uuidv4 } from 'react-native-uuid';
import { AppConfig } from '@constants/config';

function rowToJob(row: Record<string, unknown>): UploadJob {
  return {
    id: row.id as string,
    photoId: row.photo_id as string,
    status: row.status as UploadJob['status'],
    attempts: row.attempts as number,
    maxAttempts: row.max_attempts as number,
    nextRetryAt: row.next_retry_at as string | undefined,
    lastError: row.last_error as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    uploadedAt: row.uploaded_at as string | undefined,
    cloudUrl: row.cloud_url as string | undefined,
  };
}

// Hitung next retry time dengan exponential backoff
function getNextRetryAt(attempts: number): string {
  const delays = AppConfig.uploadRetryDelaysMs;
  const delayMs = delays[Math.min(attempts, delays.length - 1)] ?? delays[delays.length - 1];
  return new Date(Date.now() + delayMs).toISOString();
}

export const UploadJobRepository = {

  async create(payload: CreateUploadJobPayload): Promise<UploadJob> {
    const id = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO upload_jobs
        (id, photo_id, status, attempts, max_attempts, next_retry_at,
         last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.photoId,
        payload.status,
        payload.attempts,
        payload.maxAttempts,
        payload.nextRetryAt ?? null,
        payload.lastError ?? null,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<UploadJob | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM upload_jobs WHERE id = ?',
      [id]
    );
    return row ? rowToJob(row) : null;
  },

  async getReadyToUpload(): Promise<UploadJob[]> {
    const now = new Date().toISOString();
    const rows = await db.getAll<Record<string, unknown>>(
      `SELECT * FROM upload_jobs
       WHERE status IN ('pending', 'failed')
       AND attempts < max_attempts
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC
       LIMIT 10`,
      [now]
    );
    return rows.map(rowToJob);
  },

  async markUploading(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      "UPDATE upload_jobs SET status = 'uploading', updated_at = ? WHERE id = ?",
      [now, id]
    );
  },

  async markDone(id: string, cloudUrl: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE upload_jobs
       SET status = 'done', cloud_url = ?, uploaded_at = ?, updated_at = ?
       WHERE id = ?`,
      [cloudUrl, now, now, id]
    );
  },

  async markFailed(id: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    const job = await this.getById(id);
    if (!job) return;

    const newAttempts = job.attempts + 1;
    const nextRetry = getNextRetryAt(newAttempts);
    const isFinal = newAttempts >= job.maxAttempts;

    await db.run(
      `UPDATE upload_jobs
       SET status = ?, attempts = ?, last_error = ?, next_retry_at = ?, updated_at = ?
       WHERE id = ?`,
      [isFinal ? 'failed' : 'failed', newAttempts, error, isFinal ? null : nextRetry, now, id]
    );
  },

  async getPendingCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM upload_jobs WHERE status IN ('pending', 'failed')"
    );
    return row?.count ?? 0;
  },

  async getAll(): Promise<UploadJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM upload_jobs ORDER BY created_at DESC LIMIT 100'
    );
    return rows.map(rowToJob);
  },
};
