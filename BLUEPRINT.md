# 📸 KitaFoto — Blueprint & Arsitektur Lengkap
> Versi: 1.0.0 | Target: Samsung Galaxy Tab A9 | Platform: Android

---

## 1. 🎯 Tech Stack Decision

### Stack Terpilih: React Native (Expo Bare Workflow)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Framework** | React Native (Expo Bare) | Ringan, cross-platform, akses native Android penuh |
| **Language** | TypeScript | Type-safe, minim bug runtime, mudah maintain |
| **Navigation** | React Navigation v6 | De-facto standard, performa native |
| **State Management** | Zustand | Ultra ringan (~1KB), lebih hemat RAM dari Redux |
| **Local DB** | SQLite via expo-sqlite | Built-in Android, zero overhead, offline-first |
| **Camera** | react-native-vision-camera | Terbaik untuk USB/OTG webcam di Android |
| **Cloud Storage** | Cloudinary SDK | Free tier besar, auto-compress, mudah integrasi |
| **Print** | react-native-print + StarIO/RawBT bridge | Print via USB OTG atau WiFi |
| **Image Processing** | react-native-skia | GPU-accelerated, ringan untuk compositing frame |
| **Animations** | React Native Reanimated v3 | Native thread, tidak block JS thread |
| **Audio** | expo-av | Ringan, support background audio |
| **Storage** | expo-file-system + MMKV | MMKV 10x lebih cepat dari AsyncStorage |
| **Kiosk Mode** | react-native-android-kiosk | Lock Home button, back button, notif bar |
| **Queue/Background** | react-native-queue | Job queue ringan untuk print & upload |
| **Network** | @tanstack/react-query | Cache-first, retry otomatis, offline support |

### Kenapa BUKAN alternatif lain?

| Alternatif | Kenapa Ditolak |
|------------|----------------|
| Flutter | Dart learning curve, ekosistem printer/USB lebih terbatas |
| Capacitor/Ionic | WebView overhead, lambat untuk camera processing |
| Cordova | Legacy, tidak dioptimasi untuk Android modern |
| Electron | Windows only, berat untuk tablet Android |
| Native Kotlin | Overkill untuk 1 developer, lambat development |
| Redux | Terlalu berat untuk app ini, Zustand cukup |
| AsyncStorage | Lambat, pakai MMKV untuk performa |
| expo-camera | Tidak support USB OTG webcam eksternal |

---


## 2. 🗂️ Struktur Folder Lengkap

