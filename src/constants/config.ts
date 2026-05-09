/**
 * KitaFoto App Configuration
 * Default values — bisa di-override dari admin panel (SQLite)
 */

export const AppConfig = {
  // ── App Info ─────────────────────────────────────────
  appName: 'KitaFoto',
  version: '1.0.0',

  // ── Photo Booth Defaults ──────────────────────────────
  defaultPhotoCount: 3,            // Jumlah foto per sesi
  defaultLayout: 'strip_vertical' as LayoutType,
  defaultFilter: 'natural' as FilterType,
  defaultCountdownSecs: 3,         // Detik countdown
  previewDurationMs: 4000,         // Lama preview sebelum auto lanjut
  doneScreenDurationMs: 5000,      // Lama layar done sebelum kembali Home
  framepickerTimeoutMs: 30000,     // Timeout pilih frame → kembali Home

  // ── Print ─────────────────────────────────────────────
  defaultPrintCopies: 1,
  printMaxRetries: 5,
  printRetryDelaysMs: [5000, 10000, 30000, 60000, 120000], // Exponential

  // ── Upload ────────────────────────────────────────────
  uploadMaxRetries: 10,
  uploadRetryDelaysMs: [2000, 4000, 8000, 16000, 32000, 60000],
  uploadQuality: 0.8,              // JPEG quality untuk cloud (hemat bandwidth)
  uploadMaxDimension: 2048,        // Max px sebelum upload

  // ── Storage ───────────────────────────────────────────
  maxCacheMB: 2048,                // 2GB max cache
  warnCacheMB: 1536,               // 1.5GB → warning ke admin
  autocleanCacheMB: 1843,          // 1.8GB → auto cleanup
  emergencyCleanMB: 1945,          // 1.9GB → emergency cleanup
  autoDeleteDays: 3,               // Hapus file lokal setelah N hari (sudah upload)
  cacheCheckIntervalMs: 600000,    // 10 menit

  // ── Image Processing ─────────────────────────────────
  captureQuality: 0.92,            // Kualitas capture dari webcam
  captureMaxWidth: 1920,           // Max lebar foto capture
  captureMaxHeight: 1440,          // Max tinggi foto capture
  printQuality: 0.95,              // Kualitas versi print (tinggi)
  thumbnailSize: 200,              // Ukuran thumbnail px

  // ── Admin ─────────────────────────────────────────────
  adminPinLength: 6,
  adminLogoTapCount: 5,            // Tap logo berapa kali untuk buka admin
  adminLogoTapTimeoutMs: 3000,     // Timeout reset hitungan tap

  // ── Audio ─────────────────────────────────────────────
  defaultAudioMuted: false,
  ambienceVolume: 0.3,             // Volume musik background (30%)
  sfxVolume: 0.8,                  // Volume sound effects (80%)

  // ── Kiosk ─────────────────────────────────────────────
  kioskEnabled: true,

  // ── Network ───────────────────────────────────────────
  networkCheckIntervalMs: 5000,    // Cek koneksi setiap 5 detik

  // ── Performance ──────────────────────────────────────
  frameCacheMaxItems: 5,           // Max frame di-cache di memory
  frameGridColumns: 4,             // Kolom grid frame picker
  uploadBatchSize: 3,              // Max concurrent upload
} as const;

// ── Layout Types ──────────────────────────────────────────
export type LayoutType =
  | 'strip_vertical'   // Default: strip vertikal 3 foto
  | 'strip_horizontal' // Strip horizontal
  | 'single'           // 1 foto besar
  | 'grid_2x2'         // 4 foto grid 2x2
  | 'two_photos';      // 2 foto berdampingan

// ── Filter Types ──────────────────────────────────────────
export type FilterType =
  | 'natural'   // Tanpa filter
  | 'bright'    // Lebih cerah & vivid
  | 'sweet'     // Warm, soft pink tone
  | 'bw';       // Hitam putih

// ── Print Types ───────────────────────────────────────────
export type PrinterType = 'usb' | 'wifi' | 'pc_bridge';

// ── Cloudinary Folder ────────────────────────────────────
export const CloudinaryConfig = {
  rootFolder: 'kitafoto',
  getEventFolder: (eventId: string, eventName: string) =>
    `${eventId}_${eventName.replace(/\s+/g, '_').substring(0, 20)}`,
  getDateFolder: (date: Date) =>
    date.toISOString().split('T')[0], // YYYY-MM-DD
} as const;
