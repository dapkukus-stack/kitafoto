/**
 * upload.types.ts — Re-export bridge untuk backward compatibility
 * ─────────────────────────────────────────────────────────────
 * Tipe-tipe upload sekarang ada di storage.types.ts.
 * File ini di-keep agar import lama di codebase tidak perlu diubah.
 *
 * Untuk kode baru, langsung import dari '@types/storage.types'.
 */

// Re-export semua yang relevan dari storage.types
export type {
  UploadJobStatus,
  UploadJob,
  UploadResult,
  UploadContext,
  UploadErrorCode,
  CreateUploadJobPayload,
  UploadHistoryEntry,
} from './storage.types';

// Legacy type alias — dipertahankan agar file lama tidak error
export type { CloudinaryCredentials } from './storage.types';
