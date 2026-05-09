/**
 * StorageManager
 * ─────────────────────────────────────────────────────────────
 * Singleton yang mengatur semua operasi cloud storage.
 * Satu-satunya entry point untuk upload, health check, provider switching.
 *
 * Responsibilities:
 *   - Load & cache provider instances dari DB
 *   - Provider switching tanpa restart app
 *   - Auto failover ke backup provider jika primary down
 *   - Health monitoring semua provider aktif
 *   - Credential encryption/decryption
 *   - Provider-agnostic upload facade
 *
 * Caller (UploadQueue) hanya bicara ke StorageManager.upload()
 * dan tidak perlu tahu provider apa yang dipakai.
 */

import { db }                  from '@database/DatabaseService';
import { ProviderRegistry }    from './ProviderRegistry';
import type { IStorageProvider }  from './IStorageProvider';
import type {
  StorageProviderConfig,
  StorageProviderType,
  StorageProviderStatus,
  ProviderCredentials,
  ProviderSettings,
  UploadContext,
  UploadResult,
  HealthCheckResult,
  UploadErrorCode,
} from '@kitafoto-types/storage.types';
import { v4 as uuidv4 } from 'react-native-uuid';

// ── Simple XOR obfuscation untuk credential di SQLite ─────────
// Production: ganti dengan expo-secure-store atau react-native-keychain

const OBFUSCATION_KEY = 'KitaFoto_StorageKey_2024';

function obfuscate(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
    );
  }
  return Buffer.from(result).toString('base64');
}

function deobfuscate(encoded: string): string {
  const text = Buffer.from(encoded, 'base64').toString();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
    );
  }
  return result;
}

// ── Error codes yang tidak perlu retry (fatal) ─────────────────
const FATAL_ERROR_CODES: UploadErrorCode[] = [
  'FILE_NOT_FOUND',
  'INVALID_CREDENTIALS',
];

// ── Error codes yang butuh failover (bukan hanya retry) ────────
const FAILOVER_ERROR_CODES: UploadErrorCode[] = [
  'PROVIDER_DOWN',
  'QUOTA_EXCEEDED',
];

// ═══════════════════════════════════════════════════════════════
// STORAGE MANAGER
// ═══════════════════════════════════════════════════════════════

class StorageManagerClass {
  /** Semua provider yang ter-load: providerId → instance */
  private providers = new Map<string, IStorageProvider>();
  /** Config dari DB: providerId → config */
  private configs   = new Map<string, StorageProviderConfig>();

