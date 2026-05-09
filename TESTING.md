# 🧪 KitaFoto — Real Device Testing Plan

> Dokumen ini adalah checklist lengkap untuk validasi stabilitas, performa, dan keandalan KitaFoto di perangkat nyata sebelum digunakan di event.

**Target:** Aplikasi stabil 6–10 jam nonstop, tanpa crash, tanpa memory leak, tanpa freeze.

---

## Phase 1 — Device Compatibility

### 1.1 Device Matrix

| # | Device | OS | Layar | Orientasi | Status |
|---|--------|----|-------|-----------|--------|
| 1 | Samsung Galaxy Tab A9 | Android 13 | 11" landscape | L + P | ☐ |
| 2 | Samsung Galaxy Tab A8 | Android 12 | 10.5" | L + P | ☐ |
| 3 | Samsung Galaxy Tab A7 Lite | Android 11 | 8.7" | L + P | ☐ |
| 4 | Phone kecil (360dp) | Android 11+ | 6.1" | P + L | ☐ |
| 5 | Phone besar (430dp) | Android 12+ | 6.7" | P + L | ☐ |
| 6 | Tablet besar (1280dp+) | Android 13+ | 12"+ | L + P | ☐ |

### 1.2 UI Validation Checklist

| # | Test | Kriteria Lulus |
|---|------|---------------|
| 1 | HomeScreen render | Mascot, tombol, status bar tampil proporsional |
| 2 | FramePicker grid | Kolom sesuai breakpoint, scroll smooth |
| 3 | Countdown angka | Visible, tidak terpotong, animasi smooth |
| 4 | Camera preview | Full-screen / split layout sesuai orientasi |
| 5 | Processing progress | Bar + mascot + label tidak overlap |
| 6 | Preview foto | Foto terlihat jelas, tidak stretched |
| 7 | Done confetti | Animasi smooth (≥30fps) |
| 8 | Admin Dashboard | Sidebar muncul di tablet landscape |
| 9 | Admin Login PIN | Numpad tidak terpotong di phone kecil |
| 10 | Orientation switch | Tidak crash saat rotate mid-flow |
| 11 | Touch target | Semua tombol ≥48dp tap area |
| 12 | Font readability | Teks terbaca dari jarak 50cm |
| 13 | Safe area | Konten tidak tertutup notch/nav bar |
| 14 | Kiosk mode | Home/Back/Recents disabled |

### 1.3 Cara Test Orientasi

1. Mulai di portrait → navigasi sampai Done
2. Rotate ke landscape di tengah CountdownScreen → harus tidak crash
3. Rotate di CameraScreen → layout harus adapt
4. Rotate di Admin → sidebar muncul/hilang

---

## Phase 2 — Camera & USB Webcam

### 2.1 Basic Camera Tests

| # | Test | Langkah | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | USB detect | Tancapkan webcam OTG | Status hijau dalam 3 detik |
| 2 | Preview live | Buka CameraScreen | FPS ≥24, latency <200ms |
| 3 | Capture single | Ambil 1 foto | File tersimpan, <500ms |
| 4 | Capture 3 strip | Ambil 3 foto berturut | Semua file valid |
| 5 | Capture quality | Periksa output JPEG | ≥1600px width, <500KB |
| 6 | Flash overlay | Observe saat capture | Kilat putih visible |
| 7 | Shutter sound | Dengarkan | Suara terdengar sinkron |

### 2.2 USB Reliability Tests

| # | Test | Langkah | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | Hot disconnect | Cabut USB saat preview | Status merah, pesan error |
| 2 | Hot reconnect | Tancapkan kembali | Status hijau dalam 5 detik |
| 3 | Swap device | Ganti webcam lain | Device baru terdeteksi |
| 4 | OTG hub | Pakai USB hub OTG | Webcam tetap terdeteksi |
| 5 | 50x disconnect/connect | Cabut-tancap 50 kali | Tidak crash, selalu recovery |
| 6 | Fallback camera | Cabut USB | Otomatis pakai kamera depan |
| 7 | Return to USB | Tancapkan kembali setelah fallback | Beralih ke USB lagi |

### 2.3 Camera Stress Tests