```
kitafoto/
├── android/                          # Native Android files (Expo Bare)
│   ├── app/src/main/
│   │   ├── java/com/kitafoto/
│   │   │   ├── KioskModule.java      # Native kiosk lock module
│   │   │   ├── PrinterModule.java    # Native USB print module
│   │   │   └── CameraModule.java     # USB OTG camera bridge
│   │   └── res/
│   │       ├── drawable/             # App icons, splash
│   │       └── values/               # Colors, strings
│   └── build.gradle
│
├── src/
│   ├── app/
│   │   ├── index.tsx                 # Entry point
│   │   ├── _layout.tsx               # Root layout
│   │   └── navigation/
│   │       ├── AppNavigator.tsx      # Main navigator
│   │       ├── UserStack.tsx         # User flow screens
│   │       └── AdminStack.tsx        # Admin panel screens
│   │
│   ├── screens/
│   │   ├── user/
│   │   │   ├── SplashScreen.tsx      # Splash + mascot animasi
│   │   │   ├── HomeScreen.tsx        # Layar utama "Yuk Foto!"
│   │   │   ├── FramePickerScreen.tsx # Pilih frame
│   │   │   ├── CountdownScreen.tsx   # Countdown 3-2-1
│   │   │   ├── CameraScreen.tsx      # Ambil foto (OTG webcam)
│   │   │   ├── PreviewScreen.tsx     # Preview hasil foto
│   │   │   ├── ProcessingScreen.tsx  # Compositing foto + frame
│   │   │   └── DoneScreen.tsx        # Selesai! animasi confetti
│   │   │
│   │   └── admin/
│   │       ├── AdminLoginScreen.tsx  # PIN 6 digit
│   │       ├── AdminDashboard.tsx    # Dashboard utama
│   │       ├── EventManagerScreen.tsx  # Buat/edit event
│   │       ├── FrameManagerScreen.tsx  # Upload/manage frame
│   │       ├── PrinterSettingScreen.tsx # Setting printer
│   │       ├── CloudSettingScreen.tsx   # Setting Cloudinary
│   │       ├── PhotoGalleryScreen.tsx   # Lihat foto event
│   │       ├── PrintQueueScreen.tsx     # Queue & retry print
│   │       ├── StatisticsScreen.tsx     # Jumlah foto, statistik
│   │       ├── CacheManagerScreen.tsx   # Clear cache, storage
│   │       ├── TestWebcamScreen.tsx     # Test koneksi webcam
│   │       └── TestPrinterScreen.tsx    # Test print halaman
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── KitaButton.tsx        # Tombol besar child-friendly
│   │   │   ├── KitaText.tsx          # Text dengan font fun
│   │   │   ├── KitaModal.tsx         # Modal popup
│   │   │   ├── KitaLoader.tsx        # Loading spinner lucu
│   │   │   ├── Mascot.tsx            # Mascot KitaFoto animasi
│   │   │   └── ConfettiOverlay.tsx   # Efek confetti ringan
│   │   │
│   │   ├── camera/
│   │   │   ├── CameraView.tsx        # Wrapper VisionCamera
│   │   │   ├── CountdownOverlay.tsx  # Overlay 3-2-1
│   │   │   └── FlashOverlay.tsx      # Efek flash saat foto
│   │   │
│   │   ├── frame/
│   │   │   ├── FrameCard.tsx         # Card preview frame
│   │   │   ├── FrameGrid.tsx         # Grid pilih frame (lazy load)
│   │   │   └── FrameCompositor.tsx   # Gabung foto + frame (Skia)
│   │   │
│   │   ├── photo/
│   │   │   ├── PhotoStrip.tsx        # Layout strip 1/2/3/4 foto
│   │   │   ├── FilterPreview.tsx     # Preview filter cerah/manis
│   │   │   └── PhotoThumbnail.tsx    # Thumbnail foto
│   │   │
│   │   └── admin/
│   │       ├── StatCard.tsx          # Card statistik
│   │       ├── QueueItem.tsx         # Item print queue
│   │       └── EventCard.tsx         # Card event
│   │
│   ├── store/                        # Zustand stores
│   │   ├── useAppStore.ts            # Global app state
│   │   ├── useEventStore.ts          # Event aktif
│   │   ├── useCameraStore.ts         # State kamera
│   │   ├── usePrintStore.ts          # Print queue state
│   │   ├── useUploadStore.ts         # Upload queue state
│   │   └── useAdminStore.ts          # Admin settings
│   │
│   ├── services/
│   │   ├── camera/
│   │   │   ├── CameraService.ts      # Detect & init USB webcam
│   │   │   └── PhotoCapture.ts       # Ambil foto, compress
│   │   │
│   │   ├── print/
│   │   │   ├── PrintService.ts       # Init printer, kirim job
│   │   │   ├── PrintQueue.ts         # Manage queue + retry
│   │   │   └── PrintTemplate.ts      # Generate layout print
│   │   │
│   │   ├── cloud/
│   │   │   ├── CloudinaryService.ts  # Upload foto ke Cloudinary
│   │   │   ├── UploadQueue.ts        # Queue upload + retry offline
│   │   │   └── FolderManager.ts      # Buat folder event/tanggal
│   │   │
│   │   ├── image/
│   │   │   ├── ImageProcessor.ts     # Compress, resize, compose
│   │   │   ├── FrameCompositor.ts    # Gabung foto + frame overlay
│   │   │   ├── FilterEngine.ts       # Apply filter cerah/manis/bw
│   │   │   └── StripGenerator.ts     # Generate strip layout
│   │   │
│   │   ├── storage/
│   │   │   ├── DatabaseService.ts    # SQLite operations
│   │   │   ├── FileService.ts        # File system management
│   │   │   ├── CacheManager.ts       # Auto cleanup cache
│   │   │   └── StorageGuard.ts       # Monitor & protect 2GB limit
│   │   │
│   │   └── audio/
│   │       ├── AudioService.ts       # Load & play sounds
│   │       └── SoundBank.ts          # Daftar semua sound assets
│   │
│   ├── hooks/
│   │   ├── useCamera.ts              # Camera lifecycle hook
│   │   ├── usePrinter.ts             # Printer status hook
│   │   ├── useUpload.ts              # Upload status hook
│   │   ├── useNetworkStatus.ts       # Monitor koneksi internet
│   │   ├── useStorageGuard.ts        # Monitor storage usage
│   │   ├── useAdminGesture.ts        # Deteksi tap logo 5x
│   │   └── useKioskMode.ts           # Enable/disable kiosk lock
│   │
│   ├── database/
│   │   ├── schema.ts                 # SQLite schema definition
│   │   ├── migrations/               # DB migrations
│   │   │   ├── v1_initial.ts
│   │   │   └── v2_ai_ready.ts        # Placeholder untuk AI nanti
│   │   └── repositories/
│   │       ├── EventRepository.ts    # CRUD events
│   │       ├── PhotoRepository.ts    # CRUD photos
│   │       ├── FrameRepository.ts    # CRUD frames
│   │       ├── PrintJobRepository.ts # CRUD print jobs
│   │       └── UploadJobRepository.ts # CRUD upload jobs
│   │
│   ├── constants/
│   │   ├── colors.ts                 # Tema warna KitaFoto
│   │   ├── typography.ts             # Font sizes & families
│   │   ├── dimensions.ts             # Layout dimensions
│   │   ├── config.ts                 # App config defaults
│   │   └── routes.ts                 # Navigation route names
│   │
│   ├── types/
│   │   ├── event.types.ts            # Event, Frame types
│   │   ├── photo.types.ts            # Photo, Strip types
│   │   ├── print.types.ts            # PrintJob types
│   │   ├── upload.types.ts           # UploadJob types
│   │   ├── camera.types.ts           # Camera device types
│   │   └── ai.types.ts               # AI feature types (future)
│   │
│   └── utils/
│       ├── dateUtils.ts              # Format tanggal
│       ├── fileUtils.ts              # File helper
│       ├── validationUtils.ts        # Validasi input
│       ├── compressionUtils.ts       # Image compression
│       └── performanceUtils.ts       # Memory & CPU monitor
│
├── assets/
│   ├── fonts/
│   │   ├── Nunito-Regular.ttf        # Font utama (rounded, fun)
│   │   ├── Nunito-Bold.ttf
│   │   └── Nunito-ExtraBold.ttf
│   │
│   ├── images/
│   │   ├── mascot/
│   │   │   ├── mascot-idle.png       # Mascot diam
│   │   │   ├── mascot-happy.png      # Mascot senang
│   │   │   ├── mascot-countdown.png  # Mascot countdown
│   │   │   └── mascot-done.png       # Mascot selesai
│   │   ├── icons/
│   │   │   ├── logo.png
│   │   │   └── app-icon.png
│   │   └── ui/
│   │       ├── bg-main.png           # Background utama
│   │       └── bg-admin.png          # Background admin
│   │
│   └── sounds/
│       ├── countdown-beep.mp3        # Beep tiap detik
│       ├── countdown-go.mp3          # Suara "Go!"
│       ├── shutter.mp3               # Suara kamera
│       ├── print-done.mp3            # Suara selesai cetak
│       ├── success-jingle.mp3        # Jingle selesai
│       └── ambience-fun.mp3          # Musik background ringan
│
├── docs/
│   ├── BLUEPRINT.md                  # File ini
│   ├── SETUP.md                      # Panduan setup
│   ├── ADMIN_GUIDE.md                # Panduan admin
│   └── AI_ROADMAP.md                 # Rencana fitur AI
│
├── .env.example                      # Template env variables
├── app.json                          # Expo config
├── package.json
├── tsconfig.json
└── babel.config.js
```

