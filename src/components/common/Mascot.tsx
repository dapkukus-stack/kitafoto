/**
 * Mascot KitaFoto — "Kita" si kamera biru lucu!
 * Mascot sederhana dibuat dengan SVG/React Native shapes
 * Tidak membutuhkan asset eksternal → zero loading time
 *
 * Konsep: Kamera retro berwarna biru dengan mata bulat lucu,
 *         pipi merah, dan tangan kecil — sangat child-friendly!
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@constants/colors';
import Svg, { Rect, Circle, Ellipse, Path, G } from 'react-native-svg';

type MascotMood = 'idle' | 'happy' | 'countdown' | 'done' | 'thinking';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
}

export const Mascot: React.FC<MascotProps> = ({ mood = 'idle', size = 120 }) => {
  const bounceY = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    bounceY.value = 0;
    scaleValue.value = 1;
    rotation.value = 0;

    switch (mood) {
      case 'idle':
        // Gentle bob up/down
        bounceY.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
        break;

      case 'happy':
        // Jump & bounce!
        bounceY.value = withRepeat(
          withSequence(
            withSpring(-20, { damping: 5, stiffness: 200 }),
            withSpring(0, { damping: 8, stiffness: 200 })
          ),
          4,
          false
        );
        scaleValue.value = withRepeat(
          withSequence(
            withSpring(1.15, { damping: 5 }),
            withSpring(1, { damping: 8 })
          ),
          4,
          false
        );
        break;

      case 'countdown':
        // Excited shake
        rotation.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 150 }),
            withTiming(8, { duration: 150 }),
            withTiming(0, { duration: 150 })
          ),
          -1,
          false
        );
        break;

      case 'done':
        // Happy spin & bounce
        bounceY.value = withRepeat(
          withSequence(
            withSpring(-24, { damping: 4 }),
            withSpring(0, { damping: 6 })
          ),
          3,
          false
        );
        break;

      case 'thinking':
        // Slow sway
        rotation.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 800, easing: Easing.inOut(Easing.sin) }),
            withTiming(5, { duration: 800, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
        break;
    }
  }, [mood, bounceY, scaleValue, rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceY.value },
      { scale: scaleValue.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[animStyle, { width: size, height: size }]}>
      <MascotSvg size={size} mood={mood} />
    </Animated.View>
  );
};

// ── SVG Mascot Drawing ──────────────────────────────────────────

interface MascotSvgProps {
  size: number;
  mood: MascotMood;
}

const MascotSvg: React.FC<MascotSvgProps> = ({ size, mood }) => {
  const isHappy = mood === 'happy' || mood === 'done';
  const isExcited = mood === 'countdown';

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* ── Badan kamera ── */}
      <Rect
        x="15" y="35" width="90" height="65"
        rx="18" ry="18"
        fill={Colors.primary}
      />
      {/* Highlight badan */}
      <Rect
        x="20" y="40" width="80" height="25"
        rx="12" ry="12"
        fill={Colors.primaryLight}
        opacity="0.4"
      />

      {/* ── Tonjolan atas (hot shoe) ── */}
      <Rect
        x="45" y="25" width="30" height="14"
        rx="7" ry="7"
        fill={Colors.primaryDark}
      />

      {/* ── Lensa besar (mata utama) ── */}
      <Circle cx="60" cy="68" r="22" fill={Colors.primaryDark} />
      <Circle cx="60" cy="68" r="18" fill="#FFFFFF" />
      <Circle cx="60" cy="68" r="13" fill={Colors.primaryDark} />
      {/* Pupil */}
      <Circle cx="60" cy="68" r="8"  fill="#1A1A2E" />
      {/* Highlight mata */}
      <Circle cx="55" cy="63" r="3"  fill="#FFFFFF" />
      <Circle cx="65" cy="72" r="1.5" fill="#FFFFFF" opacity="0.6" />

      {/* ── Mata kecil kiri ── */}
      <Ellipse
        cx="28" cy="50"
        rx={isExcited ? "7" : "6"}
        ry={isHappy ? "7" : "6"}
        fill="#FFFFFF"
      />
      <Circle cx="28" cy="50" r="3.5" fill="#1A1A2E" />
      <Circle cx="26" cy="48" r="1.2" fill="#FFFFFF" />

      {/* ── Mata kecil kanan ── */}
      <Ellipse
        cx="92" cy="50"
        rx={isExcited ? "7" : "6"}
        ry={isHappy ? "7" : "6"}
        fill="#FFFFFF"
      />
      <Circle cx="92" cy="50" r="3.5" fill="#1A1A2E" />
      <Circle cx="90" cy="48" r="1.2" fill="#FFFFFF" />

      {/* ── Pipi merah malu ── */}
      <Ellipse cx="22" cy="58" rx="6" ry="4" fill="#FF8A80" opacity="0.7" />
      <Ellipse cx="98" cy="58" rx="6" ry="4" fill="#FF8A80" opacity="0.7" />

      {/* ── Mulut (senyum/girang) ── */}
      {isHappy ? (
        // Senyum lebar
        <Path
          d="M 48 80 Q 60 92 72 80"
          stroke="#1A1A2E" strokeWidth="3"
          fill="none" strokeLinecap="round"
        />
      ) : (
        // Senyum biasa
        <Path
          d="M 50 80 Q 60 88 70 80"
          stroke="#1A1A2E" strokeWidth="2.5"
          fill="none" strokeLinecap="round"
        />
      )}

      {/* ── Tangan kiri ── */}
      <Rect
        x="5" y="60" width="12" height="22"
        rx="6" ry="6"
        fill={Colors.primary}
        transform="rotate(-15, 11, 71)"
      />
      <Circle cx="8" cy="80" r="6" fill={Colors.primary} />

      {/* ── Tangan kanan ── */}
      <Rect
        x="103" y="60" width="12" height="22"
        rx="6" ry="6"
        fill={Colors.primary}
        transform="rotate(15, 109, 71)"
      />
      <Circle cx="112" cy="80" r="6" fill={Colors.primary} />

      {/* ── Kaki ── */}
      <Rect x="35" y="97" width="14" height="14" rx="7" ry="7" fill={Colors.primaryDark} />
      <Rect x="71" y="97" width="14" height="14" rx="7" ry="7" fill={Colors.primaryDark} />

      {/* ── Aksesoris: bintang kecil saat happy ── */}
      {isHappy && (
        <G>
          <Path d="M 10 25 L 12 20 L 14 25 L 9 22 L 15 22 Z"
            fill={Colors.secondary} />
          <Path d="M 105 20 L 107 14 L 109 20 L 104 17 L 110 17 Z"
            fill={Colors.secondary} />
        </G>
      )}
    </Svg>
  );
};

const styles = StyleSheet.create({});
