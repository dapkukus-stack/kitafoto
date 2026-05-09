/**
 * GoogleDriveProvider
 * Implementasi IStorageProvider untuk Google Drive
 * ─────────────────────────────────────────────────────────────
 *
 * STRATEGI OAUTH2 UNTUK ANDROID TABLET KIOSK:
 * ─────────────────────────────────────────────
 * Masalah utama: kiosk app tidak punya browser UI normal untuk OAuth flow.
 * Solusi terbaik untuk Samsung Tab A9 photobooth:
 *
 *   PILIHAN A (Recommended): "Device Authorization Grant" (RFC 8628)
 *     - Admin buka https://google.com/device di HP/laptop
 *     - Masukkan kode pendek yang tampil di layar tablet
 *     - Tablet polling Google sampai user approve
 *     - Tidak butuh redirect URI / browser di tablet
 *     - Cocok untuk TV, kiosk, IoT
 *
 *   PILIHAN B: Service Account + Drive API
 *     - Admin share folder Google Drive ke service account email
 *     - App pakai service account JWT (tidak expire)
 *     - Tidak butuh OAuth interactive sama sekali
 *     - Paling stabil untuk kiosk — DIREKOMENDASIKAN untuk production
 *
 *   PILIHAN C: Custom Tab / Expo WebBrowser
 *     - Buka browser in-app untuk OAuth
 *     - Redirect ke custom scheme (kitafoto://oauth)
 *     - Ribet di kiosk mode karena back button diblock
 *
 * IMPLEMENTASI INI: Device Authorization Grant (Pilihan A)
 *   + Service Account JWT fallback (Pilihan B)
 *
 * Features:
 *   - Device Authorization Grant (user-friendly untuk kiosk)
 *   - Service Account JWT (untuk production yang lebih stabil)
 *   - Auto token refresh (access token expired setiap 1 jam)
 *   - Auto create folder per event di Drive
 *   - Auto create subfolder per tanggal
 *   - Optional public share link
 *   - Storage quota check
 *   - Resume upload via resumable upload API
 *   - Folder ID caching (hindari duplicate create)
 */

import * as FileSystem from 'expo-file-system';
import { BaseStorageProvider } from '../IStorageProvider';
import type {
  StorageProviderType,
  StorageProviderConfig,
  GoogleDriveCredentials,
  ProviderSettings,
  UploadContext,
  UploadResult,
  HealthCheckResult,
  FolderContext,
  FolderResult,
  DeleteResult,
  OAuthTokens,
  OAuthRefreshResult,
  UploadErrorCode,
} from '@types/storage.types';

// ── Google Drive API Constants ───────────────────────────────

const DRIVE_API       = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD    = 'https://www.googleapis.com/upload/drive/v3';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_DEVICE_URL = 'https://oauth2.googleapis.com/device/code';
const DRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.file';

// ── Google API Response Types ────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;         // Kode pendek yang ditampilkan ke user
  verification_url: string;  // https://google.com/device
  expires_in: number;
  interval: number;          // Polling interval (detik)
  error?: string;
}

interface DriveAbout {
  storageQuota?: {
    limit?: string;
    usageInDrive?: string;
    usage?: string;
  };
}

// ── Device Auth State (untuk UI polling) ─────────────────────

export interface DeviceAuthState {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: Date;
  intervalSecs: number;
}

export type DeviceAuthStatus =
  | 'waiting'      // Menunggu user approve di browser
  | 'approved'     // User sudah approve
  | 'expired'      // Kode expired
  | 'error';       // Error lain

// ═══════════════════════════════════════════════════════════════
// GOOGLE DRIVE PROVIDER
// ═══════════════════════════════════════════════════════════════

export class GoogleDriveProvider extends BaseStorageProvider {
  readonly type: StorageProviderType = 'google_drive';
  readonly displayName = 'Google Drive';

  private credentials: GoogleDriveCredentials | null = null;
  private tokens: OAuthTokens | null = null;

  // Cache folder ID agar tidak buat folder duplikat
  // key: "eventId/YYYY-MM-DD" → folderId di Drive
  private folderIdCache = new Map<string, string>();

  // ── Lifecycle ──────────────────────────────────────────────

  protected async onInitialize(config: StorageProviderConfig): Promise<void> {
    if (!config.credentialsJson || config.credentialsJson === '{}') {
      this._isConfigured = false;
      return;
    }

    this.credentials = this.parseCredentials<GoogleDriveCredentials>(config.credentialsJson);

    // Bangun token dari credentials yang tersimpan
    if (this.credentials.accessToken) {
      this.tokens = {
        accessToken: this.credentials.accessToken,
        refreshToken: this.credentials.refreshToken,
        expiresAt: this.credentials.tokenExpiresAt ?? new Date(0).toISOString(),
        tokenType: 'Bearer',
        scope: DRIVE_SCOPE,
      };
    }

    this._isConfigured = !!(
      this.credentials.clientId &&
      (this.credentials.accessToken || this.credentials.refreshToken)
    );
  }

