/**
 * CountdownScreen — Responsive & Orientation-aware v2
 * ─────────────────────────────────────────────────────────────
 * Semua angka countdown, progress dots, dan mascot
 * menggunakan token dari useTokens() — otomatis scale per device.
 *
 * Landscape vs Portrait:
 *   Portrait  → mascot bawah kanan, countdown center
 *   Landscape → mascot samping kiri, countdown di kanan
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withSpring, withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation }       from '@react-navigation/native';
import { Colors }              from '@constants/colors';
import { Fonts }               from '@constants/typography';
import { Routes }              from '@constants/routes';
import { Mascot }              from '@components/common/Mascot';
import { AudioService }        from '@services/audio/AudioService';
import { useSessionStore }     from '@store/useSessionStore';
import { useEventStore }       from '@store/useEventStore';
import { useTokens, useResponsive } from '@responsive';

export const CountdownScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentPhotoIndex, totalPhotos } = useSessionStore();
  const { activeEvent }  = useEventStore();
  const T  = useTokens();
  const rs = useResponsive();

  const countdownSecs = activeEvent?.countdownSecs ?? 3;
  const [count,   setCount]   = useState(countdownSecs);
  const [showGo,  setShowGo]  = useState(false);

  const scale    = useSharedValue(0.3);
  const opacity  = useSharedValue(0);
  const bgPulse  = useSharedValue(1);

  const playBeep = useCallback(() => { AudioService.playCountdownBeep(); }, []);
  const playGo   = useCallback(() => { AudioService.playCountdownGo();   }, []);
  const goToCamera = useCallback(() => { navigation.replace(Routes.Camera); }, [navigation]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = (current: number) => {
      scale.value  = withSequence(withSpring(1.3, { damping: 4 }), withSpring(1, { damping: 10 }));
      opacity.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0.7, { duration: 800 }));
      bgPulse.value = withSequence(withTiming(1.04, { duration: 150 }), withTiming(1, { duration: 150 }));
      runOnJS(playBeep)();

      if (current > 1) {
        timer = setTimeout(() => { setCount(current - 1); tick(current - 1); }, 1000);
      } else {
        timer = setTimeout(() => {
          setShowGo(true);
          runOnJS(playGo)();
          scale.value  = withSequence(withSpring(1.5, { damping: 3 }), withSpring(1, { damping: 8 }));
          opacity.value = withTiming(1);
          timer = setTimeout(() => { runOnJS(goToCamera)(); }, 700);
        }, 1000);
      }
    };

    tick(countdownSecs);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));
  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgPulse.value }],
  }));

  const countColor = showGo ? Colors.success
    : count === 1   ? Colors.error
    : count === 2   ? Colors.warning
    : Colors.primary;

  // Responsive sizes
  const circleSize = Math.min(rs.width, rs.height) * 0.4;
  const isLandscape = rs.isLandscape;

  const styles = makeStyles(T, circleSize, isLandscape);

  return (
    <View style={styles.container}>
      {/* Background circle pulse */}
      <Animated.View style={[styles.bgCircle, bgStyle, { borderColor: countColor }]} />

      {/* Progress badge */}
      <View style={styles.progressBadge}>
        <Text style={styles.progressText}>
          📷 Foto {currentPhotoIndex + 1} dari {totalPhotos}
        </Text>
      </View>

      {/* Main layout */}
      <View style={isLandscape ? styles.rowLayout : styles.colLayout}>
        {/* Countdown number */}
        <Animated.Text style={[styles.countdown, numberStyle, { color: countColor }]}>
          {showGo ? '✓' : count}
        </Animated.Text>

        {/* Mascot */}
        <View style={isLandscape ? styles.mascotLandscape : styles.mascotPortrait}>
          <Mascot mood="countdown" size={T.mascot.corner} />
        </View>
      </View>

      {/* Ready text */}
      <Text style={styles.readyText}>{showGo ? 'Ayo senyum! 😄' : 'Bersiap...'}</Text>

      {/* Dot progress */}
      <View style={styles.dots}>
        {Array.from({ length: totalPhotos }).map((_, i) => (
          <View key={i} style={[
            styles.dot,
            i < currentPhotoIndex && styles.dotDone,
            i === currentPhotoIndex && styles.dotActive,
          ]} />
        ))}
      </View>
    </View>
  );
};

function makeStyles(
  T: ReturnType<typeof useTokens>,
  circleSize: number,
  isLandscape: boolean,
) {
  const sp = T.spacing;
  const ft = T.font;
  return StyleSheet.create({
    container: {
      flex: 1, backgroundColor: Colors.bgMain,
      justifyContent: 'center', alignItems: 'center',
    },
    bgCircle: {
      position: 'absolute',
      width: circleSize, height: circleSize,
      borderRadius: circleSize / 2,
      borderWidth: 4, opacity: 0.18,
    },

    // Layouts
    colLayout: { alignItems: 'center', justifyContent: 'center' },
    rowLayout: { flexDirection: 'row', alignItems: 'center', gap: sp.xxl },

    // Countdown
    countdown: {
      fontFamily: Fonts.black,
      fontSize:   ft.countdown,
      lineHeight: ft.countdown * 1.1,
      letterSpacing: -4,
      textShadowColor:  'rgba(0,0,0,0.08)',
      textShadowOffset: { width: 3, height: 3 },
      textShadowRadius: 8,
    },

    // Mascot positioning
    mascotPortrait:  { marginTop: sp.lg },
    mascotLandscape: {},

    // Labels
    readyText: {
      position: 'absolute', bottom: circleSize * 0.55,
      fontFamily: Fonts.extraBold, fontSize: ft.screenTitle,
      color: Colors.textSecondary,
    },

    // Progress badge
    progressBadge: {
      position: 'absolute', top: sp.xl, alignSelf: 'center',
      backgroundColor: Colors.primary, paddingHorizontal: sp.lg, paddingVertical: sp.sm,
      borderRadius: Radius_pill,
    },
    progressText: {
      fontFamily: Fonts.bold, fontSize: ft.bodyLarge, color: '#fff',
    },

    // Dots
    dots: { position: 'absolute', bottom: sp.xl, flexDirection: 'row', gap: sp.sm },
    dot: {
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: Colors.border,
    },
    dotDone:   { backgroundColor: Colors.success },
    dotActive: { backgroundColor: Colors.primary, width: 28 },
  });
}

const Radius_pill = 50;
