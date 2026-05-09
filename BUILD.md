# 🔨 KitaFoto — Panduan Build APK

> Dokumen ini menjelaskan cara menghasilkan file APK release yang bisa langsung diinstall di tablet/HP Android.

---

## Prasyarat

Sebelum mulai build, pastikan:

```bash
node --version    # >= 18.0.0
npm --version     # >= 9.0.0
java -version     # JDK 17
```

Tools yang perlu diinstall (sekali saja):

```bash
# Expo CLI (sudah bundled dalam expo package)
# EAS CLI
npm install -g eas-cli

# Login ke akun Expo (gratis)
eas login
```

---

## Opsi 1 — EAS Build (Cloud) ⭐ DIREKOMENDASIKAN

Build berjalan di server Expo. Tidak perlu Android Studio.

### Build APK Release (Langsung Install ke Device)

```bash
npm run build:apk
```

Ini akan:
1. Upload source code ke EAS server
2. Build APK release (signed dengan debug keystore)
3. Beri link download APK setelah selesai (~5-10 menit)

### Build AAB (Untuk Play Store)

```bash
npm run build:android
```

Output: `.aab` file yang bisa diupload ke Google Play Console.

### Build APK Preview (Untuk Testing)

```bash
npm run build:preview
```

---

## Opsi 2 — Local Build

Butuh Android SDK terinstall.

### Setup Satu Kali

1. Install [Android Studio](https://developer.android.com/studio)
2. Di Android Studio: Tools → SDK Manager → install:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34
   - Android NDK (Side by Side)
3. Set environment variable:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Build

```bash
# Generate folder android/ dari app.json
npx expo prebuild --platform android

# Build APK release
cd android
./gradlew assembleRelease

# APK tersimpan di:
ls app/build/outputs/apk/release/app-release.apk
```

### Build AAB Lokal

```bash
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Shortcut (dari root folder)

```bash
npm run build:local
```

---

## Install APK ke Device

### Via USB (ADB)

```bash
# Pastikan USB Debugging aktif di tablet
adb devices                    # Lihat device terhubung
adb install -r app-release.apk  # Install (replace jika sudah ada)
```

### Via Transfer File

1. Copy file `app-release.apk` ke tablet (via kabel USB / cloud / Bluetooth)
2. Di tablet, buka **File Manager**
3. Tap file APK
4. Tap **Install** (mungkin perlu izinkan "Install dari sumber tidak dikenal")

### Via Link Download (EAS Build)

Setelah `npm run build:apk` selesai, EAS memberikan URL download. Buka URL tersebut di browser tablet → download → install.

---

## Production Signing (Untuk Rilis Resmi)

### Generate Keystore

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore kitafoto-release.keystore \
  -alias kitafoto \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Jawab pertanyaan yang muncul (nama, organisasi, dll.)

### Simpan Keystore dengan Aman

> ⚠️ **JANGAN HILANGKAN KEYSTORE INI.** Tanpa keystore yang sama, Anda tidak bisa update aplikasi yang sudah terinstall.

Simpan di:
- Lokal: `~/.kitafoto-keystore/kitafoto-release.keystore`
- Backup: Google Drive / USB drive

### Configure EAS untuk Keystore Custom

```bash
eas credentials
# Pilih: Android → Production → Upload Keystore
# Upload file .keystore yang baru dibuat
```

### Configure Local Build untuk Keystore

Buat file `android/app/keystore.properties` (JANGAN commit ke git):

```properties
storeFile=../../kitafoto-release.keystore
storePassword=password_anda
keyAlias=kitafoto
keyPassword=password_anda
```

Tambahkan ke `.gitignore`:
```
*.keystore
keystore.properties
```

---

## Optimasi Build

### Hermes Engine (Sudah Aktif)

Di `app.json`:
```json
"jsEngine": "hermes"
```

Hermes membuat startup lebih cepat dan APK lebih kecil (~2-4 MB lebih kecil).

### ProGuard / R8 (Otomatis)

EAS build dan `assembleRelease` otomatis menjalankan R8 (pengganti ProGuard) untuk minify dan shrink code.

### Ukuran APK Perkiraan

| Komponen | Estimasi |
|----------|---------|
| React Native + Hermes | ~8 MB |
| Expo modules | ~5 MB |
| VisionCamera | ~3 MB |
| Skia | ~5 MB |
| Reanimated | ~2 MB |
| App code + assets | ~3 MB |
| **Total APK** | **~25-30 MB** |

### Cara Cek Ukuran APK

```bash
ls -lh app/build/outputs/apk/release/app-release.apk
# atau
du -h app-release.apk
```

---

## Troubleshooting Build

### Error: "SDK location not found"

```bash
# Buat file android/local.properties
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

### Error: "Failed to install the following Android SDK packages"

Buka Android Studio → SDK Manager → install package yang diminta.

### Error: "Execution failed for task ':app:mergeReleaseResources'"

```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --platform android --clean
```

### Error: "Could not find com.facebook.react:react-android"

```bash
# Pastikan internet tersedia saat build
# Gradle butuh download dependency dari Maven Central
```

### Build Sukses tapi APK Crash Saat Dibuka

1. Cek logcat: `adb logcat | grep -E "FATAL|kitafoto"`
2. Kemungkinan: asset yang belum diisi (font/sound)
3. Pastikan semua file di `assets/` sudah terisi dengan benar

---

## CI/CD (Opsional)

### GitHub Actions

Buat `.github/workflows/build.yml`:

```yaml
name: Build APK
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform android --profile apk --non-interactive
```

### Cara Pakai

1. Buat token di [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Simpan di GitHub Secrets sebagai `EXPO_TOKEN`
3. Tag release: `git tag v1.0.0 && git push --tags`
4. Build otomatis jalan dan APK bisa didownload dari EAS dashboard

---

## Checklist Sebelum Rilis

- [ ] Semua font di `assets/fonts/` sudah terisi (bukan placeholder)
- [ ] Semua sound di `assets/sounds/` sudah terisi (bukan placeholder)
- [ ] App icon sudah sesuai branding (`assets/images/icons/app-icon.png`)
- [ ] `.env` sudah diisi dengan credentials asli
- [ ] `app.json` → `extra.eas.projectId` sudah diisi
- [ ] `npm run check` lolos (0 errors)
- [ ] Test APK di device nyata (bukan hanya emulator)
- [ ] Test webcam USB terhubung dan bisa capture
- [ ] Test printer bisa mencetak
- [ ] Test cloud upload berhasil
- [ ] Kiosk mode berfungsi

---

## Perintah Ringkas

```bash
# === PERTAMA KALI ===
npm install
eas login
eas build:configure     # buat eas.json jika belum ada

# === BUILD APK (paling gampang) ===
npm run build:apk       # cloud build, APK release, ~5-10 menit
                        # link download muncul di terminal

# === BUILD LOKAL (butuh Android SDK) ===
npm run build:local     # prebuild + gradlew assembleRelease
                        # APK di android/app/build/outputs/apk/release/

# === INSTALL KE TABLET ===
adb install -r <path-to-apk>
```