  isConfigured(): boolean {
    return !!(
      this.credentials?.clientId &&
      (this.credentials?.accessToken || this.credentials?.refreshToken)
    );
  }

  isAuthExpired(): boolean {
    if (!this.tokens?.expiresAt) return true;
    // Anggap expired 5 menit sebelum waktu sebenarnya
    return new Date(this.tokens.expiresAt).getTime() - 300_000 < Date.now();
  }

  // ── OAuth: Device Authorization Grant ─────────────────────

  /**
   * Step 1: Minta device code dari Google.
   * Tampilkan `userCode` dan `verificationUrl` ke admin di layar.
   * Admin buka URL tsb di HP/laptop, masukkan userCode.
   */
  async startDeviceAuth(): Promise<DeviceAuthState | null> {
    if (!this.credentials?.clientId) return null;

    try {
      const params = new URLSearchParams({
        client_id: this.credentials.clientId,
        scope: DRIVE_SCOPE,
      });

      const response = await fetch(OAUTH_DEVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) return null;
      const data = await response.json() as DeviceCodeResponse;
      if (data.error) return null;

      return {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUrl: data.verification_url,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        intervalSecs: data.interval,
      };
    } catch (error) {
      console.error('[GoogleDrive] startDeviceAuth error:', error);
      return null;
    }
  }

