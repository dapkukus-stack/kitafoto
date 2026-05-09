/**
 * KitaFoto Navigation Route Names
 */

export const Routes = {
  // ── User Screens ────────────────────────────────
  Splash: 'Splash',
  Home: 'Home',
  FramePicker: 'FramePicker',
  Countdown: 'Countdown',
  Camera: 'Camera',
  Preview: 'Preview',
  Processing: 'Processing',
  Done: 'Done',

  // ── Admin Screens ───────────────────────────────
  AdminLogin: 'AdminLogin',
  AdminDashboard: 'AdminDashboard',
  AdminEventManager: 'AdminEventManager',
  AdminEventCreate: 'AdminEventCreate',
  AdminFrameManager: 'AdminFrameManager',
  AdminFrameUpload: 'AdminFrameUpload',
  AdminPrinterSetting: 'AdminPrinterSetting',
  AdminCloudSetting: 'AdminCloudSetting',
  AdminPhotoGallery: 'AdminPhotoGallery',
  AdminPrintQueue: 'AdminPrintQueue',
  AdminStatistics: 'AdminStatistics',
  AdminCacheManager: 'AdminCacheManager',
  AdminTestWebcam: 'AdminTestWebcam',
  AdminTestPrinter: 'AdminTestPrinter',
  AdminAppSetting: 'AdminAppSetting',
  AdminExportData: 'AdminExportData',
} as const;

export type RouteName = typeof Routes[keyof typeof Routes];
