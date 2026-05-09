/**
 * HomeScreen — Layar utama KitaFoto
 * "Yuk Foto! 📸" — simple, fun, touchscreen friendly
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { Spacing } from '@constants/dimensions';
import { Routes } from '@constants/routes';
import { KitaButton } from '@components/common/KitaButton';
import { Mascot } from '@components/common/Mascot';
import { KitaStatusBar } from '@components/common/StatusBar';
import { useAdminGesture } from '@hooks/useAdminGesture';
import { useEventStore } from '@store/useEventStore';
import { useAppStore } from '@store/useAppStore';

// Bubble animasi background (ringan, hanya 6 bubble)
const BUBBLES = [
  { x: '8%',  y: '15%', size: 40, delay: 0,    color: Colors.primaryLight },
  { x: '85%', y: '10%', size: 28, delay: 800,  color: Colors.secondary },
  { x: '70%', y: '75%', size: 50, delay: 400,  color: Colors.primaryLight },
  { x: '20%', y: '70%', size: 35, delay: 1200, color: Colors.secondary },
  { x: '50%', y: '5%',  size: 22, delay: 200,  color: Colors.primaryLight },
  { x: '92%', y: '50%', size: 30, delay: 600,  color: Colors.secondary },
];

const Bubble: React.FC<{ x: string; y: string; size: number; delay: number; color: string }> = ({
  x, y, size, delay, color
}) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2000 + delay }),
        withTiming(0, { duration: 2000 + delay })
      ),
      -1,
      true
    );
  }, [translateY, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.6,
        },
        style,
      ]}
    />
  );
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { activeEvent, todayPhotoCount } = useEventStore();
  const { cameraStatus, storageWarning } = useAppStore();

  const { handleTap: handleLogoTap } = useAdminGesture({
    onTriggered: () => {
      navigation.navigate(Routes.AdminLogin);
    },
  });

  const handleStartPress = useCallback(() => {
    if (cameraStatus !== 'ready') return;
    navigation.navigate(Routes.FramePicker);
  }, [cameraStatus, navigation]);

  const isCameraReady = cameraStatus === 'ready';

  return (
    <SafeAreaView style={styles.container}>
      {/* Background bubbles */}
      {BUBBLES.map((b, i) => (
        <Bubble key={i} {...b} />
      ))}

      {/* Status indicator */}
      <KitaStatusBar />

      {/* Storage warning */}
      {storageWarning && (
        <View style={styles.storageWarning}>
          <Text style={styles.storageWarningText}>
            ⚠️ Storage hampir penuh — buka panel admin
          </Text>
        </View>
      )}

      {/* Main content */}
      <View style={styles.content}>

        {/* Logo + nama brand (tap 5x → admin) */}
        <TouchableOpacity
          onPress={handleLogoTap}
          activeOpacity={1}
          style={styles.brandContainer}
        >
          <Animated.View entering={FadeIn.duration(600)}>
            <Text style={styles.brandName}>KitaFoto</Text>
            <Text style={styles.brandTagline}>📸 Foto Seru Bareng!</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Mascot */}
        <Animated.View
          entering={FadeInDown.duration(700).springify()}
          style={styles.mascotContainer}
        >
          <Mascot mood="idle" size={160} />
        </Animated.View>

        {/* Event name */}
        {activeEvent && (
          <Animated.View entering={FadeInDown.duration(800).delay(100)}>
            <Text style={styles.eventName}>🎉 {activeEvent.name}</Text>
          </Animated.View>
        )}

        {/* Main CTA button */}
        <Animated.View
          entering={FadeInDown.duration(900).delay(200).springify()}
          style={styles.buttonContainer}
        >
          {isCameraReady ? (
            <KitaButton
              label="Yuk Foto! 📸"
              onPress={handleStartPress}
              variant="primary"
              size="hero"
              style={styles.mainButton}
            />
          ) : (
            <View style={styles.cameraErrorContainer}>
              <Text style={styles.cameraErrorText}>
                📷 Kamera belum terhubung
              </Text>
              <Text style={styles.cameraErrorSub}>
                Tancapkan webcam USB dan tunggu sebentar ya!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Today counter */}
        {todayPhotoCount > 0 && (
          <Animated.View entering={FadeIn.duration(600).delay(400)}>
            <Text style={styles.counter}>
              🌟 {todayPhotoCount} foto hari ini!
            </Text>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandName: {
    ...UserTypography.heroTitle,
    color: Colors.primaryDark,
    textAlign: 'center',
    textShadowColor: Colors.primaryLight,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  brandTagline: {
    ...UserTypography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  mascotContainer: {
    marginVertical: Spacing.md,
  },
  eventName: {
    ...UserTypography.screenTitle,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mainButton: {
    minWidth: 320,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cameraErrorContainer: {
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.warning,
    minWidth: 320,
  },
  cameraErrorText: {
    ...UserTypography.bodyLarge,
    color: Colors.warning,
    textAlign: 'center',
    fontFamily: 'Nunito-Bold',
  },
  cameraErrorSub: {
    ...UserTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  counter: {
    ...UserTypography.body,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  storageWarning: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.warning,
    zIndex: 10,
  },
  storageWarningText: {
    fontSize: 12,
    color: Colors.warning,
    fontFamily: 'Nunito-Bold',
  },
});
