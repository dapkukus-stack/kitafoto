/**
 * AppNavigator — Root navigation KitaFoto
 * User flow (kiosk) + Admin flow
 * Updated Phase 2: semua user screens sudah real implementation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Routes } from '@constants/routes';

// ── User Screens (eager load — sering dipakai) ────────────────
import { HomeScreen }        from '@screens/user/HomeScreen';
import { CountdownScreen }   from '@screens/user/CountdownScreen';
import { CameraScreen }      from '@screens/user/CameraScreen';
import { ProcessingScreen }  from '@screens/user/ProcessingScreen';
import { DoneScreen }        from '@screens/user/DoneScreen';
import { FramePickerScreen } from '@screens/user/FramePickerScreen';

// ── Preview screen (inline ringan) ───────────────────────────
import { PreviewScreen } from '@screens/user/PreviewScreen';

// ── Admin Screens (lazy import — jarang dipakai) ──────────────
const AdminLoginScreen = React.lazy(
  () => import('@screens/admin/AdminLoginScreen').then(m => ({ default: m.AdminLoginScreen }))
);
const AdminDashboard = React.lazy(
  () => import('@screens/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);

import { PlaceholderScreen } from './PlaceholderScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown:    false,
  gestureEnabled: false,     // Disable swipe-back di kiosk mode
  animationEnabled: true,
  cardStyle: { backgroundColor: 'transparent' },
};

// Transisi ringan — slide horizontal standard
const slideTransition = {
  cardStyleInterpolator: ({ current, next, layouts }: any) => ({
    cardStyle: {
      transform: [{
        translateX: current.progress.interpolate({
          inputRange:  [0, 1],
          outputRange: [layouts.screen.width, 0],
        }),
      }],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange:  [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  }),
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <React.Suspense fallback={null}>
        <Stack.Navigator
          initialRouteName={Routes.Home}
          screenOptions={screenOptions}
        >
          {/* ── User Flow ─────────────────────────────────── */}
          <Stack.Screen
            name={Routes.Home}
            component={HomeScreen}
          />
          <Stack.Screen
            name={Routes.FramePicker}
            component={FramePickerScreen}
            options={slideTransition}
          />
          <Stack.Screen
            name={Routes.Countdown}
            component={CountdownScreen}
            options={slideTransition}
          />
          <Stack.Screen
            name={Routes.Camera}
            component={CameraScreen}
            options={{ animationEnabled: false }} // No animation — langsung capture
          />
          <Stack.Screen
            name={Routes.Processing}
            component={ProcessingScreen}
            options={slideTransition}
          />
          <Stack.Screen
            name={Routes.Preview}
            component={PreviewScreen}
            options={slideTransition}
          />
          <Stack.Screen
            name={Routes.Done}
            component={DoneScreen}
            options={slideTransition}
          />

          {/* ── Admin Flow ────────────────────────────────── */}
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
