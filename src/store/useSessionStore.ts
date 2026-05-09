/**
 * useSessionStore — State sesi foto aktif
 * Reset setiap kali sesi baru dimulai
 */

import { create } from 'zustand';
import type { CapturedPhoto } from '@types/photo.types';
import type { FilterType, LayoutType } from '@constants/config';

interface SessionState {
  // ── Session info ───────────────────────────────
  sessionId: string | null;
  frameId: string | null;
  layoutType: LayoutType;
  filterType: FilterType;

  // ── Capture state ──────────────────────────────
  capturedPhotos: CapturedPhoto[];
  currentPhotoIndex: number;      // Yang sedang difoto (0-based)
  totalPhotos: number;

  // ── Processing ─────────────────────────────────
  processedPhotoPath: string | null;  // Hasil composite
  printPhotoPath: string | null;      // Versi untuk print
  photoDbId: string | null;           // ID di SQLite setelah disimpan

  // ── Actions ────────────────────────────────────
  startSession: (params: {
    sessionId: string;
    frameId: string;
    layoutType: LayoutType;
    filterType: FilterType;
    totalPhotos: number;
  }) => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  setProcessedPaths: (processedPath: string, printPath: string) => void;
  setPhotoDbId: (id: string) => void;
  resetSession: () => void;
}

const initialState = {
  sessionId: null,
  frameId: null,
  layoutType: 'strip_vertical' as LayoutType,
  filterType: 'natural' as FilterType,
  capturedPhotos: [],
  currentPhotoIndex: 0,
  totalPhotos: 3,
  processedPhotoPath: null,
  printPhotoPath: null,
  photoDbId: null,
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...initialState,

  startSession: (params) =>
    set({
      ...initialState,
      sessionId: params.sessionId,
      frameId: params.frameId,
      layoutType: params.layoutType,
      filterType: params.filterType,
      totalPhotos: params.totalPhotos,
    }),

  addCapturedPhoto: (photo) =>
    set((state) => ({
      capturedPhotos: [...state.capturedPhotos, photo],
      currentPhotoIndex: state.currentPhotoIndex + 1,
    })),

  setProcessedPaths: (processedPath, printPath) =>
    set({ processedPhotoPath: processedPath, printPhotoPath: printPath }),

  setPhotoDbId: (id) => set({ photoDbId: id }),

  resetSession: () => set(initialState),
}));
