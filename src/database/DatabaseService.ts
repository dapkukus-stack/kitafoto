/**
 * KitaFoto DatabaseService
 * Singleton SQLite connection manager
 * Menggunakan expo-sqlite v14 (async API)
 */

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DEFAULT_SETTINGS } from './schema';

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('kitafoto.db');

      // Jalankan semua create table (split per statement)
      const statements = CREATE_TABLES_SQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await this.db.execAsync(
        statements.map((sql) => ({ sql, args: [] }))
      );

      // Insert default settings jika belum ada
      await this.seedDefaultSettings();

      this.initialized = true;
      console.log('[DB] KitaFoto database initialized ✓');
    } catch (error) {
      console.error('[DB] Initialization failed:', error);
      throw error;
    }
  }

  private async seedDefaultSettings(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  }

  getDB(): SQLite.SQLiteDatabase {
    if (!this.db || !this.initialized) {
      throw new Error('[DB] Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
    }
  }

  // ── Helper methods ──────────────────────────────────────

  async run(sql: string, args: (string | number | null)[] = []): Promise<SQLite.SQLiteRunResult> {
    return this.getDB().runAsync(sql, args);
  }

  async getFirst<T>(sql: string, args: (string | number | null)[] = []): Promise<T | null> {
    return this.getDB().getFirstAsync<T>(sql, args);
  }

  async getAll<T>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
    return this.getDB().getAllAsync<T>(sql, args);
  }

  async transaction(fn: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
    const db = this.getDB();
    await db.withTransactionAsync(async () => {
      await fn(db);
    });
  }

  // ── App Settings ────────────────────────────────────────

  async getSetting(key: string): Promise<string | null> {
    const row = await this.getFirst<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await this.getAll<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings'
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}

export const db = DatabaseService.getInstance();
export default DatabaseService;