---


## 3. 🔄 Flow Aplikasi Lengkap

### 3.1 Flow Utama User

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP STARTUP                               │
│  1. Check kiosk mode aktif                                       │
│  2. Load event aktif dari SQLite                                 │
│  3. Check webcam USB terhubung                                   │
│  4. Check printer status                                         │
│  5. Check koneksi internet → start upload queue jika ada backlog │
│  6. Preload frames aktif (lazy, max 5 frame dulu)                │
│  7. Tampilkan SplashScreen (mascot animasi, max 2 detik)         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       HOME SCREEN                                │
│  • Tampil logo KitaFoto + mascot idle                            │
│  • Tombol besar "YUK FOTO! 📸"                                   │
│  • Background animasi ringan (bubble/confetti sangat halus)      │
│  • Indikator status: webcam ✓ printer ✓ internet ✓              │
│  • Tap logo 5x → cek gesture → masuk Admin PIN                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ tap "Yuk Foto!"
┌─────────────────────────────────────────────────────────────────┐
│                    FRAME PICKER SCREEN                           │
│  • Grid frame (lazy load, 4 kolom)                               │
│  • Swipe horizontal per kategori (jika > 12 frame)               │
│  • Tap frame → highlight + preview kecil                         │
│  • Tombol "PILIH FRAME INI! ✨" besar di bawah                   │
│  • Tombol "← Balik" kecil di atas kiri                          │
│  • Timeout 30 detik tidak pilih → kembali Home (reset)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ pilih frame
┌─────────────────────────────────────────────────────────────────┐
│                     COUNTDOWN SCREEN                             │
│  • Mascot "siap-siap!" pose                                      │
│  • Countdown 3... 2... 1... dengan suara lucu                    │
│  • Flash putih saat 0                                            │
│  • Jika 3 foto: repeat countdown per foto                        │
│  • Progress indicator "Foto 1 dari 3"                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓ countdown selesai
┌─────────────────────────────────────────────────────────────────┐
│                      CAMERA / CAPTURE                            │
│  • Capture dari USB webcam                                       │
│  • Suara shutter                                                 │
│  • Flash overlay efek                                            │
│  • Compress otomatis (max 2MP untuk print kecil)                 │
│  • Simpan sementara ke /cache/session/                           │
│  • Jika foto < jumlah target → balik Countdown                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ semua foto selesai
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING SCREEN                             │
│  • Mascot "lagi diproses..." animasi                             │
│  • Composite: tempel foto ke frame (Skia GPU)                    │
│  • Generate strip layout (vertikal default)                      │
│  • Apply filter jika dipilih (opsional)                          │
│  • Generate 2 file: print_version.jpg + cloud_version.jpg        │
│  • Simpan ke SQLite record                                        │
│  • Estimasi waktu: < 2 detik di Tab A9                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PREVIEW SCREEN                               │
│  • Tampil hasil foto strip (4 detik preview, auto lanjut)        │
│  • Mascot "wah keren!" pose                                      │
│  • Tidak ada tombol pilih filter (sudah default)                 │
│  • Admin bisa set filter default dari panel                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ auto setelah 4 detik
┌─────────────────────────────────────────────────────────────────┐
│                      DONE SCREEN                                 │
│  • Confetti animasi!                                             │
│  • Mascot jumping happy!                                         │
│  • "Foto kamu lagi dicetak! 🖨️"                                  │
│  • Trigger: Print job → PrintQueue                               │
│  • Trigger: Upload job → UploadQueue                             │
│  • Countdown 5 detik → kembali Home otomatis                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ background (non-blocking)
┌──────────────────┐    ┌──────────────────────────────────────┐
│   PRINT QUEUE    │    │         UPLOAD QUEUE                  │
│ • Kirim ke USB   │    │ • Upload ke Cloudinary                │
│   printer        │    │ • Folder: events/{id}/{YYYY-MM-DD}/   │
│ • Retry 3x gagal │    │ • Compress sebelum upload (80% quality│
│ • Status: pending│    │ • Jika offline: tunggu, retry auto    │
│   /printing/done │    │ • Delete lokal setelah sukses         │
│   /failed        │    │ • Delete lokal setelah 3 hari         │
└──────────────────┘    └──────────────────────────────────────┘
```

### 3.2 Flow Admin Panel

```
Tap Logo 5x → Deteksi gesture (useAdminGesture hook)
     ↓
AdminLoginScreen → Input PIN 6 digit
     ↓ PIN benar
AdminDashboard
├── 📅 Event Manager    → Buat event baru, set aktif, arsip lama
├── 🖼️ Frame Manager    → Upload frame PNG, atur urutan, hapus
├── 📊 Statistics       → Total foto hari ini/bulan, per event
├── 🖨️ Print Queue      → Lihat queue, retry gagal, skip
├── ☁️ Cloud Setting    → Set Cloudinary key, test koneksi
├── 🖨️ Printer Setting  → Set printer IP/USB, test print
├── 📷 Test Webcam      → Preview live dari webcam
├── 🗑️ Cache Manager    → Lihat ukuran cache, clear manual
├── 📤 Export Data      → Export CSV/JSON data foto
└── ⚙️ App Setting      → Countdown, jumlah foto, layout, filter, mute
```

### 3.3 Flow Error Handling

```
WEBCAM ERROR:
  → Tampil pesan "Kamera belum terhubung 📷"
  → Tombol "Coba Lagi" (retry detect USB)
  → Jika 3x gagal → notif admin

PRINTER ERROR:
  → Foto tetap lanjut proses normal
  → Print job masuk queue dengan status "pending"
  → Background retry setiap 30 detik, max 5x
  → Jika semua gagal → status "failed", muncul di admin panel
  → Upload cloud tetap jalan normal

UPLOAD GAGAL (offline):
  → Simpan ke upload_queue di SQLite
  → Monitor koneksi (useNetworkStatus)
  → Saat internet kembali → process queue FIFO
  → Retry exponential backoff (1s, 2s, 4s, 8s, max 60s)

STORAGE PENUH (> 2GB):
  → StorageGuard alert admin
  → Auto-delete foto yang sudah upload > 3 hari
  → Jika masih penuh → delete yang sudah upload terlama
  → Notif warning di HomeScreen untuk admin

CRASH/FORCE CLOSE:
  → Kiosk mode auto-restart app (launcher setting)
  → Resume session dari SQLite state
  → Print queue & upload queue tetap tersimpan
```

---


## 4. 🗄️ Database Schema (SQLite)

```sql
-- ============================================
-- TABLE: events
-- ============================================
CREATE TABLE events (
  id          TEXT PRIMARY KEY,        -- UUID
  name        TEXT NOT NULL,           -- "Bazar SDN 01"
  description TEXT,
  is_active   INTEGER DEFAULT 0,       -- 1 = event aktif sekarang
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  
  -- Settings per event
  photo_count      INTEGER DEFAULT 3,  -- 1/2/3/4 foto
  layout_type      TEXT DEFAULT 'strip_vertical', -- strip_vertical/grid_2x2/single
  countdown_secs   INTEGER DEFAULT 3,
  filter_default   TEXT DEFAULT 'natural', -- natural/bright/sweet/bw
  auto_print       INTEGER DEFAULT 1,
  print_copies     INTEGER DEFAULT 1,
  cloudinary_folder TEXT               -- override folder name
);

-- ============================================
-- TABLE: frames
-- ============================================
CREATE TABLE frames (
  id          TEXT PRIMARY KEY,        -- UUID
  event_id    TEXT REFERENCES events(id),
  name        TEXT NOT NULL,           -- "Frame Bintang"
  file_path   TEXT NOT NULL,           -- local path PNG transparan
  thumbnail   TEXT,                    -- local thumbnail path
  sort_order  INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT NOT NULL,
  
  -- Frame metadata
  width       INTEGER,                 -- px
  height      INTEGER,
  file_size   INTEGER                  -- bytes
);

-- ============================================
-- TABLE: photos
-- ============================================
CREATE TABLE photos (
  id              TEXT PRIMARY KEY,    -- UUID
  event_id        TEXT REFERENCES events(id),
  frame_id        TEXT REFERENCES frames(id),
  session_id      TEXT NOT NULL,       -- group foto 1 sesi
  
  -- File paths
  raw_path        TEXT,                -- foto mentah dari kamera
  processed_path  TEXT,                -- foto + frame sudah composite
  print_path      TEXT,                -- versi untuk print (compressed)
  cloud_url       TEXT,                -- URL setelah upload Cloudinary
  
  -- Metadata
  filter_applied  TEXT DEFAULT 'natural',
  layout_type     TEXT,
  photo_count     INTEGER,
  
  -- Status
  upload_status   TEXT DEFAULT 'pending', -- pending/uploading/done/failed
  print_status    TEXT DEFAULT 'pending', -- pending/printing/done/failed
  
  created_at      TEXT NOT NULL,
  uploaded_at     TEXT,
  printed_at      TEXT
);

-- ============================================
-- TABLE: print_jobs
-- ============================================
CREATE TABLE print_jobs (
  id            TEXT PRIMARY KEY,
  photo_id      TEXT REFERENCES photos(id),
  status        TEXT DEFAULT 'pending', -- pending/printing/done/failed/cancelled
  attempts      INTEGER DEFAULT 0,
  max_attempts  INTEGER DEFAULT 5,
  last_error    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  printed_at    TEXT
);

-- ============================================
-- TABLE: upload_jobs
-- ============================================
CREATE TABLE upload_jobs (
  id            TEXT PRIMARY KEY,
  photo_id      TEXT REFERENCES photos(id),
  status        TEXT DEFAULT 'pending', -- pending/uploading/done/failed
  attempts      INTEGER DEFAULT 0,
  max_attempts  INTEGER DEFAULT 10,
  next_retry_at TEXT,                   -- exponential backoff timestamp
  last_error    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  uploaded_at   TEXT,
  cloud_url     TEXT
);

-- ============================================
-- TABLE: app_settings
-- ============================================
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Default settings:
-- admin_pin = "123456"  (hashed)
-- kiosk_enabled = "true"
-- storage_limit_mb = "2048"
-- auto_delete_days = "3"
-- audio_muted = "false"
-- cloudinary_cloud_name = ""
-- cloudinary_upload_preset = ""
-- printer_type = "usb"  (usb/wifi/pc_bridge)
-- printer_ip = ""       (jika wifi)
-- app_version = "1.0.0"

-- ============================================
-- INDEXES untuk performa
-- ============================================
CREATE INDEX idx_photos_event ON photos(event_id);
CREATE INDEX idx_photos_session ON photos(session_id);
CREATE INDEX idx_photos_upload_status ON photos(upload_status);
CREATE INDEX idx_photos_print_status ON photos(print_status);
CREATE INDEX idx_print_jobs_status ON print_jobs(status);
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);
CREATE INDEX idx_frames_event ON frames(event_id);
```

---

## 5. ☁️ Cloudinary Folder Structure

```
cloudinary/
└── kitafoto/                              # root folder
    └── {event_id}_{event_name}/           # e.g: "abc123_BazarSDN01"
        └── {YYYY-MM-DD}/                  # e.g: "2025-07-15"
            ├── photo_{session_id}.jpg     # processed final photo
            └── thumb_{session_id}.jpg     # thumbnail (opsional)
