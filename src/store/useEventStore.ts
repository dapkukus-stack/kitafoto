/**
 * useEventStore — State event aktif & frame
 */

import { create } from 'zustand';
import type { KitaEvent, KitaFrame } from '@kitafoto-types/event.types';

interface EventState {
  // ── Active event ───────────────────────────────
  activeEvent: KitaEvent | null;
  setActiveEvent: (event: KitaEvent | null) => void;

  // ── Frames ─────────────────────────────────────
  frames: KitaFrame[];
  setFrames: (frames: KitaFrame[]) => void;
  selectedFrame: KitaFrame | null;
  setSelectedFrame: (frame: KitaFrame | null) => void;

  // ── Loading ────────────────────────────────────
  isLoadingFrames: boolean;
  setLoadingFrames: (v: boolean) => void;

  // ── Photo count today ──────────────────────────
  todayPhotoCount: number;
  setTodayPhotoCount: (n: number) => void;
  incrementTodayCount: () => void;
}

export const useEventStore = create<EventState>()((set) => ({
  activeEvent: null,
  setActiveEvent: (event) => set({ activeEvent: event }),

  frames: [],
  setFrames: (frames) => set({ frames }),
  selectedFrame: null,
  setSelectedFrame: (frame) => set({ selectedFrame: frame }),

  isLoadingFrames: false,
  setLoadingFrames: (v) => set({ isLoadingFrames: v }),

  todayPhotoCount: 0,
  setTodayPhotoCount: (n) => set({ todayPhotoCount: n }),
  incrementTodayCount: () =>
    set((state) => ({ todayPhotoCount: state.todayPhotoCount + 1 })),
}));
