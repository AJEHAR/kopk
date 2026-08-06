// ============================================================
// Admin dashboard untuk Kejohanan Olahraga PPKI MSS Pahang
// Firebase Auth (emel/kata laluan) + Firestore (data) + Storage (gambar)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const CONFIG_DOC = doc(db, "site", "config");

const IMAGE_PATHS = {
  hero: "images/hero.jpg",
  kotak0: "images/kotak-pendaftaran.jpg",
  kotak1: "images/kotak-callroom.jpg",
  kotak2: "images/kotak-keputusan.jpg",
};

// nilai lalai jika dokumen Firestore belum wujud (kali pertama admin login)
const DEFAULT_STATE = {
  acara: {
    nama_penuh: "Kejohanan Olahraga Pendidikan Khas MSS Pahang",
    nama_ringkas: "Kejohanan Olahraga PPKI MSS Pahang",
    tarikh_acara: "",
    lokasi: "",
    tarikh_buka_pendaftaran: "",
    tarikh_tutup_pendaftaran: "",
    gambar_hero_url: "",
  },
  kotak: [
    { label: "Pendaftaran", keterangan: "", link: "", gambar_url: "" },
    { label: "Call Room", keterangan: "", link: "", gambar_url: "" },
    { label: "Keputusan Tidak Rasmi", keterangan: "", link: "", gambar_url: "" },
  ],
  maklumat_berkaitan: [],
};

let state = null;
const pendingImages = {}; // { key: File }

// ---------------- utils ----------------
function toDatetimeLocal(iso) {
  if (!iso) return "";
  return iso.slice(0, 16);
}
function fromDatetimeLocal(val) {
  if (!val) return "";
  return `${val}:00+08:00`;
}
function setStatus(msg, kind) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  el.className = "save-status" + (kind ? ` is-${kind}` : "");
}
function escapeAttr(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// ---------------- load ----------------
async function loadContent() {
  const snap = await getDoc(CONFIG_DOC);
  state = snap.exists() ? snap.data() : JSON.parse(JSON.stringify(DEFAULT_STATE));
  // pastikan struktur kotak sentiasa ada 3 elemen walaupun data lama tak lengkap
  if (!state.kotak || state.kotak.length < 3) state.kotak = DEFAULT_STATE.kotak;
  if (!state.maklumat_berkaitan) state.maklumat_berkaitan = [];
}

// ---------------- render form from state ----------------
function renderForm() {
  document.getElementById("f-nama-penuh").value = state.acara.nama_penuh || "";
  document.getElementById("f-nama-ringkas").value = state.acara.nama_ringkas || "";
  document.getElementById("f-tarikh-acara").value = state.acara.tarikh_acara || "";
  document.getElementById("f-lokasi").value = state.acara.lokasi || "";
  document.getElementById("f-tarikh-buka").value = toDatetimeLocal(state.acara.tarikh_buka_pendaftaran);
  document.getElementById("f-tarikh-tutup").value = toDatetimeLocal(state.acara.tarikh_tutup_pendaftaran);

  if (state.acara.gambar_hero_url) document.getElementById("hero-preview").src = state.acara.gambar_hero_url;

  state.kotak.forEach((k, i) => {
    document.getElementById(`kotak-${i}-keterangan`).value = k.keterangan || "";
    document.getElementById(`kotak-${i}-link`).value = k.link || "";
    if (k.gambar_url) document.getElementById(`kotak-${i}-preview`).src = k.gambar_url;
  });

  renderInfoList();
}

function renderInfoList() {
  const el = document.getElementById("info-rows");
  el.innerHTML = state.maklumat_berkaitan.map((item, i) => `
    <div class="info-row" data-index="${i}">
      <div style="flex:1">
        <div class="field">
          <label>Teks</label>
          <input type="text" class="info-teks" value="${escapeAttr(item.teks)}">
        </div>
        <div class="field">
          <label>Link <span class="hint">(kosongkan jika tiada)</span></label>
          <input type="url" class="info-link" value="${escapeAttr(item.link || "")}">
        </div>
      </div>
      <div class="info-row__actions">
        <button type="button" class="icon-btn" data-action="up" title="Naik">&uarr;</button>
        <button type="button" class="icon-btn" data-action="down" title="Turun">&darr;</button>
        <button type="button" class="icon-btn icon-btn--danger" data-action="delete" title="Padam">&times;</button>
      </div>
    </div>
  `).join("");

  el.querySelectorAll(".info-row").forEach(row => {
    const idx = Number(row.dataset.index);
    row.querySelector(".info-teks").addEventListener("input", e => state.maklumat_berkaitan[idx].teks = e.target.value);
    row.querySelector(".info-link").addEventListener("input", e => state.maklumat_berkaitan[idx].link = e.target.value);
    row.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.maklumat_berkaitan.splice(idx, 1);
      renderInfoList();
    });
    row.querySelector('[data-action="up"]').addEventListener("click", () => {
      if (idx === 0) return;
      [state.maklumat_berkaitan[idx - 1], state.maklumat_berkaitan[idx]] = [state.maklumat_berkaitan[idx], state.maklumat_berkaitan[idx - 1]];
      renderInfoList();
    });
    row.querySelector('[data-action="down"]').addEventListener("click", () => {
      if (idx === state.maklumat_berkaitan.length - 1) return;
      [state.maklumat_berkaitan[idx + 1], state.maklumat_berkaitan[idx]] = [state.maklumat_berkaitan[idx], state.maklumat_berkaitan[idx + 1]];
      renderInfoList();
    });
  });
}

