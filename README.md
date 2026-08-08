# Kejohanan Olahraga Pendidikan Khas MSS Pahang — Landing Page

Laman statik di GitHub Pages (`kopk.syazr.com`) + Firebase (percuma, tiada kad kredit diperlukan)
untuk data teks dan login admin. AJK update kandungan melalui `/admin`.

---

## Bagaimana ia berfungsi

| Bahagian | Diuruskan oleh |
|---|---|
| Hosting laman (`index.html`, design, dsb.) | GitHub Pages |
| Nama, tarikh, link, senarai maklumat | **Firestore** (Firebase — percuma) |
| Log masuk admin | **Firebase Authentication** (emel + kata laluan — percuma) |
| Gambar (hero, 3 kotak, logo) | Fail statik dalam repo `images/` — **upload manual ke GitHub** |

> **Kenapa gambar bukan melalui admin/Firebase?** Sejak Februari 2026, Firebase Storage
> wajib upgrade akaun ke plan **Blaze** (perlu link kad kredit, walaupun bil akhirnya $0
> untuk penggunaan kecil). Untuk elak keperluan kad kredit terus, gambar kekal diuruskan
> macam cara asal — upload fail ke folder `images/` di GitHub, guna nama fail yang sama.

---

## Setup Firebase (buat sekali sahaja, percuma — tiada kad kredit)

### 1. Cipta project
1. Pergi ke [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Namakan (contoh: `kopk-mss-pahang`) → ikut wizard (Google Analytics boleh skip)

### 2. Authentication (untuk login admin)
1. **Build → Authentication → Get started**
2. Tab **Sign-in method** → aktifkan **Email/Password**
3. Tab **Users → Add user** → masukkan emel & kata laluan untuk setiap AJK (1-2 orang)

### 3. Firestore (untuk data teks)
1. **Build → Firestore Database → Create database**
2. Pilih **Production mode** → lokasi (cadangan: `asia-southeast1` — Singapore)
3. Tab **Rules**, ganti dengan:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /site/config {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /feedback_questions/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /feedback_submissions/{doc} {
         allow create: if request.resource.data.answers is list
                       && request.resource.data.answers.size() > 0;
         allow read, delete: if request.auth != null;
       }
     }
   }
   ```
   - `feedback_questions` — sesiapa boleh **baca** (perlu untuk page `/maklum-balas/` papar soalan), tapi cuma admin log masuk boleh **tulis** (tambah/edit/padam soalan)
   - `feedback_submissions` — sesiapa boleh **hantar** jawapan (tanpa login), tapi cuma admin boleh **baca/padam** (untuk analisis, elak orang lain nampak jawapan pelawat lain)
4. **Publish**

### 4. Dapatkan config & masukkan dalam repo
1. **Project settings** (ikon gear) → scroll ke **Your apps** → klik ikon **Web (`</>`)** → daftar app
2. Salin objek `firebaseConfig`
3. Buka `firebase-config.js`, ganti nilai placeholder dengan config sebenar, commit.

### 5. Benarkan domain custom untuk login
1. **Authentication → Settings → Authorized domains → Add domain**
2. Tambah `kopk.syazr.com`

---

## Cara AJK guna admin (`/admin`)

1. Pergi ke `https://kopk.syazr.com/admin/`
2. Log masuk dengan emel & kata laluan yang disediakan
3. Isi/kemaskini:
   1. Nama header & tajuk
   2. Tarikh acara & lokasi
   3. Tarikh buka & tutup pendaftaran (untuk countdown)
   4. Link 3 kotak (Pendaftaran / Call Room / Keputusan Tidak Rasmi) + keterangan
   5. Senarai maklumat & pengumuman (+ Tambah Maklumat, boleh susun semula)
   6. Soalan Lazim (FAQ) — accordion di laman utama
   7. Soalan tinjauan/maklum balas — bina/susun soalan sendiri (tab "Maklum Balas" → "Soalan"), lihat analisis & carta (→ "Analisis"). Pelawat jawab di page berasingan `/maklum-balas/`
   8. Wording — semua teks kelihatan di laman (tajuk seksyen, label, footer)
4. Klik **Simpan Semua Perubahan** — laman terus update

**Untuk gambar** (hero + 3 kotak + logo) — admin page cuma **papar pratonton**, tukar sebenar
kena upload fail ke GitHub:

