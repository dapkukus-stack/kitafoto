/**
 * CameraScreen — Responsive & Orientation-aware v2
 * ─────────────────────────────────────────────────────────────
 * Layout modes:
 *   Phone portrait    → fullscreen camera, counter badge atas
 *   Phone landscape   → fullscreen camera, counter badge kiri
 *   Tablet portrait   → fullscreen camera, counter badge atas
 *   Tablet landscape  → camera 70% lebar + panel kontrol kanan 30%
 *
 * Memory-safe:
 *   • cameraRef di useRef (bukan state)
 *   • hasCapturedRef guard — tidak mungkin double capture
 *   • Camera unmount = releaseCameraRef() → no memory leak
 *   • VisionCamera lazy-loaded — tidak block startup
 */

import React, {
  useEffect, useRef, useCallback, useState, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, AppState, type AppStateStatus,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, runOnJS,
} from 'react-native-reanimated';
import { useNavigation }    from '@react-navigation/native';
import { Colors }           from '@constants/colors';
import { Fonts }            from '@constants/typography';
import { Routes }           from '@constants/routes';
import { useSessionStore }  from '@store/useSessionStore';
import { useAppStore }      from '@store/useAppStore';
import { WebcamService }    from '@services/camera/WebcamService';
import { AudioService }     from '@services/audio/AudioService';
import { Mascot }           from '@components/common/Mascot';
import { useTokens, useResponsive } from '@responsive';
import type { VisionCameraRef } from '@services/camera/WebcamService';

const CAMERA_READY_DELAY_MS = 800;
const POST_CAPTURE_DELAY_MS = 400;

export const CameraScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    sessionId, currentPhotoIndex, totalPhotos, addCapturedPhoto,
  } = useSessionStore();
  const { cameraStatus } = useAppStore();
  const T  = useTokens();
  const rs = useResponsive();

  const cameraRef      = useRef<VisionCameraRef>(null);
  const hasCapturedRef = useRef(false);
  const appStateRef    = useRef<AppStateStatus>('active');

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);

  const flashOpacity = useSharedValue(0);
  const flashStyle   = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const isTabletLandscape = rs.isTablet && rs.isLandscape;

  useEffect(() => {
    hasCapturedRef.current = false;
    WebcamService.setCameraRef(cameraRef);

    const timer = setTimeout(() => setIsCameraReady(true), CAMERA_READY_DELAY_MS);
    const sub   = AppState.addEventListener('change', (s: AppStateStatus) => {
      appStateRef.current = s;
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
      WebcamService.releaseCameraRef();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isCameraReady && !hasCapturedRef.current) triggerCapture();
  }, [isCameraReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const playShutter = useCallback(() => { AudioService.playShutter(); }, []);

  const navigateNext = useCallback((nextIdx: number, total: number) => {
    if (nextIdx < total) navigation.replace(Routes.Countdown);
    else navigation.replace(Routes.Processing);
  }, [navigation]);

  const triggerCapture = useCallback(async () => {
    if (hasCapturedRef.current || !sessionId) return;
    if (appStateRef.current !== 'active')      return;
    hasCapturedRef.current = true;

    flashOpacity.value = withSequence(
      withTiming(1,   { duration: 60  }),
      withTiming(0.5, { duration: 100 }),
      withTiming(0,   { duration: 200 }),
    );
    runOnJS(playShutter)();

    const result = await WebcamService.capturePhoto(sessionId, currentPhotoIndex);

    if (!result.success || !result.filePath) {
      setErrorMsg(result.error ?? 'Gagal mengambil foto');
      hasCapturedRef.current = false;
      return;
    }

    addCapturedPhoto({
      index:      currentPhotoIndex,
      filePath:   result.filePath,
      capturedAt: result.capturedAt ?? new Date().toISOString(),
    });

    setTimeout(() => {
      runOnJS(navigateNext)(currentPhotoIndex + 1, totalPhotos);
    }, POST_CAPTURE_DELAY_MS);
  }, [
    sessionId, currentPhotoIndex, totalPhotos, addCapturedPhoto,
    flashOpacity, playShutter, navigateNext,
  ]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    hasCapturedRef.current = false;
    setTimeout(triggerCapture, 300);
  }, [triggerCapture]);

  const currentDevice = WebcamService.getCurrentDevice();
  const styles        = makeStyles(T, isTabletLandscape);

  // ── No camera ────────────────────────────────────────────────
  if (!currentDevice) {
    return (
      <View style={styles.errorFull}>
        <Mascot mood="thinking" size={T.mascot.placeholder} />
        <Text style={styles.errorTitle}>📷 Kamera tidak terhubung</Text>
        <Text style={styles.errorSub}>Tancapkan webcam USB dan coba lagi</Text>
      </View>
    );
  }

  // ── Tablet landscape: split layout ───────────────────────────
  if (isTabletLandscape) {
    return (
      <View style={styles.splitRoot}>
        {/* Camera area 70% */}
        <View style={styles.splitCamera}>
          <CameraPreview
            cameraRef={cameraRef}
            device={currentDevice}
            isActive={isCameraReady && appStateRef.current === 'active'}
          />
          <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
            pointerEvents="none" />
        </View>

        {/* Control panel 30% */}
        <View style={styles.splitPanel}>
          <Text style={styles.panelCounter}>
            📷 {currentPhotoIndex + 1} / {totalPhotos}
          </Text>
          <Mascot mood="countdown" size={T.mascot.corner} />
          {errorMsg && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorOverlayText}>⚠️ {errorMsg}</Text>
              <Text style={styles.errorRetryText} onPress={handleRetry}>
                Coba lagi
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Fullscreen (phone / tablet portrait) ─────────────────────
  return (
    <View style={styles.fullRoot}>
      <CameraPreview
        cameraRef={cameraRef}
        device={currentDevice}
        isActive={isCameraReady && appStateRef.current === 'active'}
      />
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>
          📷 {currentPhotoIndex + 1} / {totalPhotos}
        </Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
        pointerEvents="none" />
      {errorMsg && (
        <View style={styles.errorOverlayFull}>
          <Text style={styles.errorOverlayText}>⚠️ {errorMsg}</Text>
          <Text style={styles.errorRetryText} onPress={handleRetry}>
            Ketuk untuk coba lagi
          </Text>
        </View>
      )}
    </View>
  );
};

// ── CameraPreview — lazy-loads VisionCamera ───────────────────

interface CameraPreviewProps {
  cameraRef: React.RefObject<VisionCameraRef>;
  device:    import('@types/camera.types').CameraDevice;
  isActive:  boolean;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ cameraRef, device, isActive }) => {
  const [Camera, setCamera] = React.useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('react-native-vision-camera')
      .then(vc => setCamera(() => vc.Camera))
      .catch(() => setCamera(null));
  }, []);

  if (!Camera) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <View style={placeholderStyles.box}>
          <Text style={placeholderStyles.emoji}>📷</Text>
          <Text style={placeholderStyles.text}>Kamera menyala...</Text>
        </View>
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
      enableZoomGesture={false}
      enableHighQualityPhotos={true}
    />
  );
};

