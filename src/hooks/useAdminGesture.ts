/**
 * useAdminGesture
 * Deteksi tap logo N kali dalam waktu tertentu untuk buka admin panel
 */

import { useCallback, useRef } from 'react';
import { useAdminStore } from '@store/useAdminStore';
import { AppConfig } from '@constants/config';

interface UseAdminGestureOptions {
  onTriggered: () => void;
  tapCount?: number;
  timeoutMs?: number;
}

export function useAdminGesture({
  onTriggered,
  tapCount = AppConfig.adminLogoTapCount,
  timeoutMs = AppConfig.adminLogoTapTimeoutMs,
}: UseAdminGestureOptions) {
  const tapCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { incrementLogoTap, resetLogoTap } = useAdminStore();

  const handleTap = useCallback(() => {
    tapCountRef.current += 1;
    incrementLogoTap();

    // Reset timer setiap tap
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Jika sudah cukup tap → trigger
    if (tapCountRef.current >= tapCount) {
      tapCountRef.current = 0;
      resetLogoTap();
      if (timerRef.current) clearTimeout(timerRef.current);
      onTriggered();
      return;
    }

    // Timeout: reset counter jika tidak tap lagi
    timerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      resetLogoTap();
    }, timeoutMs);
  }, [tapCount, timeoutMs, onTriggered, incrementLogoTap, resetLogoTap]);

  return { handleTap };
}
