/**
 * EventRepository — CRUD untuk events & frames
 */

import { db } from '../DatabaseService';
import type { KitaEvent, KitaFrame, CreateEventPayload, CreateFramePayload, UpdateEventPayload } from '@types/event.types';
import 'react-native-uuid';
import { v4 as uuidv4 } from 'react-native-uuid';

// ── Mapper helpers ───────────────────────────────────────

function rowToEvent(row: Record<string, unknown>): KitaEvent {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    isActive: (row.is_active as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    photoCount: row.photo_count as number,
    layoutType: row.layout_type as KitaEvent['layoutType'],
    countdownSecs: row.countdown_secs as number,
    filterDefault: row.filter_default as KitaEvent['filterDefault'],
    autoPrint: (row.auto_print as number) === 1,
    printCopies: row.print_copies as number,
    cloudinaryFolder: row.cloudinary_folder as string | undefined,
  };
}

function rowToFrame(row: Record<string, unknown>): KitaFrame {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: row.name as string,
    filePath: row.file_path as string,
    thumbnail: row.thumbnail as string | undefined,
    sortOrder: row.sort_order as number,
    isActive: (row.is_active as number) === 1,
    createdAt: row.created_at as string,
    width: row.width as number | undefined,
    height: row.height as number | undefined,
    fileSize: row.file_size as number | undefined,
  };
}

// ── Event CRUD ───────────────────────────────────────────

export const EventRepository = {

  async getAll(): Promise<KitaEvent[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM events ORDER BY created_at DESC'
    );
    return rows.map(rowToEvent);
  },

  async getById(id: string): Promise<KitaEvent | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    return row ? rowToEvent(row) : null;
  },

  async getActive(): Promise<KitaEvent | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM events WHERE is_active = 1 LIMIT 1'
    );
    return row ? rowToEvent(row) : null;
  },

  async create(payload: CreateEventPayload): Promise<KitaEvent> {
    const id = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO events
        (id, name, description, is_active, created_at, updated_at,
         photo_count, layout_type, countdown_secs, filter_default,
         auto_print, print_copies, cloudinary_folder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.name,
        payload.description ?? null,
        payload.isActive ? 1 : 0,
        now,
        now,
        payload.photoCount,
        payload.layoutType,
        payload.countdownSecs,
        payload.filterDefault,
        payload.autoPrint ? 1 : 0,
        payload.printCopies,
        payload.cloudinaryFolder ?? null,
      ]
    );

    return (await this.getById(id))!;
  },

  async update(id: string, payload: UpdateEventPayload): Promise<KitaEvent | null> {
    const now = new Date().toISOString();
    const current = await this.getById(id);
    if (!current) return null;

    const updated = { ...current, ...payload };

    await db.run(
      `UPDATE events SET
        name = ?, description = ?, is_active = ?, updated_at = ?,
        photo_count = ?, layout_type = ?, countdown_secs = ?,
        filter_default = ?, auto_print = ?, print_copies = ?,
        cloudinary_folder = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.description ?? null,
        updated.isActive ? 1 : 0,
        now,
        updated.photoCount,
        updated.layoutType,
        updated.countdownSecs,
        updated.filterDefault,
        updated.autoPrint ? 1 : 0,
        updated.printCopies,
        updated.cloudinaryFolder ?? null,
        id,
      ]
    );

    return this.getById(id);
  },

  async setActive(id: string): Promise<void> {
    await db.transaction(async (txDb) => {
      await txDb.runAsync('UPDATE events SET is_active = 0, updated_at = ?', [
        new Date().toISOString(),
      ]);
      await txDb.runAsync(
        'UPDATE events SET is_active = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    });
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM events WHERE id = ?', [id]);
  },
};

// ── Frame CRUD ───────────────────────────────────────────

export const FrameRepository = {

  async getByEvent(eventId: string, activeOnly = true): Promise<KitaFrame[]> {
    const sql = activeOnly
      ? 'SELECT * FROM frames WHERE event_id = ? AND is_active = 1 ORDER BY sort_order ASC'
      : 'SELECT * FROM frames WHERE event_id = ? ORDER BY sort_order ASC';
    const rows = await db.getAll<Record<string, unknown>>(sql, [eventId]);
    return rows.map(rowToFrame);
  },

  async getById(id: string): Promise<KitaFrame | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM frames WHERE id = ?',
      [id]
    );
    return row ? rowToFrame(row) : null;
  },

  async create(payload: CreateFramePayload): Promise<KitaFrame> {
    const id = uuidv4() as string;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO frames
        (id, event_id, name, file_path, thumbnail, sort_order,
         is_active, created_at, width, height, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.eventId,
        payload.name,
        payload.filePath,
        payload.thumbnail ?? null,
        payload.sortOrder,
        payload.isActive ? 1 : 0,
        now,
        payload.width ?? null,
        payload.height ?? null,
        payload.fileSize ?? null,
      ]
    );

    return (await this.getById(id))!;
  },

  async updateSortOrder(frames: { id: string; sortOrder: number }[]): Promise<void> {
    await db.transaction(async (txDb) => {
      for (const f of frames) {
        await txDb.runAsync(
          'UPDATE frames SET sort_order = ? WHERE id = ?',
          [f.sortOrder, f.id]
        );
      }
    });
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await db.run('UPDATE frames SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM frames WHERE id = ?', [id]);
  },

  async countByEvent(eventId: string): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM frames WHERE event_id = ? AND is_active = 1',
      [eventId]
    );
    return row?.count ?? 0;
  },
};