```

**Upload Config:**
- Format: JPEG
- Quality: 80% (hemat bandwidth, cukup untuk backup)
- Max dimension: 2048px (cukup untuk preview admin)
- Tags: `["kitafoto", event_id, tanggal]`
- Context: `{event_name, session_id, filter_applied}`

---


## 6. ⚡ Strategi Optimasi Performa (Tab A9 Focus)

### 6.1 Memory Management
```
• Zustand stores: pakai shallow equality check, hindari subscribe semua
• Image: compress SEBELUM simpan ke state (max 800KB per foto)
• Frame PNG: cache max 5 frame di memory, sisanya lazy load
• React.memo() pada semua komponen berat (FrameCard, PhotoStrip)
• useMemo/useCallback pada semua computed values
• Unmount CameraView saat tidak dipakai (hemat 50-80MB RAM)
• FlatList dengan getItemLayout + removeClippedSubviews untuk frame grid
• Avoid setState pada render loop (gunakan refs untuk animasi counter)
```

### 6.2 Image Processing Pipeline
```
RAW CAPTURE (webcam)
    ↓ compress ke JPEG 85% + resize max 1600x1200
    ↓ simpan ke /cache/session/{sessionId}/raw_{n}.jpg
    ↓ (ukuran: ~200-400KB per foto)

