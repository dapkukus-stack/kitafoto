/**
 * DiagnosticsService
 * ─────────────────────────────────────────────────────────────
 * Centralized logging & diagnostics for KitaFoto.
 * All subsystems (camera, print, upload, memory, perf) log here.
 *
 * Design:
 *   • SQLite-backed persistent log (survives crash/restart)
 *   • In-memory ring buffer for latest N entries (fast read for overlay)
 *   • Auto-pruning: logs older than retention period auto-deleted
 *   • Export as JSON for sharing with developer
 *   • Categories: session, camera, capture, print, upload, memory, error, perf
 *   • Severity: debug, info, warn, error, fatal
 *
 * Performance contract:
 *   • log() is fire-and-forget — never awaits SQLite write in hot path
 *   • SQLite writes batched every 2 seconds (reduce I/O)
 *   • Ring buffer capped at 200 entries (< 50 KB RAM)
 *   • Pruning runs once per hour via MemoryCleanupService
 */

import { db } from '@database/DatabaseService';

// ── Types ────────────────────────────────────────────────────

export type LogCategory =
  | 'session'
  | 'camera'
  | 'capture'
  | 'print'
  | 'upload'
  | 'memory'
  | 'error'
  | 'perf'
  | 'navigation'
  | 'system';

export type LogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id?: string;
  timestamp: string;
  category: LogCategory;
  severity: LogSeverity;
  message: string;
  data?: string;        // JSON-serialized extra data
}

export interface DiagnosticsSnapshot {
  deviceInfo: {
    model: string | null;
    os: string;
    appVersion: string;
  };
  sessionStats: {
    totalLogs: number;
    errorCount: number;
    uptime: string;
  };
  recentLogs: LogEntry[];
  queues: {
    pendingPrint: number;
    pendingUpload: number;
  };
}

// ── Retention config (days) ──────────────────────────────────

const RETENTION: Record<LogCategory, number> = {
  session:    7,
  camera:     3,
  capture:    7,
  print:      7,
  upload:     7,
  memory:     1,
  error:      30,
  perf:       1,
  navigation: 1,
  system:     7,
};

// ── Constants ────────────────────────────────────────────────

const RING_BUFFER_SIZE = 200;
const BATCH_FLUSH_MS   = 2000;
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS diagnostics_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    category  TEXT NOT NULL,
    severity  TEXT NOT NULL,
    message   TEXT NOT NULL,
    data      TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_diag_ts       ON diagnostics_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_diag_category ON diagnostics_logs(category);
  CREATE INDEX IF NOT EXISTS idx_diag_severity ON diagnostics_logs(severity);
