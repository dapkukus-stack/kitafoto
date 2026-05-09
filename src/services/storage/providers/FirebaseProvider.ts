/**
 * FirebaseProvider
 * Implementasi IStorageProvider untuk Firebase Storage
 * ─────────────────────────────────────────────────────────────
 *
 * Firebase Storage REST API (tanpa Firebase SDK native):
 *   - Upload via multipart/resumable REST API
 *   - Auth via Firebase ID Token (dari Firebase Auth)
 *   - Resumable upload untuk file besar (> 5MB)
 *   - Signed URL untuk akses publik
 *
 * STATUS: Skeleton — implementasi penuh di Phase 2
 * Interface sudah comply — bisa dipakai tanpa error
 *
 * Cara aktivasi:
 *   1. Buat Firebase project di console.firebase.google.com
 *   2. Enable Firebase Storage
 *   3. Set storage rules (allow read/write dengan auth)
 *   4. Isi credentials di admin panel
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { BaseStorageProvider } from '../IStorageProvider';
import type {
  StorageProviderType,
  StorageProviderConfig,
  FirebaseCredentials,
  ProviderSettings,
  UploadContext,
  UploadResult,
  HealthCheckResult,
  FolderResult,
  FolderContext,
  DeleteResult,
  UploadErrorCode,
} from '@types/storage.types';

// ── Firebase Storage REST endpoints ──────────────────────────

const FIREBASE_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b';
const FIREBASE_AUTH_BASE    = 'https://identitytoolkit.googleapis.com/v1';

interface FirebaseUploadResponse {
  name: string;          // path di storage
  bucket: string;
  contentType: string;
  size: string;
  downloadTokens?: string;  // Token untuk download URL
  error?: { code: number; message: string };
}

export class FirebaseProvider extends BaseStorageProvider {
  readonly type: StorageProviderType = 'firebase_storage';
  readonly displayName = 'Firebase Storage';

  private credentials: FirebaseCredentials | null = null;
  private idToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  // ── Lifecycle ──────────────────────────────────────────────

  protected async onInitialize(config: StorageProviderConfig): Promise<void> {
    if (!config.credentialsJson || config.credentialsJson === '{}') {
      this._isConfigured = false;
      return;
    }
    this.credentials = this.parseCredentials<FirebaseCredentials>(config.credentialsJson);
    this._isConfigured = !!(
      this.credentials.apiKey &&
      this.credentials.projectId &&
      this.credentials.storageBucket
    );

    // Restore token jika ada
    if (this.credentials.idToken) {
      this.idToken = this.credentials.idToken;
    }
  }

  isConfigured(): boolean {
    return !!(
      this.credentials?.apiKey &&
      this.credentials?.projectId &&
      this.credentials?.storageBucket
    );
  }

  isAuthExpired(): boolean {
    if (!this.tokenExpiresAt) return true;
    return this.tokenExpiresAt.getTime() - 300_000 < Date.now();
  }

  async refreshAuth(): Promise<{ success: boolean; error?: string }> {
    // Firebase ID Token expire setiap 1 jam
    // Gunakan custom token atau anonymous auth untuk refresh
    // TODO: implement full token refresh di Phase 2
    console.warn('[Firebase] Token refresh belum diimplementasi sepenuhnya');
    return { success: false, error: 'Token refresh belum tersedia — perlu re-login' };
  }

  // ── Upload ─────────────────────────────────────────────────

  async upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult> {
    if (!this.isConfigured() || !this.credentials) {
      return { success: false, error: 'Firebase Storage belum dikonfigurasi', errorCode: 'INVALID_CREDENTIALS' };
    }

    try {
      // Compress dulu
      const quality  = settings.uploadQuality ?? 0.8;
      const maxDim   = settings.maxDimension   ?? 2048;
      const localUri = await this.optimizeImage(context.localFilePath, quality, maxDim);

      // Bangun storage path
      const folder   = this.getFolderPath(context, settings);
      const fileName = `${context.remoteFileName ?? `photo_${context.sessionId}`}.jpg`;
      const storagePath = encodeURIComponent(`${folder}/${fileName}`);

      // Upload URL
      const bucket   = this.credentials.storageBucket;
      const uploadUrl = `${FIREBASE_STORAGE_BASE}/${bucket}/o?uploadType=media&name=${storagePath}`;

      const headers: Record<string, string> = {
        'Content-Type': 'image/jpeg',
      };
      if (this.idToken) {
        headers['Authorization'] = `Bearer ${this.idToken}`;
      }

      // Baca file
      const { readAsStringAsync, EncodingType } = await import('expo-file-system');
      const base64 = await readAsStringAsync(localUri, { encoding: EncodingType.Base64 });
      const binary = Buffer.from(base64, 'base64');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), settings.timeoutMs ?? 60_000);

      let response: Response;
      try {
        response = await fetch(uploadUrl, {
          method: 'POST',
          headers,
          body: binary,
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
        return { success: false, error: `Firebase HTTP ${response.status}: ${err}`, errorCode: this.mapError(response.status) };
      }

      const result = await response.json() as FirebaseUploadResponse;

      // Buat download URL dengan token
      const downloadUrl = result.downloadTokens
        ? `${FIREBASE_STORAGE_BASE}/${bucket}/o/${storagePath}?alt=media&token=${result.downloadTokens}`
        : `${FIREBASE_STORAGE_BASE}/${bucket}/o/${storagePath}?alt=media`;

      return {
        success: true,
        cloudUrl: downloadUrl,
        remoteId: result.name,
        remotePath: folder,
        remoteSize: result.size ? parseInt(result.size, 10) : undefined,
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

  // ── Delete ─────────────────────────────────────────────────

  async deleteFile(storagePath: string): Promise<DeleteResult> {
    if (!this.credentials?.storageBucket) return { success: false, error: 'Tidak terkonfigurasi' };

    const accessToken = this.idToken;
    const encoded = encodeURIComponent(storagePath);
    const url = `${FIREBASE_STORAGE_BASE}/${this.credentials.storageBucket}/o/${encoded}`;

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(url, { method: 'DELETE', headers });
      const ok = response.status === 204 || response.status === 404;
      return { success: ok };
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
      // Ping Firebase Storage bucket
      const response = await fetch(
        `${FIREBASE_STORAGE_BASE}/${this.credentials!.storageBucket}/o?maxResults=1`,
        { signal: AbortSignal.timeout(8000) }
      );

      const latencyMs = Date.now() - start;
      const healthy   = response.ok || response.status === 401; // 401 = bucket ada, cuma tidak auth

      return { healthy, latencyMs, checkedAt: new Date().toISOString() };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: 'Tidak bisa terhubung ke Firebase',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ── Validate Credentials ───────────────────────────────────

  async validateCredentials(creds: unknown): Promise<string | null> {
    const c = creds as Partial<FirebaseCredentials>;
    if (!c.apiKey?.trim())        return 'API Key tidak boleh kosong';
    if (!c.projectId?.trim())     return 'Project ID tidak boleh kosong';
    if (!c.storageBucket?.trim()) return 'Storage Bucket tidak boleh kosong';
    if (!c.appId?.trim())         return 'App ID tidak boleh kosong';
    return null;
  }

  // ── Folder (Firebase Storage = path-based, tidak perlu buat folder) ──

  async createFolder(context: FolderContext, settings: ProviderSettings): Promise<FolderResult> {
    // Firebase Storage tidak punya konsep folder eksplisit — path saja
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
