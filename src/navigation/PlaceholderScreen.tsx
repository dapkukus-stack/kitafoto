/**
 * PlaceholderScreen — Responsive placeholder untuk screen yang belum diimplementasi
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors }      from '@constants/colors';
import { Fonts }       from '@constants/typography';
import { KitaButton }  from '@components/common/KitaButton';
import { useTokens }   from '@responsive';

export const PlaceholderScreen: React.FC = () => {
  const route      = useRoute<any>();
  const navigation = useNavigation();
  const T          = useTokens();
  const title      = route.params?.title ?? 'Coming Soon';

  return (
    <View style={[styles.container, { padding: T.spacing.xl }]}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={[styles.title, { fontSize: T.font.screenTitle }]}>{title}</Text>
      <Text style={[styles.sub,   { fontSize: T.font.body        }]}>
        Screen ini akan segera hadir!
      </Text>
      <KitaButton
        label="← Kembali"
        onPress={() => navigation.goBack()}
        variant="outline"
        size="small"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.bgMain,
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  emoji: { fontSize: 64 },
  title: { fontFamily: Fonts.extraBold, color: Colors.textPrimary, textAlign: 'center' },
  sub:   { fontFamily: Fonts.semiBold,  color: Colors.textSecondary, textAlign: 'center' },
});