// ---------------- collect form back into state ----------------
function collectForm() {
  state.acara.nama_penuh = document.getElementById("f-nama-penuh").value.trim();
  state.acara.nama_ringkas = document.getElementById("f-nama-ringkas").value.trim();
  state.acara.tarikh_acara = document.getElementById("f-tarikh-acara").value.trim();
  state.acara.lokasi = document.getElementById("f-lokasi").value.trim();
  state.acara.tarikh_buka_pendaftaran = fromDatetimeLocal(document.getElementById("f-tarikh-buka").value);
  state.acara.tarikh_tutup_pendaftaran = fromDatetimeLocal(document.getElementById("f-tarikh-tutup").value);

  state.kotak.forEach((k, i) => {
    k.keterangan = document.getElementById(`kotak-${i}-keterangan`).value.trim();
    k.link = document.getElementById(`kotak-${i}-link`).value.trim();
  });
}

// ---------------- save flow ----------------
async function saveAll() {
  const btn = document.getElementById("btn-save");
  btn.disabled = true;
  setStatus("Menyimpan...", null);

  try {
    collectForm();

    // 1. upload gambar yang ditukar ke Firebase Storage
    for (const [key, file] of Object.entries(pendingImages)) {
      const path = IMAGE_PATHS[key];
      setStatus(`Memuat naik gambar (${path})...`, null);
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      if (key === "hero") {
        state.acara.gambar_hero_url = url;
      } else {
        const idx = Number(key.replace("kotak", ""));
        state.kotak[idx].gambar_url = url;
      }
    }

    // 2. simpan dokumen Firestore
    setStatus("Menyimpan maklumat...", null);
    await setDoc(CONFIG_DOC, state);

    Object.keys(pendingImages).forEach(k => delete pendingImages[k]);
    setStatus("✓ Berjaya disimpan. Laman utama akan terus update.", "ok");
    renderForm();
  } catch (err) {
    console.error(err);
    setStatus(`✗ ${err.message}`, "err");
  } finally {
    btn.disabled = false;
  }
}

// ---------------- image input wiring ----------------
function wireImageInput(inputId, previewId, key) {
  document.getElementById(inputId).addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingImages[key] = file;
    document.getElementById(previewId).src = URL.createObjectURL(file);
  });
}

// ---------------- auth flow ----------------
async function enterDashboard() {
  document.getElementById("gate").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  setStatus("Memuatkan data...", null);
  try {
    await loadContent();
    renderForm();
    setStatus("", null);
  } catch (err) {
    setStatus(`✗ ${err.message}`, "err");
  }
}

document.getElementById("btn-connect").addEventListener("click", async () => {
  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value;
  const gateStatus = document.getElementById("gate-status");

  if (!email || !password) { gateStatus.textContent = "Sila masukkan emel dan kata laluan."; return; }

  gateStatus.textContent = "Log masuk...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
    gateStatus.textContent = "";
    // enterDashboard() akan dipanggil automatik oleh onAuthStateChanged
  } catch (err) {
    gateStatus.textContent = "✗ Emel atau kata laluan salah.";
  }
});

document.getElementById("btn-save").addEventListener("click", saveAll);

document.getElementById("btn-add-info").addEventListener("click", () => {
  state.maklumat_berkaitan.push({ teks: "", link: "" });
  renderInfoList();
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

wireImageInput("hero-input", "hero-preview", "hero");
wireImageInput("kotak-0-input", "kotak-0-preview", "kotak0");
wireImageInput("kotak-1-input", "kotak-1-preview", "kotak1");
wireImageInput("kotak-2-input", "kotak-2-preview", "kotak2");

onAuthStateChanged(auth, (user) => {
  if (user) {
    enterDashboard();
  } else {
    document.getElementById("gate").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});
