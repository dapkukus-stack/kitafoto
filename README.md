# 📸 KitaFoto

> Aplikasi photobooth touchscreen ringan untuk Android tablet — cocok untuk bazar sekolah, ulang tahun, dan event kecil.

**Versi:** 1.0.0 · **Platform:** Android (min SDK 26 / Android 8) · **Target:** Samsung Galaxy Tab A9

---

## Daftar Isi

1. [Apa itu KitaFoto?](#1-apa-itu-kitafoto)
2. [Fitur Utama](#2-fitur-utama)
3. [Kebutuhan Hardware](#3-kebutuhan-hardware)
4. [Requirements Software](#4-requirements-software)
5. [Cara Install dari Nol](#5-cara-install-dari-nol)
6. [Setup Environment (.env)](#6-setup-environment-env)
7. [Cara Menjalankan Aplikasi](#7-cara-menjalankan-aplikasi)
8. [Cara Build & Release APK](#8-cara-build--release-apk)
9. [Setup Pertama Kali](#9-setup-pertama-kali)
10. [Panel Admin](#10-panel-admin)
11. [Cara Menambah Frame Foto](#11-cara-menambah-frame-foto)
12. [Cara Membuat Event Baru](#12-cara-membuat-event-baru)
13. [Setup Cloud Storage](#13-setup-cloud-storage)
14. [Kiosk Mode / Fullscreen](#14-kiosk-mode--fullscreen)
15. [Test Webcam](#15-test-webcam)
16. [Test Printer](#16-test-printer)
17. [Auto Print](#17-auto-print)
18. [Menangani Error Printer](#18-menangani-error-printer)
19. [Menangani Upload Gagal / Offline](#19-menangani-upload-gagal--offline)
20. [Maintenance Harian](#20-maintenance-harian)
21. [Maintenance Mingguan](#21-maintenance-mingguan)
22. [Backup & Restore Data](#22-backup--restore-data)
23. [Troubleshooting](#23-troubleshooting)
24. [FAQ](#24-faq)
25. [Kompatibilitas Device](#25-kompatibilitas-device)
26. [Performa & Optimasi](#26-performa--optimasi)
27. [Struktur Folder](#27-struktur-folder)
28. [Script NPM](#28-script-npm)
29. [Arsitektur Singkat](#29-arsitektur-singkat)
30. [Changelog](#30-changelog)
31. [Update Aplikasi](#31-update-aplikasi)

---

## 1. Apa itu KitaFoto?

KitaFoto adalah aplikasi photobooth berbasis tablet Android yang dirancang khusus untuk:

- **Bazar sekolah** dan acara pendidikan
- **Pesta ulang tahun** anak-anak
- **Event komunitas** kecil dan menengah
- **Usaha photobooth** keliling

Pengguna cukup menekan tombol besar di layar, memilih tema frame, berdiri di depan webcam, dan foto langsung dicetak otomatis — semua tanpa perlu membaca instruksi, karena UI dirancang agar anak SD pun bisa pakai sendiri.

**Alur penggunaan:**

```
Tekan Mulai → Pilih Frame → Countdown 3-2-1 → Foto →
Preview → Cetak Otomatis → Upload ke Cloud → Selesai
```

---

## 2. Fitur Utama

| Fitur | Keterangan |
|-------|-----------|
| 📸 Auto Foto | 1–4 foto per sesi, default strip vertikal 3 foto |
| 🖼️ Frame Foto | Upload frame PNG transparan lewat panel admin |
| ⏱️ Countdown | 3 detik default dengan suara lucu, bisa diubah |
| 🖨️ Auto Print | Cetak otomatis ke Canon MP287 via WiFi atau USB |
| ☁️ Auto Upload | Backup foto ke Cloudinary / Google Drive / Supabase |
| 📵 Offline First | Upload antri otomatis saat internet kembali |
| 🔒 Kiosk Mode | Layar terkunci — anak-anak tidak bisa keluar aplikasi |
| 👆 Admin Panel | Akses tersembunyi dengan PIN 6 digit |
| 🎨 Multi Event | Satu tablet bisa dipakai untuk banyak event berbeda |
| 📊 Statistik | Jumlah foto per hari, per event, status cetak & upload |
| 🔄 Retry Otomatis | Print dan upload gagal akan dicoba ulang otomatis |
| 🗑️ Auto Cleanup | Hapus file lokal otomatis setelah upload berhasil |
| 📱 Responsive | Otomatis menyesuaikan tampilan dari HP kecil ke tablet besar |

---

## 3. Kebutuhan Hardware

### Wajib Ada

| Perangkat | Spesifikasi Minimum | Rekomendasi |
|-----------|---------------------|-------------|
| **Tablet Android** | Android 8.0, 3GB RAM, layar 8 inci | Samsung Galaxy Tab A9 (11 inci) |
| **Webcam USB** | Webcam UVC standar, USB-A | Logitech C270 / C310 / C920 |
| **Kabel OTG** | USB-A female ke USB-C | Panjang 20–30 cm |
| **Printer** | Printer inkjet dengan WiFi | Canon MP287 |

### Opsional Tapi Disarankan

| Perangkat | Fungsi |
|-----------|--------|
| **Ring Light** | Pencahayaan wajah yang lebih baik |
| **Tripod tablet** | Posisi tablet stabil menghadap subjek foto |
| **Stand webcam** | Posisi kamera setinggi dada/wajah |
| **Charger aktif** | Tablet tetap terhubung charger selama event |
| **Router WiFi portable** | Koneksi printer dan internet tanpa bergantung WiFi venue |

### Catatan Penting

> ⚠️ **USB OTG:** Beberapa tablet memiliki batasan port OTG — hanya bisa satu perangkat USB sekaligus. Gunakan USB hub OTG bertenaga (powered USB hub) jika ingin sambungkan webcam + printer via USB bersamaan.
>
> ✅ **Solusi direkomendasikan:** Printer via WiFi + Webcam via USB OTG. Ini konfigurasi paling stabil.

---

## 4. Requirements Software

### Untuk Menjalankan Aplikasi (End User)
- Android 8.0 (Oreo) atau lebih baru
- Tidak perlu install apa-apa selain file APK

### Untuk Development / Build
| Tool | Versi | Keterangan |
|------|-------|-----------|
| Node.js | ≥ 18.0 | Runtime JavaScript |
| npm | ≥ 9.0 | Package manager |
| Java JDK | 17 | Dibutuhkan Android build |
| Android Studio | Ladybug+ | SDK dan emulator Android |
| Expo CLI | ≥ 0.18 | `npm install -g expo-cli` |
| EAS CLI | ≥ 10.0 | `npm install -g eas-cli` (untuk cloud build) |

### Android SDK yang Diperlukan
- **Android SDK Platform 34** (Android 14)
- **Android SDK Build-Tools 34**
- **Android NDK** (otomatis diinstall Expo Bare)

---

## 5. Cara Install dari Nol

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/dapkukus-stack/a.git kitafoto
cd kitafoto
```

### Langkah 2 — Install Dependensi

```bash
npm install
```

> 💡 Proses ini akan mengunduh semua package yang diperlukan. Butuh koneksi internet. Durasi: 3–10 menit.

### Langkah 3 — Setup Font

Download font **Nunito** dari [fonts.google.com/specimen/Nunito](https://fonts.google.com/specimen/Nunito), lalu salin ke folder `assets/fonts/`:

```
assets/fonts/
├── Nunito-Regular.ttf
├── Nunito-SemiBold.ttf
├── Nunito-Bold.ttf
├── Nunito-ExtraBold.ttf
└── Nunito-Black.ttf
```

### Langkah 4 — Setup Sound Effects

Ganti placeholder di `assets/sounds/` dengan file audio asli (format MP3). Lihat `assets/sounds/README.md` untuk panduan lengkap sumber audio gratis.

File yang diperlukan:
```
assets/sounds/
├── countdown-beep.mp3    # Beep setiap detik countdown
├── countdown-go.mp3      # Suara "yuk!" saat countdown habis
├── shutter.mp3           # Suara klik kamera
├── print-done.mp3        # Suara selesai cetak
├── success-jingle.mp3    # Jingle selesai sesi
└── ambience-fun.mp3      # Musik background (loop, 30–60 detik)
```

### Langkah 5 — Setup App Icon

Letakkan icon aplikasi di:
```
assets/images/icons/app-icon.png
```
Ukuran: minimal **1024 × 1024 px**, format PNG.

### Langkah 6 — Prebuild Native Android

```bash
npx expo prebuild --platform android
```

> ⚠️ Perintah ini menghasilkan folder `android/`. Harus dijalankan ulang setiap kali mengubah `app.json` atau menambah native module baru.

### Langkah 7 — Verifikasi Tooling

```bash
# Cek TypeScript (harus 0 errors)
npm run type-check

# Cek ESLint (harus 0 problems)
npm run lint
```

---

## 6. Setup Environment (.env)

### Salin Template

```bash
cp .env.example .env
```

### Isi Nilai di File `.env`

```env
# ── Cloudinary (isi jika pakai Cloudinary) ──────────────────
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=nama_cloud_kamu
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=kitafoto_preset

# ── Versi Aplikasi ──────────────────────────────────────────
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_ENV=production

# ── Feature Flags (isi true untuk aktifkan) ─────────────────
EXPO_PUBLIC_FEATURE_AI_BEAUTIFY=false
EXPO_PUBLIC_FEATURE_AI_BACKGROUND=false
EXPO_PUBLIC_FEATURE_AI_STYLE=false
EXPO_PUBLIC_DEBUG_MODE=false
```

### Cara Mendapatkan Cloudinary Credentials

1. Buka [cloudinary.com](https://cloudinary.com) → Daftar gratis
2. Masuk ke **Dashboard** → salin **Cloud Name**
3. Buka **Settings → Upload → Upload Presets**
4. Klik **Add upload preset**
5. Set **Signing Mode** ke `Unsigned`
6. Beri nama: `kitafoto_preset`
7. Salin nama preset ke `.env`

> 💡 **Tip:** Cloudinary free tier memberikan **25 GB storage** dan **25 GB bandwidth/bulan** — lebih dari cukup untuk event kecil.

---

## 7. Cara Menjalankan Aplikasi

### Mode Development (Langsung ke Device)

```bash
# Pastikan tablet terhubung via USB dan USB Debugging aktif
npm run android
```

### Cek Device Terhubung

```bash
adb devices
# Harus tampil: XXXXXXXXX  device
```

### Mode Development dengan Expo DevTools

```bash
npm run start
# Lalu scan QR code di Expo Go app (untuk testing cepat tanpa build native)
```

> ⚠️ **Expo Go tidak mendukung** USB OTG kamera dan print. Untuk fitur lengkap, wajib pakai `npm run android` (bare build).

---

## 8. Cara Build & Release APK

### Opsi A — EAS Build (Cloud, Direkomendasikan)

Tidak perlu Android Studio di komputer lokal. Build berjalan di server Expo.

```bash
# Install EAS CLI (sekali saja)
npm install -g eas-cli

# Login ke akun Expo
eas login

# Build APK untuk testing (debug signing)
eas build --platform android --profile preview

# Build APK production (release signing)
eas build --platform android --profile production
```

Hasil build bisa diunduh dari dashboard [expo.dev](https://expo.dev).

### Opsi B — Local Build

Butuh Android Studio terinstall.

```bash
# Generate Android project
npx expo prebuild --platform android

# Build APK release
cd android
./gradlew assembleRelease

# APK tersimpan di:
# android/app/build/outputs/apk/release/app-release.apk
```

### Install APK ke Tablet

```bash
# Via USB (pastikan adb terinstall dan USB Debugging aktif)
adb install -r app-release.apk

# Atau copy file APK ke tablet, lalu buka dari File Manager
```

### Konfigurasi Build (`eas.json`)

Jika belum ada, buat file `eas.json`:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "apk" }
    }
  }
}
```

---

## 9. Setup Pertama Kali

Setelah APK berhasil diinstall di tablet, ikuti langkah ini:

### 1. Buka Aplikasi
Tap ikon **KitaFoto** di launcher tablet.

### 2. Masuk ke Panel Admin
Tap logo **KitaFoto** di layar utama sebanyak **5 kali berturut-turut** dalam 3 detik.

### 3. Masukkan PIN Default
```
1 2 3 4 5 6
```
> ⚠️ **GANTI PIN INI SEGERA** setelah masuk pertama kali!

### 4. Ganti PIN Admin
`Panel Admin → ⚙️ Setting Aplikasi → Ganti PIN Admin`

### 5. Buat Event Pertama
`Panel Admin → 📅 Kelola Event → Buat Event Baru`

### 6. Upload Frame
`Panel Admin → 🖼️ Kelola Frame → Upload Frame`

### 7. Setup Printer
`Panel Admin → ⚙️ Setting Printer → Pilih tipe (WiFi/USB) → Test Print`

### 8. Setup Cloud (Opsional tapi Disarankan)
`Panel Admin → 🌐 Setting Cloud → Pilih Provider → Masukkan Credentials → Test Koneksi`

### 9. Aktifkan Kiosk Mode
`Panel Admin → ⚙️ Setting Aplikasi → Kiosk Mode → Aktifkan`

### 10. Siap Digunakan!
Tap **Keluar Admin** → layar akan kembali ke tampilan "Yuk Foto! 📸"

---

## 10. Panel Admin

Panel admin adalah pusat kontrol seluruh pengaturan KitaFoto.

### Cara Masuk

1. Di layar utama, **tap logo KitaFoto 5 kali** dalam waktu 3 detik
2. Masukkan **PIN 6 digit**

### Menu Panel Admin

| Menu | Fungsi |
|------|--------|
| 📅 **Kelola Event** | Buat event baru, ganti event aktif, arsip event lama |
| 🖼️ **Kelola Frame** | Upload frame PNG, atur urutan, aktifkan/nonaktifkan |
| 🖨️ **Antrian Print** | Lihat antrian, retry yang gagal, batalkan job |
| ☁️ **Status Upload** | Monitor upload, retry manual, lihat statistik |
| ⚙️ **Setting Printer** | Konfigurasi printer, test print |
| 🌐 **Setting Cloud** | Pilih provider, masukkan API key, test koneksi |
| 📊 **Statistik** | Jumlah foto hari ini, per event, total |
| 🗑️ **Kelola Cache** | Lihat penggunaan storage, hapus cache manual |
| ⚙️ **Setting Aplikasi** | Ganti PIN, jumlah foto, countdown, filter, suara |

### Cara Keluar dari Admin
Tap tombol **Keluar Admin** di pojok kanan atas → kembali ke layar user.

---


## 11. Cara Menambah Frame Foto

Frame adalah gambar **PNG transparan** yang ditempelkan di atas foto hasil jepretan.

### Format Frame yang Benar

| Kriteria | Nilai |
|----------|-------|
| **Format** | PNG dengan transparansi (RGBA) |
| **Ukuran file** | Maksimal 2 MB per frame |
| **Resolusi** | Minimal 1200 × 1800 px (untuk strip vertikal) |
| **Area foto** | Biarkan area tengah transparan untuk foto masuk |
| **Jumlah** | Maksimal 50 frame per event |

### Cara Upload Frame via Panel Admin

1. Masuk **Panel Admin → 🖼️ Kelola Frame**
2. Tap tombol **Upload Frame Baru**
3. Pilih file PNG dari penyimpanan tablet
4. Beri nama frame (contoh: "Frame Bintang Emas")
5. Tap **Simpan**
6. Frame langsung aktif dan bisa dipilih user

### Tips Membuat Frame

- Gunakan **Adobe Illustrator**, **Canva**, atau **Figma**
- Ekspor dengan background transparan
- Buat beberapa variasi warna untuk satu event
- Tema sesuai event (ulang tahun, bazar, dll.)
- Sisakan area kosong **minimal 60%** untuk foto wajah

### Mengatur Urutan Frame

Di menu **Kelola Frame**, seret (drag) kartu frame untuk mengubah urutan tampil di grid pilih frame.

---

## 12. Cara Membuat Event Baru

Satu event = satu set pengaturan (frame, countdown, jumlah foto, dll.).

### Langkah-Langkah

1. Masuk **Panel Admin → 📅 Kelola Event**
2. Tap **Buat Event Baru**
3. Isi form:
   - **Nama Event**: misal "Bazar SDN 01 — Juni 2025"
   - **Jumlah Foto**: 1, 2, 3, atau 4 foto per sesi
   - **Layout**: Strip vertikal (default), strip horizontal, grid 2×2, dll.
   - **Countdown**: berapa detik (default: 3 detik)
   - **Filter Default**: Natural, Cerah, Manis, atau Hitam Putih
   - **Auto Cetak**: Ya / Tidak
   - **Jumlah Cetak**: berapa lembar per sesi
4. Tap **Simpan**
5. Tap **Jadikan Aktif** untuk langsung pakai event ini

### Mengganti Event

Saat event berganti (misal hari Senin bazar, hari Sabtu ulang tahun):
1. Masuk Panel Admin
2. Buka **Kelola Event**
3. Tap event yang ingin diaktifkan
4. Tap **Jadikan Aktif**

Frame, pengaturan countdown, dan jumlah foto akan langsung berubah.

---

## 13. Setup Cloud Storage

KitaFoto mendukung beberapa provider cloud untuk backup foto:

| Provider | Status | Keterangan |
|----------|--------|-----------|
| **Cloudinary** | ✅ Siap pakai | Paling mudah setup, free 25GB |
| **Google Drive** | ✅ Siap pakai | Perlu login Google |
| **Firebase Storage** | 🔄 Segera | Tersedia versi berikutnya |
| **Supabase Storage** | 🔄 Segera | Tersedia versi berikutnya |

### Setup Cloudinary

1. Masuk **Panel Admin → 🌐 Setting Cloud**
2. Pilih **Cloudinary**
3. Isi:
   - **Cloud Name**: dari dashboard Cloudinary
   - **Upload Preset**: nama preset unsigned yang dibuat
4. Tap **Test Koneksi**
5. Jika berhasil → tap **Simpan sebagai Provider Utama**

### Setup Google Drive

1. Buat project di [Google Cloud Console](https://console.cloud.google.com)
2. Aktifkan **Google Drive API**
3. Buat **OAuth 2.0 Client ID** (tipe: Desktop/TV)
4. Salin **Client ID**
5. Di Panel Admin → Setting Cloud → Google Drive → masukkan Client ID
6. Tap **Login Google Drive**
7. Di HP/laptop, buka link yang tampil di tablet → setujui permission
8. Tablet otomatis terhubung

### Pengaturan Folder Cloud

Foto otomatis disimpan ke folder:
```
kitafoto/
└── {nama-event}/
    └── {tanggal}/
        └── foto_{sesi}.jpg
```

### Menjadikan Provider Backup

Satu event bisa punya **dua provider** sekaligus (utama + backup):
- Jika provider utama down → otomatis upload ke provider backup
- Setting di: **Panel Admin → Setting Cloud → Provider Backup**

---

## 14. Kiosk Mode / Fullscreen

Kiosk mode memastikan anak-anak tidak bisa keluar dari aplikasi KitaFoto.

### Aktifkan Kiosk Mode

```
Panel Admin → ⚙️ Setting Aplikasi → Kiosk Mode → Aktifkan
```

### Yang Dikunci di Kiosk Mode

- Tombol Home Android
- Tombol Recents (multitasking)
- Swipe-down notification bar
- Tombol Back (khusus flow user)

### Kiosk Mode Penuh (Device Owner)

Untuk keamanan lebih ketat (contoh: event tanpa pengawasan langsung):

```bash
# Jalankan perintah ini sekali via ADB setelah install APK
adb shell dpm set-device-owner com.kitafoto.app/.KioskDeviceAdminReceiver
```

> ⚠️ Setelah Device Owner diset, tidak bisa dihapus tanpa factory reset. Gunakan hanya untuk tablet yang memang khusus untuk KitaFoto.

### Nonaktifkan Kiosk Mode

```
Panel Admin → ⚙️ Setting Aplikasi → Kiosk Mode → Nonaktifkan
```

---

## 15. Test Webcam

Sebelum mulai event, selalu test webcam terlebih dahulu.

### Cara Test

1. Pastikan webcam USB sudah terpasang via kabel OTG
2. Masuk **Panel Admin → 📷 Test Webcam**
3. Layar akan menampilkan preview live dari webcam
4. Pastikan gambar jernih dan tidak lag

### Indikator Status Webcam

Di layar utama, pojok kanan atas terdapat indikator kecil:
- 🟢 Hijau = webcam terhubung dan siap
- 🟡 Kuning = sedang mendeteksi / fallback ke kamera tablet
- 🔴 Merah = webcam tidak terhubung

### Ganti Sumber Kamera

Jika punya lebih dari satu kamera (misal: webcam + kamera depan tablet):
```
Panel Admin → 📷 Test Webcam → Ganti Kamera → Pilih sumber
```

### Webcam Tidak Terdeteksi?

Lihat bagian [Troubleshooting](#23-troubleshooting).

---

## 16. Test Printer

### Cara Test Print

1. Pastikan printer sudah menyala dan terhubung
2. Masuk **Panel Admin → ⚙️ Setting Printer**
3. Pilih tipe koneksi:
   - **WiFi**: masukkan IP address printer
   - **USB OTG**: pastikan kabel terhubung
4. Tap **Test Print**
5. Printer akan mencetak halaman test

### Cek IP Address Printer (WiFi)

Cara mudah mendapatkan IP printer Canon MP287:
1. Tekan tombol **Menu** di printer
2. Pilih **Network Settings → WLAN**
3. IP address tampil di layar printer

Atau dari router WiFi: buka halaman admin router → lihat daftar perangkat terhubung.

### Indikator Status Printer

Di layar utama, pojok kanan atas:
- 🟢 Hijau = printer siap
- 🟡 Kuning = printer terdeteksi tapi status tidak pasti
- 🔴 Merah = printer tidak terhubung

---

## 17. Auto Print

Auto print artinya setiap sesi foto selesai, printer langsung mencetak **tanpa perlu konfirmasi**.

### Aktifkan / Nonaktifkan Auto Print

```
Panel Admin → 📅 Kelola Event → [Pilih Event] → Auto Cetak → Ya/Tidak
```

### Atur Jumlah Cetak per Sesi

```
Panel Admin → 📅 Kelola Event → [Pilih Event] → Jumlah Cetak → [1/2/3]
```

### Ukuran Kertas dan Layout

KitaFoto secara default mencetak **strip vertikal** hemat tinta. Ukuran output sekitar 2 inci × 6 inci (setengah kertas A6).

Untuk mengubah layout:
```
Panel Admin → 📅 Kelola Event → [Pilih Event] → Layout Foto
```
Pilihan: Strip Vertikal, Strip Horizontal, Satu Foto Besar, Grid 2×2

---

## 18. Menangani Error Printer

### Error: Printer Offline / Tidak Merespons

**Gejala:** Foto selesai tapi tidak ada yang tercetak, muncul pesan "Printer tidak terhubung".

**Langkah:**
1. Cek kabel power printer → pastikan menyala
2. Cek koneksi WiFi printer → pastikan sama jaringan dengan tablet
3. Restart printer
4. Di Panel Admin → Setting Printer → Test Print
5. Jika masih gagal: matikan dan nyalakan lagi printer, tunggu 30 detik

### Error: Kertas Habis

1. Isi kertas printer
2. Di Panel Admin → Antrian Print → Retry Semua Gagal

### Error: Tinta Hampir Habis

Ganti kartrid tinta sebelum event atau siapkan cadangan.

### Antrian Print Menumpuk

Jika banyak job gagal:
1. Masuk **Panel Admin → 🖨️ Antrian Print**
2. Lihat daftar job pending/gagal
3. Tap **Retry Semua** untuk mencoba ulang
4. Atau tap **Batalkan** untuk job yang tidak diperlukan lagi

### Foto Tetap Tersimpan Meski Printer Error

Semua foto tetap disimpan lokal dan dikirim ke cloud meski printer gagal. Foto tidak hilang.

---

## 19. Menangani Upload Gagal / Offline

### Cara Kerja Offline Mode

Saat internet tidak tersedia:
1. Foto tetap diambil dan dicetak seperti biasa
2. Upload ke cloud masuk ke **antrian offline**
3. Saat internet kembali, semua foto antrian otomatis diupload
4. Foto lokal dihapus otomatis setelah upload berhasil

### Cek Status Upload

```
Panel Admin → ☁️ Status Upload
```
Tampilan menunjukkan: berhasil, pending, gagal, sedang upload.

### Retry Upload Manual

Jika beberapa upload gagal permanen:
1. **Panel Admin → ☁️ Status Upload**
2. Tap **Retry Semua yang Gagal**

### Upload Gagal Terus?

Kemungkinan penyebab:
- Credentials Cloudinary salah → cek di Setting Cloud
- Provider cloud down → coba ganti ke provider backup
- Kuota cloud penuh → upgrade akun atau hapus foto lama

---

## 20. Maintenance Harian

Lakukan setiap hari sebelum dan sesudah event:

### Sebelum Event

- [ ] Cek koneksi WiFi tablet dan printer
- [ ] Test webcam: Panel Admin → Test Webcam
- [ ] Test print: Panel Admin → Setting Printer → Test Print
- [ ] Cek storage: Panel Admin → Kelola Cache → lihat % penggunaan
- [ ] Pastikan event yang benar sudah aktif
- [ ] Pastikan frame yang diinginkan sudah tersedia

### Sesudah Event

- [ ] Tunggu semua foto selesai dicetak dan diupload
- [ ] Cek Panel Admin → Status Upload → pastikan semua "Berhasil"
- [ ] Cek Panel Admin → Antrian Print → pastikan tidak ada pending
- [ ] Catat jumlah foto dari Panel Admin → Statistik

---

## 21. Maintenance Mingguan

Lakukan setiap minggu atau setelah beberapa event:

### Bersihkan Cache

```
Panel Admin → 🗑️ Kelola Cache → Hapus Cache Lama
```

Atau: biarkan otomatis — KitaFoto menghapus cache lama secara otomatis saat penggunaan storage mencapai 1.8 GB.

### Arsip Event Lama

```
Panel Admin → 📅 Kelola Event → [Event Lama] → Arsip
```

Event yang diarsip tidak tampil di daftar aktif tapi data fotonya tetap tersimpan.

### Update Cek

Cek apakah ada versi aplikasi terbaru (lihat bagian [Update Aplikasi](#31-update-aplikasi)).

### Backup Database

Lihat bagian [Backup & Restore Data](#22-backup--restore-data).

---

## 22. Backup & Restore Data

### Apa yang Perlu Di-backup?

KitaFoto menyimpan data di dua tempat:
1. **Database SQLite** (`kitafoto.db`) — event, frame, statistik, pengaturan
2. **File foto** — sudah otomatis di-backup ke cloud. File lokal dihapus setelah upload.

> ✅ Jika upload cloud aktif, foto sudah aman di cloud secara otomatis. Yang perlu di-backup manual hanya database.

### Cara Backup Database (via ADB)

```bash
# Ambil file database dari tablet
adb pull /data/data/com.kitafoto.app/databases/kitafoto.db ./backup-$(date +%Y%m%d).db

# Simpan di komputer / cloud storage
```

### Cara Backup via File Manager

1. Di tablet, buka **File Manager**
2. Navigasi ke `/Android/data/com.kitafoto.app/` (mungkin perlu akses root atau ADB)
3. Salin folder `databases/` ke penyimpanan eksternal

### Cara Restore

```bash
# Kirim file backup ke tablet
adb push ./backup-20250601.db /data/data/com.kitafoto.app/databases/kitafoto.db

# Restart aplikasi
adb shell am force-stop com.kitafoto.app
adb shell am start -n com.kitafoto.app/.MainActivity
```

> ⚠️ Restore akan menimpa semua data yang ada saat ini. Pastikan backup file sudah benar sebelum restore.

---

## 23. Troubleshooting

### 📷 Webcam Tidak Terdeteksi

| Langkah | Tindakan |
|---------|---------|
| 1 | Cabut dan tancapkan kembali kabel OTG |
| 2 | Saat muncul popup "Izinkan akses USB?" → tap **Ya** |
| 3 | Panel Admin → Test Webcam → Reconnect |
| 4 | Coba kabel OTG berbeda |
| 5 | Coba webcam berbeda |
| 6 | Restart aplikasi |
| 7 | Restart tablet |

**Webcam model tertentu tidak bekerja?**
Tidak semua webcam kompatibel dengan Android OTG. Webcam yang terbukti bekerja: Logitech C270, C310, C920, Razer Kiyo. Webcam murah China umumnya tidak punya driver UVC standard.

---

### 🖨️ Printer Tidak Mencetak

| Langkah | Tindakan |
|---------|---------|
| 1 | Cek printer menyala |
| 2 | Cek kertas tersedia |
| 3 | Cek tinta tidak habis |
| 4 | Cek tablet dan printer di jaringan WiFi sama |
| 5 | Panel Admin → Setting Printer → Test Print |
| 6 | Restart printer |
| 7 | Ganti tipe koneksi (coba USB jika WiFi bermasalah) |

---

### ☁️ Upload Selalu Gagal

| Langkah | Tindakan |
|---------|---------|
| 1 | Cek koneksi internet tablet |
| 2 | Panel Admin → Setting Cloud → Test Koneksi |
| 3 | Cek credentials Cloud Name dan Upload Preset |
| 4 | Buat ulang Upload Preset di dashboard Cloudinary |
| 5 | Cek kuota storage Cloudinary |
| 6 | Coba ganti provider ke Google Drive |

---

### 📱 Aplikasi Lemot / Lag

| Langkah | Tindakan |
|---------|---------|
| 1 | Panel Admin → Kelola Cache → Hapus Cache |
| 2 | Restart aplikasi |
| 3 | Tutup semua aplikasi lain di background |
| 4 | Restart tablet |
| 5 | Cek storage tablet tidak hampir penuh (butuh min. 2 GB kosong) |

---

### 🔒 Lupa PIN Admin

PIN tersimpan di database dalam bentuk hash. Tidak bisa di-decrypt.

**Reset PIN via ADB:**
```bash
adb shell "sqlite3 /data/data/com.kitafoto.app/databases/kitafoto.db \
  \"UPDATE app_settings SET value='8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' WHERE key='admin_pin_hash'\""
```

Perintah di atas mereset PIN kembali ke `123456`.

---

### ⚡ Aplikasi Crash / Force Close

1. Buka log via ADB: `adb logcat | grep kitafoto`
2. Restart aplikasi
3. Jika crash berulang saat buka screen tertentu → hubungi developer dengan screenshot log

---

## 24. FAQ

**Q: Apakah KitaFoto butuh internet terus-menerus?**
A: Tidak. Foto tetap bisa diambil dan dicetak tanpa internet. Internet hanya dibutuhkan untuk upload backup ke cloud.

---

**Q: Berapa foto yang bisa diambil dalam satu hari?**
A: Tidak ada batas dari aplikasi. Batas praktis tergantung: kecepatan printer, kertas yang tersedia, dan storage tablet. Dengan storage 2 GB, bisa menyimpan 2.000–4.000 foto sebelum perlu dibersihkan.

---

**Q: Bisakah satu tablet dipakai untuk beberapa event berbeda dalam satu minggu?**
A: Ya. Buat event berbeda di Panel Admin, masing-masing dengan frame dan pengaturan berbeda. Aktifkan event yang sesuai sebelum mulai.

---

**Q: Apakah foto user tersimpan permanen di tablet?**
A: Tidak. Foto lokal dihapus otomatis 3 hari setelah berhasil diupload ke cloud. Operator bisa mengunduh foto dari dashboard cloud (Cloudinary/Google Drive).

---

**Q: Bagaimana jika printer habis kertas saat acara berlangsung?**
A: Foto tetap diproses dan masuk antrian cetak. Saat kertas diisi kembali, KitaFoto otomatis melanjutkan cetak antrian tanpa perlu perintah manual.

---

**Q: Bisa pakai lebih dari satu printer?**
A: Saat ini satu printer per sesi. Fitur multiple printer direncanakan untuk versi mendatang.

---

**Q: Apakah bisa cetak tanpa webcam (pakai kamera bawaan tablet)?**
A: Ya. Jika webcam USB tidak terhubung, aplikasi otomatis fallback ke kamera depan tablet. Kualitas foto mungkin berbeda tergantung kamera tablet.

---

**Q: Apakah data foto aman?**
A: Foto diupload ke cloud dengan koneksi HTTPS terenkripsi. Di Cloudinary, foto tersimpan privat kecuali operator membagikan linknya secara manual.

---

**Q: Bisakah dipakai di HP Android (bukan tablet)?**
A: Ya. UI menyesuaikan otomatis untuk layar kecil. Namun pengalaman terbaik adalah di tablet ≥ 8 inci.

---

## 25. Kompatibilitas Device

### Tablet yang Direkomendasikan

| Device | Layar | RAM | Status |
|--------|-------|-----|--------|
| Samsung Galaxy Tab A9 | 11" | 4 GB | ✅ Direkomendasikan |
| Samsung Galaxy Tab A8 | 10.5" | 3 GB | ✅ Bekerja baik |
| Samsung Galaxy Tab A7 Lite | 8.7" | 3 GB | ✅ Bekerja baik |
| Samsung Galaxy Tab S6 Lite | 10.4" | 4 GB | ✅ Bekerja sangat baik |
| Realme Pad | 10.4" | 4 GB | ✅ Bekerja baik |
| Xiaomi Pad 5 | 11" | 6 GB | ✅ Bekerja sangat baik |

### HP Android (Mode Compact)

| Device | Status | Catatan |
|--------|--------|---------|
| Samsung Galaxy A55 | ✅ | Tampilan compact, lebih kecil |
| Xiaomi Redmi Note 13 | ✅ | Bisa, kurang ideal untuk kiosk |
| HP layar < 5 inci | ⚠️ | Tombol mungkin terlalu kecil |

### Versi Android

| Android | Status |
|---------|--------|
| Android 8.0 – 9 | ✅ Minimum supported |
| Android 10 – 12 | ✅ Stabil |
| Android 13 – 14 | ✅ Direkomendasikan |
| Android 7 ke bawah | ❌ Tidak didukung |

---

## 26. Performa & Optimasi

### Target Performa di Samsung Galaxy Tab A9

| Metrik | Target |
|--------|--------|
| Boot aplikasi | < 3 detik |
| Kamera siap | < 1,5 detik setelah screen terbuka |
| Proses foto (composite + simpan) | < 3 detik |
| RAM saat idle | < 150 MB |
| RAM saat aktif sesi foto | < 250 MB |
| Stabilitas | 6–10 jam nonstop tanpa crash |

### Tips agar Aplikasi Tetap Kencang

1. **Tutup aplikasi lain** sebelum mulai event
2. **Bersihkan cache** mingguan via Panel Admin → Kelola Cache
3. **Jangan isi storage tablet > 80%** — sisakan minimal 2 GB kosong
4. **Hubungkan charger** selama event agar tablet tidak throttle CPU
5. **Restart tablet** sekali sebelum event besar
6. **Matikan fitur tidak perlu**: Bluetooth, GPS, sync background app

### Ukuran Cache

KitaFoto otomatis membatasi penggunaan storage di 2 GB. Jika mendekati batas:
- 🟡 1,5 GB: peringatan tampil di layar admin
- 🔴 1,8 GB: auto hapus file lama yang sudah upload
- 🆘 1,9 GB: emergency cleanup — hapus semua yang sudah upload

---


## 27. Struktur Folder

```
kitafoto/
│
├── 📄 index.js                    # Entry point aplikasi
├── 📄 app.json                    # Konfigurasi Expo (nama, package, permissions)
├── 📄 package.json                # Dependensi dan script NPM
├── 📄 tsconfig.json               # Konfigurasi TypeScript
├── 📄 babel.config.js             # Konfigurasi Babel + module resolver
├── 📄 eslint.config.js            # Konfigurasi ESLint v10 flat config
├── 📄 .env.example                # Template environment variables
│
├── 📂 assets/
│   ├── 📂 fonts/                  # Font Nunito (harus diisi manual)
│   ├── 📂 images/
│   │   ├── 📂 icons/              # App icon
│   │   └── 📂 ui/                 # Background dan UI assets
│   └── 📂 sounds/                 # Sound effects MP3
│
├── 📂 src/
│   ├── 📂 app/
│   │   └── AppInitializer.tsx     # Boot sequence + init semua services
│   │
│   ├── 📂 components/
│   │   └── 📂 common/             # KitaButton, Mascot, StatusBar, dll.
│   │
│   ├── 📂 constants/
│   │   ├── colors.ts              # Palet warna brand KitaFoto
│   │   ├── config.ts              # Konfigurasi default aplikasi
│   │   ├── dimensions.ts          # Ukuran dan spacing (deprecated → pakai responsive/)
│   │   ├── routes.ts              # Nama-nama route navigasi
│   │   └── typography.ts          # Font families dan ukuran
│   │
│   ├── 📂 database/
│   │   ├── DatabaseService.ts     # Koneksi SQLite singleton
│   │   ├── schema.ts              # DDL tabel + migrasi
│   │   └── 📂 repositories/       # CRUD: Event, Frame, Photo, PrintJob, UploadJob
│   │
│   ├── 📂 hooks/
│   │   ├── useAdminGesture.ts     # Deteksi tap logo 5x
│   │   ├── useNetworkStatus.ts    # Monitor koneksi internet
│   │   └── useStorageGuard.ts     # Monitor penggunaan storage
│   │
│   ├── 📂 navigation/
│   │   ├── AppNavigator.tsx       # Root navigator (user + admin stack)
│   │   └── PlaceholderScreen.tsx  # Screen placeholder untuk fitur belum jadi
│   │
│   ├── 📂 responsive/
│   │   ├── breakpoints.ts         # Definisi breakpoint (xs/sm/md/lg/xl/xxl)
│   │   ├── useResponsive.ts       # Hook: width, height, bp, isTablet, isLandscape
│   │   ├── tokens.ts              # Design tokens adaptif per breakpoint
│   │   ├── grid.ts                # Helper kalkulasi grid responsif
│   │   └── index.ts               # Barrel export (@responsive alias)
│   │
│   ├── 📂 screens/
│   │   ├── 📂 user/               # Home, FramePicker, Countdown, Camera,
│   │   │                          # Processing, Preview, Done
│   │   └── 📂 admin/              # AdminLogin, AdminDashboard
│   │
│   ├── 📂 services/
│   │   ├── 📂 audio/              # AudioService (suara countdown, shutter, dll.)
│   │   ├── 📂 camera/             # WebcamService, CameraDeviceManager
│   │   ├── 📂 image/              # ImageProcessor, PhotoCapturePipeline, PhotoCompositor
│   │   ├── 📂 print/              # PrintService (IPP/RawBT), PrintQueue
│   │   └── 📂 storage/            # StorageManager, UploadQueue, MemoryCleanupService
│   │       └── 📂 providers/      # CloudinaryProvider, GoogleDriveProvider,
│   │                              # FirebaseProvider, SupabaseProvider
│   │
│   ├── 📂 store/                  # Zustand state (App, Event, Session, Admin)
│   │
│   ├── 📂 types/                  # TypeScript types (event, photo, print, storage, dll.)
│   │
│   ├── 📂 utils/                  # dateUtils, fileUtils
│   └── 📄 global.d.ts             # Ambient declarations untuk packages
│
└── 📂 docs/
    └── SETUP.md                   # Panduan setup developer
```

---

## 28. Script NPM

Jalankan semua perintah dari folder root project.

| Script | Perintah | Keterangan |
|--------|---------|-----------|
| `start` | `npm run start` | Jalankan Expo dev server |
| `android` | `npm run android` | Build dan jalankan di Android device/emulator |
| `build:android` | `npm run build:android` | Cloud build production (EAS) |
| `build:apk` | `npm run build:apk` | Cloud build APK preview (EAS) |
| `type-check` | `npm run type-check` | Cek TypeScript, harus 0 errors |
| `lint` | `npm run lint` | Cek ESLint, harus 0 problems |
| `lint:fix` | `npm run lint:fix` | Auto-fix ESLint yang bisa diperbaiki |
| `check` | `npm run check` | Jalankan type-check + lint sekaligus |
| `clean` | `npm run clean` | Hapus node_modules, .expo, build artifacts |
| `prebuild` | `npm run prebuild` | Generate ulang folder android/ |

### Contoh Penggunaan

```bash
# Sebelum commit, selalu jalankan:
npm run check

# Jika ada masalah lint:
npm run lint:fix

# Setelah update package atau ubah native module:
npm run prebuild
```

---

## 29. Arsitektur Singkat

KitaFoto menggunakan **React Native (Expo Bare Workflow)** dengan arsitektur berlapis:

```
┌─────────────────────────────────────────────────────┐
│              UI Layer (React Native)                 │
│  Screens → Components → Responsive System           │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              State Layer (Zustand)                   │
│  AppStore · EventStore · SessionStore · AdminStore  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│            Services Layer                            │
│  Camera · Image · Print · Storage · Audio           │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│            Data Layer (SQLite)                       │
│  DatabaseService · Repositories · Schema            │
└─────────────────────────────────────────────────────┘
```

### Prinsip Desain Utama

- **Offline-first**: semua data tersimpan lokal dulu, sinkronisasi cloud di background
- **Provider-agnostic**: cloud storage bisa diganti tanpa ubah business logic
- **Memory-safe**: camera ref di-release saat unmount, bitmap tidak disimpan di state
- **Responsive**: satu codebase untuk semua ukuran layar (360dp – 1280dp+)
- **Queue-based**: print dan upload menggunakan persistent queue di SQLite

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React Native 0.74 (Expo Bare) |
| Bahasa | TypeScript 5.3 |
| State | Zustand 4.5 |
| Database | expo-sqlite 14 |
| Navigasi | React Navigation 6 |
| Animasi | React Native Reanimated 3.10 |
| Compositing | @shopify/react-native-skia |
| Cloud | Cloudinary / Google Drive / Supabase |
| Camera | react-native-vision-camera 4 |
| Audio | expo-av |

---

## 30. Changelog

### v1.0.0 (2025)
- 🎉 Rilis pertama KitaFoto
- ✅ Flow foto lengkap: Home → Frame → Countdown → Capture → Preview → Done
- ✅ Auto print via WiFi IPP (Canon MP287) dan USB OTG (RawBT)
- ✅ Upload cloud: Cloudinary (production), Google Drive (production)
- ✅ Panel admin dengan PIN 6 digit
- ✅ Multi-event support
- ✅ Kiosk mode
- ✅ Responsive UI (360dp – 1280dp+)
- ✅ Offline queue untuk print dan upload
- ✅ Auto memory cleanup dan storage guard
- ✅ Mascot animasi "Kita" (SVG, 5 mood)
- ✅ Modular cloud storage (provider-agnostic architecture)
- 🔄 Firebase Storage — tersedia versi berikutnya
- 🔄 Supabase Storage — tersedia versi berikutnya
- 🔄 AI Beautify / Background Replace — direncanakan v1.5

---

## 31. Update Aplikasi

### Cek Versi Saat Ini

```
Panel Admin → ⚙️ Setting Aplikasi → Versi Aplikasi
```

### Cara Update ke Versi Baru

#### Langkah 1 — Tarik Kode Terbaru

```bash
git pull origin main
```

#### Langkah 2 — Update Dependensi

```bash
npm install
```

#### Langkah 3 — Verifikasi

```bash
npm run check
```

#### Langkah 4 — Rebuild APK

```bash
# EAS Build (cloud)
eas build --platform android --profile production

# Atau local build
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

#### Langkah 5 — Install ke Tablet

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

#### Langkah 6 — Migrasi Database (Jika Ada)

Jika ada perubahan schema database, KitaFoto menjalankan migrasi otomatis saat pertama kali buka setelah update. Tidak perlu tindakan manual.

> ⚠️ **Selalu backup database** sebelum update ke versi baru! Lihat bagian [Backup & Restore Data](#22-backup--restore-data).

### Update Konfigurasi Cloud

Jika credentials cloud berubah setelah update:
```
Panel Admin → 🌐 Setting Cloud → [Pilih Provider] → Update Credentials
```

---

## Lisensi & Kontak

KitaFoto dikembangkan oleh **dapkukus-stack**.

---

*Dokumentasi ini dibuat untuk versi KitaFoto v1.0.0*