1. Buka folder `images/` dalam repo GitHub
2. Upload gambar baru dengan **nama fail yang SAMA**, GitHub akan tanya "replace this file?" → Yes

| Nama fail | Kegunaan |
|---|---|
| `images/hero.jpg` | Gambar besar hero |
| `images/kotak-pendaftaran.jpg` | Gambar kotak Pendaftaran |
| `images/kotak-callroom.jpg` | Gambar kotak Call Room |
| `images/kotak-keputusan.jpg` | Gambar kotak Keputusan Tidak Rasmi |
| `images/logo-jata-negara.png` | Logo Jata Negara |
| `images/logo-mss-pahang.png` | Logo MSS Pahang |
| `images/logo-tambahan.png` | Logo tambahan (jika ada) |

---

## Setup domain custom (`kopk.syazr.com`) di GitHub Pages

1. Fail `CNAME` (kandungan: `kopk.syazr.com`) sudah disediakan di root repo.
2. Di pembekal DNS domain `syazr.com`, tambah rekod **CNAME** `kopk` → `ajehar.github.io`
3. Repo → **Settings → Pages** → "Custom domain" → masukkan `kopk.syazr.com` → Save.
4. Tunggu DNS propagate, GitHub auto-issue HTTPS.

---

## Upload Dokumen (PDF/gambar) terus dari Admin

AJK boleh upload dokumen rasmi (garis panduan, senarai acara, dsb.) terus dari `/admin`
tanpa perlu akaun GitHub — fail disimpan ke **Google Drive anda** melalui Google Apps
Script (percuma, tiada kad kredit).

### Setup (buat sekali sahaja)

