/**
 * PhotoRepository — CRUD untuk photos
 */

import { db } from '../DatabaseService';
import type { KitaPhoto, CreatePhotoPayload } from '@kitafoto-types/photo.types';
import { v4 as uuidv4 } from 'react-native-uuid';

function rowToPhoto(row: Record<string, unknown>): KitaPhoto {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    frameId: row.frame_id as string,
    sessionId: row.session_id as string,
    rawPath: row.raw_path as string | undefined,
    processedPath: row.processed_path as string | undefined,
    printPath: row.print_path as string | undefined,
    cloudUrl: row.cloud_url as string | undefined,
    filterApplied: row.filter_applied as KitaPhoto['filterApplied'],
    layoutType: row.layout_type as KitaPhoto['layoutType'],
    photoCount: row.photo_count as number,
    uploadStatus: row.upload_status as KitaPhoto['uploadStatus'],
    printStatus: row.print_status as KitaPhoto['printStatus'],
    createdAt: row.created_at as string,
    uploadedAt: row.uploaded_at as string | undefined,
    printedAt: row.printed_at as string | undefined,
  };
}

export const PhotoRepository = {

  async create(payload: CreatePhotoPayload): Promise<KitaPhoto> {
    const id = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO photos
        (id, event_id, frame_id, session_id, raw_path, processed_path,
         print_path, cloud_url, filter_applied, layout_type, photo_count,
         upload_status, print_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.eventId,
        payload.frameId,
        payload.sessionId,
        payload.rawPath ?? null,
        payload.processedPath ?? null,
        payload.printPath ?? null,
        payload.cloudUrl ?? null,
        payload.filterApplied,
        payload.layoutType,
        payload.photoCount,
        payload.uploadStatus,
        payload.printStatus,
        now,
      ]
    );

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<KitaPhoto | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM photos WHERE id = ?',
      [id]
    );
    return row ? rowToPhoto(row) : null;
  },

  async getByEvent(eventId: string, limit = 50, offset = 0): Promise<KitaPhoto[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM photos WHERE event_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [eventId, limit, offset]
    );
    return rows.map(rowToPhoto);
  },

  async getPendingUploads(): Promise<KitaPhoto[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM photos WHERE upload_status IN ('pending', 'failed') ORDER BY created_at ASC"
    );
    return rows.map(rowToPhoto);
  },

  async getPendingPrints(): Promise<KitaPhoto[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      "SELECT * FROM photos WHERE print_status IN ('pending', 'failed') ORDER BY created_at ASC"
    );
    return rows.map(rowToPhoto);
  },

  async updateUploadStatus(
    id: string,
    status: KitaPhoto['uploadStatus'],
    cloudUrl?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE photos SET upload_status = ?, cloud_url = ?, uploaded_at = ? WHERE id = ?`,
      [status, cloudUrl ?? null, status === 'done' ? now : null, id]
    );
  },

  async updatePrintStatus(id: string, status: KitaPhoto['printStatus']): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE photos SET print_status = ?, printed_at = ? WHERE id = ?`,
      [status, status === 'done' ? now : null, id]
    );
  },

  async updatePaths(
    id: string,
    paths: { processedPath?: string; printPath?: string }
  ): Promise<void> {
    await db.run(
      'UPDATE photos SET processed_path = ?, print_path = ? WHERE id = ?',
      [paths.processedPath ?? null, paths.printPath ?? null, id]
    );
  },

  async getCountByEvent(eventId: string): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM photos WHERE event_id = ?',
      [eventId]
    );
    return row?.count ?? 0;
  },

  async getTodayCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM photos WHERE DATE(created_at) = ?",
      [today]
    );
    return row?.count ?? 0;
  },

  // Cari foto yang sudah diupload dan lebih dari N hari lalu
  async getEligibleForDeletion(olderThanDays: number): Promise<KitaPhoto[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffStr = cutoff.toISOString();

    const rows = await db.getAll<Record<string, unknown>>(
      `SELECT * FROM photos
       WHERE upload_status = 'done'
       AND created_at < ?
       ORDER BY created_at ASC`,
      [cutoffStr]
    );
    return rows.map(rowToPhoto);
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM photos WHERE id = ?', [id]);
  },
};
