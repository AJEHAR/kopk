# Kejohanan Olahraga Pendidikan Khas MSS Pahang — Landing Page

Laman statik di GitHub Pages (`kopk.syazr.com`) + Firebase untuk data dan admin login.
AJK update semua kandungan melalui `/admin` — **tak perlu sentuh kod, JSON, atau akaun GitHub**.

---

## Bagaimana ia berfungsi

| Bahagian | Diuruskan oleh |
|---|---|
| Hosting laman (`index.html`, design, dsb.) | GitHub Pages — tak berubah |
| Data (nama, tarikh, link, senarai maklumat) | **Firestore** (Firebase) |
| Log masuk admin | **Firebase Authentication** (emel + kata laluan) |
| Gambar (hero + 3 kotak) | **Firebase Storage** |
| Logo (Jata Negara, MSS Pahang, dll) | Fail statik dalam repo `images/` — jarang tukar, bukan sebahagian admin |

Firebase **bukan hosting** — laman utama tetap live di GitHub Pages / domain custom anda.
Firebase cuma "backend" ringan untuk data + login, dipanggil terus dari browser (tiada server anda perlu jaga).

---

## Setup Firebase (buat sekali sahaja)

### 1. Cipta project
1. Pergi ke [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Namakan (contoh: `kopk-mss-pahang`) → ikut wizard (Google Analytics boleh skip)

### 2. Authentication (untuk login admin)
1. Dalam project → **Build → Authentication → Get started**
2. Tab **Sign-in method** → aktifkan **Email/Password**
3. Tab **Users → Add user** → masukkan emel & kata laluan untuk setiap AJK (1-2 orang)

### 3. Firestore (untuk data)
1. **Build → Firestore Database → Create database**
2. Pilih **Production mode** → pilih lokasi (contoh `asia-southeast1` — Singapore, paling dekat)
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
   (Sesiapa boleh **baca** — perlu untuk laman utama paparkan data. Hanya admin yang log masuk boleh **tulis**.)
4. Klik **Publish**

### 4. Storage (untuk gambar)
1. **Build → Storage → Get started** → Production mode → lokasi sama macam Firestore
2. Tab **Rules**, ganti dengan:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /images/{fileName} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
3. **Publish**

### 5. Dapatkan config & masukkan dalam repo
1. **Project settings** (ikon gear) → scroll ke **Your apps** → klik ikon **Web (`</>`)** → daftar app (nama bebas)
2. Salin objek `firebaseConfig` yang diberikan
3. Buka fail `firebase-config.js` dalam repo, ganti nilai placeholder dengan config sebenar anda, commit.

### 6. Benarkan domain custom untuk login
1. **Authentication → Settings → Authorized domains → Add domain**
2. Tambah `kopk.syazr.com` (kalau tak ditambah, login akan gagal di domain custom anda)

---

## Cara AJK guna admin (`/admin`)

1. Pergi ke `https://kopk.syazr.com/admin/`
2. Log masuk dengan emel & kata laluan yang anda dah create (langkah 2 di atas)
3. Kali pertama, borang akan kosong — isi:
   1. Nama header & tajuk
   2. Tarikh acara & lokasi
   3. Tarikh buka & tutup pendaftaran (untuk countdown)
   4. Gambar hero
   5. Gambar + link untuk 3 kotak (Pendaftaran / Call Room / Keputusan Tidak Rasmi)
   6. Senarai maklumat & pengumuman (+ Tambah Maklumat)
4. Klik **Simpan Semua Perubahan** — laman utama terus update (tiada delay macam git deploy)

---

## Setup domain custom (`kopk.syazr.com`) di GitHub Pages

1. Fail `CNAME` (kandungan: `kopk.syazr.com`) sudah disediakan di root repo.
2. Di pembekal DNS domain `syazr.com`, tambah rekod:
   - **CNAME** `kopk` → `ajehar.github.io`
3. Repo → **Settings → Pages** → "Custom domain" → masukkan `kopk.syazr.com` → Save.
4. Tunggu DNS propagate, GitHub auto-issue HTTPS.

---

## Struktur fail

```
├── index.html            ← laman utama (tak perlu sentuh)
├── styles.css              ← design (tak perlu sentuh)
├── script.js                 ← baca data dari Firestore (tak perlu sentuh)
├── firebase-config.js         ← GANTI dengan config project Firebase anda
├── admin/
│   ├── index.html                ← dashboard admin
│   ├── admin.js                    ← logik login + simpan data (tak perlu sentuh)
│   └── admin.css
├── images/
│   ├── logo-jata-negara.png          ← logo statik (upload manual ke repo je)
│   ├── logo-mss-pahang.png
│   └── logo-tambahan.png
├── content.seed-example.json          ← rujukan struktur data sahaja, tak digunakan laman
└── CNAME                                ← domain custom
```

**Nota:** gambar hero & 3 kotak **tak lagi** disimpan dalam folder `images/` — semua diuruskan
terus dari Firebase Storage melalui `/admin`. Fail `content.seed-example.json` cuma rujukan struktur,
bukan sumber data sebenar lagi (sumber sebenar = Firestore).
