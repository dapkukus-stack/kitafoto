/**
 * src/services/cloud/index.ts
 * ─────────────────────────────────────────────────────────────
 * Backward-compat re-export bridge.
 * Kode lama yang import dari '@services/cloud/...' tetap bisa jalan.
 *
 * Gunakan import baru untuk kode baru:
 *   import { StorageManager } from '@services/storage/StorageManager'
 *   import { UploadQueue }    from '@services/storage/UploadQueue'
 */

export { StorageManager as CloudinaryService } from '../storage/StorageManager';
export { UploadQueue }                         from '../storage/UploadQueue';
export { StorageManager }                      from '../storage/StorageManager';
