/**
 * KitaFoto Camera Types — v2
 * Extended untuk support USB OTG webcam, diagnostics, AI pipeline
 */

// ── Camera Status ────────────────────────────────────────────

export type CameraStatus =
  | 'disconnected'   // Tidak ada kamera terdeteksi
  | 'connecting'     // Sedang inisialisasi
  | 'ready'          // Siap digunakan
  | 'capturing'      // Sedang ambil foto
  | 'error'          // Error, perlu reconnect
  | 'fallback';      // Pakai kamera tablet (bukan USB webcam)

export type CameraSourceType = 'usb_webcam' | 'front_camera' | 'back_camera';

// ── Camera Device ────────────────────────────────────────────

export interface CameraDevice {
  id: string;
  name: string;
  sourceType: CameraSourceType;
  isUSBDevice: boolean;
  position?: 'front' | 'back' | 'external';
  /** Max supported resolution */
  maxWidth?: number;
  maxHeight?: number;
  /** Apakah device ini dipilih aktif */
  isActive?: boolean;
}

// ── Capture ──────────────────────────────────────────────────

export interface CaptureOptions {
  quality?: number;       // 0–1, default 0.92
  maxWidth?: number;
  maxHeight?: number;
  flash?: 'on' | 'off' | 'auto';
  skipCompress?: boolean; // true = simpan raw tanpa compress dulu
}

export interface CaptureResult {
  success: boolean;
  filePath?: string;
  width?: number;
  height?: number;
  fileSize?: number;      // bytes
  capturedAt?: string;    // ISO timestamp
  durationMs?: number;    // Waktu dari trigger ke file tersimpan
  error?: string;
  errorCode?: CaptureErrorCode;
}

export type CaptureErrorCode =
  | 'CAMERA_NOT_READY'
  | 'CAPTURE_TIMEOUT'
  | 'DISK_FULL'
  | 'PERMISSION_DENIED'
  | 'HARDWARE_ERROR'
  | 'UNKNOWN';

// ── Camera Diagnostics ───────────────────────────────────────

export interface CameraDiagnostics {
  deviceId: string | null;
  deviceName: string | null;
  sourceType: CameraSourceType | null;
  isUSBConnected: boolean;
  previewFPS: number;
  lastCaptureMs: number;
  totalCapturesSession: number;
  errorCount: number;
  lastError: string | null;
  memoryUsageMB: number;
  checkedAt: string;
}

// ── USB Device Info ──────────────────────────────────────────

export interface USBDeviceInfo {
  vendorId: number;
  productId: number;
  deviceName: string;
  isCamera: boolean;
  serialNumber?: string;
}

// ── Camera Config (dari admin panel) ────────────────────────

export interface CameraConfig {
  preferUSB: boolean;           // Utamakan USB webcam
  fallbackToBuiltin: boolean;   // Fallback ke kamera tablet
  captureQuality: number;       // 0–1
  maxResolutionWidth: number;
  maxResolutionHeight: number;
  previewFrameRate: number;     // FPS preview (default 30)
  captureFrameRate: number;     // FPS saat capture (default 15, hemat CPU)
  autoReconnectDelay: number;   // ms sebelum reconnect attempt
  maxReconnectAttempts: number;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  preferUSB: true,
  fallbackToBuiltin: true,
  captureQuality: 0.92,
  maxResolutionWidth: 1920,
  maxResolutionHeight: 1440,
  previewFrameRate: 30,
  captureFrameRate: 15,
  autoReconnectDelay: 2000,
  maxReconnectAttempts: 3,
};
