/**
 * PlaceholderScreen — Placeholder untuk screen yang belum diimplementasi
 * Akan diganti satu per satu di phase berikutnya
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { UserTypography } from '@constants/typography';
import { KitaButton } from '@components/common/KitaButton';

export const PlaceholderScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const title = route.params?.title ?? 'Coming Soon';

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Screen ini akan segera hadir!</Text>
      <KitaButton
        label="← Kembali"
        onPress={() => navigation.goBack()}
        variant="outline"
        size="small"
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    ...UserTypography.screenTitle,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...UserTypography.body,
    color: Colors.textSecondary,
  },
  button: {
    marginTop: 16,
  },
});