  private healthCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // ── Lifecycle ──────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadAllProviders();
    this.startHealthMonitor();
    this.initialized = true;
    console.log('[StorageManager] Initialized ✓');
  }

  /** Load semua provider dari tabel storage_providers di SQLite */
  async loadAllProviders(): Promise<void> {
    try {
      const rows = await db.getAll<Record<string, unknown>>(
        'SELECT * FROM storage_providers WHERE status != ? ORDER BY is_primary DESC',
        ['unconfigured']
      );

      for (const row of rows) {
        await this.loadProvider(this.rowToConfig(row));
      }
    } catch (error) {
      console.error('[StorageManager] loadAllProviders error:', error);
    }
  }

  /** Load / reload satu provider dari config */
  private async loadProvider(config: StorageProviderConfig): Promise<void> {
    const instance = ProviderRegistry.create(config.type);
    if (!instance) return;

    // Decrypt credentials
    const decryptedConfig: StorageProviderConfig = {
      ...config,
      credentialsJson: this.decryptCredentials(config.credentialsJson),
    };

    const ok = await instance.initialize(decryptedConfig);
    if (ok) {
      this.providers.set(config.id, instance);
      this.configs.set(config.id, config);
    }
  }

  // ── Upload — Public API ────────────────────────────────────

  /**
   * Upload file menggunakan primary provider.
   * Jika primary gagal dengan error PROVIDER_DOWN / QUOTA_EXCEEDED,
   * otomatis coba backup provider (failover).
   */
  async upload(context: UploadContext): Promise<UploadResult & { usedProviderId?: string }> {
    const primary = this.getPrimaryProvider();
    if (!primary) {
      return {
        success: false,
        error: 'Tidak ada provider storage yang aktif. Konfigurasi di panel admin.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    const primaryConfig  = this.configs.get(primary.id);
    const primarySettings = this.parseSettings(primaryConfig?.settingsJson ?? '{}');

    // Coba primary
    const primaryResult = await primary.provider.upload(context, primarySettings);

    if (primaryResult.success) {
      await this.logUploadHistory(context, primary.id, primary.provider.type, primaryResult);
      return { ...primaryResult, usedProviderId: primary.id };
    }

    // Log kegagalan primary
    await this.logUploadHistory(context, primary.id, primary.provider.type, primaryResult);
    console.warn(`[StorageManager] Primary provider ${primary.provider.type} gagal: ${primaryResult.error}`);

    // Jika error fatal → jangan coba failover
    if (primaryResult.errorCode && FATAL_ERROR_CODES.includes(primaryResult.errorCode)) {
      return primaryResult;
    }

    // Coba failover jika error perlu failover
    if (primaryResult.errorCode && FAILOVER_ERROR_CODES.includes(primaryResult.errorCode)) {
      const backup = this.getBackupProvider(primary.id);
      if (backup) {
        console.log(`[StorageManager] Failover ke ${backup.provider.displayName}...`);
        const backupSettings = this.parseSettings(
          this.configs.get(backup.id)?.settingsJson ?? '{}'
        );
        const backupResult = await backup.provider.upload(context, backupSettings);
        await this.logUploadHistory(context, backup.id, backup.provider.type, backupResult);

        if (backupResult.success) {
          await this.updateProviderError(primary.id, primaryResult.error);
          return { ...backupResult, usedProviderId: backup.id };
        }
      }
    }

    // Auth expired → tandai error agar admin tahu
    if (primaryResult.errorCode === 'AUTH_EXPIRED') {
      await this.updateProviderStatus(primary.id, 'error', 'Token expired — perlu re-auth');
    }

    return primaryResult;
  }

  // ── Provider Management ────────────────────────────────────

  /** Tambah atau update provider config */
  async saveProvider(
    type: StorageProviderType,
    credentials: ProviderCredentials,
    settings: ProviderSettings,
    options: {
      id?: string;          // Jika ada → update, tidak ada → buat baru
      name?: string;
      isPrimary?: boolean;
      isBackup?: boolean;
    } = {}
  ): Promise<StorageProviderConfig> {
    const id  = options.id ?? (uuidv4() as string);
    const now = new Date().toISOString();

    const credJson    = this.encryptCredentials(JSON.stringify(credentials));
    const settingsJson = JSON.stringify(settings);

    if (options.isPrimary) {
      // Un-primary semua provider lain yang sama type
      await db.run(
        'UPDATE storage_providers SET is_primary = 0, updated_at = ? WHERE type = ? AND id != ?',
        [now, type, id]
      );
    }

    await db.run(
      `INSERT OR REPLACE INTO storage_providers
        (id, name, type, status, is_primary, is_backup, credentials_json,
         settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        options.name ?? ProviderRegistry.getMeta(type)?.displayName ?? type,
        type,
        'active',
        options.isPrimary ? 1 : 0,
        options.isBackup  ? 1 : 0,
        credJson,
        settingsJson,
        now,
        now,
      ]
    );

    const config = await this.getProviderConfig(id);
    if (config) {
      await this.loadProvider(config);
    }

    return config!;
  }

  /** Hapus provider */
  async removeProvider(providerId: string): Promise<void> {
    await db.run('DELETE FROM storage_providers WHERE id = ?', [providerId]);
    this.providers.delete(providerId);
    this.configs.delete(providerId);
  }

  /** Ganti primary provider (provider switching tanpa restart) */
  async setPrimaryProvider(providerId: string): Promise<void> {
    const config = await this.getProviderConfig(providerId);
    if (!config) throw new Error('Provider tidak ditemukan');

    const now = new Date().toISOString();

    await db.transaction(async (txDb) => {
      await txDb.runAsync(
        'UPDATE storage_providers SET is_primary = 0, updated_at = ? WHERE type = ?',
        [now, config.type]
      );
      await txDb.runAsync(
        'UPDATE storage_providers SET is_primary = 1, status = ?, updated_at = ? WHERE id = ?',
        ['active', now, providerId]
      );
    });

    // Update in-memory cache
    for (const [id, cfg] of this.configs.entries()) {
      if (cfg.type === config.type) {
        this.configs.set(id, { ...cfg, isPrimary: id === providerId });
      }
    }
  }

  /** Reload config satu provider (dipanggil setelah admin ubah setting) */
  async reloadProvider(providerId: string): Promise<void> {
    const config = await this.getProviderConfig(providerId);
    if (config) await this.loadProvider(config);
  }

  // ── Health Monitoring ──────────────────────────────────────

  private startHealthMonitor(): void {
    // Health check semua provider setiap 5 menit
    this.healthCheckIntervalId = setInterval(
      () => this.runHealthChecks(),
      5 * 60 * 1000
    );
  }

  async runHealthChecks(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();

    for (const [id, provider] of this.providers.entries()) {
      try {
        const result = await provider.healthCheck();
        results.set(id, result);

        await this.logHealthCheck(id, result);

        const newStatus: StorageProviderStatus = result.healthy ? 'active' : 'error';
        await this.updateProviderStatus(id, newStatus, result.error);
      } catch (error) {
        const result: HealthCheckResult = {
          healthy: false,
          error: String(error),
          checkedAt: new Date().toISOString(),
        };
        results.set(id, result);
        await this.updateProviderStatus(id, 'error', String(error));
      }
    }

    return results;
  }

  async checkProviderHealth(providerId: string): Promise<HealthCheckResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { healthy: false, error: 'Provider tidak ditemukan', checkedAt: new Date().toISOString() };
    }
    const result = await provider.healthCheck();
    await this.logHealthCheck(providerId, result);
    await this.updateProviderStatus(providerId, result.healthy ? 'active' : 'error', result.error);
    return result;
  }

  // ── Query ──────────────────────────────────────────────────

  async getAllConfigs(): Promise<StorageProviderConfig[]> {
    const rows = await db.getAll<Record<string, unknown>>(
      'SELECT * FROM storage_providers ORDER BY is_primary DESC, created_at ASC'
    );
    return rows.map(this.rowToConfig);
  }

  async getProviderConfig(id: string): Promise<StorageProviderConfig | null> {
    const row = await db.getFirst<Record<string, unknown>>(
      'SELECT * FROM storage_providers WHERE id = ?',
      [id]
    );
    return row ? this.rowToConfig(row) : null;
  }

  getPrimaryProvider(): { id: string; provider: IStorageProvider } | null {
    for (const [id, cfg] of this.configs.entries()) {
      if (cfg.isPrimary && cfg.status === 'active') {
        const p = this.providers.get(id);
        if (p?.isReady()) return { id, provider: p };
      }
    }
    // Fallback: ambil provider aktif pertama
    for (const [id, cfg] of this.configs.entries()) {
      if (cfg.status === 'active') {
        const p = this.providers.get(id);
        if (p?.isReady()) return { id, provider: p };
      }
    }
    return null;
  }

  getBackupProvider(excludeId: string): { id: string; provider: IStorageProvider } | null {
    for (const [id, cfg] of this.configs.entries()) {
      if (id === excludeId) continue;
      if (cfg.isBackup && cfg.status === 'active') {
        const p = this.providers.get(id);
        if (p?.isReady()) return { id, provider: p };
      }
    }
    return null;
  }

  getProviderInstance(id: string): IStorageProvider | null {
    return this.providers.get(id) ?? null;
  }

  // ── Credentials Encryption ─────────────────────────────────

  private encryptCredentials(json: string): string {
    // TODO Phase 2: ganti dengan expo-secure-store / react-native-keychain
    return obfuscate(json);
  }

  private decryptCredentials(encoded: string): string {
    try {
      return deobfuscate(encoded);
    } catch {
      return encoded; // Mungkin plain JSON (migrasi dari versi lama)
    }
  }

  // ── Private DB Helpers ─────────────────────────────────────

  private rowToConfig(row: Record<string, unknown>): StorageProviderConfig {
    return {
      id:              row.id as string,
      name:            row.name as string,
      type:            row.type as StorageProviderType,
      status:          row.status as StorageProviderStatus,
      isPrimary:       (row.is_primary as number) === 1,
      isBackup:        (row.is_backup as number) === 1,
      credentialsJson: row.credentials_json as string,
      settingsJson:    row.settings_json as string,
      lastHealthAt:    row.last_health_at as string | undefined,
      lastUploadAt:    row.last_upload_at as string | undefined,
      lastError:       row.last_error as string | undefined,
      createdAt:       row.created_at as string,
      updatedAt:       row.updated_at as string,
    };
  }

  private parseSettings(json: string): ProviderSettings {
    try {
      return JSON.parse(json) as ProviderSettings;
    } catch {
      return {};
    }
  }

  private async updateProviderStatus(
    id: string,
    status: StorageProviderStatus,
    error?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE storage_providers SET status = ?, last_error = ?, updated_at = ? WHERE id = ?',
      [status, error ?? null, now, id]
    );
    const cfg = this.configs.get(id);
    if (cfg) this.configs.set(id, { ...cfg, status, lastError: error });
  }

  private async updateProviderError(id: string, error?: string): Promise<void> {
    await this.updateProviderStatus(id, 'error', error);
  }

  private async logUploadHistory(
    context: UploadContext,
    providerId: string,
    providerType: StorageProviderType,
    result: UploadResult
  ): Promise<void> {
    try {
      const id  = uuidv4() as string;
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO upload_history
          (id, photo_id, job_id, provider_id, provider_type, status,
           cloud_url, remote_id, error_code, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          context.photoId,
          '',
          providerId,
          providerType,
          result.success ? 'success' : 'failed',
          result.cloudUrl ?? null,
          result.remoteId ?? null,
          result.errorCode ?? null,
          result.error ?? null,
          now,
        ]
      );
      if (result.success) {
        await db.run(
          'UPDATE storage_providers SET last_upload_at = ?, updated_at = ? WHERE id = ?',
          [now, now, providerId]
        );
      }
    } catch { /* log tidak boleh block upload */ }
  }

  private async logHealthCheck(
    providerId: string,
    result: HealthCheckResult
  ): Promise<void> {
    try {
      const id  = uuidv4() as string;
      await db.run(
        `INSERT INTO provider_health_logs
          (id, provider_id, healthy, latency_ms, error_message, checked_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          providerId,
          result.healthy ? 1 : 0,
          result.latencyMs ?? null,
          result.error ?? null,
          result.checkedAt,
        ]
      );
      await db.run(
        'UPDATE storage_providers SET last_health_at = ?, updated_at = ? WHERE id = ?',
        [result.checkedAt, result.checkedAt, providerId]
      );
    } catch { /* ignore */ }
  }

  stop(): void {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }
}

export const StorageManager = new StorageManagerClass();
