/**
 * KitaFoto — Storage Types
 * Provider-agnostic types untuk seluruh sistem cloud storage
 * ─────────────────────────────────────────────────────────
 * Setiap provider (Cloudinary, Google Drive, Firebase, Supabase, dll.)
 * menggunakan types ini — tidak ada hardcoded provider logic di sini.
 */

// ═══════════════════════════════════════════════════════════════
// PROVIDER IDENTITY
// ═══════════════════════════════════════════════════════════════

/** ID unik tiap provider type */
export type StorageProviderType =
  | 'cloudinary'
  | 'google_drive'
  | 'firebase_storage'
  | 'supabase_storage'
  | 'local_nas'        // Future: NAS/local server
  | 'custom_webhook';  // Future: custom HTTP endpoint

/** Status provider saat ini */
export type StorageProviderStatus =
  | 'active'      // Configured & healthy
  | 'inactive'    // Configured but disabled by admin
  | 'error'       // Configured but health check failed
  | 'unconfigured'; // Belum dikonfigurasi

// ═══════════════════════════════════════════════════════════════
// CREDENTIALS — per-provider (disimpan terenkripsi di SQLite)
// ═══════════════════════════════════════════════════════════════

export interface CloudinaryCredentials {
  cloudName: string;
  uploadPreset: string;          // Unsigned preset untuk upload
  apiKey?: string;               // Opsional: untuk signed uploads / admin API
  apiSecret?: string;            // Hanya untuk server-side (jangan simpan di client)
  folder?: string;               // Root folder override
}

export interface GoogleDriveCredentials {
  clientId: string;
  /** Redirect URI yang didaftarkan di Google Console */
  redirectUri: string;
  /** Access token (short-lived, ~1 jam) */
  accessToken?: string;
  /** Refresh token (long-lived, untuk auto-renew) */
  refreshToken?: string;
  /** Kapan access token expired */
  tokenExpiresAt?: string;       // ISO string
  /** Root folder ID di Drive (dibuat otomatis jika kosong) */
  rootFolderId?: string;
  /** Nama root folder di Drive */
  rootFolderName?: string;
}

export interface FirebaseCredentials {
  apiKey: string;
  projectId: string;
  storageBucket: string;         // e.g. "kitafoto-xxx.appspot.com"
  appId: string;
  /** Custom auth token jika pakai Firebase Auth */
  idToken?: string;
}

export interface SupabaseCredentials {
  url: string;                   // e.g. "https://xxx.supabase.co"
  anonKey: string;               // Public anon key
  bucketName: string;            // Storage bucket name
  /** Service role key — JANGAN simpan di client kecuali device owner */
  serviceKey?: string;
}

