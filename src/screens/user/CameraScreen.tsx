/**
 * CameraScreen — Live preview + capture
 * ─────────────────────────────────────────────────────────────
 * Memory-safe design:
 *   • Camera hanya aktif saat screen ini mounted
 *   • Camera ref di-release saat unmount
 *   • Tidak ada state besar di React state (pakai refs)
 *   • Flash overlay via Animated (UI thread, tidak block JS)
 *   • Tidak re-render saat capture berlangsung
 *
 * Flow:
 *   CountdownScreen → replace → CameraScreen (capture) →
 *   jika masih ada foto → replace → CountdownScreen
 *   jika selesai semua → replace → ProcessingScreen
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  AppState,
  type AppStateStatus,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { Routes } from '@constants/routes';
import { useSessionStore } from '@store/useSessionStore';
import { useAppStore } from '@store/useAppStore';
import { WebcamService } from '@services/camera/WebcamService';
import { AudioService } from '@services/audio/AudioService';
import { AppConfig } from '@constants/config';
import { Mascot } from '@components/common/Mascot';
import type { VisionCameraRef } from '@services/camera/WebcamService';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Timeout tunggu kamera siap sebelum auto-capture ──────────
const CAMERA_READY_TIMEOUT_MS = 3000;
// ── Delay setelah capture sebelum navigasi (tampilkan flash) ──
const POST_CAPTURE_DELAY_MS   = 400;

export const CameraScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const {
    sessionId,
    currentPhotoIndex,
    totalPhotos,
    addCapturedPhoto,
    frameId,
  } = useSessionStore();

  const { cameraStatus } = useAppStore();

  // Camera ref — tidak masuk React state, tidak trigger re-render
  const cameraRef = useRef<VisionCameraRef>(null);
  const hasCapturedRef = useRef(false);   // Prevent double-capture
  const appStateRef    = useRef<AppStateStatus>('active');

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);

  // Flash overlay animation
  const flashOpacity = useSharedValue(0);

  // ── Lifecycle ──────────────────────────────────────────────

  useEffect(() => {
    hasCapturedRef.current = false;

    // Register ref ke WebcamService
    WebcamService.setCameraRef(cameraRef);

    // Tunggu kamera ready lalu capture
    const readyTimer = setTimeout(() => {
      setIsCameraReady(true);
    }, 800); // Beri waktu VisionCamera initialize

    // Monitor AppState — pause kamera saat app background
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      clearTimeout(readyTimer);
      sub.remove();
      // Release ref saat unmount — PENTING cegah memory leak
      WebcamService.releaseCameraRef();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-capture saat kamera ready
  useEffect(() => {
    if (isCameraReady && !hasCapturedRef.current) {
      triggerCapture();
    }
  }, [isCameraReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAppState = useCallback((state: AppStateStatus) => {
    appStateRef.current = state;
  }, []);

  // ── Capture ───────────────────────────────────────────────

  const triggerCapture = useCallback(async () => {
    if (hasCapturedRef.current || !sessionId) return;
    if (appStateRef.current !== 'active') return;

    hasCapturedRef.current = true;

    // Flash effect — berjalan di UI thread via Reanimated
    flashOpacity.value = withSequence(
      withTiming(1,   { duration: 60 }),
      withTiming(0.6, { duration: 100 }),
      withTiming(0,   { duration: 200 })
    );

    // Suara shutter
    runOnJS(playShutter)();

    const result = await WebcamService.capturePhoto(
      sessionId,
      currentPhotoIndex
    );

    if (!result.success || !result.filePath) {
      setErrorMsg(result.error ?? 'Gagal mengambil foto');
      hasCapturedRef.current = false;
      return;
    }

    // Tambah ke session store
    addCapturedPhoto({
      index:      currentPhotoIndex,
      filePath:   result.filePath,
      capturedAt: result.capturedAt ?? new Date().toISOString(),
    });

    // Navigasi setelah delay singkat (biarkan flash selesai)
    setTimeout(() => {
      runOnJS(navigateNext)(currentPhotoIndex + 1, totalPhotos);
    }, POST_CAPTURE_DELAY_MS);

  }, [sessionId, currentPhotoIndex, totalPhotos, addCapturedPhoto, flashOpacity]);

  // Harus dipanggil via runOnJS karena dipakai dalam Animated callback
  const playShutter = () => {
    AudioService.playShutter();
  };

  const navigateNext = useCallback((nextIndex: number, total: number) => {
    if (nextIndex < total) {
      // Masih ada foto lagi → kembali ke countdown
      navigation.replace(Routes.Countdown);
    } else {
      // Semua foto selesai → ke processing
      navigation.replace(Routes.Processing);
    }
  }, [navigation]);

  // ── Retry saat error ───────────────────────────────────────

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    hasCapturedRef.current = false;
    // Re-trigger capture
    setTimeout(triggerCapture, 300);
  }, [triggerCapture]);

  // ── Animated styles ───────────────────────────────────────

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // ── Camera tidak ready ─────────────────────────────────────

  const currentDevice = WebcamService.getCurrentDevice();
  const isConnected   = !!currentDevice;

  if (!isConnected) {
    return (
      <View style={styles.errorContainer}>
        <Mascot mood="thinking" size={120} />
        <Text style={styles.errorTitle}>📷 Kamera tidak terhubung</Text>
        <Text style={styles.errorSub}>
          Tancapkan webcam USB dan coba lagi
        </Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Camera Preview — VisionCamera */}
      <CameraPreview
        cameraRef={cameraRef}
        device={currentDevice}
        isActive={isCameraReady && appStateRef.current === 'active'}
      />

      {/* Photo counter overlay */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>
          📷 {currentPhotoIndex + 1} / {totalPhotos}
        </Text>
      </View>

      {/* Flash white overlay */}
      <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />

      {/* Error state */}
      {errorMsg && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorOverlayText}>⚠️ {errorMsg}</Text>
          <Text style={styles.errorRetryText} onPress={handleRetry}>
            Ketuk untuk coba lagi
          </Text>
        </View>
      )}
    </View>
  );
};

