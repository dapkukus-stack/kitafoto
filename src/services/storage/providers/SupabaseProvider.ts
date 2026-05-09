/**
 * SupabaseProvider
 * Implementasi IStorageProvider untuk Supabase Storage
 * ─────────────────────────────────────────────────────────────
 *
 * Supabase Storage:
 *   - Upload via REST API (tanpa Supabase JS SDK yang berat)
 *   - Resumable upload via TUS protocol (untuk file besar)
 *   - Signed URL untuk akses private
 *   - Public bucket untuk akses langsung
 *   - Row Level Security (RLS) via anon key
 *
 * STATUS: Skeleton — implementasi penuh di Phase 2
 * Interface sudah comply — bisa dipakai tanpa error
 *
 * Cara aktivasi:
 *   1. Buat project di supabase.com
 *   2. Buat Storage bucket (misal: "kitafoto")
 *   3. Set bucket policy (public atau private)
 *   4. Copy URL dan anon key dari dashboard
 *   5. Isi credentials di admin panel KitaFoto
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { BaseStorageProvider } from '../IStorageProvider';
import type {
  StorageProviderType,
  StorageProviderConfig,
  SupabaseCredentials,
  ProviderSettings,
  UploadContext,
  UploadResult,
  HealthCheckResult,
  FolderContext,
  FolderResult,
  DeleteResult,
  UploadErrorCode,
} from '@types/storage.types';

// ── Supabase Storage API Response ────────────────────────────

interface SupabaseUploadResponse {
  Key?: string;
  Id?: string;
  error?: string;
  message?: string;
  statusCode?: string;
}

interface SupabaseSignedUrlResponse {
  signedURL?: string;
  error?: string;
}

export class SupabaseProvider extends BaseStorageProvider {
  readonly type: StorageProviderType = 'supabase_storage';
  readonly displayName = 'Supabase Storage';

  private credentials: SupabaseCredentials | null = null;

  // ── Lifecycle ──────────────────────────────────────────────

  protected async onInitialize(config: StorageProviderConfig): Promise<void> {
    if (!config.credentialsJson || config.credentialsJson === '{}') {
      this._isConfigured = false;
      return;
    }
    this.credentials = this.parseCredentials<SupabaseCredentials>(config.credentialsJson);
    this._isConfigured = !!(
      this.credentials.url &&
      this.credentials.anonKey &&
      this.credentials.bucketName
    );
  }

  isConfigured(): boolean {
    return !!(
      this.credentials?.url &&
      this.credentials?.anonKey &&
      this.credentials?.bucketName
    );
  }

  // ── Upload ─────────────────────────────────────────────────

  async upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult> {
    if (!this.isConfigured() || !this.credentials) {
      return {
        success: false,
        error: 'Supabase Storage belum dikonfigurasi',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    try {
      // Compress dulu
      const quality  = settings.uploadQuality ?? 0.8;
      const maxDim   = settings.maxDimension   ?? 2048;
      const localUri = await this.optimizeImage(context.localFilePath, quality, maxDim);

      // Bangun storage path
      const folder   = this.getFolderPath(context, settings);
      const fileName = `${context.remoteFileName ?? `photo_${context.sessionId}`}.jpg`;
      const storagePath = `${folder}/${fileName}`;

      // Baca file
      const { readAsStringAsync, EncodingType } = await import('expo-file-system');
      const base64 = await readAsStringAsync(localUri, { encoding: EncodingType.Base64 });

      const uploadUrl = `${this.credentials.url}/storage/v1/object/${this.credentials.bucketName}/${storagePath}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), settings.timeoutMs ?? 60_000);

      let response: Response;
      try {
        response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.credentials.anonKey}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true', // Overwrite jika ada file dengan nama sama
          },
          body: Buffer.from(base64, 'base64'),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (localUri !== context.localFilePath) {
        this.safeDeleteFile(localUri);
      }

      if (!response.ok) {
        const err = await response.text();
        return {
          success: false,
          error: `Supabase HTTP ${response.status}: ${err}`,
          errorCode: this.mapError(response.status),
        };
      }

      const result = await response.json() as SupabaseUploadResponse;

      if (result.error) {
        return { success: false, error: result.error, errorCode: 'UNKNOWN' };
      }

      // Bangun public URL
      const publicUrl = settings.makePublic
        ? `${this.credentials.url}/storage/v1/object/public/${this.credentials.bucketName}/${storagePath}`
        : await this.getSignedUrl(storagePath);

      return {
        success: true,
        cloudUrl: publicUrl ?? undefined,
        remoteId: result.Key ?? storagePath,
        remotePath: folder,
        providerType: this.type,
        providerId: this.config?.id,
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Upload timeout', errorCode: 'TIMEOUT' };
      }
      return { success: false, error: String(error), errorCode: 'NETWORK_ERROR' };
    }
  }

  // ── Signed URL ─────────────────────────────────────────────

  async getPublicUrl(storagePath: string): Promise<string | null> {
    return this.getSignedUrl(storagePath, 3600 * 24 * 7); // 7 hari
  }

  private async getSignedUrl(
    storagePath: string,
    expiresIn = 3600
  ): Promise<string | null> {
    if (!this.credentials) return null;
    try {
      const response = await fetch(
        `${this.credentials.url}/storage/v1/object/sign/${this.credentials.bucketName}/${storagePath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn }),
        }
      );
      if (!response.ok) return null;
      const data = await response.json() as SupabaseSignedUrlResponse;
      if (!data.signedURL) return null;
      return `${this.credentials.url}/storage/v1${data.signedURL}`;
    } catch {
      return null;
    }
  }

  // ── Delete ─────────────────────────────────────────────────

  async deleteFile(storagePath: string): Promise<DeleteResult> {
    if (!this.credentials) return { success: false, error: 'Tidak terkonfigurasi' };

    try {
      const response = await fetch(
        `${this.credentials.url}/storage/v1/object/${this.credentials.bucketName}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.credentials.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [storagePath] }),
        }
      );
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ── Health Check ───────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isConfigured()) {
      return { healthy: false, error: 'Tidak terkonfigurasi', checkedAt: new Date().toISOString() };
    }

    const start = Date.now();
    try {
      const response = await fetch(
        `${this.credentials!.url}/storage/v1/bucket`,
        {
          headers: { Authorization: `Bearer ${this.credentials!.anonKey}` },
          signal: AbortSignal.timeout(8000),
        }
      );

      const latencyMs = Date.now() - start;
      return {
        healthy: response.ok,
        latencyMs,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: 'Tidak bisa terhubung ke Supabase',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ── Validate Credentials ───────────────────────────────────

  async validateCredentials(creds: unknown): Promise<string | null> {
    const c = creds as Partial<SupabaseCredentials>;
    if (!c.url?.trim())         return 'Supabase URL tidak boleh kosong';
    if (!c.anonKey?.trim())     return 'Anon Key tidak boleh kosong';
    if (!c.bucketName?.trim())  return 'Bucket Name tidak boleh kosong';
    if (!c.url.startsWith('https://')) return 'URL harus dimulai dengan https://';
    return null;
  }

  // ── Folder (path-based, tidak perlu create) ────────────────

  async createFolder(context: FolderContext, settings: ProviderSettings): Promise<FolderResult> {
    const path = this.getFolderPath(
      { ...context, sessionId: '', photoId: '', localFilePath: '' },
      settings
    );
    return { success: true, folderPath: path };
  }

  // ── Private Helpers ────────────────────────────────────────

  private async optimizeImage(path: string, quality: number, maxDim: number): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        path,
        [{ resize: { width: maxDim } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch {
      return path;
    }
  }

  private mapError(status: number): UploadErrorCode {
    if (status === 401 || status === 403) return 'INVALID_CREDENTIALS';
    if (status === 429)                   return 'RATE_LIMITED';
    if (status >= 500)                    return 'PROVIDER_DOWN';
    return 'UNKNOWN';
  }

  private async safeDeleteFile(uri: string): Promise<void> {
    try {
      const fs = await import('expo-file-system');
      await fs.deleteAsync(uri, { idempotent: true });
    } catch { /* ignore */ }
  }
}
