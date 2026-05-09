/**
 * KitaFoto SQLite Schema
 * Semua DDL statements untuk inisialisasi database
 */

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA cache_size = -4000;

  -- ============================================
  -- events
  -- ============================================
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
    cloudinary_folder TEXT
  );

  -- ============================================
  -- frames
  -- ============================================
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

  -- ============================================
  -- photos
  -- ============================================
  CREATE TABLE IF NOT EXISTS photos (
    id               TEXT PRIMARY KEY,
    event_id         TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    frame_id         TEXT NOT NULL REFERENCES frames(id),
    session_id       TEXT NOT NULL,
    raw_path         TEXT,
    processed_path   TEXT,
    print_path       TEXT,
    cloud_url        TEXT,
    filter_applied   TEXT NOT NULL DEFAULT 'natural',
    layout_type      TEXT NOT NULL DEFAULT 'strip_vertical',
    photo_count      INTEGER NOT NULL DEFAULT 3,
    upload_status    TEXT NOT NULL DEFAULT 'pending',
    print_status     TEXT NOT NULL DEFAULT 'pending',
    created_at       TEXT NOT NULL,
    uploaded_at      TEXT,
    printed_at       TEXT
  );

  -- ============================================
  -- print_jobs
  -- ============================================
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

  -- ============================================
  -- upload_jobs
  -- ============================================
  CREATE TABLE IF NOT EXISTS upload_jobs (
    id            TEXT PRIMARY KEY,
    photo_id      TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending',
    attempts      INTEGER NOT NULL DEFAULT 0,
    max_attempts  INTEGER NOT NULL DEFAULT 10,
    next_retry_at TEXT,
    last_error    TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    uploaded_at   TEXT,
    cloud_url     TEXT
  );

  -- ============================================
  -- app_settings (key-value)
  -- ============================================
  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- ============================================
  -- INDEXES
  -- ============================================
  CREATE INDEX IF NOT EXISTS idx_frames_event      ON frames(event_id);
  CREATE INDEX IF NOT EXISTS idx_frames_active     ON frames(event_id, is_active);
  CREATE INDEX IF NOT EXISTS idx_photos_event      ON photos(event_id);
  CREATE INDEX IF NOT EXISTS idx_photos_session    ON photos(session_id);
  CREATE INDEX IF NOT EXISTS idx_photos_upload     ON photos(upload_status);
  CREATE INDEX IF NOT EXISTS idx_photos_print      ON photos(print_status);
  CREATE INDEX IF NOT EXISTS idx_photos_created    ON photos(created_at);
  CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_upload_jobs_status ON upload_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_upload_jobs_retry ON upload_jobs(status, next_retry_at);
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  admin_pin_hash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // "123456" sha256
  kiosk_enabled: 'true',
  storage_limit_mb: '2048',
  auto_delete_days: '3',
  audio_muted: 'false',
  ambience_enabled: 'true',
  cloudinary_cloud_name: '',
  cloudinary_upload_preset: '',
  printer_type: 'usb',
  printer_ip: '',
  printer_port: '9100',
  app_version: '1.0.0',
  onboarding_done: 'false',
};
