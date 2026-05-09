/**
 * KitaFoto SQLite Schema — v2
 * ─────────────────────────────────────────────────────────────
 * Perubahan dari v1:
 *   + storage_providers  — konfigurasi provider cloud (multi-provider)
 *   + upload_queue       — antrian upload universal (ganti upload_jobs)
 *   + upload_history     — log setiap percobaan upload (analytics)
 *   + provider_health_logs — log health check tiap provider
 *   ~ events             — hapus kolom cloudinary_folder (pindah ke provider settings)
 *   ~ photos             — tambah kolom storage_provider_id
 */

// ─────────────────────────────────────────────────────────────
// TABLE DEFINITIONS
// ─────────────────────────────────────────────────────────────

const TABLES_V1 = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA cache_size = -4000;

  -- ══════════════════════════════════════════
  -- events
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS events (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    is_active        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    photo_count      INTEGER NOT NULL DEFAULT 3,
    layout_type      TEXT NOT NULL DEFAULT 'strip_vertical',
    countdown_secs   INTEGER NOT NULL DEFAULT 3,
    filter_default   TEXT NOT NULL DEFAULT 'natural',
    auto_print       INTEGER NOT NULL DEFAULT 1,
    print_copies     INTEGER NOT NULL DEFAULT 1,
    storage_folder   TEXT     -- folder override untuk semua provider event ini
  );

  -- ══════════════════════════════════════════
  -- frames
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS frames (
    id          TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    thumbnail   TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    width       INTEGER,
    height      INTEGER,
    file_size   INTEGER
  );

  -- ══════════════════════════════════════════
  -- photos
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS photos (
    id                  TEXT PRIMARY KEY,
    event_id            TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    frame_id            TEXT NOT NULL REFERENCES frames(id),
    session_id          TEXT NOT NULL,
    raw_path            TEXT,
    processed_path      TEXT,
    print_path          TEXT,
    cloud_url           TEXT,
    storage_provider_id TEXT,     -- provider yang berhasil upload
    storage_remote_id   TEXT,     -- ID file di provider cloud
    filter_applied      TEXT NOT NULL DEFAULT 'natural',
    layout_type         TEXT NOT NULL DEFAULT 'strip_vertical',
    photo_count         INTEGER NOT NULL DEFAULT 3,
    upload_status       TEXT NOT NULL DEFAULT 'pending',
    print_status        TEXT NOT NULL DEFAULT 'pending',
    created_at          TEXT NOT NULL,
    uploaded_at         TEXT,
    printed_at          TEXT
  );

  -- ══════════════════════════════════════════
  -- print_jobs
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS print_jobs (
    id           TEXT PRIMARY KEY,
    photo_id     TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending',
    attempts     INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_error   TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    printed_at   TEXT
  );

  -- ══════════════════════════════════════════
  -- app_settings  (key-value store)
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const TABLES_V2_STORAGE = `
  -- ══════════════════════════════════════════
  -- storage_providers
  -- Provider cloud yang dikonfigurasi admin.
  -- Bisa ada banyak provider sekaligus (primary + backup).
  -- credentials_json tersimpan ter-obfuscate.
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS storage_providers (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,          -- "Cloudinary Utama", "Google Drive Backup"
    type             TEXT NOT NULL,          -- cloudinary | google_drive | firebase_storage | supabase_storage
    status           TEXT NOT NULL DEFAULT 'unconfigured', -- active | inactive | error | unconfigured
    is_primary       INTEGER NOT NULL DEFAULT 0,
    is_backup        INTEGER NOT NULL DEFAULT 0,
    credentials_json TEXT NOT NULL DEFAULT '{}',  -- encrypted JSON
    settings_json    TEXT NOT NULL DEFAULT '{}',  -- ProviderSettings JSON
    last_health_at   TEXT,
    last_upload_at   TEXT,
    last_error       TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  -- ══════════════════════════════════════════
  -- upload_queue
  -- Antrian upload universal — provider-agnostic.
  -- Menggantikan upload_jobs dari v1.
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS upload_queue (
    id                    TEXT PRIMARY KEY,
    photo_id              TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    provider_id           TEXT,              -- NULL = pakai primary provider
    status                TEXT NOT NULL DEFAULT 'pending',
    attempts              INTEGER NOT NULL DEFAULT 0,
    max_attempts          INTEGER NOT NULL DEFAULT 10,
    priority              INTEGER NOT NULL DEFAULT 0,   -- Lebih tinggi = lebih duluan
    next_retry_at         TEXT,              -- ISO: kapan boleh retry
    last_error            TEXT,
    last_error_code       TEXT,              -- UploadErrorCode
    cloud_url             TEXT,
    succeeded_provider_id TEXT,             -- Provider yang akhirnya berhasil
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    uploaded_at           TEXT
  );

  -- ══════════════════════════════════════════
  -- upload_history
  -- Log setiap percobaan upload (sukses & gagal).
  -- Untuk analytics, audit trail, debugging.
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS upload_history (
    id            TEXT PRIMARY KEY,
    photo_id      TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    job_id        TEXT,                      -- Referensi ke upload_queue
    provider_id   TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    status        TEXT NOT NULL,             -- 'success' | 'failed'
    cloud_url     TEXT,
    remote_id     TEXT,                      -- ID file di provider
    file_size     INTEGER,                   -- Bytes
    duration_ms   INTEGER,                   -- Lama upload
    error_code    TEXT,
    error_message TEXT,
    created_at    TEXT NOT NULL
  );

  -- ══════════════════════════════════════════
  -- provider_health_logs
  -- Log health check berkala tiap provider.
  -- Untuk monitoring uptime & latency trend.
  -- Dibersihkan otomatis setelah 30 hari.
  -- ══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS provider_health_logs (
    id            TEXT PRIMARY KEY,
    provider_id   TEXT NOT NULL,
    healthy       INTEGER NOT NULL,          -- 1 = sehat, 0 = error
    latency_ms    INTEGER,
    error_message TEXT,
    checked_at    TEXT NOT NULL
  );
`;