| # | Test | Durasi/Jumlah | Kriteria Lulus |
|---|------|---------------|---------------|
| 1 | Rapid capture | 50 foto berturut tanpa jeda | Semua tersimpan, RAM stabil |
| 2 | Long preview | Preview 30 menit nonstop | FPS stabil, tidak crash |
| 3 | Rapid open/close | Buka-tutup CameraScreen 100x | Tidak crash, no memory leak |
| 4 | Background/foreground | App background 5 menit → kembali | Kamera re-init normal |

### 2.4 Camera Diagnostics (cek di Debug Overlay)

- [ ] Device ID terdeteksi
- [ ] Preview FPS > 24
- [ ] Last capture duration < 500ms
- [ ] Total captures session counter benar
- [ ] Error count = 0 saat normal operation
- [ ] Memory usage kamera < 80MB

---

## Phase 3 — Print Testing

### 3.1 Basic Print Tests

| # | Test | Langkah | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | WiFi connect | Input IP printer | Status hijau |
| 2 | Test print | Admin → Test Print | Kertas keluar |
| 3 | Auto print | Selesaikan 1 sesi foto | Otomatis tercetak |
| 4 | Multiple copies | Set 2 copies | 2 lembar tercetak |
| 5 | Print quality | Periksa hasil cetak | Gambar jelas, warna benar |

### 3.2 Print Reliability Tests

| # | Test | Langkah | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | Printer offline | Matikan printer → foto | Job masuk pending queue |
| 2 | Printer online kembali | Nyalakan printer | Auto retry & cetak |
| 3 | Kertas habis | Cetak sampai habis | Error tercatat, queue intact |
| 4 | Queue overload | 20 foto tanpa printer | Semua 20 masuk queue |
| 5 | Retry semua | Admin → Retry All | Semua tercetak |
| 6 | WiFi unstable | Putus-sambung WiFi | Retry tanpa duplikat |
| 7 | Cancel job | Admin → Batalkan job | Job dibatalkan, lainnya jalan |

### 3.3 Print Stress Tests

| # | Test | Durasi | Kriteria Lulus |
|---|------|--------|---------------|
| 1 | 50 prints continuous | ~50 sesi foto nonstop | Semua tercetak, urutan benar |
| 2 | Print + upload concurrent | Cetak sambil upload | Tidak saling block |
| 3 | Queue persistence crash | Force-kill app saat queue ≥5 | Setelah restart, queue masih ada |

---

## Phase 4 — Memory & Performance

### 4.1 Memory Monitoring Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| JS Heap idle | < 80 MB | > 120 MB |
| JS Heap saat sesi | < 150 MB | > 200 MB |
| Native RAM total | < 250 MB | > 350 MB |
| Storage cache | < 2 GB | > 1.5 GB (warning) |

### 4.2 Performance Monitoring Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| UI FPS idle | 60 fps | < 45 fps |
| UI FPS saat animasi | ≥ 50 fps | < 30 fps |
| JS FPS idle | 60 fps | < 30 fps |
| App startup | < 3 detik | > 5 detik |
| Camera ready | < 1.5 detik | > 3 detik |
| Composite foto | < 3 detik | > 5 detik |
| Print job submit | < 100 ms | > 500 ms |
| Upload enqueue | < 50 ms | > 200 ms |

### 4.3 Long Session Tests

| # | Test | Durasi | Interval Foto | Metric Target |
|---|------|--------|---------------|---------------|
| 1 | Medium session | 2 jam | 1 foto/2 menit | RAM stabil ±10% |
| 2 | Full day session | 6 jam | 1 foto/menit | RAM stabil ±15% |
| 3 | Extended session | 10 jam | 1 foto/3 menit | RAM stabil ±20% |
| 4 | Burst session | 1 jam | 1 foto/10 detik | RAM stabil, no OOM |

### 4.4 Memory Leak Detection

**Prosedur:**
1. Catat RAM awal setelah boot (baseline)
2. Jalankan 50 sesi foto lengkap
3. Catat RAM setelah 50 sesi
4. Tunggu 5 menit idle (GC chance)
5. Catat RAM final

**Kriteria LULUS:** RAM final ≤ baseline + 30 MB

**Lokasi leak yang sering terjadi:**
- Camera buffer tidak di-release
- Image bitmap tetap di memory
- SQLite connections terbuka
- Timer/interval tidak di-clear
- Event listener tidak di-remove

