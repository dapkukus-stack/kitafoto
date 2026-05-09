/**
 * PreviewScreen
 * Preview hasil foto selama 4 detik lalu auto ke DoneScreen.
 * Trigger print + upload sudah dilakukan di PhotoCapturePipeline,
 * screen ini hanya tampilan — tidak ada async ops.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { Spacing } from '@constants/dimensions';
import { Routes } from '@constants/routes';
import { Mascot } from '@components/common/Mascot';
import { useSessionStore } from '@store/useSessionStore';
import { AppConfig } from '@constants/config';

const PREVIEW_SECS = Math.ceil(AppConfig.previewDurationMs / 1000); // 4

export const PreviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { processedPhotoPath } = useSessionStore();
  const [countdown, setCountdown] = useState(PREVIEW_SECS);

  const photoScale = useSharedValue(0.85);
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  useEffect(() => {
    // Animasi masuk foto
    photoScale.value = withSpring(1, { damping: 8, stiffness: 120 });

    // Auto-navigate ke Done
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigation.replace(Routes.Done);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      {/* Mascot */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.mascotRow}>
        <Mascot mood="happy" size={80} />
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>Wah keren banget! 😍</Text>
        </View>
      </Animated.View>

      {/* Photo preview */}
      {processedPhotoPath ? (
        <Animated.View style={[styles.photoWrap, photoStyle]}>
          <Image
            source={{ uri: processedPhotoPath }}
            style={styles.photo}
            resizeMode="contain"
          />
        </Animated.View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderEmoji}>🖼️</Text>
        </View>
      )}

      {/* Countdown */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <Text style={styles.countdownText}>
          Foto kamu siap! Mencetak dalam {countdown} detik...
        </Text>
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
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speechBubble: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 12,
    maxWidth: 200,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  speechText: {
    ...UserTypography.body,
    color: Colors.textPrimary,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
  },
  photoWrap: {
    width: 260,
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: 260,
    height: 380,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  countdownText: {
    ...UserTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
