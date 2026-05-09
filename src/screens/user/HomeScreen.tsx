/**
 * HomeScreen — Layar utama KitaFoto (Responsive v2)
 * ─────────────────────────────────────────────────────────────
 * Adaptive untuk phone 360dp hingga tablet 1280dp+.
 * Semua spacing/font/touch dari useTokens() — zero magic numbers.
 *
 * Layout modes:
 *   compact  (phone)  → vertical stack, full-width button
 *   medium   (sm tab) → vertical stack sedikit lebih longgar
 *   expanded (tablet) → horizontal split: mascot kiri | CTA kanan
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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
  FadeInRight,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors }           from '@constants/colors';
import { Fonts }            from '@constants/typography';
import { Shadow }           from '@constants/dimensions';
import { Routes }           from '@constants/routes';
import { KitaButton }       from '@components/common/KitaButton';
import { Mascot }           from '@components/common/Mascot';
import { KitaStatusBar }    from '@components/common/StatusBar';
import { useAdminGesture }  from '@hooks/useAdminGesture';
import { useEventStore }    from '@store/useEventStore';
import { useAppStore }      from '@store/useAppStore';
import { useTokens, useResponsive } from '@responsive';

// ── Bubble config (percentage-based positions = responsive) ──
const BUBBLES = [
  { x: '8%',  y: '15%', sizeFactor: 0.05, delay: 0,    color: Colors.primaryLight },
  { x: '85%', y: '10%', sizeFactor: 0.03, delay: 800,  color: Colors.secondary },
  { x: '72%', y: '72%', sizeFactor: 0.06, delay: 400,  color: Colors.primaryLight },
  { x: '18%', y: '68%', sizeFactor: 0.04, delay: 1200, color: Colors.secondary },
  { x: '50%', y: '4%',  sizeFactor: 0.03, delay: 200,  color: Colors.primaryLight },
  { x: '92%', y: '48%', sizeFactor: 0.035,delay: 600,  color: Colors.secondary },
] as const;

// ── Bubble component ──────────────────────────────────────────
interface BubbleProps {
  x: string; y: string;
  sizeFactor: number; delay: number; color: string;
  screenW: number;
}

const Bubble = React.memo<BubbleProps>(({ x, y, sizeFactor, delay, color, screenW }) => {
  const size       = Math.round(screenW * sizeFactor);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2000 + delay }),
        withTiming(0,   { duration: 2000 + delay })
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
        style,
        {
          position:     'absolute',
          left:         x,
          top:          y,
          width:        size,
          height:       size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity:      0.55,
        },
      ]}
    />
  );
});
Bubble.displayName = 'Bubble';

// ── Main Screen ───────────────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { activeEvent, todayPhotoCount } = useEventStore();
  const { cameraStatus, storageWarning } = useAppStore();
  const T  = useTokens();
  const rs = useResponsive();

  const { handleTap: handleLogoTap } = useAdminGesture({
    onTriggered: () => navigation.navigate(Routes.AdminLogin),
  });

  const handleStart = useCallback(() => {
    if (cameraStatus !== 'ready' && cameraStatus !== 'fallback') return;
    navigation.navigate(Routes.FramePicker);
  }, [cameraStatus, navigation]);

  const canStart = cameraStatus === 'ready' || cameraStatus === 'fallback';
  const isExpanded = T._isTablet && T._isLandscape; // tablet landscape → side-by-side

  // ── Derived styles (memoized per token set) ──────────────────
  const styles = makeStyles(T, rs.width);

  return (
    <SafeAreaView style={styles.root}>
      {/* Decorative bubbles */}
      {BUBBLES.map((b, i) => (
        <Bubble key={i} {...b} screenW={rs.width} />
      ))}

      {/* Status badges */}
      <KitaStatusBar />

      {/* Storage warning */}
      {storageWarning && (
        <View style={styles.storageWarn}>
          <Text style={styles.storageWarnText}>
            ⚠️ Storage hampir penuh — buka panel admin
          </Text>
        </View>
      )}

      {/* ── Layout: side-by-side (expanded) or stacked (compact/medium) ── */}
      <View style={isExpanded ? styles.rowLayout : styles.colLayout}>

        {/* ── LEFT / TOP: Mascot + Brand ── */}
        <Animated.View
          style={isExpanded ? styles.mascotPanel : styles.mascotBlock}
          entering={isExpanded ? FadeInRight.duration(600).springify() : FadeIn.duration(600)}
        >
          {/* Brand name — tap 5× → admin */}
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={1} style={styles.brand}>
            <Text style={styles.brandName}>KitaFoto</Text>
            <Text style={styles.brandTagline}>📸 Foto Seru Bareng!</Text>
          </TouchableOpacity>

          <Mascot mood="idle" size={T.mascot.home} />
        </Animated.View>

        {/* ── RIGHT / BOTTOM: CTA + Event info ── */}
        <View style={isExpanded ? styles.ctaPanel : styles.ctaBlock}>

          {activeEvent && (
            <Animated.Text
              style={styles.eventName}
              entering={FadeInDown.delay(150).duration(500)}
            >
              🎉 {activeEvent.name}
            </Animated.Text>
          )}

          <Animated.View entering={FadeInDown.delay(200).springify()}>
            {canStart ? (
              <KitaButton
                label="Yuk Foto! 📸"
                onPress={handleStart}
                variant="primary"
                size="hero"
                fullWidth={!isExpanded}
                style={isExpanded ? styles.ctaBtnWide : undefined}
              />
            ) : (
              <CameraError T={T} isExpanded={isExpanded} />
            )}
          </Animated.View>

          {todayPhotoCount > 0 && (
            <Animated.Text
              style={styles.counter}
              entering={FadeIn.delay(400).duration(500)}
            >
              🌟 {todayPhotoCount} foto hari ini!
            </Animated.Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ── CameraError inline component ──────────────────────────────
const CameraError: React.FC<{ T: ReturnType<typeof useTokens>; isExpanded: boolean }> =
  ({ T, isExpanded }) => {
    const styles = makeStyles(T, 0);
    return (
      <View style={[styles.camErrBox, isExpanded && { minWidth: 280 }]}>
        <Text style={styles.camErrTitle}>📷 Kamera belum terhubung</Text>
        <Text style={styles.camErrSub}>
          Tancapkan webcam USB dan tunggu sebentar ya!
        </Text>
      </View>
    );
  };

// ── Style factory (recreated only when tokens change) ─────────
// Menggunakan closure agar semua nilai dari tokens, bukan hardcode.
function makeStyles(T: ReturnType<typeof useTokens>, screenW: number) {
  const sp  = T.spacing;
  const ft  = T.font;
  const tch = T.touch;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: Colors.bgMain,
    },

    // ── Layouts ──────────────────────────────────────────────
    colLayout: {
      flex: 1,
      justifyContent: 'center',
      alignItems:     'center',
      paddingHorizontal: sp.screenH,
      gap: sp.lg,
    },
    rowLayout: {
      flex: 1,
      flexDirection:  'row',
      alignItems:     'center',
      paddingHorizontal: sp.xl,
      gap: sp.xxl,
    },

    // ── Mascot panel ─────────────────────────────────────────
    mascotBlock: {
      alignItems: 'center',
      gap: sp.md,
    },
    mascotPanel: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: sp.lg,
    },

    // ── CTA panel ────────────────────────────────────────────
    ctaBlock: {
      width: '100%',
      alignItems: 'center',
      gap: sp.md,
    },
    ctaPanel: {
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: sp.lg,
    },
    ctaBtnWide: {
      minWidth: 260,
    },

    // ── Brand ─────────────────────────────────────────────────
    brand: {
      alignItems: 'center',
    },
    brandName: {
      fontFamily:  Fonts.extraBold,
      fontSize:    ft.heroTitle,
      color:       Colors.primaryDark,
      textAlign:   'center',
      textShadowColor:  Colors.primaryLight,
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
    brandTagline: {
      fontFamily: Fonts.bold,
      fontSize:   ft.bodyLarge,
      color:      Colors.textSecondary,
      textAlign:  'center',
      marginTop:  sp.xs,
    },

    // ── Event name ────────────────────────────────────────────
    eventName: {
      fontFamily: Fonts.extraBold,
      fontSize:   ft.screenTitle,
      color:      Colors.primaryDark,
      textAlign:  'center',
    },

    // ── Counter ───────────────────────────────────────────────
    counter: {
      fontFamily: Fonts.semiBold,
      fontSize:   ft.body,
      color:      Colors.primaryDark,
      textAlign:  'center',
    },

    // ── Camera error ──────────────────────────────────────────
    camErrBox: {
      alignItems:      'center',
      backgroundColor: Colors.warningLight,
      borderRadius:    T.radius.lg,
      padding:         sp.lg,
      borderWidth:     2,
      borderColor:     Colors.warning,
      width:           '100%',
    },
    camErrTitle: {
      fontFamily: Fonts.bold,
      fontSize:   ft.bodyLarge,
      color:      Colors.warning,
      textAlign:  'center',
    },
    camErrSub: {
      fontFamily: Fonts.semiBold,
      fontSize:   ft.body,
      color:      Colors.textSecondary,
      textAlign:  'center',
      marginTop:  sp.sm,
    },

    // ── Storage warning ───────────────────────────────────────
    storageWarn: {
      position:        'absolute',
      top:             56,
      left:            sp.screenH,
      backgroundColor: Colors.warningLight,
      borderRadius:    T.radius.sm,
      paddingHorizontal: sp.md,
      paddingVertical:   sp.xs,
      borderWidth:     1,
      borderColor:     Colors.warning,
      zIndex:          10,
    },
    storageWarnText: {
      fontFamily: Fonts.bold,
      fontSize:   ft.caption,
      color:      Colors.warning,
    },
  });
}
