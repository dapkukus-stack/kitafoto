/**
 * AppInitializer
 * Boot sequence KitaFoto — dijalankan sekali saat startup
 * Target: selesai < 2 detik
 *
 * v2: + ErrorBoundary, DiagnosticsService, PerformanceMonitor, DebugOverlay
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { db } from '@database/DatabaseService';
import { AudioService } from '@services/audio/AudioService';
import { StorageManager }      from '@services/storage/StorageManager';
import { UploadQueue }          from '@services/storage/UploadQueue';
import { MemoryCleanupService } from '@services/storage/MemoryCleanupService';
import { PrintService }         from '@services/print/PrintService';
import { PrintQueue }           from '@services/print/PrintQueue';
import { WebcamService }        from '@services/camera/WebcamService';
import { DiagnosticsService }   from '@services/diagnostics/DiagnosticsService';
import { PerformanceMonitor }   from '@services/diagnostics/PerformanceMonitor';
import { EventRepository } from '@database/repositories/EventRepository';
import { PhotoRepository } from '@database/repositories/PhotoRepository';
import { useAppStore } from '@store/useAppStore';
import { useEventStore } from '@store/useEventStore';
import { Colors } from '@constants/colors';
import { AppNavigator } from '@navigation/AppNavigator';
import { ErrorBoundary } from '@components/common/ErrorBoundary';
import { DebugOverlay } from '@components/common/DebugOverlay';

// Jaga splash screen tetap tampil saat boot
SplashScreen.preventAutoHideAsync();

async function loadFonts(): Promise<void> {
  await Font.loadAsync({
    'Nunito-Regular': require('../../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-SemiBold': require('../../assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Bold': require('../../assets/fonts/Nunito-Bold.ttf'),
    'Nunito-ExtraBold': require('../../assets/fonts/Nunito-ExtraBold.ttf'),
    'Nunito-Black': require('../../assets/fonts/Nunito-Black.ttf'),
  });
}

// ── Debug overlay activation: tap version label 10x ──────────
const DEBUG_TAP_COUNT    = 10;
const DEBUG_TAP_TIMEOUT  = 4000; // ms

export const AppInitializer: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);

  // Debug overlay tap counter
  const [debugTaps, setDebugTaps] = useState(0);
  const debugTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setInitialized,
    setAudioMuted,
    setAmbienceEnabled,
    setKioskEnabled,
  } = useAppStore();

  const { setActiveEvent, setTodayPhotoCount } = useEventStore();

  useEffect(() => {
    bootApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bootApp = async () => {
    try {
      // Step 1: Load fonts (blocking — diperlukan sebelum render UI)
      await loadFonts();

      // Step 2: Init database
      await db.initialize();

      // Step 2.5: Init diagnostics (depends on DB)
      await DiagnosticsService.initialize();
      DiagnosticsService.info('system', 'Boot sequence started');

      // Step 3: Load settings dari DB
      const [
        audioMuted,
        ambienceEnabled,
        kioskEnabled,
      ] = await Promise.all([
        db.getSetting('audio_muted'),
        db.getSetting('ambience_enabled'),
        db.getSetting('kiosk_enabled'),
      ]);

      setAudioMuted(audioMuted === 'true');
      setAmbienceEnabled(ambienceEnabled !== 'false'); // default true
      setKioskEnabled(kioskEnabled !== 'false');       // default true

      // Step 4: Load event aktif & frame (parallel dengan audio + services init)
      const [activeEvent, todayCount] = await Promise.all([
        EventRepository.getActive(),
        PhotoRepository.getTodayCount(),
        // Audio init background — non-blocking
        AudioService.initialize().catch(e => {
          DiagnosticsService.warn('system', 'Audio init failed', { error: String(e) });
        }),
        // StorageManager init (load semua provider dari DB)
        StorageManager.initialize().catch(e => {
          DiagnosticsService.warn('system', 'StorageManager init failed', { error: String(e) });
        }),
        // Printer service init
        PrintService.initialize().catch(e => {
          DiagnosticsService.warn('system', 'PrintService init failed', { error: String(e) });
        }),
        // Webcam init (detect USB camera)
        WebcamService.initialize().catch(e => {
          DiagnosticsService.warn('system', 'WebcamService init failed', { error: String(e) });
        }),
      ]);

      if (activeEvent) {
        setActiveEvent(activeEvent);
        // Load frames di background
        const { FrameRepository } = await import('@database/repositories/EventRepository');
        const frames = await FrameRepository.getByEvent(activeEvent.id);
        useEventStore.getState().setFrames(frames);
      }

      setTodayPhotoCount(todayCount);

      // Step 5: Start background services
      UploadQueue.start();
      PrintQueue.start();
      MemoryCleanupService.start();
      PerformanceMonitor.start();

      // Step 6: Play ambience jika enabled
      if (ambienceEnabled !== 'false' && audioMuted !== 'true') {
        AudioService.playAmbience();
      }

      setInitialized(true);
      setIsReady(true);

      // Sembunyikan splash screen
      await SplashScreen.hideAsync();

      DiagnosticsService.info('system', 'Boot sequence complete', {
        activeEvent: activeEvent?.name ?? 'none',
        todayCount,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat startup';
      DiagnosticsService.fatal('system', `Boot failed: ${msg}`);
      setError(msg);
      await SplashScreen.hideAsync();
    }
  };

  // ── Debug overlay activation ───────────────────────────────

  const handleDebugTap = useCallback(() => {
    setDebugTaps(prev => {
      const next = prev + 1;
      if (next >= DEBUG_TAP_COUNT) {
        setDebugVisible(v => !v); // Toggle
        return 0;
      }
      return next;
    });

    // Reset counter after timeout
    if (debugTimerRef.current) clearTimeout(debugTimerRef.current);
    debugTimerRef.current = setTimeout(() => setDebugTaps(0), DEBUG_TAP_TIMEOUT);
  }, []);

  // ── Render: Error state ────────────────────────────────────

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😢</Text>
        <Text style={styles.errorTitle}>Oops! Ada masalah</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <Text style={styles.errorHint}>Coba restart aplikasi</Text>
      </View>
    );
  }

  // ── Render: Loading state ──────────────────────────────────

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo} onPress={handleDebugTap}>KitaFoto</Text>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Memuat aplikasi...</Text>
      </View>
    );
  }

  // ── Render: App ready ──────────────────────────────────────

  return (
    <ErrorBoundary>
      <AppNavigator />
      <DebugOverlay
        visible={debugVisible}
        onClose={() => setDebugVisible(false)}
      />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  errorEmoji: {
    fontSize: 64,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  errorMsg: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
