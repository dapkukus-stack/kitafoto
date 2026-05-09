/**
 * DoneScreen — Selesai! Confetti + mascot happy
 * Auto kembali ke Home setelah 5 detik
 * Non-blocking: trigger print & upload di background
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { Mascot } from '@components/common/Mascot';
import { AudioService } from '@services/audio/AudioService';
import { Routes } from '@constants/routes';
import { useSessionStore } from '@store/useSessionStore';
import { AppConfig } from '@constants/config';

// Confetti partikel sederhana (30 partikel, ringan)
const CONFETTI_COLORS = [
  Colors.primary, Colors.secondary, Colors.success,
  Colors.error, '#CE93D8', '#80DEEA',
];

const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const x = Math.random() * 100;
  const size = 8 + Math.random() * 12;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = Math.random() * 1000;
  const duration = 1500 + Math.random() * 1000;

  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(800, { duration: duration + delay })
    );
    opacity.value = withSequence(
      withTiming(1, { duration: duration * 0.6 + delay }),
      withTiming(0, { duration: duration * 0.4 })
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 500 }),
      Math.ceil(duration / 500),
      false
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${x}%`,
          top: 0,
          width: size,
          height: size,
          borderRadius: Math.random() > 0.5 ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

export const DoneScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { processedPhotoPath, resetSession } = useSessionStore();
  const [countdown, setCountdown] = useState(Math.ceil(AppConfig.doneScreenDurationMs / 1000));

  const titleScale = useSharedValue(0);

  useEffect(() => {
    // Play success jingle
    AudioService.playSuccessJingle();

    // Animasi title masuk
    titleScale.value = withSpring(1, { damping: 6, stiffness: 200 });

    // Countdown ke Home
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          resetSession();
          navigation.replace(Routes.Home);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Confetti */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Animated.Text style={[styles.title, titleStyle]}>
          🎉 Yeay! Keren!
        </Animated.Text>

        {/* Mascot */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Mascot mood="done" size={180} />
        </Animated.View>

        {/* Preview foto kecil */}
        {processedPhotoPath && (
          <Animated.View
            entering={FadeIn.delay(400).duration(600)}
            style={styles.photoPreview}
          >
            <Image
              source={{ uri: processedPhotoPath }}
              style={styles.photoImage}
              resizeMode="contain"
            />
          </Animated.View>
        )}

        {/* Status info */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.statusContainer}
        >
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🖨️</Text>
            <Text style={styles.statusText}>Foto lagi dicetak!</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>☁️</Text>
            <Text style={styles.statusText}>Foto disimpan!</Text>
          </View>
        </Animated.View>

        {/* Countdown balik ke home */}
        <Animated.View entering={FadeIn.delay(600)}>
          <Text style={styles.backText}>
            Kembali ke halaman utama dalam {countdown} detik...
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    zIndex: 2,
    paddingHorizontal: 32,
  },
  title: {
    ...UserTypography.heroTitle,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  photoPreview: {
    width: 160,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 24,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusText: {
    ...UserTypography.body,
    color: Colors.textPrimary,
    fontFamily: 'Nunito-Bold',
  },
  backText: {
    ...UserTypography.label,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
