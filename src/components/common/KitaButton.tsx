/**
 * KitaButton — Tombol utama KitaFoto
 * Child-friendly: besar, rounded, colorful, animasi ringan
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { ButtonSize, Shadow } from '@constants/dimensions';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSizeVariant = 'hero' | 'large' | 'small' | 'admin';

interface KitaButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSizeVariant;
  icon?: string;          // Emoji icon
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: Colors.primary,    text: Colors.textLight },
  secondary: { bg: Colors.secondary,  text: Colors.textPrimary },
  success:   { bg: Colors.success,    text: Colors.textLight },
  danger:    { bg: Colors.error,      text: Colors.textLight },
  outline:   { bg: 'transparent',     text: Colors.primary,    border: Colors.primary },
  ghost:     { bg: 'transparent',     text: Colors.primary },
};

export const KitaButton: React.FC<KitaButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const variantStyle = VARIANT_STYLES[variant];
  const sizeConfig = ButtonSize[size];

  const buttonStyle: ViewStyle = {
    backgroundColor: disabled ? Colors.btnDisabled : variantStyle.bg,
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    borderRadius: sizeConfig.borderRadius,
    borderWidth: variantStyle.border ? 2 : 0,
    borderColor: variantStyle.border ?? 'transparent',
    minWidth: fullWidth ? undefined : sizeConfig.minWidth,
    width: fullWidth ? '100%' : undefined,
    ...Shadow.md,
  };

  const labelStyle: TextStyle =
    size === 'hero' || size === 'large'
      ? { ...UserTypography.bigButton }
      : size === 'small'
        ? { fontSize: 18, fontFamily: 'Nunito-Bold' }
        : { fontSize: 16, fontFamily: 'Nunito-Bold' };

  return (
    <AnimatedTouchable
      style={[styles.base, buttonStyle, animatedStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text
            style={[
              labelStyle,
              { color: disabled ? Colors.textMuted : variantStyle.text },
              textStyle,
            ]}
          >
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
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 28,
  },
});
