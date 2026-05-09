/**
 * KitaFoto Print Types — v2
 * Extended untuk dual-path printing (WiFi IPP + RawBT fallback)
 */

import type { PrinterType } from '@constants/config';

// ── Job Status ────────────────────────────────────────────────

export type PrintJobStatus =
  | 'pending'     // Menunggu printer siap
  | 'printing'    // Sedang cetak
  | 'done'        // Berhasil cetak
  | 'failed'      // Gagal, sudah max retry
  | 'cancelled';  // Dibatalkan manual

// ── Print Job (DB row) ────────────────────────────────────────

export interface PrintJob {
  id:          string;
  photoId:     string;
  status:      PrintJobStatus;
  attempts:    number;
  maxAttempts: number;
  lastError?:  string;
  createdAt:   string;
  updatedAt:   string;
  printedAt?:  string;
  /** Copy ke berapa yang sedang dicetak */
  copyNumber?: number;
  totalCopies?: number;
}

export type CreatePrintJobPayload = Omit<PrintJob, 'id' | 'createdAt' | 'updatedAt'>;

// ── Printer Config ────────────────────────────────────────────

export interface PrinterConfig {
  type:           PrinterType;
  /** WiFi printer IP address */
  ip?:            string;
  /** IPP port — default 631 */
  port?:          number;
  /** Nama printer untuk display */
  name?:          string;
  isConnected:    boolean;
  lastSeenAt?:    string;
}

// ── Print Result ──────────────────────────────────────────────

export interface PrintResult {
  success:    boolean;
  error?:     string;
  errorCode?: PrintErrorCode;
  durationMs?: number;
  /** Nomor job dari printer (jika tersedia) */
  printerJobId?: string;
}

export type PrintErrorCode =
  | 'PRINTER_OFFLINE'     // Printer tidak merespons
  | 'PAPER_EMPTY'         // Kertas habis
  | 'INK_LOW'             // Tinta hampir habis
  | 'PAPER_JAM'           // Kertas macet
  | 'FILE_NOT_FOUND'      // File foto tidak ada
  | 'PERMISSION_DENIED'   // Permission Android
  | 'TIMEOUT'             // Tidak ada respons dalam batas waktu
  | 'CONNECTION_ERROR'    // Tidak bisa connect ke printer
  | 'UNKNOWN';

// ── Printer Status (untuk diagnostics) ───────────────────────

export interface PrinterStatus {
  isConnected:    boolean;
  isReady:        boolean;
  ip?:            string;
  name?:          string;
  pendingJobs:    number;
  lastError?:     string;
  lastPrintAt?:   string;
  checkedAt:      string;
}

// ── Queue Event (untuk UI listener) ──────────────────────────

export type PrintQueueEvent =
  | { type: 'job_started';  jobId: string; photoId: string }
  | { type: 'job_done';     jobId: string; photoId: string; copies: number }
  | { type: 'job_failed';   jobId: string; photoId: string; error: string; isFinal: boolean }
  | { type: 'printer_online'  }
  | { type: 'printer_offline' }
  | { type: 'queue_empty'     };
