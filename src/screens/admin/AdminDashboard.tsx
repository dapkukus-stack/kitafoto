/**
 * AdminDashboard — Panel admin utama KitaFoto
 * Grid menu akses cepat ke semua fitur admin
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';
import { AdminTypography } from '@constants/typography';
import { Spacing, Shadow } from '@constants/dimensions';
import { Routes } from '@constants/routes';
import { useAdminStore } from '@store/useAdminStore';
import { useEventStore } from '@store/useEventStore';
import { PhotoRepository } from '@database/repositories/PhotoRepository';
import { PrintJobRepository } from '@database/repositories/PrintJobRepository';
import { UploadJobRepository } from '@database/repositories/UploadJobRepository';

interface MenuItemProps {
  icon: string;
  label: string;
  description: string;
  badge?: number;
  color: string;
  onPress: () => void;
  delay?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon, label, description, badge, color, onPress, delay = 0
}) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <TouchableOpacity style={[styles.menuItem, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, { backgroundColor: `${color}20` }]}>
        <Text style={styles.menuIcon}>{icon}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDesc}>{description}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  </Animated.View>
);

export const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setAdminAuthenticated } = useAdminStore();
  const { activeEvent, todayPhotoCount } = useEventStore();

  const [pendingPrint, setPendingPrint] = useState(0);
  const [pendingUpload, setPendingUpload] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [prints, uploads] = await Promise.all([
      PrintJobRepository.getPendingCount(),
      UploadJobRepository.getPendingCount(),
    ]);
    setPendingPrint(prints);
    setPendingUpload(uploads);
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    navigation.replace(Routes.Home);
  };

  const MENU_ITEMS: Omit<MenuItemProps, 'delay'>[] = [
    {
      icon: '📅',
      label: 'Kelola Event',
      description: 'Buat, edit, dan aktifkan event',
      color: Colors.primary,
      onPress: () => navigation.navigate(Routes.AdminEventManager),
    },
    {
      icon: '🖼️',
      label: 'Kelola Frame',
      description: 'Upload dan atur frame foto',
      color: '#CE93D8',
      onPress: () => navigation.navigate(Routes.AdminFrameManager),
    },
    {
      icon: '🖨️',
      label: 'Antrian Print',
      description: 'Lihat dan retry antrian cetak',
      badge: pendingPrint,
      color: Colors.warning,
      onPress: () => navigation.navigate(Routes.AdminPrintQueue),
    },
    {
      icon: '☁️',
      label: 'Status Upload',
      description: 'Monitor upload ke cloud',
      badge: pendingUpload,
      color: Colors.info,
      onPress: () => navigation.navigate(Routes.AdminStatistics),
    },
    {
      icon: '⚙️',
      label: 'Setting Printer',
      description: 'Konfigurasi printer USB/WiFi',
      color: Colors.textSecondary,
      onPress: () => navigation.navigate(Routes.AdminPrinterSetting),
    },
    {
      icon: '☁️',
      label: 'Setting Cloud',
      description: 'Konfigurasi Cloudinary',
      color: Colors.primaryDark,
      onPress: () => navigation.navigate(Routes.AdminCloudSetting),
    },
    {
      icon: '📊',
      label: 'Statistik',
      description: 'Jumlah foto dan laporan',
      color: Colors.success,
      onPress: () => navigation.navigate(Routes.AdminStatistics),
    },
    {
      icon: '🗑️',
      label: 'Kelola Cache',
      description: 'Lihat storage & hapus cache',
      color: Colors.error,
      onPress: () => navigation.navigate(Routes.AdminCacheManager),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔧 Panel Admin</Text>
          <Text style={styles.headerSubtitle}>KitaFoto v1.0.0</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Keluar →</Text>
        </TouchableOpacity>
      </View>

      {/* Event aktif & stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: Colors.primary }]}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statValue}>{activeEvent?.name ?? 'Belum ada'}</Text>
          <Text style={styles.statLabel}>Event Aktif</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.success }]}>
          <Text style={styles.statIcon}>📸</Text>
          <Text style={styles.statValue}>{todayPhotoCount}</Text>
          <Text style={styles.statLabel}>Foto Hari Ini</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.warning }]}>
          <Text style={styles.statIcon}>🖨️</Text>
          <Text style={styles.statValue}>{pendingPrint}</Text>
          <Text style={styles.statLabel}>Print Pending</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.info }]}>
          <Text style={styles.statIcon}>☁️</Text>
          <Text style={styles.statValue}>{pendingUpload}</Text>
          <Text style={styles.statLabel}>Upload Pending</Text>
        </View>
      </View>

      {/* Menu grid */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuList}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map((item, i) => (
          <MenuItem key={item.label} {...item} delay={i * 50} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgAdmin,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    ...AdminTypography.pageTitle,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    ...AdminTypography.small,
    color: Colors.textMuted,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.errorLight,
  },
  logoutText: {
    ...AdminTypography.bodyBold,
    color: Colors.error,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    ...Shadow.sm,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    ...AdminTypography.sectionTitle,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...AdminTypography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  menuScroll: {
    flex: 1,
  },
  menuList: {
    padding: Spacing.lg,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    gap: 14,
    ...Shadow.sm,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'Nunito-Bold',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    ...AdminTypography.bodyBold,
    color: Colors.textPrimary,
  },
  menuDesc: {
    ...AdminTypography.small,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 22,
    color: Colors.textMuted,
    fontFamily: 'Nunito-Regular',
  },
});