const INDEXES = `
  -- ── Events ──────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_events_active         ON events(is_active);

  -- ── Frames ──────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_frames_event          ON frames(event_id);
  CREATE INDEX IF NOT EXISTS idx_frames_active         ON frames(event_id, is_active);

  -- ── Photos ──────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_photos_event          ON photos(event_id);
  CREATE INDEX IF NOT EXISTS idx_photos_session        ON photos(session_id);
  CREATE INDEX IF NOT EXISTS idx_photos_upload_status  ON photos(upload_status);
  CREATE INDEX IF NOT EXISTS idx_photos_print_status   ON photos(print_status);
  CREATE INDEX IF NOT EXISTS idx_photos_created        ON photos(created_at);

  -- ── Print Jobs ───────────────────────────
  CREATE INDEX IF NOT EXISTS idx_print_jobs_status     ON print_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_print_jobs_photo      ON print_jobs(photo_id);

  -- ── Storage Providers ────────────────────
  CREATE INDEX IF NOT EXISTS idx_providers_type        ON storage_providers(type);
  CREATE INDEX IF NOT EXISTS idx_providers_primary     ON storage_providers(is_primary, status);

  -- ── Upload Queue ─────────────────────────
  CREATE INDEX IF NOT EXISTS idx_upload_q_status       ON upload_queue(status);
  CREATE INDEX IF NOT EXISTS idx_upload_q_photo        ON upload_queue(photo_id);
  CREATE INDEX IF NOT EXISTS idx_upload_q_ready        ON upload_queue(status, next_retry_at, priority);
  CREATE INDEX IF NOT EXISTS idx_upload_q_provider     ON upload_queue(provider_id, status);

  -- ── Upload History ───────────────────────
  CREATE INDEX IF NOT EXISTS idx_upload_hist_photo     ON upload_history(photo_id);
  CREATE INDEX IF NOT EXISTS idx_upload_hist_provider  ON upload_history(provider_id);
  CREATE INDEX IF NOT EXISTS idx_upload_hist_status    ON upload_history(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_upload_hist_created   ON upload_history(created_at);

  -- ── Provider Health Logs ─────────────────
  CREATE INDEX IF NOT EXISTS idx_health_provider       ON provider_health_logs(provider_id);
  CREATE INDEX IF NOT EXISTS idx_health_checked        ON provider_health_logs(checked_at);
`;

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export const CREATE_TABLES_SQL = TABLES_V1 + TABLES_V2_STORAGE + INDEXES;

export const DEFAULT_SETTINGS: Record<string, string> = {
  // Auth
  admin_pin_hash:         '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',

  // Kiosk
  kiosk_enabled:          'true',

  // Storage
  storage_limit_mb:       '2048',
  auto_delete_days:       '3',

  // Audio
  audio_muted:            'false',
  ambience_enabled:       'true',

  // Printer
  printer_type:           'usb',
  printer_ip:             '',
  printer_port:           '9100',

  // App
  app_version:            '2.0.0',
  onboarding_done:        'false',
  db_schema_version:      '2',

  // Upload
  upload_batch_size:      '3',
  health_check_interval:  '300',  // detik (5 menit)
  health_log_retention:   '30',   // hari
};

// ─────────────────────────────────────────────────────────────
// MIGRATION: v1 → v2
// Dijalankan jika schema_version < 2
// ─────────────────────────────────────────────────────────────

export const MIGRATION_V1_TO_V2 = `
  -- Tambah kolom baru ke photos jika belum ada
  ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_provider_id TEXT;
  ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_remote_id   TEXT;

  -- Tambah kolom storage_folder ke events
  ALTER TABLE events ADD COLUMN IF NOT EXISTS storage_folder TEXT;

  -- Buat tabel-tabel baru storage system
  ${TABLES_V2_STORAGE}

  -- Buat indexes baru
  CREATE INDEX IF NOT EXISTS idx_providers_type    ON storage_providers(type);
  CREATE INDEX IF NOT EXISTS idx_providers_primary ON storage_providers(is_primary, status);
  CREATE INDEX IF NOT EXISTS idx_upload_q_status   ON upload_queue(status);
  CREATE INDEX IF NOT EXISTS idx_upload_q_ready    ON upload_queue(status, next_retry_at, priority);
  CREATE INDEX IF NOT EXISTS idx_upload_hist_photo ON upload_history(photo_id);
  CREATE INDEX IF NOT EXISTS idx_health_provider   ON provider_health_logs(provider_id);

  -- Migrasi data dari upload_jobs (v1) ke upload_queue (v2) jika tabel lama masih ada
  INSERT OR IGNORE INTO upload_queue
    (id, photo_id, status, attempts, max_attempts, next_retry_at,
     last_error, cloud_url, created_at, updated_at, uploaded_at)
  SELECT
    id, photo_id, status, attempts, max_attempts, next_retry_at,
    last_error, cloud_url, created_at, updated_at, uploaded_at
  FROM upload_jobs
  WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='upload_jobs');

  UPDATE app_settings SET value = '2' WHERE key = 'db_schema_version';
`;
