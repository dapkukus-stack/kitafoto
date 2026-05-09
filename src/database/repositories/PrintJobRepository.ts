/**
 * PrintJobRepository — CRUD untuk print_jobs
 */

import { db } from '../DatabaseService';
import type { PrintJob, CreatePrintJobPayload } from '@types/print.types';
import { v4 as uuidv4 } from 'react-native-uuid';

function rowToJob(row: Record<string, unknown>): PrintJob {
  return {
    id: row.id as string,
    photoId: row.photo_id as string,
    status: row.status as PrintJob['status'],
    attempts: row.attempts as number,
    maxAttempts: row.max_attempts as number,
    lastError: row.last_error as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    printedAt: row.printed_at as string | undefined,
  };
}

export const PrintJobRepository = {

  async create(payload: CreatePrintJobPayload): Promise<PrintJob> {
    const id = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO print_jobs
        (id, photo_id, status, attempts, max_attempts, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.photoId,
        payload.status,
        payload.attempts,
        payload.maxAttempts,
        payload.lastError ?? null,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<PrintJob | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM print_jobs WHERE id = ?',
      [id]
    );
    return row ? rowToJob(row) : null;
  },

  async getPending(): Promise<PrintJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM print_jobs WHERE status = 'pending' ORDER BY created_at ASC"
    );
    return rows.map(rowToJob);
  },

  async getFailed(): Promise<PrintJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM print_jobs WHERE status = 'failed' ORDER BY created_at DESC"
    );
    return rows.map(rowToJob);
  },

  async getRetryable(): Promise<PrintJob[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      `SELECT * FROM print_jobs
       WHERE status IN ('pending', 'failed')
       AND attempts < max_attempts
       ORDER BY created_at ASC`
    );
    return rows.map(rowToJob);
  },

  async updateStatus(
    id: string,
    status: PrintJob['status'],
    error?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE print_jobs
       SET status = ?, last_error = ?, updated_at = ?, printed_at = ?
       WHERE id = ?`,
      [status, error ?? null, now, status === 'done' ? now : null, id]
    );
  },

  async incrementAttempts(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE print_jobs SET attempts = attempts + 1, updated_at = ? WHERE id = ?',
      [now, id]
    );
  },

  async getPendingCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM print_jobs WHERE status = 'pending'"
    );
    return row?.count ?? 0;
  },
};