### 4.5 Profiling dengan Debug Overlay

Gunakan Debug Overlay (tap logo admin 10x) untuk monitor:
- Real-time FPS (UI + JS thread)
- RAM usage (trend line)
- Queue sizes (print + upload pending)
- Camera state dan last error
- Storage usage percentage

---

## Phase 5 — Stress Testing

### 5.1 Input Spam Tests

| # | Test | Aksi | Durasi | Kriteria Lulus |
|---|------|------|--------|---------------|
| 1 | Tap spam Home | Tap "Yuk Foto" 50x cepat | 10 detik | Navigasi 1x, tidak crash |
| 2 | Tap spam Frame | Tap frame berbeda 100x | 30 detik | Selection smooth |
| 3 | Back-forth spam | Home→Frame→Home 50x | 1 menit | Tidak crash, RAM stabil |
| 4 | Capture spam | Trigger capture 20x cepat | 20 detik | Hanya 1 capture berlangsung |
| 5 | Admin PIN brute | Input PIN salah 100x | 2 menit | UI responsive, tidak lock |

### 5.2 System Condition Tests

| # | Test | Kondisi | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | Low storage | Isi tablet sampai 95% penuh | Warning muncul, cleanup jalan |
| 2 | Low battery | 10% battery, no charger | App tetap jalan (mungkin lambat) |
| 3 | High CPU | Buka video YouTube background | FPS turun tapi tidak crash |
| 4 | Airplane mode | Aktifkan airplane mode | Upload queue offline mode |
| 5 | Developer options on | Animasi skala 10x | App tetap usable |

### 5.3 Automated Stress Test (via StressTestRunner)

Jalankan dari Admin → Debug → Stress Test:

```
Test Suite: "Full Stress"
- 100x rapid navigation (Home → Frame → Home)
- 50x capture foto
- 30x enqueue upload
- 20x enqueue print
- 10x disconnect/reconnect webcam simulation
- Durasi target: ~10 menit
- Pass criteria: 0 crashes, RAM delta < 50MB
```

---

## Phase 6 — Offline Recovery

### 6.1 Network Disruption Tests

| # | Test | Langkah | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | Mid-upload disconnect | Matikan WiFi saat upload | Job → pending, retry nanti |
| 2 | Long offline (1 jam) | Foto 30x tanpa internet | Semua masuk local queue |
| 3 | Reconnect recovery | Nyalakan internet setelah offline | Queue diproses FIFO |
| 4 | Partial connectivity | WiFi lemah (1 bar) | Upload retry dengan backoff |
| 5 | Provider down | Cloud server tidak respond | Auto failover ke backup |

### 6.2 App Crash Recovery

| # | Test | Langkah | Kriteria Lulus |
|---|------|---------|---------------|
| 1 | Force kill | `adb shell am force-stop` | Restart normal, queue intact |
| 2 | Kill saat capture | Force kill di CameraScreen | Restart, session reset, no orphan |
| 3 | Kill saat processing | Force kill di ProcessingScreen | Restart, no corrupt files |
| 4 | Kill saat print | Force kill saat printing | Restart, job retry otomatis |
| 5 | OOM kill | Simulate low memory | Restart via kiosk auto-launch |

### 6.3 Data Integrity After Crash

Setelah setiap crash recovery, validasi:
- [ ] SQLite database readable (no corruption)
- [ ] Upload queue count sama dengan sebelum crash
- [ ] Print queue count sama dengan sebelum crash
- [ ] Active event masih benar
- [ ] Settings tidak berubah
- [ ] Tidak ada file orphan di cache

---

## Phase 7 — Logging & Diagnostics

### 7.1 Log Categories

| Category | Contoh Entry | Retention |
|----------|-------------|-----------|
| `session` | "Session abc123 started, 3 photos, frame: xyz" | 7 hari |
| `camera` | "USB webcam connected: Logitech C270" | 3 hari |
| `capture` | "Photo 2/3 captured in 320ms, 1.2MB" | 7 hari |
| `print` | "Job 456 sent to printer, attempt 1/5" | 7 hari |
| `upload` | "Upload job 789 to cloudinary: success, 2.1s" | 7 hari |
| `memory` | "RAM: 145MB, Cache: 1.2GB, Cleanup triggered" | 1 hari |
| `error` | "CameraScreen crash: TypeError at line 87" | 30 hari |
| `perf` | "FPS dropped to 22, duration: 3.2s" | 1 hari |

