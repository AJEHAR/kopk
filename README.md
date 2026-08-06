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
     }
   }
   ```
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

## Struktur fail

```
├── index.html                     ← laman utama (tak perlu sentuh)
├── styles.css                       ← design (tak perlu sentuh)
├── script.js                          ← baca data dari Firestore (tak perlu sentuh)
├── firebase-config.js                  ← GANTI dengan config project Firebase anda
├── admin/
│   ├── index.html                        ← dashboard admin
│   ├── admin.js                            ← logik login + simpan data (tak perlu sentuh)
│   └── admin.css
├── images/                                  ← GANTI GAMBAR di sini (nama fail sama)
│   ├── hero.jpg
│   ├── kotak-pendaftaran.jpg
│   ├── kotak-callroom.jpg
│   ├── kotak-keputusan.jpg
│   ├── logo-jata-negara.png
│   ├── logo-mss-pahang.png
│   └── logo-tambahan.png
├── content.seed-example.json                  ← rujukan struktur data sahaja
└── CNAME                                        ← domain custom
```
