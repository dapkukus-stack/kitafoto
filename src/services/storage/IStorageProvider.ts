/**
 * IStorageProvider — Kontrak wajib untuk semua cloud storage provider
 * ─────────────────────────────────────────────────────────────────────
 * Setiap provider (Cloudinary, Google Drive, Firebase, Supabase, dll.)
 * WAJIB mengimplementasi interface ini. StorageManager hanya bicara
 * lewat interface ini — tidak tahu provider apa yang dipakai.
 *
 * Pattern: Strategy + Interface Segregation Principle
 *
 * Cara tambah provider baru:
 *   1. Buat file baru: providers/MyNewProvider.ts
 *   2. Implement IStorageProvider
 *   3. Register di ProviderRegistry
 *   4. Done — tidak perlu ubah kode lain
 */

import type {
  StorageProviderType,
  StorageProviderConfig,
  ProviderCredentials,
  ProviderSettings,
  UploadContext,
  UploadResult,
  HealthCheckResult,
  FolderContext,
  FolderResult,
  DeleteResult,
} from '@kitafoto-types/storage.types';

// ═══════════════════════════════════════════════════════════════
// CORE INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface IStorageProvider {
  // ── Identity ──────────────────────────────────────────────
  readonly type: StorageProviderType;
  readonly displayName: string;

  // ── Lifecycle ─────────────────────────────────────────────

  /**
   * Inisialisasi provider dengan config dari DB.
   * Dipanggil saat provider pertama kali dimuat atau config berubah.
   * JANGAN lempar error jika credential kosong — return false saja.
   */
  initialize(config: StorageProviderConfig): Promise<boolean>;

  /**
   * Apakah provider sudah terkonfigurasi (credential lengkap)?
   */
  isConfigured(): boolean;

  /**
   * Apakah provider siap menerima upload sekarang?
   * (configured + tidak sedang error fatal)
   */
  isReady(): boolean;

  // ── Upload ────────────────────────────────────────────────

  /**
   * Upload satu file foto ke cloud.
   * Provider bertanggung jawab untuk:
   * - Compress/resize jika perlu (sesuai settings)
   * - Buat folder jika belum ada
   * - Return URL publik hasil upload
   */
  upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult>;

  /**
   * Upload dengan progress callback (untuk file besar / resumable upload).
   * Provider yang tidak support bisa delegate ke upload() biasa.
   */
  uploadWithProgress?(
    context: UploadContext,
    settings: ProviderSettings,
    onProgress: (percent: number) => void
  ): Promise<UploadResult>;

  // ── Folder Management ─────────────────────────────────────

  /**
   * Buat folder di cloud untuk event tertentu.
   * Google Drive: return folder ID (diperlukan untuk upload ke folder)
   * Cloudinary / Supabase: return folder path saja
   */
  createFolder(context: FolderContext, settings: ProviderSettings): Promise<FolderResult>;

  /**
   * Cek apakah folder sudah ada (opsional — provider bisa return true saja)
   */
  folderExists?(folderId: string): Promise<boolean>;

  // ── File Operations ───────────────────────────────────────

  /**
   * Hapus file dari cloud berdasarkan remote ID atau URL.
   */
  deleteFile(remoteId: string): Promise<DeleteResult>;

  /**
   * Ambil URL publik dari remote ID (jika berbeda dari upload URL).
   */
  getPublicUrl?(remoteId: string): Promise<string | null>;

  // ── Health & Monitoring ───────────────────────────────────

  /**
   * Cek kesehatan provider:
   * - Apakah bisa terkoneksi?
   * - Berapa latency?
   * - Berapa sisa storage quota? (jika provider support)
   */
  healthCheck(): Promise<HealthCheckResult>;

  // ── Auth / Token Management ───────────────────────────────

  /**
   * Refresh auth token jika expired.
   * Provider tanpa token management (Cloudinary) bisa return { success: true }.
   */
  refreshAuth?(): Promise<{ success: boolean; error?: string }>;

  /**
   * Apakah auth token sudah expired?
   */
  isAuthExpired?(): boolean;

  // ── Config Management ─────────────────────────────────────

  /**
   * Reload credentials/config dari storage (dipanggil setelah admin ubah setting).
   */
  reloadConfig(config: StorageProviderConfig): Promise<void>;

  /**
   * Validate credentials sebelum disimpan.
   * Return error message jika invalid, null jika valid.
   */
  validateCredentials(credentials: ProviderCredentials): Promise<string | null>;
}

// ═══════════════════════════════════════════════════════════════
// BASE CLASS (opsional — provider bisa extend ini untuk default impl)
// ═══════════════════════════════════════════════════════════════

export abstract class BaseStorageProvider implements IStorageProvider {
  abstract readonly type: StorageProviderType;
  abstract readonly displayName: string;

  // Subclass wajib implement kedua method ini
  abstract upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  protected config: StorageProviderConfig | null = null;
  protected settings: ProviderSettings = {};
  protected _isConfigured = false;
  protected _hasError = false;

  async initialize(config: StorageProviderConfig): Promise<boolean> {
    this.config = config;
    try {
      this.settings = this.parseSettings(config.settingsJson);
      await this.onInitialize(config);
      this._isConfigured = true;
      this._hasError = false;
      return true;
    } catch (error) {
      this._hasError = true;
      console.error(`[${this.type}] Initialize error:`, error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this._isConfigured;
  }

  isReady(): boolean {
    return this._isConfigured && !this._hasError;
  }

  async reloadConfig(config: StorageProviderConfig): Promise<void> {
    await this.initialize(config);
  }

  // Default: folder management tidak wajib (Cloudinary auto-create folder)
  async createFolder(context: FolderContext, _settings: ProviderSettings): Promise<FolderResult> {
    // Default implementation: buat path string saja
    const date = context.date ?? new Date();
    const dateStr = date.toISOString().split('T')[0];
    const eventSlug = context.eventName.replace(/\s+/g, '_').substring(0, 20);
    return {
      success: true,
      folderPath: `kitafoto/${context.eventId}_${eventSlug}/${dateStr}`,
    };
  }

  // Default: delete tidak diimplementasi (return success agar tidak block queue)
  async deleteFile(_remoteId: string): Promise<DeleteResult> {
    return { success: true };
  }

  // Default: validate selalu pass (provider override jika perlu)
  async validateCredentials(_creds: ProviderCredentials): Promise<string | null> {
    return null;
  }

  // ── Protected helpers ─────────────────────────────────────

  protected parseSettings(json: string): ProviderSettings {
    try {
      return JSON.parse(json) as ProviderSettings;
    } catch {
      return {};
    }
  }

  protected parseCredentials<T>(json: string): T {
    return JSON.parse(json) as T;
  }

  protected getFolderPath(context: UploadContext, settings: ProviderSettings): string {
    const root = settings.rootFolder ?? 'kitafoto';
    const eventSlug = context.eventName.replace(/\s+/g, '_').substring(0, 20);
    const dateStr = new Date().toISOString().split('T')[0];

    const parts = [root];
    if (settings.createEventFolder !== false) {
      parts.push(`${context.eventId}_${eventSlug}`);
    }
    if (settings.createDateFolder !== false) {
      parts.push(dateStr);
    }
    return parts.join('/');
  }

  // Override ini untuk logic inisialisasi tiap provider
  protected abstract onInitialize(config: StorageProviderConfig): Promise<void>;
}