// ── CameraPreview component (isolate VisionCamera) ────────────
// Dipisah agar Tree-shakeable dan mudah di-mock saat testing

interface CameraPreviewProps {
  cameraRef: React.RefObject<VisionCameraRef>;
  device: import('@types/camera.types').CameraDevice;
  isActive: boolean;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({
  cameraRef,
  device,
  isActive,
}) => {
  // Lazy-load VisionCamera untuk hemat startup time
  const [Camera, setCamera] = React.useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('react-native-vision-camera')
      .then(vc => setCamera(() => vc.Camera))
      .catch(() => setCamera(null));
  }, []);

  if (!Camera) {
    // Fallback placeholder saat modul loading / tidak tersedia
    return (
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderEmoji}>📷</Text>
        <Text style={styles.placeholderText}>Kamera menyala...</Text>
      </View>
    );
  }

  return (
    <Camera
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      photo={true}
      video={false}
      audio={false}
      // Hemat CPU: preview lebih rendah dari capture
      fps={AppConfig.captureQuality > 0.9 ? 30 : 24}
      // Disable fitur yang tidak perlu
      enableZoomGesture={false}
      enableHighQualityPhotos={true}
      // Android specific: mencegah restart saat screen rotate
      orientation="landscape"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Camera error states ──────────────────────────────────
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorTitle: {
    ...UserTypography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  errorSub: {
    ...UserTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ── Overlays ─────────────────────────────────────────────
  counterBadge: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  counterText: {
    ...UserTypography.bodyLarge,
    color: '#fff',
    fontFamily: 'Nunito-Bold',
  },

  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 10,
  },

  errorOverlay: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(239,83,80,0.9)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  errorOverlayText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
  },
  errorRetryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    textDecorationLine: 'underline',
  },

  // ── Camera placeholder ────────────────────────────────────
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
});
