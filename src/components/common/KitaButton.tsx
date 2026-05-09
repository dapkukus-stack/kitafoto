/**
 * KitaButton — Responsive v2
 * ─────────────────────────────────────────────────────────────
 * Touch target otomatis scale per device:
 *   xs/sm phone  → hero 64dp, large 52dp, small 48dp
 *   tablet       → hero 88dp, large 72dp, small 52dp
 *
 * Semua dimensi dari useTokens() — zero hardcode.
 * Press animation berjalan di UI thread (Reanimated).
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Colors }      from '@constants/colors';
import { Fonts }       from '@constants/typography';
import { Shadow }      from '@constants/dimensions';
import { useTokens }   from '@responsive';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSizeKey = 'hero' | 'large' | 'small' | 'admin';

interface KitaButtonProps {
  label:     string;
  onPress:   () => void;
  variant?:  ButtonVariant;
  size?:     ButtonSizeKey;
  icon?:     string;          // Emoji icon
  disabled?: boolean;
  loading?:  boolean;
  style?:    ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: Colors.primary,    text: Colors.textLight  },
  secondary: { bg: Colors.secondary,  text: Colors.textPrimary },
  success:   { bg: Colors.success,    text: Colors.textLight  },
  danger:    { bg: Colors.error,      text: Colors.textLight  },
  outline:   { bg: 'transparent',     text: Colors.primary,    border: Colors.primary },
  ghost:     { bg: 'transparent',     text: Colors.primary     },
} as const;

export const KitaButton: React.FC<KitaButtonProps> = ({
  label,
  onPress,
  variant   = 'primary',
  size      = 'large',
  icon,
  disabled  = false,
  loading   = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const T      = useTokens();
  const scale  = useSharedValue(1);
  const vc     = VARIANT_COLORS[variant];

  // ── Touch target height from tokens ───────────────────────────
  const height: number = {
    hero:  T.touch.heroBtn,
    large: T.touch.largeBtn,
    small: T.touch.smallBtn,
    admin: T.touch.adminBtn,
  }[size];

  // ── Font size from tokens ─────────────────────────────────────
  const fontSize: number = {
    hero:  T.font.bigButton,
    large: T.font.medButton,
    small: T.font.label,
    admin: T.font.adminButton,
  }[size];

  // ── Horizontal padding proportional to height ─────────────────
  const paddingH = Math.round(height * 0.45);

  // ── Min width — percentage of hero button height ──────────────
  const minWidth: number | undefined = fullWidth ? undefined : {
    hero:  Math.round(T.touch.heroBtn  * 3.2),
    large: Math.round(T.touch.largeBtn * 3.0),
    small: Math.round(T.touch.smallBtn * 2.2),
    admin: Math.round(T.touch.adminBtn * 2.5),
  }[size];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1,    { damping: 15, stiffness: 300 });
  }, [scale]);

  const btnStyle: ViewStyle = {
    height,
    paddingHorizontal: paddingH,
    borderRadius:      T.radius.pill,
    backgroundColor:   disabled ? Colors.btnDisabled : vc.bg,
    borderWidth:       vc.border ? 2 : 0,
    borderColor:       vc.border ?? 'transparent',
    minWidth,
    width:             fullWidth ? '100%' : undefined,
    ...Shadow.md,
  };

  const labelColor = disabled ? Colors.textMuted : vc.text;

  return (
    <AnimatedTouchable
      style={[styles.base, btnStyle, animStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={vc.text} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <Text style={[styles.icon, { fontSize: fontSize * 1.1 }]}>{icon}</Text> : null}
          <Text style={[
            { fontFamily: Fonts.extraBold, fontSize, color: labelColor },
            textStyle,
          ]}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems:     'center',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  icon: {
    lineHeight: undefined,
  },
});
