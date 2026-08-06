// ============================================================
// GANTI nilai di bawah dengan config project Firebase ANDA.
// (Firebase Console → Project Settings → General → scroll ke
//  "Your apps" → Web app → SDK setup and configuration)
//
// PENTING: config ni SELAMAT untuk public/repo. Firebase config
// bukan "rahsia" — keselamatan sebenar dikawal oleh Firestore
// Security Rules & Storage Rules (rujuk README.md), bukan dengan
// menyembunyikan nilai-nilai ini.
// ============================================================

export const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY",
  authDomain: "GANTI-PROJECT-ID.firebaseapp.com",
  projectId: "GANTI-PROJECT-ID",
  storageBucket: "GANTI-PROJECT-ID.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID",
};
