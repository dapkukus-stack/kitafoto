/**
 * CameraDeviceManager
 * ─────────────────────────────────────────────────────────────
 * Mengelola deteksi, pemilihan, dan monitoring device kamera.
 *
 * Responsibilities:
 *   - Scan semua camera device yang tersedia (USB + built-in)
 *   - Pilih USB webcam jika ada, fallback ke built-in
 *   - Deteksi USB connect/disconnect (polling + event)
 *   - Hot-swap: ganti device tanpa restart app
 *   - Publish state ke useAppStore
 *
 * Catatan USB OTG di Android:
 *   VisionCamera v4 mendukung "external" camera dari USB via
 *   Android Camera2 API. USB UVC webcam yang support Android
 *   (sebagian besar webcam modern) akan muncul sebagai
 *   CameraDevice dengan position = 'external'.
 *   Tidak butuh custom native module tambahan.
 */

import { useAppStore } from '@store/useAppStore';
import type {
  CameraDevice,
  CameraSourceType,
  CameraDiagnostics,
  CameraConfig,
} from '@types/camera.types';
import { DEFAULT_CAMERA_CONFIG } from '@types/camera.types';

// VisionCamera — import akan resolve saat runtime di device nyata
// Di environment ini kita buat abstraction layer yang bisa di-mock
let VisionCameraModule: typeof import('react-native-vision-camera') | null = null;

async function loadVisionCamera() {
  if (VisionCameraModule) return VisionCameraModule;
  try {
    VisionCameraModule = await import('react-native-vision-camera');
    return VisionCameraModule;
  } catch {
    console.warn('[CameraDeviceManager] VisionCamera tidak tersedia — pakai mock mode');
    return null;
  }
}

// ── Polling interval untuk cek perubahan device ──────────────
const DEVICE_POLL_INTERVAL_MS = 3000;
const RECONNECT_POLL_INTERVAL_MS = 1500;

class CameraDeviceManagerClass {
  private currentDevice: CameraDevice | null = null;
  private availableDevices: CameraDevice[] = [];
  private config: CameraConfig = { ...DEFAULT_CAMERA_CONFIG };
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private reconnectIntervalId: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private diagnostics: CameraDiagnostics = this.emptyDiagnostics();
  private isStarted = false;

  // ── Listeners ─────────────────────────────────────────────

  private deviceListeners = new Set<(device: CameraDevice | null) => void>();

  onDeviceChange(fn: (device: CameraDevice | null) => void): () => void {
    this.deviceListeners.add(fn);
    return () => this.deviceListeners.delete(fn);
  }

