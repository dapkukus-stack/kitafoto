/**
 * KitaStatusBar — Indikator status di pojok layar
 * Webcam ✓ Printer ✓ Internet ✓
 * Hanya tampil di HomeScreen, mini & tidak mengganggu anak-anak
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '@store/useAppStore';
import { Colors } from '@constants/colors';

export const KitaStatusBar: React.FC = () => {
  const { cameraStatus, printerConnected, isOnline } = useAppStore();

  const items = [
    {
      icon: '📷',
      ok: cameraStatus === 'ready',
      label: 'Kamera',
    },
    {
      icon: '🖨️',
      ok: printerConnected,
      label: 'Printer',
    },
    {
      icon: '🌐',
      ok: isOnline,
      label: 'Internet',
    },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={styles.icon}>{item.icon}</Text>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.ok ? Colors.success : Colors.warning },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