### 7.2 Diagnostics Export

Admin → Debug → Export Diagnostics → menghasilkan JSON:

```json
{
  "deviceInfo": { "model": "SM-X115", "os": "13", "ram": "4GB" },
  "appVersion": "1.0.0",
  "sessionStats": { "totalPhotos": 342, "uptime": "6h 23m" },
  "performance": { "avgFPS": 58, "peakRAM": "198MB" },
  "errors": [ ... ],
  "queues": { "pendingPrint": 2, "pendingUpload": 5 },
  "logs": [ ... last 100 entries ... ]
}
```

### 7.3 Crash Report Format

Setiap unhandled error di-log ke SQLite:

```json
{
  "timestamp": "2025-07-15T14:23:01.456Z",
  "type": "render_error",
  "component": "CameraScreen",
  "message": "Cannot read property 'current' of null",
  "stack": "...(first 500 chars)...",
  "deviceState": {
    "cameraStatus": "ready",
    "isOnline": true,
    "ramMB": 178,
    "activeEvent": "Bazar SDN 01"
  }
}
```

---

## Phase 8 — Optimization Checklist

Setelah testing, prioritaskan fix berdasarkan severity:

### Priority 1 (Blocker)
- [ ] Crash di flow utama (capture → print → upload)
- [ ] Memory leak > 50MB/jam
- [ ] Camera tidak recovery setelah disconnect
- [ ] Database corruption

### Priority 2 (Major)
- [ ] FPS < 30 saat animasi
- [ ] Upload selalu gagal
- [ ] Print selalu gagal
- [ ] Storage tidak ter-cleanup

### Priority 3 (Minor)
- [ ] Animasi tidak smooth (30-45 fps)
- [ ] Font terlalu kecil di device tertentu
- [ ] Layout sedikit terpotong
- [ ] Sound delay > 200ms

### Priority 4 (Cosmetic)
- [ ] Warna sedikit berbeda antar device
- [ ] Shadow tidak visible di theme tertentu
- [ ] Mascot terlalu kecil di phone

---

## Pre-Production Readiness Checklist

### ✅ Wajib Lulus Semua

- [ ] Phase 1: UI render benar di Samsung Tab A9 (target device)
- [ ] Phase 2: Camera capture 100% reliable di device target
- [ ] Phase 3: Print auto-print bekerja 50/50 test
- [ ] Phase 4: Long session 6 jam tanpa crash
- [ ] Phase 4: RAM delta < 30MB setelah 100 sesi
- [ ] Phase 5: Survive tap spam tanpa crash
- [ ] Phase 6: Upload queue recovery setelah offline
- [ ] Phase 6: App restart recovery — queue intact
- [ ] Phase 7: Diagnostics export menghasilkan JSON valid
- [ ] Phase 7: Error boundary menangkap crash tanpa white screen

### ✅ Direkomendasikan

- [ ] Test di 3+ device berbeda
- [ ] Test dengan 2+ model webcam
- [ ] Test di WiFi lambat (3G speed)
- [ ] Test 10 jam continuous
- [ ] Test kiosk mode full lock (Device Owner)

---

## Cara Menjalankan Testing

### Quick Smoke Test (5 menit)

```
1. Install APK
2. Buka app → pastikan Home tampil
3. Tap "Yuk Foto" → pilih frame → countdown → foto → preview → done
4. Cek print queue (admin)
5. Cek upload queue (admin)
6. Verifikasi foto tercetak
```

### Full Regression Test (2 jam)

```
1. Semua Phase 1 checklist
2. Semua Phase 2 basic tests
3. Semua Phase 3 basic tests
4. Phase 4: 50 sesi foto, monitor RAM
5. Phase 6: 1x crash recovery test
```

### Production Acceptance Test (6 jam)

```
1. Full regression test
2. Phase 4: 6 jam long session
3. Phase 5: stress test suite
4. Phase 6: semua offline recovery tests
5. Final diagnostics export → review
```

---

*Testing plan v1.0 — KitaFoto Real Device Validation*
