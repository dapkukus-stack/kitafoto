/**
 * KitaStatusBar — Responsive v2
 * Indikator status webcam/printer/internet di pojok layar.
 * Ukuran ikon dan padding dari tokens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore }  from '@store/useAppStore';
import { Colors }       from '@constants/colors';
import { Fonts }        from '@constants/typography';
import { useTokens }    from '@responsive';

export const KitaStatusBar: React.FC = () => {
  const { cameraStatus, printerConnected, isOnline } = useAppStore();
  const T = useTokens();

  const items = [
    { icon: '📷', ok: cameraStatus === 'ready' || cameraStatus === 'fallback' },
    { icon: '🖨️', ok: printerConnected  },
    { icon: '🌐', ok: isOnline          },
  ];

  const iconSize = T.font.label;
  const dotSize  = Math.max(7, Math.round(iconSize * 0.5));

  return (
    <View style={[styles.container, {
      top:             T.spacing.sm,
      right:           T.spacing.screenH,
      paddingHorizontal: T.spacing.md,
      paddingVertical:   T.spacing.xs,
      borderRadius:    T.radius.pill,
      gap:             T.spacing.sm,
    }]}>
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={{ fontSize: iconSize }}>{item.icon}</Text>
          <View style={[
            styles.dot,
            { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
            { backgroundColor: item.ok ? Colors.success : Colors.warning },
          ]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    flexDirection:   'row',
    backgroundColor: 'rgba(255,255,255,0.88)',
    zIndex:          10,
  },
  item: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  dot: {},
});
