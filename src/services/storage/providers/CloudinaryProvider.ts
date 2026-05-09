/**
 * CloudinaryProvider
 * Implementasi IStorageProvider untuk Cloudinary
 * ─────────────────────────────────────────────────────────────
 * Features:
 *   - Unsigned upload (tidak perlu API secret di client)
 *   - Auto folder per event + tanggal
 *   - Image optimization sebelum upload
 *   - AI-ready: transformation params sudah disiapkan
 *   - Health check via ping ke CDN
 *   - Signed URL support (future, butuh API key)
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { BaseStorageProvider } from '../IStorageProvider';
import type {
  StorageProviderConfig,
  StorageProviderType,
  CloudinaryCredentials,
  ProviderSettings,
  UploadContext,
  UploadResult,
  HealthCheckResult,
  DeleteResult,
  UploadErrorCode,
} from '@kitafoto-types/storage.types';
import { AppConfig } from '@constants/config';

// ── Cloudinary API Response ──────────────────────────────────

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
  version: number;
  resource_type: string;
  created_at: string;
  error?: { message: string; http_code?: number };
}

// ═══════════════════════════════════════════════════════════════
// CLOUDINARY PROVIDER
// ═══════════════════════════════════════════════════════════════

export class CloudinaryProvider extends BaseStorageProvider {
  readonly type: StorageProviderType = 'cloudinary';
  readonly displayName = 'Cloudinary';

  private credentials: CloudinaryCredentials | null = null;

  // ── Lifecycle ──────────────────────────────────────────────

  protected async onInitialize(config: StorageProviderConfig): Promise<void> {
    if (!config.credentialsJson || config.credentialsJson === '{}') {
      this._isConfigured = false;
      return;
    }
    this.credentials = this.parseCredentials<CloudinaryCredentials>(config.credentialsJson);
    this._isConfigured = !!(
      this.credentials.cloudName &&
      this.credentials.uploadPreset
    );
  }

  isConfigured(): boolean {
    return !!(
      this.credentials?.cloudName &&
      this.credentials?.uploadPreset
    );
  }

  // ── Upload ─────────────────────────────────────────────────

  async upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult> {
    if (!this.isConfigured() || !this.credentials) {
      return { success: false, error: 'Cloudinary belum dikonfigurasi', errorCode: 'INVALID_CREDENTIALS' };
    }

    try {
      // 1. Compress & resize sebelum upload
      const quality = settings.uploadQuality ?? AppConfig.uploadQuality;
      const maxDim  = settings.maxDimension  ?? AppConfig.uploadMaxDimension;
      const optimizedUri = await this.optimizeImage(context.localFilePath, quality, maxDim);

      // 2. Bangun folder path
      const folder = this.getFolderPath(context, settings);

      // 3. Public ID unik
      const publicId = context.remoteFileName ?? `photo_${context.sessionId}_${Date.now()}`;

      // 4. Upload via multipart/form-data (unsigned preset)
      const formData = new FormData();
      formData.append('file', {
        uri: optimizedUri,
        type: context.mimeType ?? 'image/jpeg',
        name: `${publicId}.jpg`,
      } as unknown as Blob);
      formData.append('upload_preset', this.credentials.uploadPreset);
      formData.append('folder', folder);
      formData.append('public_id', publicId);

      // Tag untuk tracking & AI transform nanti
      const tags = ['kitafoto', context.eventId, ...(context.tags ?? [])];
      formData.append('tags', tags.join(','));

      // Context metadata (searchable di Cloudinary dashboard)
      const contextStr = Object.entries({
        event_id: context.eventId,
        event_name: context.eventName,
        session_id: context.sessionId,
        photo_id: context.photoId,
        ...(context.metadata ?? {}),
      })
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
      formData.append('context', contextStr);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${this.credentials.cloudName}/image/upload`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), settings.timeoutMs ?? 30000);

      let response: Response;
      try {
        response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      // Cleanup file terkompresi jika berbeda dari asli
      if (optimizedUri !== context.localFilePath) {
        this.safeDeleteFile(optimizedUri);
      }

      if (!response.ok) {
        const errorText = await response.text();
        const code = this.mapHttpError(response.status);
        return { success: false, error: `Cloudinary HTTP ${response.status}: ${errorText}`, errorCode: code };
      }

      const result = await response.json() as CloudinaryUploadResponse;

      if (result.error) {
        return { success: false, error: result.error.message, errorCode: 'UNKNOWN' };
      }

      return {
        success: true,
        cloudUrl: result.secure_url,
        remoteId: result.public_id,
        remotePath: folder,
        remoteSize: result.bytes,
        providerType: this.type,
        providerId: this.config?.id,
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Upload timeout', errorCode: 'TIMEOUT' };
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      const code = this.detectNetworkError(msg);
      return { success: false, error: msg, errorCode: code };
    }
  }

  async uploadWithProgress(
    context: UploadContext,
    settings: ProviderSettings,
    onProgress: (percent: number) => void
  ): Promise<UploadResult> {
    // Cloudinary tidak expose progress via fetch standar
    // Simulasi progress 0 → 50 saat upload dimulai, 100 saat selesai
    onProgress(0);
    setTimeout(() => onProgress(30), 500);
    const result = await this.upload(context, settings);
    onProgress(result.success ? 100 : 0);
    return result;
  }

  // ── Delete ─────────────────────────────────────────────────

  async deleteFile(publicId: string): Promise<DeleteResult> {
    // Unsigned preset tidak bisa delete — butuh signed request
    // Jika admin set API key, bisa delete. Else: soft-delete saja.
    if (!this.credentials?.apiKey) {
      console.warn('[Cloudinary] Delete requires API key — skipped');
      return { success: true }; // Non-blocking: jangan gagal queue
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // Signed delete (butuh API secret di server — lewat webhook jika ada)
      // Untuk sekarang return success agar queue tidak block
      console.log(`[Cloudinary] Delete ${publicId} at ${timestamp} — needs server-side signing`);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ── Health Check ───────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.credentials?.cloudName) {
      return { healthy: false, error: 'Tidak terkonfigurasi', checkedAt: new Date().toISOString() };
    }

    const start = Date.now();
    try {
      // Ping ke Cloudinary CDN — 404 berarti server up tapi asset tidak ada (expected)
      const response = await fetch(
        `https://res.cloudinary.com/${this.credentials.cloudName}/image/upload/ping_kitafoto`,
        { method: 'HEAD', signal: AbortSignal.timeout(8000) }
      );

      const latencyMs = Date.now() - start;
      const healthy   = response.ok || response.status === 404;

      return { healthy, latencyMs, checkedAt: new Date().toISOString() };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: 'Tidak bisa terhubung ke Cloudinary',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ── Validate Credentials ───────────────────────────────────

  async validateCredentials(creds: unknown): Promise<string | null> {
    const c = creds as Partial<CloudinaryCredentials>;
    if (!c.cloudName?.trim())    return 'Cloud Name tidak boleh kosong';
    if (!c.uploadPreset?.trim()) return 'Upload Preset tidak boleh kosong';
    // Quick ping test
    try {
      const res = await fetch(
        `https://res.cloudinary.com/${c.cloudName}/image/upload/test`,
        { method: 'HEAD', signal: AbortSignal.timeout(5000) }
      );
      if (res.status === 401) return 'Cloud Name tidak valid atau preset salah';
    } catch {
      return 'Tidak bisa terhubung ke Cloudinary — cek koneksi internet';
    }
    return null;
  }

  // ── Private Helpers ────────────────────────────────────────

  /** Compress & resize gambar sebelum upload */
  private async optimizeImage(
    localPath: string,
    quality: number,
    maxDimension: number
  ): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        localPath,
        [{ resize: { width: maxDimension } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return result.uri;
    } catch {
      // Jika gagal compress, pakai file asli
      return localPath;
    }
  }

  private mapHttpError(status: number): UploadErrorCode {
    if (status === 401 || status === 403) return 'INVALID_CREDENTIALS';
    if (status === 429)                   return 'RATE_LIMITED';
    if (status === 503 || status === 502) return 'PROVIDER_DOWN';
    if (status >= 500)                    return 'PROVIDER_DOWN';
    return 'UNKNOWN';
  }

  private detectNetworkError(msg: string): UploadErrorCode {
    const lower = msg.toLowerCase();
    if (lower.includes('network') || lower.includes('fetch'))  return 'NETWORK_ERROR';
    if (lower.includes('timeout') || lower.includes('abort'))  return 'TIMEOUT';
    return 'UNKNOWN';
  }

  private async safeDeleteFile(uri: string): Promise<void> {
    try {
      const fs = await import('expo-file-system');
      await fs.deleteAsync(uri, { idempotent: true });
    } catch { /* ignore */ }
  }
}