const placeholderStyles = StyleSheet.create({
  box:   { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', gap: 16 },
  emoji: { fontSize: 72 },
  text:  { color: '#fff', fontSize: 18, fontFamily: Fonts.bold },
});

// ── Style factory ─────────────────────────────────────────────

function makeStyles(T: ReturnType<typeof useTokens>, isTabletLandscape: boolean) {
  const sp = T.spacing;
  const ft = T.font;
  return StyleSheet.create({
    // Fullscreen
    fullRoot: { flex: 1, backgroundColor: '#000' },

    // Split (tablet landscape)
    splitRoot:   { flex: 1, flexDirection: 'row', backgroundColor: '#000' },
    splitCamera: { flex: 7 },
    splitPanel:  {
      flex: 3, backgroundColor: Colors.bgMain,
      justifyContent: 'center', alignItems: 'center',
      gap: sp.xl, paddingHorizontal: sp.lg,
    },
    panelCounter: {
      fontFamily: Fonts.bold, fontSize: ft.bodyLarge,
      color: Colors.textPrimary, textAlign: 'center',
    },

    // Counter badge (fullscreen mode)
    counterBadge: {
      position: 'absolute', top: sp.xl, alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: sp.lg, paddingVertical: sp.sm,
      borderRadius: 30,
    },
    counterText: { fontFamily: Fonts.bold, fontSize: ft.bodyLarge, color: '#fff' },

    // Flash overlay
    flash: { backgroundColor: '#fff', zIndex: 10 },

    // Error (no camera)
    errorFull: {
      flex: 1, backgroundColor: Colors.bgMain,
      justifyContent: 'center', alignItems: 'center',
      gap: sp.lg, padding: sp.xl,
    },
    errorTitle: { fontFamily: Fonts.extraBold, fontSize: ft.screenTitle, color: Colors.textPrimary, textAlign: 'center' },
    errorSub:   { fontFamily: Fonts.semiBold,  fontSize: ft.body,        color: Colors.textSecondary, textAlign: 'center' },

    // Error overlay (during capture)
    errorOverlayFull: {
      position: 'absolute', bottom: sp.xxl, alignSelf: 'center',
      backgroundColor: 'rgba(239,83,80,0.9)', padding: sp.lg,
      borderRadius: T.radius.lg, alignItems: 'center', gap: sp.sm,
    },
    errorOverlay: {
      backgroundColor: Colors.errorLight, padding: sp.md,
      borderRadius: T.radius.md, alignItems: 'center', gap: sp.sm,
    },
    errorOverlayText: { color: '#fff',         fontFamily: Fonts.bold,    fontSize: ft.body, textAlign: 'center' },
    errorRetryText:   { color: Colors.textLight, fontFamily: Fonts.regular, fontSize: ft.label, textDecorationLine: 'underline' },
  });
}
