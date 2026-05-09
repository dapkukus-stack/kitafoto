/**
 * KitaFoto Color System
 * Tema: Biru Muda + Putih + Kuning — Child-friendly & Fun!
 */

export const Colors = {
  // ── Brand Primary ──────────────────────────────────────
  primary: '#4FC3F7',       // Biru muda cerah (main brand)
  primaryDark: '#0288D1',   // Biru gelap (hover/active)
  primaryLight: '#B3E5FC',  // Biru sangat muda (background accent)

  // ── Secondary / Accent ─────────────────────────────────
  secondary: '#FFF176',     // Kuning ceria
  secondaryDark: '#F9A825', // Kuning gelap / oranye hangat
  accent: '#FFFFFF',        // Putih bersih

  // ── Background ─────────────────────────────────────────
  bgMain: '#E3F2FD',        // Biru sangat pucat (layar utama user)
  bgCard: '#FFFFFF',        // Putih untuk card/panel
  bgAdmin: '#F5F9FF',       // Biru sangat pucat untuk admin
  bgOverlay: 'rgba(0,0,0,0.4)',  // Overlay gelap semi-transparan

  // ── Status ─────────────────────────────────────────────
  success: '#66BB6A',       // Hijau ✓
  successLight: '#E8F5E9',  // Hijau pucat background
  warning: '#FFA726',       // Oranye ⚠
  warningLight: '#FFF3E0',  // Oranye pucat background
  error: '#EF5350',         // Merah ✗
  errorLight: '#FFEBEE',    // Merah pucat background
  info: '#29B6F6',          // Biru info ℹ

  // ── Text ───────────────────────────────────────────────
  textPrimary: '#1A237E',   // Biru tua gelap (teks utama)
  textSecondary: '#546E7A', // Abu biru (teks sekunder)
  textMuted: '#90A4AE',     // Abu muda (placeholder, disabled)
  textLight: '#FFFFFF',     // Putih (teks di bg gelap)
  textDark: '#212121',      // Hitam hampir (teks admin)

  // ── Button Colors ──────────────────────────────────────
  btnPrimary: '#4FC3F7',    // Tombol utama
  btnSecondary: '#FFF176',  // Tombol sekunder/aksi fun
  btnDanger: '#EF5350',     // Tombol hapus/bahaya
  btnSuccess: '#66BB6A',    // Tombol selesai/konfirmasi
  btnDisabled: '#CFD8DC',   // Tombol disabled

  // ── Gradients (pakai dalam LinearGradient) ──────────────
  gradientBlue: ['#81D4FA', '#0288D1'] as [string, string],
  gradientYellow: ['#FFF176', '#FFD54F'] as [string, string],
  gradientGreen: ['#A5D6A7', '#388E3C'] as [string, string],
  gradientSunset: ['#FFB74D', '#F06292'] as [string, string],  // Fun untuk frame

  // ── Border ─────────────────────────────────────────────
  border: '#B3E5FC',        // Border halus
  borderDark: '#4FC3F7',    // Border lebih terlihat
  divider: '#E0E0E0',       // Garis pemisah admin

  // ── Shadow ─────────────────────────────────────────────
  shadow: 'rgba(2, 136, 209, 0.2)', // Shadow kebiruan
} as const;

export type ColorKey = keyof typeof Colors;
