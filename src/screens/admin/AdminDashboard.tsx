/**
 * AdminDashboard — Responsive v2
 * ─────────────────────────────────────────────────────────────
 * Layout modes:
 *   compact  (phone)  → stacked, full-width menu list
 *   medium   (sm tab) → 2-column menu grid
 *   expanded (lg tab) → sidebar kiri tetap + konten kanan
 *
 * Semua spacing/font dari useTokens().
 * Sidebar hanya muncul di md+ (≥600dp).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation }         from '@react-navigation/native';
import { Colors }                from '@constants/colors';
import { Fonts }                 from '@constants/typography';
import { Shadow, Radius }        from '@constants/dimensions';
import { Routes }                from '@constants/routes';
import { useAdminStore }         from '@store/useAdminStore';
import { useEventStore }         from '@store/useEventStore';
import { PhotoRepository }       from '@database/repositories/PhotoRepository';
import { PrintJobRepository }    from '@database/repositories/PrintJobRepository';
import { UploadJobRepository }   from '@database/repositories/UploadJobRepository';
import { useTokens, useResponsive } from '@responsive';

// ── Menu definition ───────────────────────────────────────────
interface MenuItem {
  icon:    string;
  label:   string;
  desc:    string;
  badge?:  number;
  color:   string;
  route:   string;
}

function buildMenu(pendingPrint: number, pendingUpload: number): MenuItem[] {
  return [
    { icon: '📅', label: 'Kelola Event',    desc: 'Buat, edit, aktifkan event',     color: Colors.primary,       route: Routes.AdminEventManager  },
    { icon: '🖼️', label: 'Kelola Frame',    desc: 'Upload dan atur frame foto',      color: '#CE93D8',            route: Routes.AdminFrameManager  },
    { icon: '🖨️', label: 'Antrian Print',   desc: 'Lihat dan retry antrian cetak',   color: Colors.warning,       route: Routes.AdminPrintQueue, badge: pendingPrint   },
    { icon: '☁️', label: 'Status Upload',   desc: 'Monitor upload ke cloud',         color: Colors.info,          route: Routes.AdminStatistics, badge: pendingUpload  },
    { icon: '⚙️', label: 'Setting Printer', desc: 'Konfigurasi printer USB/WiFi',    color: Colors.textSecondary, route: Routes.AdminPrinterSetting },
    { icon: '🌐', label: 'Setting Cloud',   desc: 'Konfigurasi cloud storage',       color: Colors.primaryDark,   route: Routes.AdminCloudSetting   },
    { icon: '📊', label: 'Statistik',       desc: 'Jumlah foto dan laporan',         color: Colors.success,       route: Routes.AdminStatistics     },
    { icon: '🗑️', label: 'Kelola Cache',    desc: 'Storage dan hapus cache',         color: Colors.error,         route: Routes.AdminCacheManager   },
  ];
}

// ─────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width: winW } = useWindowDimensions();
  const { setAdminAuthenticated } = useAdminStore();
  const { activeEvent, todayPhotoCount } = useEventStore();
  const T  = useTokens();
  const rs = useResponsive();

  const [pendingPrint,  setPendingPrint]  = useState(0);
  const [pendingUpload, setPendingUpload] = useState(0);

  const showSidebar = rs.isTablet && rs.isLandscape;   // split-view
  const menuCols    = T.grid.adminMenuCols;

  useEffect(() => { loadStats(); }, []);

  const loadStats = useCallback(async () => {
    const [prints, uploads] = await Promise.all([
      PrintJobRepository.getPendingCount(),
      UploadJobRepository.getPendingCount(),
    ]);
    setPendingPrint(prints);
    setPendingUpload(uploads);
  }, []);

  const menu = buildMenu(pendingPrint, pendingUpload);

  const styles = makeStyles(T);

  const handleLogout = useCallback(() => {
    setAdminAuthenticated(false);
    navigation.replace(Routes.Home);
  }, [setAdminAuthenticated, navigation]);

  // ── Stats data ─────────────────────────────────────────────
  const stats = [
    { icon: '📅', value: activeEvent?.name ?? '—', label: 'Event Aktif', color: Colors.primary    },
    { icon: '📸', value: String(todayPhotoCount),  label: 'Foto Hari Ini',color: Colors.success  },
    { icon: '🖨️', value: String(pendingPrint),     label: 'Print Pending',color: Colors.warning   },
    { icon: '☁️', value: String(pendingUpload),    label: 'Upload Pending',color: Colors.info      },
  ];

  // ── Inner content (shared by both layout modes) ─────────────
  const Content = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, showSidebar && styles.scrollContentSidebar]}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats row */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <Animated.View
            key={s.label}
            entering={FadeInDown.delay(i * 60).springify()}
            style={[styles.statCard, { borderColor: s.color }]}
          >
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]} numberOfLines={1}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Menu grid */}
      <View style={[styles.menuGrid, { columnGap: T.spacing.sm, rowGap: T.spacing.sm }]}>
        {menu.map((item, i) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.delay(80 + i * 40).springify()}
            style={[
              styles.menuItemWrap,
              menuCols > 1 && { width: `${Math.floor(100 / menuCols) - 1}%` },
            ]}
          >
            <TouchableOpacity
              style={[styles.menuItem, { borderLeftColor: item.color }]}
              onPress={() => navigation.navigate(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}22` }]}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
                {(item.badge ?? 0) > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge! > 99 ? '99+' : item.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.menuDesc}  numberOfLines={1}>{item.desc}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );

  // ── Layout: sidebar (tablet landscape) vs stacked ───────────
  return (
    <SafeAreaView style={styles.root}>
      {showSidebar ? (
        /* Tablet landscape: sidebar + content side-by-side */
        <View style={styles.sidebarLayout}>
          <Sidebar T={T} onLogout={handleLogout} navigation={navigation} styles={styles} />
          <View style={styles.sidebarContent}>{Content}</View>
        </View>
      ) : (
        /* Phone / portrait tablet: header + content stacked */
        <>
          <Header T={T} onLogout={handleLogout} styles={styles} />
          {Content}
        </>
      )}
    </SafeAreaView>
  );
};

// ── Header (compact/medium mode) ─────────────────────────────

const Header: React.FC<{
  T: ReturnType<typeof useTokens>;
  onLogout: () => void;
  styles: ReturnType<typeof makeStyles>;
}> = ({ T, onLogout, styles }) => (
  <View style={styles.header}>
    <View>
      <Text style={styles.headerTitle}>🔧 Panel Admin</Text>
      <Text style={styles.headerSub}>KitaFoto v1.0.0</Text>
    </View>
    <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Keluar →</Text>
    </TouchableOpacity>
  </View>
);

// ── Sidebar (expanded mode, tablet landscape) ─────────────────

const Sidebar: React.FC<{
  T: ReturnType<typeof useTokens>;
  onLogout: () => void;
  navigation: any;
  styles: ReturnType<typeof makeStyles>;
}> = ({ T, onLogout, navigation, styles }) => (
  <View style={[styles.sidebar, { width: T.layout.sidebarW }]}>
    <View style={styles.sidebarBrand}>
      <Text style={styles.sidebarTitle}>🔧 Admin</Text>
      <Text style={styles.sidebarSub}>KitaFoto v1.0.0</Text>
    </View>

    <View style={styles.sidebarNavItem}>
      <Text style={styles.sidebarNavLabel}>📊 Dashboard</Text>
    </View>

    <View style={{ flex: 1 }} />

    <TouchableOpacity onPress={onLogout} style={styles.sidebarLogout}>
      <Text style={styles.sidebarLogoutText}>← Keluar Admin</Text>
    </TouchableOpacity>
  </View>
);

// ── Style factory ─────────────────────────────────────────────

function makeStyles(T: ReturnType<typeof useTokens>) {
  const sp = T.spacing;
  const ft = T.font;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bgAdmin },

    // ── Layouts ──────────────────────────────────────────────
    sidebarLayout: {
      flex: 1, flexDirection: 'row',
    },
    sidebarContent: { flex: 1 },

    // ── Header (stacked) ─────────────────────────────────────
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: sp.screenH, paddingVertical: sp.md,
      backgroundColor: Colors.bgCard,
      borderBottomWidth: 1, borderBottomColor: Colors.divider,
    },
    headerTitle: { fontFamily: Fonts.extraBold, fontSize: ft.adminPageTitle, color: Colors.textPrimary },
    headerSub:   { fontFamily: Fonts.regular,   fontSize: ft.adminSmall,     color: Colors.textMuted    },
    logoutBtn:   { backgroundColor: Colors.errorLight, borderRadius: Radius.pill,
                   paddingHorizontal: sp.md, paddingVertical: sp.sm },
    logoutText:  { fontFamily: Fonts.bold, fontSize: ft.adminBody, color: Colors.error },

    // ── Sidebar ───────────────────────────────────────────────
    sidebar: {
      backgroundColor: Colors.primaryDark,
      paddingVertical: sp.xl,
      paddingHorizontal: sp.lg,
    },
    sidebarBrand:     { marginBottom: sp.xl },
    sidebarTitle:     { fontFamily: Fonts.extraBold, fontSize: ft.adminPageTitle, color: '#fff' },
    sidebarSub:       { fontFamily: Fonts.regular,   fontSize: ft.adminSmall,     color: 'rgba(255,255,255,0.6)', marginTop: sp.xs },
    sidebarNavItem:   { paddingVertical: sp.md, paddingHorizontal: sp.sm,
                        borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: sp.sm },
    sidebarNavLabel:  { fontFamily: Fonts.bold, fontSize: ft.adminBody, color: '#fff' },
    sidebarLogout:    { paddingVertical: sp.md },
    sidebarLogoutText:{ fontFamily: Fonts.bold, fontSize: ft.adminBody, color: 'rgba(255,255,255,0.7)' },

    // ── Scroll ────────────────────────────────────────────────
    scroll:               { flex: 1 },
    scrollContent:        { padding: sp.screenH, gap: sp.lg },
    scrollContentSidebar: { padding: sp.lg },

    // ── Stats row ─────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap',
    },
    statCard: {
      flex: 1, minWidth: 80,
      backgroundColor: Colors.bgCard, borderRadius: Radius.md,
      padding: sp.md, alignItems: 'center', borderWidth: 2, ...Shadow.sm,
    },
    statIcon:  { fontSize: T.font.bodyLarge, marginBottom: sp.xs },
    statValue: { fontFamily: Fonts.extraBold, fontSize: ft.adminSection, textAlign: 'center' },
    statLabel: { fontFamily: Fonts.regular,   fontSize: ft.adminCaption, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },

    // ── Menu grid ─────────────────────────────────────────────
    menuGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
    },
    menuItemWrap: {
      width: '100%',           // overridden per cols above
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: Colors.bgCard, borderRadius: Radius.md,
      padding: sp.md, borderLeftWidth: 4, gap: sp.md, ...Shadow.sm,
    },
    menuIcon: {
      width: T.touch.iconBtn, height: T.touch.iconBtn,
      borderRadius: T.touch.iconBtn / 2,
      justifyContent: 'center', alignItems: 'center',
    },
    menuIconText: { fontSize: ft.bodyLarge },
    menuText: { flex: 1 },
    menuLabel:{ fontFamily: Fonts.bold,    fontSize: ft.adminBody,  color: Colors.textPrimary },
    menuDesc: { fontFamily: Fonts.regular, fontSize: ft.adminSmall, color: Colors.textMuted, marginTop: 2 },
    menuArrow:{ fontFamily: Fonts.regular, fontSize: 22, color: Colors.textMuted },

    // ── Badge ─────────────────────────────────────────────────
    badge:     { position: 'absolute', top: -4, right: -4,
                 backgroundColor: Colors.error, borderRadius: 10,
                 minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
    badgeText: { fontSize: 10, color: '#fff', fontFamily: Fonts.bold },
  });
}