`;

// ═══════════════════════════════════════════════════════════════

class DiagnosticsServiceClass {
  private ringBuffer: LogEntry[] = [];
  private writeBatch: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private startedAt   = Date.now();

  // ── Lifecycle ──────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create table (idempotent)
      const statements = CREATE_TABLE_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const sql of statements) {
        await db.run(sql);
      }

      // Start batch flush timer
      this.flushTimer = setInterval(() => this.flush(), BATCH_FLUSH_MS);

      this.initialized = true;
      this.log('system', 'info', 'DiagnosticsService initialized');
    } catch (error) {
      console.error('[Diagnostics] init error:', error);
    }
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Final flush
    this.flush();
  }

  // ── Logging API ────────────────────────────────────────────

  /**
   * Primary log method. Fire-and-forget — does NOT await.
   * Hot path safe: only pushes to array, SQLite write is batched.
   */
  log(
    category: LogCategory,
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      severity,
      message,
      data: data ? JSON.stringify(data) : undefined,
    };

    // Ring buffer (in-memory, capped)
    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > RING_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }

    // Batch for SQLite write
    this.writeBatch.push(entry);

    // Console output for development
    if (__DEV__ || severity === 'error' || severity === 'fatal') {
      const prefix = `[${category}/${severity}]`;
      if (severity === 'error' || severity === 'fatal') {
        console.error(prefix, message, data ?? '');
      } else if (severity === 'warn') {
        console.warn(prefix, message, data ?? '');
      }
    }
  }

  // ── Convenience methods ────────────────────────────────────

  info(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(category, 'info', message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(category, 'warn', message, data);
  }

  error(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(category, 'error', message, data);
  }

  fatal(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(category, 'fatal', message, data);
    // Fatal: flush immediately (app might crash after this)
    this.flush();
  }

  // ── Query ──────────────────────────────────────────────────

  /** Get ring buffer (in-memory, instant, no I/O) */
  getRecentLogs(count = 50): LogEntry[] {
    return this.ringBuffer.slice(-count);
  }

  /** Get logs by category from SQLite */
  async getLogsByCategory(
    category: LogCategory,
    limit = 50
  ): Promise<LogEntry[]> {
    const rows = await db.getAll<LogEntry>(
      'SELECT * FROM diagnostics_logs WHERE category = ? ORDER BY timestamp DESC LIMIT ?',
      [category, limit]
    );
    return rows;
  }

  /** Get error/fatal logs from SQLite */
  async getErrors(limit = 100): Promise<LogEntry[]> {
    const rows = await db.getAll<LogEntry>(
      "SELECT * FROM diagnostics_logs WHERE severity IN ('error', 'fatal') ORDER BY timestamp DESC LIMIT ?",
      [limit]
    );
    return rows;
  }

  /** Count logs by severity */
  async getErrorCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM diagnostics_logs WHERE severity IN ('error', 'fatal')"
    );
    return row?.count ?? 0;
  }

  /** Get total log count */
  async getTotalCount(): Promise<number> {
    const row = await db.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM diagnostics_logs'
    );
    return row?.count ?? 0;
  }

  // ── Export ─────────────────────────────────────────────────

  /** Export diagnostics snapshot as JSON-serializable object */
  async exportSnapshot(): Promise<DiagnosticsSnapshot> {
    const [totalLogs, errorCount, pendingPrint, pendingUpload] = await Promise.all([
      this.getTotalCount(),
      this.getErrorCount(),
      db.getFirst<{ c: number }>("SELECT COUNT(*) as c FROM print_jobs WHERE status = 'pending'"),
      db.getFirst<{ c: number }>("SELECT COUNT(*) as c FROM upload_queue WHERE status IN ('pending','uploading')"),
    ]);

    const uptimeMs = Date.now() - this.startedAt;
    const hours    = Math.floor(uptimeMs / 3600000);
    const minutes  = Math.floor((uptimeMs % 3600000) / 60000);

    return {
      deviceInfo: {
        model: null,  // Filled by caller from expo-device
        os: 'Android',
        appVersion: '1.0.0',
      },
      sessionStats: {
        totalLogs,
        errorCount,
        uptime: `${hours}h ${minutes}m`,
      },
      recentLogs: this.getRecentLogs(100),
      queues: {
        pendingPrint:  pendingPrint?.c ?? 0,
        pendingUpload: pendingUpload?.c ?? 0,
      },
    };
  }

  /** Export as JSON string (for file save or share) */
  async exportJSON(): Promise<string> {
    const snapshot = await this.exportSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  // ── Pruning ────────────────────────────────────────────────

  /** Delete old logs per retention policy. Called by MemoryCleanupService. */
  async prune(): Promise<number> {
    let totalDeleted = 0;

    for (const [category, days] of Object.entries(RETENTION)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = await db.run(
        'DELETE FROM diagnostics_logs WHERE category = ? AND timestamp < ?',
        [category, cutoff.toISOString()]
      );
      totalDeleted += result.changes ?? 0;
    }

    if (totalDeleted > 0) {
      this.log('system', 'info', `Pruned ${totalDeleted} old log entries`);
    }

    return totalDeleted;
  }

  /** Clear ALL logs (admin action) */
  async clearAll(): Promise<void> {
    await db.run('DELETE FROM diagnostics_logs');
    this.ringBuffer = [];
    this.log('system', 'info', 'All diagnostics logs cleared by admin');
  }

  // ── Private: Batch Flush ───────────────────────────────────

  private async flush(): Promise<void> {
    if (this.writeBatch.length === 0) return;
    if (!this.initialized) return;

    const batch = this.writeBatch.splice(0);  // Take and clear

    try {
      for (const entry of batch) {
        await db.run(
          'INSERT INTO diagnostics_logs (timestamp, category, severity, message, data) VALUES (?, ?, ?, ?, ?)',
          [entry.timestamp, entry.category, entry.severity, entry.message, entry.data ?? null]
        );
      }
    } catch (error) {
      // If SQLite fails, don't lose logs — put back in buffer
      // But cap to prevent infinite growth
      if (this.writeBatch.length < 500) {
        this.writeBatch.push(...batch);
      }
      console.error('[Diagnostics] flush error:', error);
    }
  }
}

// ── Singleton ────────────────────────────────────────────────

export const DiagnosticsService = new DiagnosticsServiceClass();
