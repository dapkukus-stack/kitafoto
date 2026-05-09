/**
 * useAdminStore — State admin panel
 */

import { create } from 'zustand';
import type { KitaEvent } from '@types/event.types';

interface AdminState {
  // ── Auth ───────────────────────────────────────
  isAdminAuthenticated: boolean;
  setAdminAuthenticated: (v: boolean) => void;
  adminLoginError: string | null;
  setAdminLoginError: (msg: string | null) => void;

  // ── Admin tap gesture ──────────────────────────
  logoTapCount: number;
  incrementLogoTap: () => void;
  resetLogoTap: () => void;

  // ── Events list (admin view) ───────────────────
  events: KitaEvent[];
  setEvents: (events: KitaEvent[]) => void;

  // ── Loading states ─────────────────────────────
  isLoading: boolean;
  setLoading: (v: boolean) => void;

  // ── Feedback ───────────────────────────────────
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

export const useAdminStore = create<AdminState>()((set) => ({
  isAdminAuthenticated: false,
  setAdminAuthenticated: (v) => set({ isAdminAuthenticated: v }),
  adminLoginError: null,
  setAdminLoginError: (msg) => set({ adminLoginError: msg }),

  logoTapCount: 0,
  incrementLogoTap: () =>
    set((state) => ({ logoTapCount: state.logoTapCount + 1 })),
  resetLogoTap: () => set({ logoTapCount: 0 }),

  events: [],
  setEvents: (events) => set({ events }),

  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),

  successMessage: null,
  setSuccessMessage: (msg) => set({ successMessage: msg }),
  errorMessage: null,
  setErrorMessage: (msg) => set({ errorMessage: msg }),
}));