1. **Cipta folder Drive** — buka [drive.google.com](https://drive.google.com) → cipta
   folder baru (contoh: "Dokumen KOPK") → buka folder tu → salin **Folder ID** dari URL:
   ```
   https://drive.google.com/drive/folders/INI_FOLDER_ID
   ```

2. **Cipta Apps Script** — buka [script.google.com](https://script.google.com) →
   **New project** → padam kod default → salin SEMUA kod dari fail
   `apps-script/Code.gs` dalam repo ini → tampal.

3. **Isi konfigurasi** dalam kod yang ditampal tadi:
   - `SECRET_KEY` — apa-apa kata laluan unik anda cipta sendiri (contoh: `"kopk-rahsia-2026"`)
   - `FOLDER_ID` — Folder ID dari langkah 1

3b. **PENTING — jangan skip:** klik ikon gear (Project Settings) → tick
   **"Show appsscript.json manifest file in editor"**. Fail `appsscript.json`
   akan muncul di sidebar kiri → buka → tambah baris `oauthScopes`:
   ```json
   "oauthScopes": ["https://www.googleapis.com/auth/drive"]
   ```
   Tanpa ni, Apps Script auto-detect scope **sempit** (`drive.file`) yang
   tak boleh akses folder sedia ada anda → ralat **"Access denied: DriveApp"**
   walaupun proses authorize nampak berjaya dalam editor.

4. **Deploy** → klik **Deploy → New deployment** → ikon gear (⚙️) pilih **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy** → authorize semula jika diminta (scope baru = consent baru) → salin **Web app URL** yang diberikan

5. **Masukkan dalam repo** — buka fail `apps-script-config.js`, gantikan:
   - `APPS_SCRIPT_URL` — URL dari langkah 4
   - `APPS_SCRIPT_SECRET` — **SAMA PERSIS** dengan `SECRET_KEY` langkah 3

### Cara AJK guna lepas setup siap

1. Buka `/admin` → panel **"5. Maklumat & Pengumuman"**
2. Klik **"📎 Upload Dokumen"** → pilih fail (PDF/gambar, had 15MB)
3. Tunggu ~5-10 saat → item baru automatik masuk senarai dengan link Drive
4. Edit teks paparan jika perlu → klik **"Simpan Semua Perubahan"**

**Nota:** semua dokumen akan masuk folder Drive **anda** (bukan Drive AJK masing-masing) —
anda jadi penyimpan rasmi fail-fail ni. Storan guna kuota Drive akaun anda.

## Sistem Maklum Balas Dinamik (`/maklum-balas/`)

Page berasingan (bukan bahagian laman utama) untuk soalan tinjauan/kepuasan pengguna.
**Tiada soalan hardcode** — semua soalan diuruskan sepenuhnya dari `/admin`.

### Cara guna (admin)

1. `/admin` → tab **"Maklum Balas"** → sub-tab **"Soalan"**
2. Klik **"+ Tambah Soalan"** → isi teks soalan, pilih jenis:
   - **Rating 1-5** / **Rating 1-10** — skala kepuasan
   - **Pilihan Tunggal** / **Pilihan Berbilang** — perlu isi senarai pilihan (1 baris = 1 pilihan)
   - **Jawapan Pendek** / **Jawapan Panjang** — teks bebas
3. Tetapkan **Wajib** (required) dan **Status** (Aktif/Tidak Aktif)
4. Susun soalan guna butang ↑↓ dalam table
5. Soalan **Aktif** sahaja akan dipaparkan di `/maklum-balas/` — susunan ikut "Susunan"

**Nota penting:** perubahan di tab Soalan tersimpan **serta-merta** (bukan perlu klik "Simpan Semua Perubahan" — itu untuk data lain sahaja). Padam soalan **tidak** menjejaskan data submission lama, sebab setiap jawapan simpan salinan teks soalan pada masa dihantar.

### Analisis

Sub-tab **"Analisis"** papar:
- KPI: jumlah submission, purata rating keseluruhan, jumlah soalan
- Setiap soalan rating → carta bar (Chart.js) + purata
- Setiap soalan pilihan → carta bar taburan pilihan
- Setiap soalan teks → senarai jawapan (komen)

### Struktur data Firestore

- **`feedback_questions`** — satu dokumen per soalan (question, type, required, order, status, options, createdAt, updatedAt)
- **`feedback_submissions`** — satu dokumen per submission (submittedAt, answers: array `{questionId, questionText, type, answer}`)



Bila link `kopk.syazr.com` di-paste dalam app lain, ia akan papar kad preview (gambar +
tajuk + keterangan) — ini dikawal oleh tag `<meta property="og:...">` dalam `<head>`
fail `index.html`.

**Penting:** tag ni **statik** (bukan auto dari Firestore/`/admin`), sebab app macam
WhatsApp/Telegram tak jalankan JavaScript semasa scan link — mereka cuma baca HTML terus.
Kalau nama/tarikh acara berubah **besar**, kemaskini manual bahagian ni dalam `index.html`:

```html
<meta property="og:title" content="...">
<meta property="og:description" content="...">
```

Gambar preview (`images/og-image.jpg`, saiz 1200×630) juga boleh ditukar — upload fail
baru dengan nama yang sama ke `images/`.

**Nota cache platform:** WhatsApp/Facebook/Telegram masing-masing **cache** preview lama
buat beberapa hari. Kalau anda update tag/gambar tapi preview lama masih papar:
- Facebook/WhatsApp: guna [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → paste URL → "Scrape Again"
- Telegram: hantar link dengan `?` tambahan di hujung (contoh `kopk.syazr.com/?v=2`) untuk paksa scan baru

## Feature Tambahan (Real-time, Analytics, Offline, Automasi)

### Real-time update
Laman kini "live" — guna `onSnapshot` bukan `getDoc`. Update di `/admin` akan terus
muncul untuk semua orang yang tengah buka laman, tanpa refresh. Tiada setup tambahan.

### Google Analytics (GA4)
1. Pergi ke [analytics.google.com](https://analytics.google.com) → cipta akaun/property baru
2. Salin **Measurement ID** (format `G-XXXXXXXXXX`)
3. Buka `index.html`, cari **2 tempat** `G-XXXXXXXXXX` → gantikan dengan ID sebenar anda

### Service Worker (Offline-ready)
`sw.js` cache reka bentuk laman (bukan data) supaya boleh dibuka walau signal lemah —
relevan untuk stadium. Auto-daftar bila laman dibuka, tiada setup tambahan.
**Nota:** kalau anda naikkan `?v=` untuk `styles.css`/`script.js`, kemaskini juga
senarai `APP_SHELL` dalam `sw.js` dan naikkan `CACHE_VERSION` supaya Service Worker
tak "stuck" dengan versi lama.

### QR Code
`images/qr-code.png` — QR code terus ke `kopk.syazr.com`, sedia untuk letak pada
banner/poster cetakan akan datang.

### Butang "Tambah ke Kalendar"
Automatik — jana link Google Calendar berdasarkan tarikh buka/tutup pendaftaran yang
diisi di `/admin`. Tiada setup tambahan.

### `sitemap.xml` + `robots.txt` + Halaman 404
Fail statik, siap. `robots.txt` block `/admin/` daripada diindeks Google.

> **Nota:** GitHub Action "auto naikkan versi cache" yang pernah dicadangkan
> **dibuang** — ia menyebabkan *merge conflict* berulang sebab commit
> automatik bertembung dengan perubahan kod manual. Nombor `?v=` dinaikkan
> manual sahaja sekarang (rujuk bahagian "Cache CSS/JS" di bawah).

### GitHub Action — Backup Firestore harian
`.github/workflows/backup-firestore.yml` — setiap hari, eksport data Firestore
(`site/config` + `feedback`) ke `backups/backup-TARIKH.json` dalam repo.

**Setup diperlukan (sekali sahaja):**
1. Firebase Console → **Project Settings → Service Accounts** → **Generate new private key** → muat turun fail JSON
2. Repo GitHub → **Settings → Secrets and variables → Actions** → **New repository secret**
   - Nama: `FIREBASE_SERVICE_ACCOUNT`
   - Value: tampal **semua** kandungan fail JSON tadi
3. Siap — backup pertama akan jalan pada jadual seterusnya, atau boleh trigger manual
   di tab **Actions** → pilih workflow → **Run workflow**

## Cache CSS/JS (untuk anda sendiri semasa buat perubahan kod)

`index.html` dan `admin/index.html` rujuk `styles.css`, `script.js`, `admin.css`, `admin.js`
dengan `?v=1` di hujung URL. Setiap kali anda (atau saya) push perubahan pada fail-fail ni,
**naikkan nombor `v=` tu** (contoh `?v=2`) di SEMUA tempat ia muncul, supaya semua pelawat
terus dapat versi terkini tanpa tunggu cache GitHub Pages luput (~10 minit).

Tempat yang perlu dikemaskini bersama:
- `index.html` → `styles.css?v=` dan `script.js?v=`
- `admin/index.html` → `admin.css?v=` dan `admin.js?v=`
- `admin/admin.css` → baris `@import url("../styles.css?v=")`

**Data (Firestore) dan gambar tak perlukan ini** — data sentiasa live, gambar ada sistem
cache-bust sendiri (`asset_version`, laraskan dari `/admin`).

## Struktur fail

```
├── index.html                     ← laman utama (tak perlu sentuh)
├── styles.css                       ← design (tak perlu sentuh)
├── script.js                          ← baca data dari Firestore (tak perlu sentuh)
├── sw.js                                 ← Service Worker (offline-ready)
├── site.webmanifest                        ← PWA icons
├── 404.html, sitemap.xml, robots.txt         ← SEO/error page
├── firebase-config.js                          ← GANTI dengan config project Firebase anda
├── apps-script-config.js                         ← GANTI dengan URL & kunci Apps Script anda
├── apps-script/
│   └── Code.gs                                     ← Salin ke script.google.com (rujuk panduan atas)
├── admin/
│   ├── index.html                                ← dashboard admin
│   ├── admin.js                                    ← logik login + simpan data (tak perlu sentuh)
│   └── admin.css
├── maklum-balas/
│   ├── index.html                                    ← page awam borang tinjauan
│   ├── feedback.js                                     ← ambil soalan aktif dari Firestore, handle submit
│   └── feedback.css
├── images/                                              ← GANTI GAMBAR di sini (nama fail sama)
│   ├── hero.jpg, hero-mobile.jpg
│   ├── kotak-pendaftaran.jpg, kotak-callroom.jpg, kotak-keputusan.jpg
│   ├── logo-jata-negara.png, logo-mss-pahang.png, logo-tambahan.png
│   ├── og-image.jpg, qr-code.png
├── icons/                                                 ← favicon/PWA icons
├── .github/workflows/                                       ← automasi (cache-version, backup)
├── content.seed-example.json                                 ← rujukan struktur data sahaja
└── CNAME                                                       ← domain custom
```

**Nota:** koleksi Firestore lama `feedback` (sistem bintang+mesej terdahulu, sebelum sistem
soalan dinamik ni) tidak lagi digunakan — boleh dipadam manual di Firestore Console jika nak,
atau biar sahaja (tidak menjejaskan apa-apa, cuma data lapuk tersimpan).
