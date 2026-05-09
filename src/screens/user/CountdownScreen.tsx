/**
 * CountdownScreen — Countdown 3-2-1 sebelum foto
 * Animasi besar, suara lucu, progress "Foto X dari Y"
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { Mascot } from '@components/common/Mascot';
import { AudioService } from '@services/audio/AudioService';
import { Routes } from '@constants/routes';
import { useSessionStore } from '@store/useSessionStore';
import { useEventStore } from '@store/useEventStore';

export const CountdownScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentPhotoIndex, totalPhotos } = useSessionStore();
  const { activeEvent } = useEventStore();

  const countdownSecs = activeEvent?.countdownSecs ?? 3;

  const [count, setCount] = useState(countdownSecs);
  const [showGo, setShowGo] = useState(false);

  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const bgPulse = useSharedValue(1);

  const playBeep = useCallback(async () => {
    await AudioService.playCountdownBeep();
  }, []);

  const playGo = useCallback(async () => {
    await AudioService.playCountdownGo();
  }, []);

  const goToCamera = useCallback(() => {
    navigation.replace(Routes.Camera);
  }, [navigation]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = (current: number) => {
      // Animasi angka muncul
      scale.value = withSequence(
        withSpring(1.3, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0.7, { duration: 800 })
      );

      // Background pulse
      bgPulse.value = withSequence(
        withTiming(1.05, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      // Suara beep
      runOnJS(playBeep)();

      if (current > 1) {
        timer = setTimeout(() => {
          setCount(current - 1);
          tick(current - 1);
        }, 1000);
      } else {
        // Countdown habis → "GO!"
        timer = setTimeout(() => {
          setShowGo(true);
          runOnJS(playGo)();

          scale.value = withSequence(
            withSpring(1.5, { damping: 3, stiffness: 300 }),
            withSpring(1, { damping: 8 })
          );
          opacity.value = withTiming(1);

          // Pindah ke CameraScreen setelah animasi GO
          timer = setTimeout(() => {
            runOnJS(goToCamera)();
          }, 700);
        }, 1000);
      }
    };

    // Mulai countdown
    tick(countdownSecs);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgPulse.value }],
  }));

  const countColor = showGo
    ? Colors.success
    : count === 1
      ? Colors.error
      : count === 2
        ? Colors.warning
        : Colors.primary;

  return (
    <View style={styles.container}>
      {/* Background circle pulse */}
      <Animated.View style={[styles.bgCircle, bgStyle, { borderColor: countColor }]} />

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          📷 Foto {currentPhotoIndex + 1} dari {totalPhotos}
        </Text>
      </View>

      {/* Mascot */}
      <View style={styles.mascotContainer}>
        <Mascot mood="countdown" size={100} />
      </View>

      {/* Countdown number */}
      <Animated.Text
        style={[
          styles.countdownNumber,
          numberStyle,
          { color: countColor },
        ]}
      >
        {showGo ? '✓' : count}
      </Animated.Text>

      {/* Label */}
      <Text style={styles.readyText}>
        {showGo ? 'Ayo senyum! 😄' : 'Bersiap...'}
      </Text>

      {/* Dots progress */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalPhotos }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < currentPhotoIndex && styles.dotDone,
              i === currentPhotoIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
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
  bgCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 4,
    borderColor: Colors.primary,
    opacity: 0.2,
  },
  progressContainer: {
    position: 'absolute',
    top: 40,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  progressText: {
    ...UserTypography.bodyLarge,
    color: Colors.textLight,
    fontFamily: 'Nunito-Bold',
  },
  mascotContainer: {
    position: 'absolute',
    bottom: 60,
    right: 60,
  },
  countdownNumber: {
    ...UserTypography.countdown,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  readyText: {
    ...UserTypography.screenTitle,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  dotDone: {
    backgroundColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 32,
  },
});