COMPOSITING (Skia GPU)
    ↓ load frame PNG (dari cache)
    ↓ draw foto sebagai background
    ↓ overlay frame PNG di atas
    ↓ apply filter jika ada (color matrix transform)
    ↓ export JPEG 90% untuk print (ukuran: ~500KB-1MB)
    ↓ export JPEG 75% untuk cloud (ukuran: ~200-400KB)

PRINT VERSION
    ↓ resize ke DPI yang tepat untuk strip print 4R/2R
    ↓ kirim binary ke printer (RawBT bridge atau USB direct)

CLEANUP setelah upload sukses:
    ↓ hapus raw files
    ↓ hapus processed file
    ↓ keep thumbnail saja di SQLite untuk gallery
```

### 6.3 Startup Optimization
```
• App startup target: < 3 detik
• Lazy import screens (tidak load semua screen saat boot)
• SQLite init: background thread, non-blocking
• Camera init: background, tampil Home dulu
• Preload sounds: hanya countdown + shutter saat start
• Defer: frame thumbnails, admin screens, statistics
• Splash screen native (bukan JS): tampil instant
```

### 6.4 Animation Budget (Tab A9)
```
• Gunakan HANYA Reanimated v3 (berjalan di UI thread native)
• Hindari Animated API lama (berjalan di JS thread)
• Confetti: max 30 partikel, gunakan Canvas/Skia bukan View
• Mascot: Lottie JSON ringan ATAU PNG sequence 4-6 frame
• Countdown angka: scale + opacity transform saja
• Transisi screen: slide sederhana, 200ms, tidak perlu blur
• Background bubble Home: max 8 bubble, infinite loop slow
• FPS target: 60fps saat interaksi, 30fps boleh saat idle
```

### 6.5 Background Services
```
PrintQueue Worker:
• Jalan di background thread (Headless JS)
• Poll setiap 5 detik cek queue
• Max 1 print job concurrent
• Exponential retry: 5s, 10s, 30s, 60s, 120s

