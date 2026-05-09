/**
 * useNetworkStatus
 * Monitor koneksi internet secara real-time
 * Trigger upload queue saat kembali online
 */

import { useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { useAppStore } from '@store/useAppStore';
import { AppConfig } from '@constants/config';

export function useNetworkStatus() {
  const { isOnline, setOnline } = useAppStore();
  const wasOfflineRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const online = !!(state.isConnected && state.isInternetReachable);

      const previouslyOffline = wasOfflineRef.current;
      wasOfflineRef.current = !online;

      setOnline(online);

      // Jika baru kembali online → log (service lain subscribe ke store)
      if (online && previouslyOffline) {
        console.log('[Network] Internet kembali! Trigger upload queue.');
      }
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    // Check sekali saat mount
    checkNetwork();

    // Poll berkala
    intervalRef.current = setInterval(checkNetwork, AppConfig.networkCheckIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline };
}
