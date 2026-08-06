// ============================================================
// Admin dashboard untuk Kejohanan Olahraga PPKI MSS Pahang
// Firebase Auth (emel/kata laluan) + Firestore (data teks/tarikh/link)
// Gambar TIDAK melalui Firebase (elak keperluan plan Blaze/kad kredit)
// -> gambar diuruskan macam logo: upload manual ke folder images/ repo
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CONFIG_DOC = doc(db, "site", "config");

// path gambar tetap (fail statik dalam repo, sama konsep macam logo)
const IMAGE_PATHS = {
  hero: "../images/hero.jpg",
  kotak0: "../images/kotak-pendaftaran.jpg",
  kotak1: "../images/kotak-callroom.jpg",
  kotak2: "../images/kotak-keputusan.jpg",
};

const DEFAULT_STATE = {
  acara: {
    nama_penuh: "Kejohanan Olahraga Pendidikan Khas MSS Pahang",
    nama_ringkas: "Kejohanan Olahraga PPKI MSS Pahang",
    tarikh_acara: "",
    lokasi: "",
    tarikh_buka_pendaftaran: "",
    tarikh_tutup_pendaftaran: "",
    gambar_hero: "images/hero.jpg",
    hero_overlay_opacity: 0.85,
  },
  kotak: [
    { label: "Pendaftaran", keterangan: "", link: "", gambar: "images/kotak-pendaftaran.jpg" },
    { label: "Call Room", keterangan: "", link: "", gambar: "images/kotak-callroom.jpg" },
    { label: "Keputusan Tidak Rasmi", keterangan: "", link: "", gambar: "images/kotak-keputusan.jpg" },
  ],
  maklumat_berkaitan: [],
};

let state = null;

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

// jaring keselamatan: auto-tambah https:// kalau admin lupa taip semasa simpan
function normalizeUrl(url) {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

// ---------------- load ----------------
async function loadContent() {
  const snap = await getDoc(CONFIG_DOC);
  state = snap.exists() ? snap.data() : JSON.parse(JSON.stringify(DEFAULT_STATE));
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

  document.getElementById("hero-preview").src = IMAGE_PATHS.hero + "?t=" + Date.now();
  const opacityPct = Math.round((typeof state.acara.hero_overlay_opacity === "number" ? state.acara.hero_overlay_opacity : 0.85) * 100);
  document.getElementById("f-hero-opacity").value = opacityPct;
  document.getElementById("hero-opacity-value").textContent = opacityPct + "%";

  state.kotak.forEach((k, i) => {
    document.getElementById(`kotak-${i}-keterangan`).value = k.keterangan || "";
    document.getElementById(`kotak-${i}-link`).value = k.link || "";
    document.getElementById(`kotak-${i}-preview`).src = IMAGE_PATHS["kotak" + i] + "?t=" + Date.now();
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
  state.acara.gambar_hero = "images/hero.jpg"; // path tetap, gambar tukar manual di GitHub
  state.acara.hero_overlay_opacity = Number(document.getElementById("f-hero-opacity").value) / 100;
  state.acara.asset_version = Date.now(); // paksa cache-bust gambar setiap kali disimpan

  state.kotak.forEach((k, i) => {
    k.keterangan = document.getElementById(`kotak-${i}-keterangan`).value.trim();
    k.link = normalizeUrl(document.getElementById(`kotak-${i}-link`).value.trim());
    k.gambar = IMAGE_PATHS["kotak" + i].replace("../", ""); // path tetap
  });
}

// ---------------- save flow ----------------
async function saveAll() {
  const btn = document.getElementById("btn-save");
  btn.disabled = true;
  setStatus("Menyimpan...", null);

  try {
    collectForm();
    state.maklumat_berkaitan.forEach(item => { item.link = normalizeUrl(item.link); });
    await setDoc(CONFIG_DOC, state);
    setStatus("✓ Berjaya disimpan. Laman utama akan terus update.", "ok");
    renderForm();
  } catch (err) {
    console.error(err);
    setStatus(`✗ ${err.message}`, "err");
  } finally {
    btn.disabled = false;
  }
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
  } catch (err) {
    console.error("Firebase auth error:", err);
    gateStatus.textContent = `✗ ${err.code || err.message}`;
  }
});

document.getElementById("btn-save").addEventListener("click", saveAll);

document.getElementById("f-hero-opacity").addEventListener("input", (e) => {
  document.getElementById("hero-opacity-value").textContent = e.target.value + "%";
});

document.getElementById("btn-bust-cache").addEventListener("click", async () => {
  const btn = document.getElementById("btn-bust-cache");
  btn.disabled = true;
  setStatus("Menyegarkan cache gambar...", null);
  try {
    state.acara.asset_version = Date.now();
    await setDoc(CONFIG_DOC, state);
    setStatus("✓ Cache gambar disegarkan. Pelawat baru akan nampak versi terkini.", "ok");
    renderForm();
  } catch (err) {
    console.error(err);
    setStatus(`✗ ${err.message}`, "err");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("btn-add-info").addEventListener("click", () => {
  state.maklumat_berkaitan.push({ teks: "", link: "" });
  renderInfoList();
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    enterDashboard();
  } else {
    document.getElementById("gate").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});