export interface LocalNasCredentials {
  serverUrl: string;             // e.g. "http://192.168.1.100:8080"
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface CustomWebhookCredentials {
  uploadUrl: string;
  deleteUrl?: string;
  healthUrl?: string;
  headers?: Record<string, string>; // Custom headers (auth, etc.)
}

/** Union type semua credentials */
export type ProviderCredentials =
  | CloudinaryCredentials
  | GoogleDriveCredentials
  | FirebaseCredentials
  | SupabaseCredentials
  | LocalNasCredentials
  | CustomWebhookCredentials;

// ═══════════════════════════════════════════════════════════════
// PROVIDER CONFIG — disimpan di tabel storage_providers
// ═══════════════════════════════════════════════════════════════

export interface StorageProviderConfig {
  id: string;
  name: string;                  // Display name: "Cloudinary Utama"
  type: StorageProviderType;
  status: StorageProviderStatus;
  isPrimary: boolean;            // Provider utama
  isBackup: boolean;             // Provider backup (auto-failover)
  /** Credentials tersimpan sebagai JSON terenkripsi */
  credentialsJson: string;
  /** Settings tambahan (folder naming, transform config, dll.) */
  settingsJson: string;
  /** Kapan terakhir health check sukses */
  lastHealthAt?: string;
  /** Kapan terakhir upload sukses */
  lastUploadAt?: string;
  /** Error terakhir */
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

/** Settings umum yang berlaku untuk semua provider */
export interface ProviderSettings {
  /** Nama folder root di cloud (override default) */
  rootFolder?: string;
  /** Apakah buat subfolder per event */
  createEventFolder?: boolean;
  /** Apakah buat subfolder per tanggal */
  createDateFolder?: boolean;
  /** Kualitas kompresi sebelum upload (0-1) */
  uploadQuality?: number;
  /** Max dimensi gambar sebelum upload (px) */
  maxDimension?: number;
  /** Apakah hasil upload bisa diakses publik */
  makePublic?: boolean;
  /** Timeout upload dalam ms */
  timeoutMs?: number;
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD — request & result
// ═══════════════════════════════════════════════════════════════

/** Konteks foto yang akan diupload */
export interface UploadContext {
  photoId: string;
  sessionId: string;
  eventId: string;
  eventName: string;
  /** Path file lokal yang akan diupload */
  localFilePath: string;
  /** Nama file di cloud (tanpa extension) */
  remoteFileName?: string;
  /** MIME type */
  mimeType?: string;
  /** Tag tambahan */
  tags?: string[];
  /** Metadata tambahan */
  metadata?: Record<string, string>;
}

/** Hasil upload dari provider manapun */
export interface UploadResult {
  success: boolean;
  /** URL publik hasil upload */
  cloudUrl?: string;
  /** ID unik file di provider */
  remoteId?: string;
  /** Path/folder di cloud */
  remotePath?: string;
  /** Ukuran file di cloud (bytes) */
  remoteSize?: number;
  /** Provider yang berhasil mengupload */
  providerType?: StorageProviderType;
  providerId?: string;
  /** Error message jika gagal */
  error?: string;
  /** Kode error untuk kategorisasi retry */
  errorCode?: UploadErrorCode;
}

/** Kode error untuk menentukan apakah perlu retry */
export type UploadErrorCode =
  | 'NETWORK_ERROR'        // Koneksi putus → retry
  | 'TIMEOUT'              // Timeout → retry
  | 'QUOTA_EXCEEDED'       // Storage penuh → failover/alert
  | 'AUTH_EXPIRED'         // Token expired → refresh dulu
  | 'FILE_NOT_FOUND'       // File lokal tidak ada → skip
  | 'INVALID_CREDENTIALS'  // Salah credential → alert admin
  | 'RATE_LIMITED'         // Rate limit → retry lebih lama
  | 'PROVIDER_DOWN'        // Provider down → failover
  | 'UNKNOWN';

// ═══════════════════════════════════════════════════════════════
// UPLOAD QUEUE — job yang disimpan di DB
// ═══════════════════════════════════════════════════════════════

export type UploadJobStatus =
  | 'pending'    // Menunggu diproses
  | 'uploading'  // Sedang upload
  | 'done'       // Sukses
  | 'failed'     // Gagal permanen (max retry habis)
  | 'cancelled'; // Dibatalkan manual

export interface UploadJob {
  id: string;
  photoId: string;
  /** Provider yang ditarget (null = pakai primary) */
  providerId?: string;
  status: UploadJobStatus;
  attempts: number;
  maxAttempts: number;
  /** Kapan boleh dicoba lagi (exponential backoff) */
  nextRetryAt?: string;
  lastError?: string;
  lastErrorCode?: UploadErrorCode;
  /** URL cloud jika berhasil */
  cloudUrl?: string;
  /** Provider yang akhirnya berhasil */
  succeededProviderId?: string;
  createdAt: string;
  updatedAt: string;
  uploadedAt?: string;
}

export type CreateUploadJobPayload = Omit<UploadJob, 'id' | 'createdAt' | 'updatedAt'>;

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs?: number;
  /** Sisa storage (jika provider support quota check) */
  storageUsedBytes?: number;
  storageQuotaBytes?: number;
  storageUsedPercent?: number;
  error?: string;
  checkedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// FOLDER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export interface FolderContext {
  eventId: string;
  eventName: string;
  date?: Date; // default: today
}

export interface FolderResult {
  success: boolean;
  folderId?: string;    // ID folder di provider (penting untuk Google Drive)
  folderPath?: string;  // Path/nama folder
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

export interface DeleteResult {
  success: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS — disimpan di upload_history
// ═══════════════════════════════════════════════════════════════

export interface UploadHistoryEntry {
  id: string;
  photoId: string;
  jobId: string;
  providerId: string;
  providerType: StorageProviderType;
  status: 'success' | 'failed';
  cloudUrl?: string;
  remoteId?: string;
  fileSize?: number;
  durationMs?: number;
  errorCode?: UploadErrorCode;
  errorMessage?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER HEALTH LOG
// ═══════════════════════════════════════════════════════════════

export interface ProviderHealthLog {
  id: string;
  providerId: string;
  healthy: boolean;
  latencyMs?: number;
  errorMessage?: string;
  checkedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// OAUTH (Google Drive khusus)
// ═══════════════════════════════════════════════════════════════

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string; // ISO string
  tokenType: string;
  scope?: string;
}

export interface OAuthRefreshResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
}