UploadQueue Worker:
• Monitor network state changes
• Batch upload: max 3 concurrent uploads
• Pause otomatis saat network lemah (< 1 bar)
• Resume saat wifi/4G kembali
• Exponential retry: 2s, 4s, 8s, 16s, 32s, 60s

StorageGuard:
• Check setiap 10 menit
• Alert jika > 1.5GB (warning)
• Auto-cleanup jika > 1.8GB (hapus tertua yang sudah upload)
• Emergency cleanup jika > 1.9GB (hapus semua sudah upload)
• Never delete yang belum upload
```

### 6.6 Kiosk Mode Implementation
```
• Gunakan react-native-android-kiosk atau Device Owner API
• Disable: Home button, Recents button, Status bar swipe
• Lock: volume buttons (atau limit volume via audio focus)
• Auto-start: app launch on boot
• Auto-restart: crash recovery via AlarmManager
• Screen: selalu ON (WakeLock.SCREEN_BRIGHT)
• Orientation: LANDSCAPE lock (atau PORTRAIT tergantung setup)
```

---

## 7. 🎨 Design System KitaFoto

### Color Palette
```typescript
export const Colors = {
  // Primary Brand
  primary:    '#4FC3F7',  // Biru muda cerah
  primaryDark:'#0288D1',  // Biru lebih gelap
  secondary:  '#FFF176',  // Kuning ceria
  accent:     '#FFFFFF',  // Putih bersih
  
  // Background
  bgMain:     '#E3F2FD',  // Biru sangat muda (background utama)
  bgCard:     '#FFFFFF',  // Putih untuk card
  bgAdmin:    '#F8F9FA',  // Abu sangat muda untuk admin
  
  // Status colors
  success:    '#66BB6A',  // Hijau
  warning:    '#FFA726',  // Oranye
  error:      '#EF5350',  // Merah
  
  // Text
  textPrimary:   '#1A237E', // Biru tua untuk teks utama
  textSecondary: '#546E7A', // Abu untuk teks sekunder
  textLight:     '#FFFFFF', // Putih untuk teks di background gelap
  
  // Gradients (untuk tombol & header)
  gradientBlue:  ['#4FC3F7', '#0288D1'],
  gradientYellow:['#FFF176', '#FFD54F'],
};
```

### Typography
```typescript
export const Typography = {
  // Font: Nunito (rounded, friendly, child-readable)
  
  // User-facing (besar!)
  heroTitle:  { fontSize: 48, fontFamily: 'Nunito-ExtraBold' },
  bigButton:  { fontSize: 32, fontFamily: 'Nunito-Bold' },
  countdown:  { fontSize: 120, fontFamily: 'Nunito-ExtraBold' },
  screenTitle:{ fontSize: 28, fontFamily: 'Nunito-Bold' },
  bodyLarge:  { fontSize: 22, fontFamily: 'Nunito-Regular' },
  
  // Admin panel (normal size)
  adminTitle: { fontSize: 20, fontFamily: 'Nunito-Bold' },
  adminBody:  { fontSize: 16, fontFamily: 'Nunito-Regular' },
  adminSmall: { fontSize: 14, fontFamily: 'Nunito-Regular' },
};
```

### Tombol Design
```
KitaButton (user-facing):
• Height: 80dp minimum
• Border radius: 24dp (rounded pill)
• Shadow: elevation 4
• Font: 28-32sp Bold Nunito
• Icon: emoji atau icon 32dp
• Press feedback: scale 0.95 (Reanimated, 100ms)
• Color: gradient biru/kuning/hijau sesuai aksi
```

---

## 8. 🤖 AI Readiness Roadmap

Arsitektur sudah didesain untuk upgrade AI tanpa rewrite:

```
Phase 1 (Sekarang): Classic Photobooth
  ✓ Frame overlay (static PNG)
  ✓ Filter warna (color matrix)
  ✓ Auto print & upload

Phase 2 (AI Basic): +3-6 bulan
  → AI Beautify ringan (face smoothing)
     Gunakan: Google ML Kit Face Mesh (on-device, gratis)
  → AI Auto-crop & center wajah
     Gunakan: ML Kit Face Detection

Phase 3 (AI Advanced): +6-12 bulan
  → AI Background Replace
     Gunakan: MediaPipe Selfie Segmentation (on-device)
  → AI Anime/Roblox Style Filter
     Gunakan: TFLite model ringan (< 20MB)
  → AI Auto Sticker (deteksi posisi wajah → tempel stiker lucu)
     Gunakan: ML Kit Face Landmarks

Arsitektur pendukung sudah ada:
  • FilterEngine.ts → tinggal tambah AI filter type
  • ImageProcessor.ts → pipeline sudah modular
  • ai.types.ts → type definitions sudah disiapkan
  • v2_ai_ready.ts → DB migration sudah disiapkan
