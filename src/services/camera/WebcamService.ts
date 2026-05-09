/**
 * WebcamService
 * ─────────────────────────────────────────────────────────────
 * Facade tunggal untuk semua operasi kamera di KitaFoto.
 * Komponen dan screens hanya bicara ke WebcamService,
 * tidak langsung ke VisionCamera atau CameraDeviceManager.
 *
 * Responsibilities:
 *   - Init & lifecycle kamera (start/stop/release)
 *   - Capture foto dengan quality config
 *   - Permission handling Android
 *   - Memory-safe: release buffer setelah tidak dipakai
 *   - Expose camera ref untuk CameraScreen
 *   - Crash recovery (re-init jika kamera error)
 */

import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { CameraDeviceManager } from './CameraDeviceManager';
import { useAppStore } from '@store/useAppStore';
import { AppConfig } from '@constants/config';
import type {
  CaptureResult,
  CaptureOptions,
  CaptureErrorCode,
  CameraDevice,
} from '@kitafoto-types/camera.types';

// ── Session temp directory ────────────────────────────────────
export const SESSION_DIR = `${FileSystem.cacheDirectory}kitafoto/sessions/`;

// ── Timeout untuk capture (ms) ────────────────────────────────
const CAPTURE_TIMEOUT_MS = 8000;

// ── VisionCamera ref type (avoid hard dep at module level) ────
export type VisionCameraRef = {
  takePhoto: (opts?: {
    qualityPrioritization?: 'speed' | 'balanced' | 'quality';
    flash?: 'on' | 'off' | 'auto';
    enableAutoRedEyeReduction?: boolean;
    skipMetadata?: boolean;
  }) => Promise<{ path: string; width: number; height: number }>;
  focus?: (point: { x: number; y: number }) => Promise<void>;
};

class WebcamServiceClass {
  private cameraRef: React.RefObject<VisionCameraRef> | null = null;
  private isInitialized = false;
  private captureInProgress = false;

