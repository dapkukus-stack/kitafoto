/**
 * useAppStore — Global app state
 * Status webcam, printer, internet, kiosk, audio
 */

import { create } from 'zustand';
import type { CameraStatus } from '@kitafoto-types/camera.types';

interface AppState {
  // ── Init ───────────────────────────────────────
  isInitialized: boolean;
  setInitialized: (v: boolean) => void;

  // ── Camera ─────────────────────────────────────
  cameraStatus: CameraStatus;
  setCameraStatus: (s: CameraStatus) => void;

  // ── Printer ────────────────────────────────────
  printerConnected: boolean;
  setPrinterConnected: (v: boolean) => void;

  // ── Network ────────────────────────────────────
  isOnline: boolean;
  setOnline: (v: boolean) => void;

  // ── Audio ──────────────────────────────────────
  audioMuted: boolean;
  setAudioMuted: (v: boolean) => void;
  ambienceEnabled: boolean;
  setAmbienceEnabled: (v: boolean) => void;

  // ── Kiosk ──────────────────────────────────────
  kioskEnabled: boolean;
  setKioskEnabled: (v: boolean) => void;

  // ── Storage warning ────────────────────────────
  storageWarning: boolean;
  setStorageWarning: (v: boolean) => void;

  // ── Print / Upload badge counts ────────────────
  pendingPrintCount: number;
  setPendingPrintCount: (n: number) => void;
  pendingUploadCount: number;
  setPendingUploadCount: (n: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isInitialized: false,
  setInitialized: (v) => set({ isInitialized: v }),

  cameraStatus: 'disconnected',
  setCameraStatus: (s) => set({ cameraStatus: s }),

  printerConnected: false,
  setPrinterConnected: (v) => set({ printerConnected: v }),

  isOnline: true,
  setOnline: (v) => set({ isOnline: v }),

  audioMuted: false,
  setAudioMuted: (v) => set({ audioMuted: v }),
  ambienceEnabled: true,
  setAmbienceEnabled: (v) => set({ ambienceEnabled: v }),

  kioskEnabled: true,
  setKioskEnabled: (v) => set({ kioskEnabled: v }),

  storageWarning: false,
  setStorageWarning: (v) => set({ storageWarning: v }),

  pendingPrintCount: 0,
  setPendingPrintCount: (n) => set({ pendingPrintCount: n }),
  pendingUploadCount: 0,
  setPendingUploadCount: (n) => set({ pendingUploadCount: n }),
}));