```

---

## 9. 🔧 Environment Variables (.env)

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=kitafoto_preset
CLOUDINARY_API_KEY=your_api_key        # hanya untuk admin panel

# App Config
APP_VERSION=1.0.0
APP_ENV=production                      # development/production
DEBUG_MODE=false

# Printer (bisa di-override dari admin panel)
DEFAULT_PRINTER_TYPE=usb               # usb/wifi/bridge
DEFAULT_PRINTER_IP=

# Feature Flags (untuk progressive rollout)
FEATURE_AI_BEAUTIFY=false
FEATURE_AI_BACKGROUND=false
FEATURE_AI_STYLE=false
```

---

## 10. 📋 Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Setup Expo Bare project + TypeScript
- [ ] Setup navigation structure
- [ ] Implement design system (colors, typography, components)
- [ ] SQLite schema + repositories
- [ ] MMKV storage setup
- [ ] Mascot design & basic assets

### Phase 2: Core User Flow (Week 3-4)
- [ ] HomeScreen + mascot
- [ ] FramePicker dengan lazy loading
- [ ] Countdown + audio
- [ ] Camera capture (USB OTG webcam)
- [ ] Frame compositing (Skia)
- [ ] Preview + Done screen

### Phase 3: Print & Upload (Week 5-6)
- [ ] PrintService + USB print
- [ ] PrintQueue dengan retry
- [ ] Cloudinary upload service
- [ ] UploadQueue dengan offline support
- [ ] StorageGuard + auto-cleanup

### Phase 4: Admin Panel (Week 7-8)
- [ ] Kiosk mode implementation
- [ ] Admin login PIN
- [ ] Event manager
- [ ] Frame uploader
- [ ] Settings panel
- [ ] Print queue monitor
- [ ] Statistics dashboard

### Phase 5: Polish & Optimize (Week 9-10)
- [ ] Performance profiling Tab A9
- [ ] Memory leak audit
- [ ] Animation smoothing
- [ ] Error handling & recovery
- [ ] Testing skenario edge cases
- [ ] Production build & APK

---

*KitaFoto Blueprint v1.0.0 — Generated for Samsung Galaxy Tab A9*
*Stack: React Native (Expo Bare) + TypeScript + Zustand + SQLite + Cloudinary*


---

## 11. ☁️ Modular Cloud Storage Architecture (v2)

> Diperbarui di Phase 2. Menggantikan arsitektur Cloudinary-only di v1.

### 11.1 Desain Filosofi

```
PRINSIP:
  Provider-Agnostic  → kode bisnis tidak tahu provider apa yang dipakai
  Open/Closed        → tambah provider baru tanpa ubah kode yang ada
  Fail-Safe          → upload tetap berjalan meski primary provider down
  Offline-First      → semua upload persistent di SQLite, tidak hilang saat crash
  Lightweight        → lazy loading provider, hemat RAM di Tab A9
```

### 11.2 Layer Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                       │
│   PhotoSession → enqueue(photoId) → UploadQueue          │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│              UPLOAD QUEUE (universal)                     │
│  • Persistent di SQLite (survive crash)                   │
│  • Exponential backoff retry                              │
│  • Pause/resume saat offline                              │
│  • Max 3 concurrent (throttled)                           │
│  • FIFO + priority queue                                  │
│  • Event listener untuk UI real-time                      │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│              STORAGE MANAGER (orchestrator)               │
│  • Pilih primary provider                                 │
│  • Auto failover ke backup jika primary down              │
│  • Health monitoring semua provider (5 menit interval)    │
│  • Upload history logging (analytics)                     │
│  • Credential encryption/decryption                       │
│  • Provider switching tanpa restart app                   │
└──────┬──────────┬──────────┬───────────┬─────────────────┘
       ↓          ↓          ↓           ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│Cloudinary│ │ Google   │ │Firebase  │ │ Supabase         │
│Provider  │ │ Drive    │ │ Storage  │ │ Storage          │
│          │ │ Provider │ │ (Phase2) │ │ (Phase2)         │
│✓ Prod    │ │✓ Prod    │ │⚡ Skeleton│ │⚡ Skeleton        │
└──────────┘ └──────────┘ └──────────┘ └──────────────────┘
       ↑ semua implement IStorageProvider ↑
```

### 11.3 IStorageProvider Interface

```typescript
interface IStorageProvider {
  // Identity
  readonly type: StorageProviderType;
  readonly displayName: string;

  // Lifecycle
  initialize(config: StorageProviderConfig): Promise<boolean>;
  isConfigured(): boolean;
  isReady(): boolean;
  reloadConfig(config): Promise<void>;

  // Upload
  upload(context: UploadContext, settings: ProviderSettings): Promise<UploadResult>;
  uploadWithProgress?(context, settings, onProgress): Promise<UploadResult>;  // opsional

  // Folder management
  createFolder(context: FolderContext, settings): Promise<FolderResult>;
  folderExists?(folderId: string): Promise<boolean>;  // opsional

  // File operations
  deleteFile(remoteId: string): Promise<DeleteResult>;
  getPublicUrl?(remoteId: string): Promise<string | null>;  // opsional

  // Health & monitoring
  healthCheck(): Promise<HealthCheckResult>;

  // Auth (OAuth providers)
  refreshAuth?(): Promise<{ success: boolean; error?: string }>;
  isAuthExpired?(): boolean;