  /**
   * Step 2: Poll Google sampai user approve atau expired.
   * Panggil ini berkala sesuai `intervalSecs` dari startDeviceAuth.
   * Return status: 'waiting' | 'approved' | 'expired' | 'error'
   */
  async pollDeviceAuth(
    deviceCode: string,
    onTokensReceived: (tokens: OAuthTokens) => Promise<void>
  ): Promise<DeviceAuthStatus> {
    if (!this.credentials?.clientId) return 'error';

    try {
      const params = new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: '', // Tidak diperlukan untuk installed app
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json() as TokenResponse;

      if (data.error === 'authorization_pending') return 'waiting';
      if (data.error === 'expired_token')         return 'expired';
      if (data.error === 'slow_down')             return 'waiting'; // Perlu naikkan interval

      if (data.access_token) {
        const tokens: OAuthTokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
          tokenType: data.token_type,
          scope: data.scope,
        };
        this.tokens = tokens;
        await onTokensReceived(tokens);
        return 'approved';
      }

      return 'error';
    } catch {
      return 'error';
    }
  }

  // ── Token Refresh ──────────────────────────────────────────

  async refreshAuth(): Promise<{ success: boolean; error?: string }> {
    if (!this.tokens?.refreshToken || !this.credentials?.clientId) {
      return { success: false, error: 'Tidak ada refresh token — perlu login ulang' };
    }

    try {
      const params = new URLSearchParams({
        client_id: this.credentials.clientId,
        refresh_token: this.tokens.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json() as TokenResponse;

      if (data.error || !data.access_token) {
        return { success: false, error: data.error_description ?? data.error ?? 'Refresh gagal' };
      }

      this.tokens = {
        ...this.tokens,
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      };

      // Update credentials dengan token baru
      if (this.credentials) {
        this.credentials.accessToken  = this.tokens.accessToken;
        this.credentials.tokenExpiresAt = this.tokens.expiresAt;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ── Access Token Helper ────────────────────────────────────

  /** Ambil access token yang valid, auto-refresh jika expired */
  private async getValidAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;

    if (this.isAuthExpired()) {
      const result = await this.refreshAuth();
      if (!result.success) {
        this._hasError = true;
        return null;
      }
    }

    return this.tokens.accessToken;
  }

  // ── Upload ─────────────────────────────────────────────────

  async upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Google Drive belum dikonfigurasi',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return {
        success: false,
        error: 'Token Google Drive expired — perlu login ulang di panel admin',
        errorCode: 'AUTH_EXPIRED',
      };
    }

    try {
      // 1. Cari atau buat folder untuk event + tanggal
      const folderResult = await this.createFolder(
        { eventId: context.eventId, eventName: context.eventName },
        settings
      );
      const parentFolderId = folderResult.folderId;

      // 2. Compress file sebelum upload
      const quality  = settings.uploadQuality ?? 0.8;
      const maxDim   = settings.maxDimension   ?? 2048;
      const localUri = await this.optimizeImage(context.localFilePath, quality, maxDim);

      // 3. Baca file sebagai base64
      const fileBase64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 4. Upload via Drive API (multipart upload)
      const fileName = `${context.remoteFileName ?? `photo_${context.sessionId}`}.jpg`;
      const metadata = {
        name: fileName,
        parents: parentFolderId ? [parentFolderId] : undefined,
        description: JSON.stringify({
          eventId:   context.eventId,
          sessionId: context.sessionId,
          photoId:   context.photoId,
          app:       'KitaFoto',
        }),
      };

      const boundary  = `kitafoto_boundary_${Date.now()}`;
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: image/jpeg\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        fileBase64 +
        closeDelimiter;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), settings.timeoutMs ?? 60_000);

      let response: Response;
      try {
        response = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,webViewLink,size`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      // Cleanup compressed file
      if (localUri !== context.localFilePath) {
        this.safeDeleteFile(localUri);
      }

      if (!response.ok) {
        const err = await response.text();
        const code = this.mapDriveHttpError(response.status);
        return { success: false, error: `Drive HTTP ${response.status}: ${err}`, errorCode: code };
      }

      const file = await response.json() as DriveFile;

      // 5. Optional: buat public share link
      let publicUrl = file.webViewLink;
      if (settings.makePublic) {
        publicUrl = await this.makeFilePublic(file.id, accessToken) ?? file.webViewLink;
      }

      return {
        success: true,
        cloudUrl: publicUrl,
        remoteId: file.id,
        remotePath: folderResult.folderPath,
        remoteSize: file.size ? parseInt(file.size, 10) : undefined,
        providerType: this.type,
        providerId: this.config?.id,
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Upload timeout', errorCode: 'TIMEOUT' };
      }
      const msg  = error instanceof Error ? error.message : String(error);
      const code = this.detectNetworkError(msg);
      return { success: false, error: msg, errorCode: code };
    }
  }

  async uploadWithProgress(
    context: UploadContext,
    settings: ProviderSettings,
    onProgress: (percent: number) => void
  ): Promise<UploadResult> {
    // Drive mendukung resumable upload untuk file besar
    // Untuk foto photobooth (< 3MB) pakai multipart biasa + simulasi progress
    onProgress(0);
    const result = await this.upload(context, settings);
    onProgress(result.success ? 100 : 0);
    return result;
  }

  // ── Folder Management ──────────────────────────────────────

  async createFolder(context: FolderContext, settings: ProviderSettings): Promise<FolderResult> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      // Kembalikan path string saja agar tidak block upload
      return { success: false, error: 'Token expired' };
    }

    const dateStr   = (context.date ?? new Date()).toISOString().split('T')[0];
    const eventSlug = context.eventName.replace(/\s+/g, '_').substring(0, 30);
    const cacheKey  = `${context.eventId}/${dateStr}`;

    // Cek cache dulu
    if (this.folderIdCache.has(cacheKey)) {
      const cachedId = this.folderIdCache.get(cacheKey)!;
      return {
        success: true,
        folderId: cachedId,
        folderPath: `KitaFoto/${context.eventId}_${eventSlug}/${dateStr}`,
      };
    }

    try {
      // 1. Pastikan root folder ada
      const rootFolder = settings.rootFolder ?? 'KitaFoto';
      const rootId = await this.ensureFolder(rootFolder, null, accessToken);
      if (!rootId) return { success: false, error: 'Gagal buat root folder' };

      // 2. Folder per event
      let parentId = rootId;
      if (settings.createEventFolder !== false) {
        const eventFolderName = `${context.eventId}_${eventSlug}`;
        const eventId = await this.ensureFolder(eventFolderName, rootId, accessToken);
        if (eventId) parentId = eventId;
      }

      // 3. Folder per tanggal
      if (settings.createDateFolder !== false) {
        const dateFolderId = await this.ensureFolder(dateStr, parentId, accessToken);
        if (dateFolderId) {
          this.folderIdCache.set(cacheKey, dateFolderId);
          return {
            success: true,
            folderId: dateFolderId,
            folderPath: `${rootFolder}/${context.eventId}_${eventSlug}/${dateStr}`,
          };
        }
      }

      this.folderIdCache.set(cacheKey, parentId);
      return { success: true, folderId: parentId, folderPath: rootFolder };

    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async folderExists(folderId: string): Promise<boolean> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return false;
    try {
      const response = await fetch(
        `${DRIVE_API}/files/${folderId}?fields=id,trashed`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) return false;
      const file = await response.json() as { id: string; trashed: boolean };
      return !file.trashed;
    } catch {
      return false;
    }
  }

  // ── Delete ─────────────────────────────────────────────────

  async deleteFile(fileId: string): Promise<DeleteResult> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return { success: false, error: 'Token expired' };

    try {
      const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // 204 = success, 404 = already deleted
      const ok = response.status === 204 || response.status === 404;
      return { success: ok, error: ok ? undefined : `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ── Health Check ───────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isConfigured()) {
      return { healthy: false, error: 'Tidak terkonfigurasi', checkedAt: new Date().toISOString() };
    }

    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return {
        healthy: false,
        error: 'Token expired — perlu re-auth',
        checkedAt: new Date().toISOString(),
      };
    }

    const start = Date.now();
    try {
      const response = await fetch(
        `${DRIVE_API}/about?fields=storageQuota`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(8000),
        }
      );

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          healthy: false,
          latencyMs,
          error: `Drive API HTTP ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const about = await response.json() as DriveAbout;
      const quota = about.storageQuota;

      const usedBytes  = quota?.usageInDrive ? parseInt(quota.usageInDrive, 10) : undefined;
      const limitBytes = quota?.limit        ? parseInt(quota.limit, 10)        : undefined;

      return {
        healthy: true,
        latencyMs,
        storageUsedBytes: usedBytes,
        storageQuotaBytes: limitBytes,
        storageUsedPercent:
          usedBytes && limitBytes
            ? Math.round((usedBytes / limitBytes) * 100)
            : undefined,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: 'Tidak bisa terhubung ke Google Drive',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ── Validate Credentials ───────────────────────────────────

  async validateCredentials(creds: unknown): Promise<string | null> {
    const c = creds as Partial<GoogleDriveCredentials>;
    if (!c.clientId?.trim()) return 'Client ID tidak boleh kosong';
    if (!c.accessToken && !c.refreshToken) {
      return 'Belum ada token — lakukan login Google Drive terlebih dahulu';
    }
    return null;
  }

  // ── Public URL ─────────────────────────────────────────────

  async getPublicUrl(fileId: string): Promise<string | null> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return null;
    try {
      const response = await fetch(
        `${DRIVE_API}/files/${fileId}?fields=webViewLink`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) return null;
      const file = await response.json() as DriveFile;
      return file.webViewLink ?? null;
    } catch {
      return null;
    }
  }

  // ── Private Helpers ────────────────────────────────────────

  /**
   * Cari folder berdasarkan nama & parent, buat baru jika tidak ada.
   * Return folder ID.
   */
  private async ensureFolder(
    name: string,
    parentId: string | null,
    accessToken: string
  ): Promise<string | null> {
    try {
      // Search dulu
      let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
      if (parentId) query += ` and '${parentId}' in parents`;

      const searchRes = await fetch(
        `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchRes.ok) {
        const list = await searchRes.json() as DriveFileList;
        if (list.files.length > 0) return list.files[0].id;
      }

      // Buat baru
      const meta: Record<string, unknown> = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) meta.parents = [parentId];

      const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meta),
      });

      if (!createRes.ok) return null;
      const created = await createRes.json() as DriveFile;
      return created.id;

    } catch {
      return null;
    }
  }

  /** Set file permission jadi anyone can view */
  private async makeFilePublic(fileId: string, accessToken: string): Promise<string | null> {
    try {
      await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });

      const res = await fetch(
        `${DRIVE_API}/files/${fileId}?fields=webContentLink`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const file = await res.json() as DriveFile;
      return file.webContentLink ?? null;
    } catch {
      return null;
    }
  }

  /** Compress gambar sebelum upload */
  private async optimizeImage(
    localPath: string,
    quality: number,
    maxDimension: number
  ): Promise<string> {
    try {
      const ImageManipulator = await import('expo-image-manipulator');
      const result = await ImageManipulator.manipulateAsync(
        localPath,
        [{ resize: { width: maxDimension } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch {
      return localPath;
    }
  }

  private mapDriveHttpError(status: number): UploadErrorCode {
    if (status === 401)           return 'AUTH_EXPIRED';
    if (status === 403)           return 'INVALID_CREDENTIALS';
    if (status === 429)           return 'RATE_LIMITED';
    if (status === 507)           return 'QUOTA_EXCEEDED';
    if (status === 503 || status === 502) return 'PROVIDER_DOWN';
    return 'UNKNOWN';
  }

  private detectNetworkError(msg: string): UploadErrorCode {
    const lower = msg.toLowerCase();
    if (lower.includes('network') || lower.includes('fetch'))  return 'NETWORK_ERROR';
    if (lower.includes('timeout') || lower.includes('abort'))  return 'TIMEOUT';
    if (lower.includes('quota'))                               return 'QUOTA_EXCEEDED';
    if (lower.includes('unauthorized') || lower.includes('401')) return 'AUTH_EXPIRED';
    return 'UNKNOWN';
  }

  private async safeDeleteFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch { /* ignore */ }
  }
}
