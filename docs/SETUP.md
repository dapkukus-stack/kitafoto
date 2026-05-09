# 🚀 KitaFoto — Panduan Setup & Development

## Prerequisites

```bash
node >= 18
npm >= 9
Android Studio (untuk build Android)
Java 17
```

## 1. Clone & Install

```bash
git clone https://github.com/yourusername/kitafoto.git
cd kitafoto
npm install
```

## 2. Setup Assets

### Font Nunito
Download dari https://fonts.google.com/specimen/Nunito
Copy ke `assets/fonts/`:
- Nunito-Regular.ttf
- Nunito-SemiBold.ttf
- Nunito-Bold.ttf
- Nunito-ExtraBold.ttf
- Nunito-Black.ttf

### Sound Effects
Ganti placeholder di `assets/sounds/` dengan file audio asli.
Lihat `assets/sounds/README.md` untuk detail.

## 3. Environment Variables

```bash
cp .env.example .env
# Edit .env dengan nilai asli Cloudinary
```

## 4. Build & Run (Development)

```bash
# Prebuild native Android
npx expo prebuild --platform android

# Run di device
npx expo run:android --device
```

## 5. Production Build (APK)

### Menggunakan EAS Build (Recommended):
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

### Local Build:
```bash
cd android
./gradlew assembleRelease
# APK ada di: android/app/build/outputs/apk/release/
```

## 6. Install ke Samsung Galaxy Tab A9

1. Enable Developer Options di tablet
2. Enable USB Debugging
3. Hubungkan via USB
4. `adb install -r app-release.apk`

## 7. Setup Kiosk Mode

Setelah install, buka app → tap logo 5x → masukkan PIN (default: 123456)
→ Masuk admin → Setting → Enable Kiosk Mode

Untuk kiosk mode penuh (Device Owner):
```bash
adb shell dpm set-device-owner com.kitafoto.app/.KioskDeviceAdminReceiver
```

## 8. Setup Event Pertama

1. Masuk admin panel
2. Kelola Event → Buat Event Baru
3. Isi nama event (contoh: "Bazar SDN 01")
4. Set aktif
5. Kelola Frame → Upload frame PNG transparan
6. Setting Cloud → Masukkan Cloudinary credentials
7. Keluar admin → Siap digunakan!

## Admin Default PIN
`123456`

**⚠️ GANTI PIN SEGERA setelah pertama install!**

---

## Troubleshooting

### Webcam tidak terdeteksi
- Pastikan kabel OTG tersambung dengan benar
- Grant permission USB saat popup muncul
- Coba cabut dan tancapkan kembali
- Test di: Admin → Test Webcam

### Printer tidak response
- Check koneksi USB OTG / WiFi
- Restart printer
- Admin → Setting Printer → Test Print

### Upload gagal terus
- Check koneksi internet
- Verifikasi Cloudinary credentials di admin
- Admin → Status Upload → Retry Manual
