/**
 * AppInitializer
 * Boot sequence KitaFoto — dijalankan sekali saat startup
 * Target: selesai < 2 detik
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { db } from '@database/DatabaseService';
import { AudioService } from '@services/audio/AudioService';
import { CloudinaryService } from '@services/cloud/CloudinaryService';
import { UploadQueue } from '@services/cloud/UploadQueue';
import { EventRepository } from '@database/repositories/EventRepository';
import { PhotoRepository } from '@database/repositories/PhotoRepository';
import { useAppStore } from '@store/useAppStore';
import { useEventStore } from '@store/useEventStore';
import { Colors } from '@constants/colors';
import { AppNavigator } from '@navigation/AppNavigator';

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

export const AppInitializer: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Step 4: Load event aktif & frame (parallel dengan audio init)
      const [activeEvent, todayCount] = await Promise.all([
        EventRepository.getActive(),
        PhotoRepository.getTodayCount(),
        // Audio init background — non-blocking
        AudioService.initialize().catch(e => console.warn('[Boot] Audio init failed:', e)),
        // Cloudinary config reload
        CloudinaryService.initialize().catch(e => console.warn('[Boot] Cloudinary init failed:', e)),
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

      // Step 6: Play ambience jika enabled
      if (ambienceEnabled !== 'false' && audioMuted !== 'true') {
        AudioService.playAmbience();
      }

      setInitialized(true);
      setIsReady(true);

      // Sembunyikan splash screen
      await SplashScreen.hideAsync();

      console.log('[Boot] KitaFoto ready! ✓');

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat startup';
      console.error('[Boot] Error:', msg);
      setError(msg);
      await SplashScreen.hideAsync();
    }
  };

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

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>KitaFoto</Text>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Memuat aplikasi...</Text>
      </View>
    );
  }

  return <AppNavigator />;
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
