/**
 * ProcessingScreen
 * ─────────────────────────────────────────────────────────────
 * Tampilan saat foto diproses (composite + strip + save).
 * Processing berjalan di background, UI tetap smooth.
 *
 * Key principles:
 *   • Processing di useEffect terpisah, tidak block render
 *   • Progress callback dari pipeline → update bar halus
 *   • Mascot animasi ringan (Reanimated UI thread)
 *   • Timeout protection: jika processing > 10 detik → error state
 *   • Auto-navigate ke Preview saat selesai
 *
 * Memory: tidak ada state besar, hanya string paths + progress number
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { Spacing } from '@constants/dimensions';
import { Routes } from '@constants/routes';
import { Mascot } from '@components/common/Mascot';
import { useSessionStore } from '@store/useSessionStore';
import { useEventStore } from '@store/useEventStore';
import { PhotoCapturePipeline } from '@services/image/PhotoCapturePipeline';
import { FrameRepository } from '@database/repositories/EventRepository';
import type { PipelineProgress } from '@services/image/PhotoCapturePipeline';

// ── Processing timeout ────────────────────────────────────────
const PROCESSING_TIMEOUT_MS = 12_000;
// ── Auto-navigate ke Preview setelah selesai ─────────────────
const PREVIEW_DELAY_MS = 600;

// ── Stage labels ──────────────────────────────────────────────
const STAGE_LABELS: Record<PipelineProgress['stage'], string> = {
  compress:  'Memproses foto...',
  composite: 'Menggabungkan dengan frame...',
  strip:     'Membuat strip foto...',
  save:      'Menyimpan hasil...',
  cleanup:   'Hampir selesai...',
};

// ─────────────────────────────────────────────────────────────

export const ProcessingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    sessionId,
    frameId,
    capturedPhotos,
    layoutType,
    filterType,
    totalPhotos,
    processedPhotoPath,
  } = useSessionStore();
  const { activeEvent } = useEventStore();

  const [progress, setProgress]     = useState(0);
  const [stageLabel, setStageLabel] = useState('Memulai...');
  const [hasError, setHasError]     = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  const timeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  // ── Animations ─────────────────────────────────────────────
  const progressWidth  = useSharedValue(0);
  const spinRotation   = useSharedValue(0);
  const pulsScale      = useSharedValue(1);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  useEffect(() => {
    // Spinner berputar terus
    spinRotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse pada mascot
    pulsScale.value = withRepeat(
      withSequence(
        withSpring(1.08, { damping: 8 }),
        withSpring(1.0,  { damping: 8 })
      ),
      -1,
      true
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger processing ──────────────────────────────────────

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    startProcessing();

    // Timeout protection
    timeoutRef.current = setTimeout(() => {
      if (progress < 100) {
        setHasError(true);
        setErrorMsg('Pemrosesan terlalu lama — coba ambil foto ulang');
      }
    }, PROCESSING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startProcessing = useCallback(async () => {
    if (!sessionId || !frameId || !activeEvent || capturedPhotos.length === 0) {
      setHasError(true);
      setErrorMsg('Data sesi tidak lengkap');
      return;
    }

    try {
      // Ambil path frame dari DB
      const frame = await FrameRepository.getById(frameId);
      if (!frame) {
        setHasError(true);
        setErrorMsg('Frame tidak ditemukan');
        return;
      }

      const result = await PhotoCapturePipeline.run(
        {
          sessionId,
          eventId:        activeEvent.id,
          frameId:        frame.id,
          capturedPhotos,
          layoutType,
          filterType,
          photoCount:     totalPhotos,
          framePath:      frame.filePath,
        },
        (p: PipelineProgress) => {
          // Update progress dari pipeline callback
          setProgress(p.percent);
          setStageLabel(STAGE_LABELS[p.stage] ?? 'Memproses...');
          progressWidth.value = withTiming(p.percent, { duration: 300 });
        }
      );

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (result.success) {
        // Selesai — navigasi ke Preview setelah animasi bar penuh
        progressWidth.value = withTiming(100, { duration: 200 });
        setProgress(100);
        setStageLabel('Selesai! 🎉');

        setTimeout(() => {
          navigation.replace(Routes.Preview);
        }, PREVIEW_DELAY_MS);

      } else {
        setHasError(true);
        setErrorMsg(result.error ?? 'Pemrosesan gagal');
      }

    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setHasError(true);
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  }, [
    sessionId, frameId, activeEvent, capturedPhotos,
    layoutType, filterType, totalPhotos, navigation, progressWidth,
  ]);

  // ── Error: kembali ke home ─────────────────────────────────
  const handleReturnHome = useCallback(() => {
    navigation.replace(Routes.Home);
  }, [navigation]);

  // ── Animated mascot style ──────────────────────────────────
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulsScale.value }],
  }));

  // ── Error state ────────────────────────────────────────────
  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Mascot mood="thinking" size={130} />
        <Text style={styles.errorTitle}>Aduh, ada masalah 😓</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <Text
          style={styles.errorAction}
          onPress={handleReturnHome}
        >
          Ketuk untuk kembali ke halaman utama
        </Text>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Background subtle bubbles */}
      <View style={styles.bgDecor} />

      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Mascot + spinner */}
        <View style={styles.mascotArea}>
          <Animated.View style={mascotStyle}>
            <Mascot mood="thinking" size={160} />
          </Animated.View>

          {/* Spinner overlay kecil di pojok mascot */}
          <Animated.View style={[styles.spinner, spinStyle]}>
            <Text style={styles.spinnerIcon}>⚙️</Text>
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.title}
        >
          Lagi diproses...
        </Animated.Text>

        {/* Stage label */}
        <Animated.Text
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.stageLabel}
        >
          {stageLabel}
        </Animated.Text>

        {/* Progress bar */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.progressContainer}
        >
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </Animated.View>

        {/* Fun tip */}
        <Animated.Text
          entering={FadeInDown.delay(600).duration(400)}
          style={styles.tipText}
        >
          📸 Foto kamu sedang diracik jadi keren...
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bgDecor: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.primaryLight,
    opacity: 0.4,
    top: '10%',
    alignSelf: 'center',
  },

  content: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },

  // ── Mascot ───────────────────────────────────────────────
  mascotArea: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  spinner: {
    position: 'absolute',
    bottom: 0,
    right: -10,
  },
  spinnerIcon: {
    fontSize: 32,
  },

  // ── Text ─────────────────────────────────────────────────
  title: {
    ...UserTypography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stageLabel: {
    ...UserTypography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    minHeight: 30,
  },
  tipText: {
    ...UserTypography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },

  // ── Progress bar ─────────────────────────────────────────
  progressContainer: {
    width: '80%',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    // Shimmer effect lewat gradient nanti
  },
  progressText: {
    ...UserTypography.label,
    color: Colors.primaryDark,
    fontFamily: 'Nunito-Bold',
  },

  // ── Error state ───────────────────────────────────────────
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
  errorMsg: {
    ...UserTypography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  errorAction: {
    ...UserTypography.body,
    color: Colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
