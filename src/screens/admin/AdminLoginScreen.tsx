/**
 * AdminLoginScreen — PIN 6 digit untuk masuk admin
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { AdminTypography, UserTypography } from '@constants/typography';
import { Spacing, Shadow } from '@constants/dimensions';
import { Routes } from '@constants/routes';
import { useAdminStore } from '@store/useAdminStore';
import { db } from '@database/DatabaseService';
import { AppConfig } from '@constants/config';

// Simple hash untuk PIN (production: gunakan crypto yang lebih baik)
async function hashPin(pin: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const NUMPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '✓'],
];

export const AdminLoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setAdminAuthenticated, adminLoginError, setAdminLoginError } = useAdminStore();

  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 80 }),
      withTiming(12, { duration: 80 }),
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(0, { duration: 80 })
    );
  }, [shakeX]);

  useEffect(() => {
    setAdminLoginError(null);
    setPin('');
  }, [setAdminLoginError]);

  const handleNumPress = useCallback(
    async (key: string) => {
      if (isVerifying) return;

      if (key === '⌫') {
        setPin((prev) => prev.slice(0, -1));
        setAdminLoginError(null);
        return;
      }

      if (key === '✓') {
        // Verifikasi PIN
        if (pin.length !== AppConfig.adminPinLength) {
          shake();
          setAdminLoginError(`PIN harus ${AppConfig.adminPinLength} digit`);
          return;
        }

        setIsVerifying(true);
        try {
          const storedHash = await db.getSetting('admin_pin_hash');
          const inputHash = await hashPin(pin);

          if (inputHash === storedHash) {
            setAdminAuthenticated(true);
            setAdminLoginError(null);
            navigation.replace(Routes.AdminDashboard);
          } else {
            shake();
            setAdminLoginError('PIN salah. Coba lagi!');
            setPin('');
          }
        } catch {
          setAdminLoginError('Terjadi kesalahan. Coba lagi!');
        } finally {
          setIsVerifying(false);
        }
        return;
      }

      // Angka biasa
      if (pin.length < AppConfig.adminPinLength) {
        setPin((prev) => prev + key);
        setAdminLoginError(null);
      }
    },
    [pin, isVerifying, navigation, shake, setAdminAuthenticated, setAdminLoginError]
  );

  // Auto-verify saat PIN lengkap
  useEffect(() => {
    if (pin.length === AppConfig.adminPinLength) {
      handleNumPress('✓');
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.title}>Panel Admin</Text>
          <Text style={styles.subtitle}>Masukkan PIN 6 digit</Text>
        </View>

        {/* PIN dots */}
        <Animated.View style={[styles.pinContainer, shakeStyle]}>
          {Array.from({ length: AppConfig.adminPinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                i < pin.length && styles.pinDotFilled,
                adminLoginError && styles.pinDotError,
              ]}
            />
          ))}
        </Animated.View>

        {/* Error message */}
        {adminLoginError ? (
          <Text style={styles.errorText}>{adminLoginError}</Text>
        ) : (
          <View style={{ height: 22 }} />
        )}

        {/* Numpad */}
        <View style={styles.numpad}>
          {NUMPAD.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.numpadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.numKey,
                    key === '✓' && styles.numKeyConfirm,
                    key === '⌫' && styles.numKeyBack,
                  ]}
                  onPress={() => handleNumPress(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.numKeyText,
                      key === '✓' && styles.numKeyConfirmText,
                    ]}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 28,
    padding: Spacing.xl,
    width: 360,
    alignItems: 'center',
    ...Shadow.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    ...AdminTypography.pageTitle,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    ...AdminTypography.body,
    color: Colors.textSecondary,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: Spacing.md,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinDotError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...AdminTypography.small,
    color: Colors.error,
    height: 22,
    textAlign: 'center',
  },
  numpad: {
    gap: 12,
    marginTop: Spacing.md,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  numKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgAdmin,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  numKeyText: {
    fontSize: 26,
    fontFamily: 'Nunito-Bold',
    color: Colors.textPrimary,
  },
  numKeyConfirm: {
    backgroundColor: Colors.primary,
  },
  numKeyConfirmText: {
    color: Colors.textLight,
  },
  numKeyBack: {
    backgroundColor: Colors.errorLight,
  },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  cancelText: {
    ...AdminTypography.body,
    color: Colors.textSecondary,
  },
});