  private notifyDeviceChange(device: CameraDevice | null): void {
    this.deviceListeners.forEach(fn => {
      try { fn(device); } catch { /* ignore */ }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────

  async start(config?: Partial<CameraConfig>): Promise<void> {
    if (this.isStarted) return;
    if (config) this.config = { ...this.config, ...config };

    this.isStarted = true;
    await this.scanDevices();

    // Poll periodik untuk deteksi USB connect/disconnect
    this.pollIntervalId = setInterval(
      () => this.pollDeviceChanges(),
      DEVICE_POLL_INTERVAL_MS
    );

    console.log('[CameraDeviceManager] Started ✓', this.currentDevice?.name ?? 'no device');
  }

  stop(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.stopReconnect();
    this.isStarted = false;
  }

  // ── Device Scanning ───────────────────────────────────────

  async scanDevices(): Promise<CameraDevice[]> {
    const vc = await loadVisionCamera();
    if (!vc) {
      // Mock mode (dev environment / no native)
      this.availableDevices = [];
      this.selectBestDevice();
      return [];
    }

    try {
      const rawDevices = await vc.Camera.getAvailableCameraDevices();

      this.availableDevices = rawDevices.map(d => ({
        id: d.id,
        name: d.name ?? d.id,
        // Kamera USB OTG muncul dengan position 'external' di VisionCamera v4
        sourceType: this.mapPosition(d.position),
        isUSBDevice: d.position === 'external',
        position: d.position as CameraDevice['position'],
        maxWidth:  d.formats[0]?.videoWidth  ?? 1920,
        maxHeight: d.formats[0]?.videoHeight ?? 1080,
        isActive: false,
      }));

      this.selectBestDevice();
    } catch (error) {
      console.error('[CameraDeviceManager] scanDevices error:', error);
      this.availableDevices = [];
      this.selectBestDevice();
    }

    return this.availableDevices;
  }

  private selectBestDevice(): void {
    const prev = this.currentDevice?.id;

    if (this.config.preferUSB) {
      // 1. Utamakan USB external webcam
      const usbDevice = this.availableDevices.find(d => d.isUSBDevice);
      if (usbDevice) {
        this.setActiveDevice(usbDevice, 'usb_webcam');
        if (prev !== usbDevice.id) this.onUSBConnected(usbDevice);
        return;
      }
    }

    if (this.config.fallbackToBuiltin) {
      // 2. Fallback ke kamera depan tablet
      const frontCamera = this.availableDevices.find(d => d.position === 'front');
      const anyCamera   = this.availableDevices[0];
      const fallback    = frontCamera ?? anyCamera ?? null;

      if (fallback) {
        this.setActiveDevice(fallback, 'front_camera');
        if (prev !== fallback.id) this.onFallbackActivated(fallback);
        return;
      }
    }

    // 3. Tidak ada kamera sama sekali
    this.currentDevice = null;
    useAppStore.getState().setCameraStatus('disconnected');
    this.notifyDeviceChange(null);
  }

  private setActiveDevice(device: CameraDevice, sourceType: CameraSourceType): void {
    // Mark lama sebagai tidak aktif
    this.availableDevices.forEach(d => (d.isActive = false));
    // Mark yang baru sebagai aktif
    device.isActive  = true;
    device.sourceType = sourceType;
    this.currentDevice = device;

    useAppStore.getState().setCameraStatus('ready');
    this.notifyDeviceChange(device);

    // Reset reconnect jika berhasil
    this.reconnectAttempts = 0;
    this.stopReconnect();

    // Update diagnostics
    this.diagnostics.deviceId   = device.id;
    this.diagnostics.deviceName = device.name;
    this.diagnostics.sourceType = sourceType;
    this.diagnostics.isUSBConnected = device.isUSBDevice;
  }

  // ── Polling ───────────────────────────────────────────────

  private async pollDeviceChanges(): Promise<void> {
    const prevIds = new Set(this.availableDevices.map(d => d.id));
    const prevActiveId = this.currentDevice?.id;

    await this.scanDevices();

    const newIds = new Set(this.availableDevices.map(d => d.id));

    // Deteksi disconnect
    if (prevActiveId && !newIds.has(prevActiveId)) {
      console.warn('[CameraDeviceManager] Active device disconnected!', prevActiveId);
      this.onUSBDisconnected();
    }

    // Deteksi USB baru tancap
    for (const id of newIds) {
      if (!prevIds.has(id)) {
        const newDev = this.availableDevices.find(d => d.id === id);
        if (newDev?.isUSBDevice) {
          console.log('[CameraDeviceManager] New USB device detected:', newDev.name);
        }
      }
    }
  }

  // ── USB Events ─────────────────────────────────────────────

  private onUSBConnected(device: CameraDevice): void {
    console.log(`[CameraDeviceManager] USB webcam connected: ${device.name}`);
    this.stopReconnect();
  }

  private onUSBDisconnected(): void {
    useAppStore.getState().setCameraStatus('disconnected');
    this.notifyDeviceChange(null);
    this.startReconnect();
  }

  private onFallbackActivated(device: CameraDevice): void {
    console.warn(`[CameraDeviceManager] Using fallback camera: ${device.name}`);
    useAppStore.getState().setCameraStatus('fallback');
  }

  // ── Auto Reconnect ─────────────────────────────────────────

  private startReconnect(): void {
    if (this.reconnectIntervalId) return;

    this.reconnectIntervalId = setInterval(async () => {
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        console.warn('[CameraDeviceManager] Max reconnect attempts reached — activating fallback');
        this.stopReconnect();

        // Activate fallback camera
        if (this.config.fallbackToBuiltin) {
          await this.scanDevices();
        } else {
          useAppStore.getState().setCameraStatus('error');
        }
        return;
      }

      this.reconnectAttempts++;
      console.log(`[CameraDeviceManager] Reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
      useAppStore.getState().setCameraStatus('connecting');
      await this.scanDevices();

    }, this.config.autoReconnectDelay);
  }

  private stopReconnect(): void {
    if (this.reconnectIntervalId) {
      clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
    this.reconnectAttempts = 0;
  }

  // ── Manual Controls ───────────────────────────────────────

  /** Force reconnect (dari tombol admin) */
  async forceReconnect(): Promise<void> {
    this.stopReconnect();
    useAppStore.getState().setCameraStatus('connecting');
    await this.scanDevices();
  }

  /** Pilih device tertentu secara manual (dari admin panel) */
  async selectDevice(deviceId: string): Promise<boolean> {
    const device = this.availableDevices.find(d => d.id === deviceId);
    if (!device) return false;
    this.setActiveDevice(device, device.isUSBDevice ? 'usb_webcam' : 'front_camera');
    return true;
  }

  // ── Getters ───────────────────────────────────────────────

  getCurrentDevice(): CameraDevice | null {
    return this.currentDevice;
  }

  getAvailableDevices(): CameraDevice[] {
    return [...this.availableDevices];
  }

  getDiagnostics(): CameraDiagnostics {
    return { ...this.diagnostics, checkedAt: new Date().toISOString() };
  }

  isReady(): boolean {
    return this.currentDevice !== null &&
      ['ready', 'fallback'].includes(useAppStore.getState().cameraStatus);
  }

  updateConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ── Diagnostics helpers ───────────────────────────────────

  recordCapture(durationMs: number): void {
    this.diagnostics.lastCaptureMs = durationMs;
    this.diagnostics.totalCapturesSession++;
  }

  recordError(error: string): void {
    this.diagnostics.errorCount++;
    this.diagnostics.lastError = error;
  }

  // ── Private helpers ───────────────────────────────────────

  private mapPosition(pos: string | undefined): CameraSourceType {
    if (pos === 'external') return 'usb_webcam';
    if (pos === 'front')    return 'front_camera';
    return 'back_camera';
  }

  private emptyDiagnostics(): CameraDiagnostics {
    return {
      deviceId: null,
      deviceName: null,
      sourceType: null,
      isUSBConnected: false,
      previewFPS: 0,
      lastCaptureMs: 0,
      totalCapturesSession: 0,
      errorCount: 0,
      lastError: null,
      memoryUsageMB: 0,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const CameraDeviceManager = new CameraDeviceManagerClass();
