/**
 * AppNavigator — Root navigation KitaFoto
 * User flow (kiosk) + Admin flow
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Routes } from '@constants/routes';

// ── User Screens ─────────────────────────────────────────
import { HomeScreen } from '@screens/user/HomeScreen';
import { CountdownScreen } from '@screens/user/CountdownScreen';
import { DoneScreen } from '@screens/user/DoneScreen';

// ── Admin Screens (lazy import untuk hemat memory) ────────
const AdminLoginScreen = React.lazy(
  () => import('@screens/admin/AdminLoginScreen').then(m => ({ default: m.AdminLoginScreen }))
);
const AdminDashboard = React.lazy(
  () => import('@screens/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);

// ── Placeholder screens (akan dibuat di phase berikutnya) ─
import { PlaceholderScreen } from './PlaceholderScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
  gestureEnabled: false,        // Disable swipe back di kiosk mode
  animationEnabled: true,
  cardStyle: { backgroundColor: 'transparent' },
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <React.Suspense fallback={null}>
        <Stack.Navigator
          initialRouteName={Routes.Home}
          screenOptions={screenOptions}
        >
          {/* ── User Flow ── */}
          <Stack.Screen name={Routes.Home} component={HomeScreen} />
          <Stack.Screen
            name={Routes.FramePicker}
            component={PlaceholderScreen}
            initialParams={{ title: 'Pilih Frame 🖼️' }}
          />
          <Stack.Screen name={Routes.Countdown} component={CountdownScreen} />
          <Stack.Screen
            name={Routes.Camera}
            component={PlaceholderScreen}
            initialParams={{ title: 'Ambil Foto 📷' }}
          />
          <Stack.Screen
            name={Routes.Processing}
            component={PlaceholderScreen}
            initialParams={{ title: 'Memproses... ⏳' }}
          />
          <Stack.Screen
            name={Routes.Preview}
            component={PlaceholderScreen}
            initialParams={{ title: 'Lihat Hasil! ✨' }}
          />
          <Stack.Screen name={Routes.Done} component={DoneScreen} />

          {/* ── Admin Flow ── */}
          <Stack.Screen
            name={Routes.AdminLogin}
            component={AdminLoginScreen as any}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name={Routes.AdminDashboard}
            component={AdminDashboard as any}
          />
          <Stack.Screen
            name={Routes.AdminEventManager}
            component={PlaceholderScreen}
            initialParams={{ title: 'Kelola Event' }}
          />
          <Stack.Screen
            name={Routes.AdminFrameManager}
            component={PlaceholderScreen}
            initialParams={{ title: 'Kelola Frame' }}
          />
          <Stack.Screen
            name={Routes.AdminPrinterSetting}
            component={PlaceholderScreen}
            initialParams={{ title: 'Setting Printer' }}
          />
          <Stack.Screen
            name={Routes.AdminCloudSetting}
            component={PlaceholderScreen}
            initialParams={{ title: 'Setting Cloud' }}
          />
          <Stack.Screen
            name={Routes.AdminStatistics}
            component={PlaceholderScreen}
            initialParams={{ title: 'Statistik' }}
          />
          <Stack.Screen
            name={Routes.AdminPrintQueue}
            component={PlaceholderScreen}
            initialParams={{ title: 'Antrian Print' }}
          />
          <Stack.Screen
            name={Routes.AdminCacheManager}
            component={PlaceholderScreen}
            initialParams={{ title: 'Kelola Cache' }}
          />
        </Stack.Navigator>
      </React.Suspense>
    </NavigationContainer>
  );
};
