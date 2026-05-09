/**
 * KitaFoto Typography System
 * Font: Nunito — Rounded, friendly, mudah dibaca anak SD
 */

export const Fonts = {
  regular: 'Nunito-Regular',
  semiBold: 'Nunito-SemiBold',
  bold: 'Nunito-Bold',
  extraBold: 'Nunito-ExtraBold',
  black: 'Nunito-Black',
} as const;

/**
 * Typography untuk layar USER (anak SD = besar & jelas!)
 */
export const UserTypography = {
  // Layar utama
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 52,
    lineHeight: 60,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 36,
  },

  // Tombol besar
  bigButton: {
    fontFamily: Fonts.extraBold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  medButton: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 32,
  },

  // Countdown (super besar!)
  countdown: {
    fontFamily: Fonts.black,
    fontSize: 160,
    lineHeight: 180,
    letterSpacing: -4,
  },

  // Judul layar
  screenTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 32,
    lineHeight: 40,
  },

  // Teks informasi user
  bodyLarge: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 30,
  },
  body: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    lineHeight: 26,
  },

  // Label status kecil
  label: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 22,
  },
} as const;

/**
 * Typography untuk layar ADMIN (lebih kecil, padat)
 */
export const AdminTypography = {
  pageTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    lineHeight: 30,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  smallBold: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  buttonAdmin: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 22,
  },
} as const;