  // Config
  validateCredentials(credentials): Promise<string | null>;
}
```

### 11.4 Provider Support Matrix

| Feature              | Cloudinary | Google Drive | Firebase | Supabase |
|----------------------|:----------:|:------------:|:--------:|:--------:|
| Auto folder          | ✅          | ✅            | ✅        | ✅        |
| Public URL           | ✅          | ✅            | ✅        | ✅        |
| Signed URL           | ⚠️ (paid)  | ✅            | ✅        | ✅        |
| Delete file          | ⚠️ (signed)| ✅            | ✅        | ✅        |
| Quota check          | ✅          | ✅            | ❌        | ❌        |
| Resumable upload     | ❌          | ✅ (Phase 2)  | ✅ (P2)  | ✅ (P2)  |
| AI transform         | ✅          | ❌            | ❌        | ❌        |
| OAuth required       | ❌          | ✅            | ❌        | ❌        |
| Free tier (storage)  | 25GB        | 15GB         | 5GB      | 1GB      |
| Production ready     | ✅          | ✅            | Phase 2  | Phase 2  |

### 11.5 Database Tables (v2)

```
storage_providers    → konfigurasi provider (bisa banyak)
upload_queue         → antrian upload universal (ganti upload_jobs)
upload_history       → log setiap percobaan upload
provider_health_logs → log health check berkala
```

### 11.6 Google Drive — OAuth Strategy untuk Kiosk

```
PILIHAN TERBAIK untuk Samsung Tab A9 Kiosk:

┌─────────────────────────────────────────────────────────┐
│  OPSI A: Device Authorization Grant (RFC 8628)          │
│  ─────────────────────────────────────────────────────  │
│  1. App tampilkan kode pendek di layar (mis: "XYZ-123") │
│  2. Admin buka https://google.com/device di HP/laptop   │
│  3. Masukkan kode pendek                                │
│  4. Approve permission di browser                       │
│  5. Tablet polling Google → dapat token otomatis        │
│                                                         │
│  + Tidak butuh browser di tablet                        │
│  + Cocok untuk kiosk/TV/IoT                             │
│  + Standar RFC resmi Google                             │
│  - Butuh Client ID dari Google Console                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  OPSI B: Service Account (RECOMMENDED untuk production) │
│  ─────────────────────────────────────────────────────  │
│  1. Buat Service Account di Google Cloud Console        │
│  2. Download JSON key file                              │
│  3. Share folder Drive ke email service account         │
│  4. App sign JWT dengan private key → dapat token       │
│                                                         │
│  + Token tidak expire (bisa auto-renew)                 │
│  + Tidak butuh interaksi user sama sekali               │
│  + Paling stabil untuk kiosk app                        │
│  - Setup lebih teknis                                   │
│  - Butuh simpan private key di device (aman di kiosk)   │
└─────────────────────────────────────────────────────────┘

IMPLEMENTASI SEKARANG: Opsi A (Device Auth Grant)
ROADMAP: Opsi B via JWT signing di Phase 3
```

### 11.7 Token Security & Credential Storage

```
CURRENT (Phase 1):
  Credentials → XOR obfuscation + Base64 → SQLite
  Cukup untuk mencegah casual tampering

PHASE 2 (Production hardening):
  Credentials → expo-secure-store (Android Keystore)
  Access token → react-native-keychain
  Refresh token → Android Keystore (hardware-backed)

RULES:
  ✗ JANGAN hardcode credential di source code
  ✗ JANGAN commit .env dengan nilai asli ke git
  ✗ JANGAN simpan API secret di client-side
  ✓ Gunakan unsigned upload preset (Cloudinary)
  ✓ Gunakan anon key saja (Supabase)
  ✓ Refresh token auto-renew via StorageManager
```

### 11.8 Cara Tambah Provider Baru

```typescript
// 1. Buat file: src/services/storage/providers/MyProvider.ts
export class MyProvider extends BaseStorageProvider {
  readonly type: StorageProviderType = 'my_provider';  // tambah ke union type
  readonly displayName = 'My Provider';

  protected async onInitialize(config): Promise<void> { /* ... */ }
  async upload(context, settings): Promise<UploadResult> { /* ... */ }
  async healthCheck(): Promise<HealthCheckResult> { /* ... */ }
}

// 2. Register di ProviderRegistry.ts (tambah 1 baris)
this.register('my_provider', MyProvider, { /* metadata */ });

// 3. Tambah type ke StorageProviderType di storage.types.ts
// 4. Done — admin panel otomatis tampilkan provider baru
```

### 11.9 Upload Flow (End-to-End)

```
PhotoSession selesai
    ↓
UploadQueue.enqueue(photoId)   → simpan ke SQLite upload_queue
    ↓ (background, non-blocking)
UploadQueue.tick() setiap 5 detik
    ↓ jika online & ada job pending
StorageManager.upload(context)
    ↓ pilih primary provider
CloudinaryProvider.upload()   ← atau GoogleDriveProvider, dll.
    ↓ sukses
PhotoRepository.updateUploadStatus('done', cloudUrl)
UploadQueue.markJobDone()
upload_history INSERT (analytics)
Cleanup file lokal
    ↓ gagal (provider down)
StorageManager auto failover ke backup provider
    ↓ backup juga gagal
UploadQueue.markJobFailed() + exponential backoff
    ↓ retry otomatis saat internet/provider kembali
```

---

*Cloud Storage Architecture v2.0 — Provider-Agnostic, Modular, Future-Proof*
*Stack: IStorageProvider + ProviderRegistry + StorageManager + UploadQueue*