  // ── Init ──────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Cek & minta permission
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        useAppStore.getState().setCameraStatus('error');
        console.error('[WebcamService] Camera permission denied');
        return;
      }

      // 2. Ensure session directory ada
      await FileSystem.makeDirectoryAsync(SESSION_DIR, { intermediates: true });

      // 3. Start device manager (detect USB webcam)
      await CameraDeviceManager.start({
        preferUSB: true,
        fallbackToBuiltin: true,
        captureQuality: AppConfig.captureQuality,
        maxResolutionWidth: AppConfig.captureMaxWidth,
        maxResolutionHeight: AppConfig.captureMaxHeight,
      });

      this.isInitialized = true;
      console.log('[WebcamService] Initialized ✓');

    } catch (error) {
      console.error('[WebcamService] Init failed:', error);
      useAppStore.getState().setCameraStatus('error');
    }
  }

  // ── Permission ─────────────────────────────────────────────

  private async requestPermissions(): Promise<boolean> {
    try {
      const vc = await this.loadVC();
      if (!vc) return true; // dev mode, skip

      const status = await vc.Camera.requestCameraPermission();
      return status === 'granted' || status === 'authorized';
    } catch {
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const vc = await this.loadVC();
      if (!vc) return true;
      const status = await vc.Camera.getCameraPermissionStatus();
      return status === 'granted' || status === 'authorized';
    } catch {
      return false;
    }
  }

  // ── Camera Ref (dipanggil dari CameraScreen) ──────────────

  setCameraRef(ref: React.RefObject<VisionCameraRef>): void {
    this.cameraRef = ref;
  }

  clearCameraRef(): void {
    this.cameraRef = null;
  }

  // ── Capture ───────────────────────────────────────────────

  /**
   * Ambil satu foto.
   * Hasil disimpan ke SESSION_DIR/{sessionId}/raw_{index}.jpg
   * Memory-safe: tidak simpan bitmap ke memory, langsung ke file.
   */
  async capturePhoto(
    sessionId: string,
    photoIndex: number,
    options: CaptureOptions = {}
  ): Promise<CaptureResult> {
    if (this.captureInProgress) {
      return {
        success: false,
        error: 'Capture sedang berlangsung',
        errorCode: 'CAMERA_NOT_READY',
      };
    }

    if (!this.cameraRef?.current) {
      return {
        success: false,
        error: 'Camera ref tidak tersedia',
        errorCode: 'CAMERA_NOT_READY',
      };
    }

    const startTime = Date.now();
    this.captureInProgress = true;
    useAppStore.getState().setCameraStatus('capturing');

    try {
      // Ensure session dir
      const sessionDir = `${SESSION_DIR}${sessionId}/`;
      await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });

      // Ambil foto dengan timeout
      const capturePromise = this.cameraRef.current.takePhoto({
        qualityPrioritization: 'balanced', // speed=cepat, quality=bagus, balanced=tengah
        flash: options.flash ?? 'off',
        skipMetadata: true,                // Hemat ~20% ukuran file
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('CAPTURE_TIMEOUT')), CAPTURE_TIMEOUT_MS)
      );

      const photo = await Promise.race([capturePromise, timeoutPromise]);
      const rawPath = `${sessionDir}raw_${photoIndex}.jpg`;

      // Move dari temp path VisionCamera ke session dir kita
      await FileSystem.moveAsync({ from: `file://${photo.path}`, to: rawPath });

      const fileInfo = await FileSystem.getInfoAsync(rawPath, { size: true });
      const durationMs = Date.now() - startTime;

      // Update diagnostics
      CameraDeviceManager.recordCapture(durationMs);

      useAppStore.getState().setCameraStatus('ready');

      return {
        success: true,
        filePath: rawPath,
        width: photo.width,
        height: photo.height,
        fileSize: (fileInfo as { size?: number }).size,
        capturedAt: new Date().toISOString(),
        durationMs,
      };

    } catch (error) {
      const msg  = error instanceof Error ? error.message : String(error);
      const code = this.mapError(msg);

      CameraDeviceManager.recordError(msg);
      useAppStore.getState().setCameraStatus(code === 'HARDWARE_ERROR' ? 'error' : 'ready');

      return { success: false, error: msg, errorCode: code };

    } finally {
      this.captureInProgress = false;
    }
  }

  // ── Cleanup ───────────────────────────────────────────────

  /**
   * Hapus semua file dalam session dir.
   * Dipanggil setelah compositing selesai.
   */
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(`${SESSION_DIR}${sessionId}/`, { idempotent: true });
    } catch { /* ignore */ }
  }

  /**
   * Release camera (dipanggil saat CameraScreen unmount).
   * Penting: mencegah memory leak di Android.
   */
  releaseCameraRef(): void {
    this.cameraRef = null;
    useAppStore.getState().setCameraStatus(
      CameraDeviceManager.isReady() ? 'ready' : 'disconnected'
    );
  }

  /** Cleanup total (dipanggil saat app background lama) */
  async releaseAll(): Promise<void> {
    this.cameraRef = null;
    CameraDeviceManager.stop();
    this.isInitialized = false;
  }

  // ── Status & Info ─────────────────────────────────────────

  getCurrentDevice(): CameraDevice | null {
    return CameraDeviceManager.getCurrentDevice();
  }

  isReady(): boolean {
    return CameraDeviceManager.isReady() && !this.captureInProgress;
  }

  getDiagnostics() {
    return CameraDeviceManager.getDiagnostics();
  }

  async forceReconnect(): Promise<void> {
    await CameraDeviceManager.forceReconnect();
  }

  getAvailableDevices(): CameraDevice[] {
    return CameraDeviceManager.getAvailableDevices();
  }

  async selectDevice(deviceId: string): Promise<boolean> {
    return CameraDeviceManager.selectDevice(deviceId);
  }

  // ── Private helpers ───────────────────────────────────────

  private async loadVC() {
    try {
      return await import('react-native-vision-camera');
    } catch {
      return null;
    }
  }

  private mapError(msg: string): CaptureErrorCode {
    if (msg.includes('CAPTURE_TIMEOUT'))     return 'CAPTURE_TIMEOUT';
    if (msg.includes('permission'))           return 'PERMISSION_DENIED';
    if (msg.includes('disk') || msg.includes('ENOSPC')) return 'DISK_FULL';
    if (msg.includes('hardware') || msg.includes('camera')) return 'HARDWARE_ERROR';
    return 'UNKNOWN';
  }
}

export const WebcamService = new WebcamServiceClass();
