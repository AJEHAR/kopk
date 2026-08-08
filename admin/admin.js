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
  getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy,
  deleteDoc, addDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";
import { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } from "../apps-script-config.js";

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
    label_kecil: "MSS PAHANG · OLAHRAGA PENDIDIKAN KHAS",
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
  faq: [],
  teks: {
    tab_title: "az=R - KOPK",
    label_akses_pantas: "Akses Pantas",
    label_maklumat_terkini: "Maklumat Terkini",
    label_faq_title: "Soalan Lazim",
    label_feedback_title: "Ada Soalan / Maklum Balas?",
    label_tambah_kalendar: "Tambah ke Kalendar",
    label_feedback_cta_title: "Kongsikan pandangan anda",
    label_feedback_cta_desc: "Bantu kami tingkatkan kejohanan akan datang — ambil masa kurang dari 2 minit",
    footer_org: "Anjuran Majlis Sukan Sekolah Pahang, Jabatan Pendidikan Negeri Pahang",
    footer_copyright: "az=r. Hak cipta terpelihara.",
    label_admin_link: "Log Masuk Admin",
  },
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

// ---------------- upload dokumen (via Apps Script -> Google Drive) ----------------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadDocument(file) {
  if (APPS_SCRIPT_URL.startsWith("GANTI_")) {
    throw new Error("Apps Script belum disetup lagi (rujuk README.md).");
  }
  const base64 = await fileToBase64(file);
  const payload = {
    secret: APPS_SCRIPT_SECRET,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    base64,
  };
  // guna text/plain (bukan application/json) supaya browser elak "preflight"
  // CORS - Apps Script Web App tak handle preflight OPTIONS dengan baik
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Upload gagal.");
  return data; // { url, name }
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
  if (!state.faq) state.faq = [];
  if (!state.teks) state.teks = JSON.parse(JSON.stringify(DEFAULT_STATE.teks));
  else state.teks = { ...DEFAULT_STATE.teks, ...state.teks }; // isi medan baru yang belum ada
}

// ---------------- render form from state ----------------
function renderForm() {
  document.getElementById("f-label-kecil").value = state.acara.label_kecil || "";
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
  renderFaqList();
  renderTeksFields();
}

function renderTeksFields() {
  const t = state.teks;
  const map = {
    "t-tab-title": t.tab_title,
    "t-akses-pantas": t.label_akses_pantas,
    "t-maklumat-terkini": t.label_maklumat_terkini,
    "t-faq-title": t.label_faq_title,
    "t-feedback-title": t.label_feedback_title,
    "t-tambah-kalendar": t.label_tambah_kalendar,
    "t-feedback-cta-title": t.label_feedback_cta_title,
    "t-feedback-cta-desc": t.label_feedback_cta_desc,
    "t-footer-org": t.footer_org,
    "t-footer-copyright": t.footer_copyright,
    "t-admin-link": t.label_admin_link,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  });
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

function renderFaqList() {
  const el = document.getElementById("faq-rows");
  el.innerHTML = state.faq.map((item, i) => `
    <div class="info-row" data-index="${i}">
      <div style="flex:1">
        <div class="field">
          <label>Soalan</label>
          <input type="text" class="faq-soalan" value="${escapeAttr(item.soalan)}">
        </div>
        <div class="field">
          <label>Jawapan</label>
          <textarea class="faq-jawapan" rows="2">${escapeAttr(item.jawapan)}</textarea>
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
    row.querySelector(".faq-soalan").addEventListener("input", e => state.faq[idx].soalan = e.target.value);
    row.querySelector(".faq-jawapan").addEventListener("input", e => state.faq[idx].jawapan = e.target.value);
    row.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.faq.splice(idx, 1);
      renderFaqList();
    });
    row.querySelector('[data-action="up"]').addEventListener("click", () => {
      if (idx === 0) return;
      [state.faq[idx - 1], state.faq[idx]] = [state.faq[idx], state.faq[idx - 1]];
      renderFaqList();
    });
    row.querySelector('[data-action="down"]').addEventListener("click", () => {
      if (idx === state.faq.length - 1) return;
      [state.faq[idx + 1], state.faq[idx]] = [state.faq[idx], state.faq[idx + 1]];
      renderFaqList();
    });
  });
}

// ---------------- feedback (maklum balas dari pelawat) ----------------
// ============================================================
// MAKLUM BALAS - soalan dinamik (bukan hardcode) + analisis
// Koleksi Firestore: feedback_questions, feedback_submissions
// ============================================================
const QUESTION_TYPES = {
  rating5: "Skor Kepuasan (0-5)",
  rating10: "Skala 1-10",
  single_choice: "Pilihan Tunggal",
  multi_choice: "Pilihan Berbilang",
  short_text: "Jawapan Pendek",
  long_text: "Jawapan Panjang",
};
const CHOICE_TYPES = ["single_choice", "multi_choice"];
const RATING_TYPES = ["rating5", "rating10"];

let allQuestions = [];

// ---- sub-tab dalam "Maklum Balas": Soalan / Analisis ----
document.querySelectorAll(".fb-subtab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".fb-subtab-btn").forEach(b => b.classList.toggle("is-active", b === btn));
    const target = btn.dataset.fbsubtab;
    document.querySelectorAll(".fb-subpanel").forEach(p => p.classList.toggle("is-active", p.dataset.fbsubpanel === target));
    if (target === "analisis") loadFeedbackAnalytics();
  });
});

// ---- SOALAN: senarai + table ----
async function loadFeedbackQuestions() {
  const el = document.getElementById("questions-table-body");
  el.innerHTML = `<tr><td colspan="6" style="padding:16px; color:var(--ink-soft);">Memuatkan...</td></tr>`;
  try {
    const q = query(collection(db, "feedback_questions"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    allQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderQuestionsTable();
  } catch (err) {
    console.error(err);
    el.innerHTML = `<tr><td colspan="6" style="padding:16px; color:#c0392b;">✗ ${err.message}</td></tr>`;
  }
}

function renderQuestionsTable() {
  const el = document.getElementById("questions-table-body");
  if (allQuestions.length === 0) {
    el.innerHTML = `<tr><td colspan="6" style="padding:16px; color:var(--ink-soft);">Belum ada soalan. Klik "+ Tambah Soalan" untuk mula.</td></tr>`;
    return;
  }
  el.innerHTML = allQuestions.map((q, i) => `
    <tr data-id="${q.id}">
      <td>${i + 1}</td>
      <td>${escapeAttr(q.question)}</td>
      <td>${QUESTION_TYPES[q.type] || q.type}</td>
      <td>${q.required ? "Ya" : "Tidak"}</td>
      <td>
        <button type="button" class="status-pill status-pill--${q.status}" data-action="toggle-status" title="Klik untuk tukar">
          ${q.status === "active" ? "Aktif" : "Tidak Aktif"}
        </button>
      </td>
      <td class="q-actions">
        <button type="button" class="icon-btn" data-action="up" title="Naik">&uarr;</button>
        <button type="button" class="icon-btn" data-action="down" title="Turun">&darr;</button>
        <button type="button" class="icon-btn" data-action="edit" title="Edit">&#9998;</button>
        <button type="button" class="icon-btn icon-btn--danger" data-action="delete" title="Padam">&times;</button>
      </td>
    </tr>
  `).join("");

  el.querySelectorAll("tr[data-id]").forEach(row => {
    const id = row.dataset.id;
    const q = allQuestions.find(x => x.id === id);
    row.querySelector('[data-action="edit"]').addEventListener("click", () => openQuestionModal(q));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteQuestion(q));
    row.querySelector('[data-action="toggle-status"]').addEventListener("click", () => toggleQuestionStatus(q));
    row.querySelector('[data-action="up"]').addEventListener("click", () => moveQuestion(q, -1));
    row.querySelector('[data-action="down"]').addEventListener("click", () => moveQuestion(q, 1));
  });
}

async function deleteQuestion(q) {
  if (!confirm(`Padam soalan "${q.question}"? Data submission lama TIDAK terjejas (snapshot soalan dah disimpan berasingan).`)) return;
  await deleteDoc(doc(db, "feedback_questions", q.id));
  await loadFeedbackQuestions();
}

async function toggleQuestionStatus(q) {
  const newStatus = q.status === "active" ? "inactive" : "active";
  await updateDoc(doc(db, "feedback_questions", q.id), { status: newStatus, updatedAt: serverTimestamp() });
  await loadFeedbackQuestions();
}

async function moveQuestion(q, dir) {
  const idx = allQuestions.findIndex(x => x.id === q.id);
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= allQuestions.length) return;
  const other = allQuestions[swapIdx];
  const qOrder = q.order, otherOrder = other.order;
  await updateDoc(doc(db, "feedback_questions", q.id), { order: otherOrder, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "feedback_questions", other.id), { order: qOrder, updatedAt: serverTimestamp() });
  await loadFeedbackQuestions();
}

// ---- Modal tambah/edit soalan ----
function openQuestionModal(existing) {
  const modal = document.getElementById("question-modal");
  document.getElementById("qm-title").textContent = existing ? "Edit Soalan" : "Tambah Soalan";
  document.getElementById("qm-id").value = existing?.id || "";
  document.getElementById("qm-question").value = existing?.question || "";
  document.getElementById("qm-type").value = existing?.type || "short_text";
  document.getElementById("qm-required").checked = existing?.required ?? false;
  document.getElementById("qm-status").value = existing?.status || "active";
  document.getElementById("qm-options").value = (existing?.options || []).join("\n");
  toggleOptionsField();
  modal.classList.add("is-open");
}
function closeQuestionModal() {
  document.getElementById("question-modal").classList.remove("is-open");
}
function toggleOptionsField() {
  const type = document.getElementById("qm-type").value;
  document.getElementById("qm-options-field").style.display = CHOICE_TYPES.includes(type) ? "block" : "none";
}

async function saveQuestionFromModal() {
  const id = document.getElementById("qm-id").value;
  const question = document.getElementById("qm-question").value.trim();
  const type = document.getElementById("qm-type").value;
  const required = document.getElementById("qm-required").checked;
  const status = document.getElementById("qm-status").value;
  const optionsRaw = document.getElementById("qm-options").value.trim();
  const options = CHOICE_TYPES.includes(type) && optionsRaw
    ? optionsRaw.split("\n").map(s => s.trim()).filter(Boolean)
    : [];

  if (!question) { alert("Sila isi teks soalan."); return; }
  if (CHOICE_TYPES.includes(type) && options.length < 2) { alert("Sila isi sekurang-kurangnya 2 pilihan jawapan."); return; }

  try {
    if (id) {
      await updateDoc(doc(db, "feedback_questions", id), {
        question, type, required, status, options, updatedAt: serverTimestamp(),
      });
    } else {
      const maxOrder = allQuestions.reduce((m, q) => Math.max(m, q.order || 0), 0);
      await addDoc(collection(db, "feedback_questions"), {
        question, type, required, status, options,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    closeQuestionModal();
    await loadFeedbackQuestions();
  } catch (err) {
    alert(`Gagal simpan: ${err.message}`);
  }
}

// ---- ANALISIS ----
async function loadFeedbackAnalytics() {
  const el = document.getElementById("analytics-container");
  el.innerHTML = `<p style="padding:16px; color:var(--ink-soft);">Memuatkan...</p>`;
  try {
    const [qSnap, sSnap] = await Promise.all([
      getDocs(query(collection(db, "feedback_questions"), orderBy("order", "asc"))),
      getDocs(collection(db, "feedback_submissions")),
    ]);
    const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const submissions = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (submissions.length === 0) {
      el.innerHTML = `<p style="padding:16px; color:var(--ink-soft);">Tiada submission lagi.</p>`;
      return;
    }

    // ---- KPI cards ----
    const totalSubmissions = submissions.length;
    const allRatingAnswers = [];
    submissions.forEach(s => (s.answers || []).forEach(a => {
      if (typeof a.answer === "number") allRatingAnswers.push(a.answer);
    }));
    const overallAvg = allRatingAnswers.length
      ? (allRatingAnswers.reduce((a, b) => a + b, 0) / allRatingAnswers.length).toFixed(1)
      : "-";

    let html = `
      <div class="kpi-row">
        <div class="kpi-card"><span class="kpi-card__value">${totalSubmissions}</span><span class="kpi-card__label">Jumlah Submission</span></div>
        <div class="kpi-card"><span class="kpi-card__value">${overallAvg}</span><span class="kpi-card__label">Purata Rating Keseluruhan</span></div>
        <div class="kpi-card"><span class="kpi-card__value">${questions.length}</span><span class="kpi-card__label">Jumlah Soalan</span></div>
      </div>
    `;

    // ---- per-soalan breakdown ----
    for (const q of questions) {
      const answersForQ = [];
      submissions.forEach(s => {
        const a = (s.answers || []).find(x => x.questionId === q.id);
        if (a) answersForQ.push(a.answer);
      });
      if (answersForQ.length === 0) continue;

      html += `<div class="analytics-block"><h3>${escapeAttr(q.question)}</h3>`;

      if (RATING_TYPES.includes(q.type)) {
        const start = q.type === "rating5" ? 0 : 1;
        const end = q.type === "rating5" ? 5 : 10;
        const labels = [];
        const counts = [];
        for (let n = start; n <= end; n++) {
          labels.push(String(n));
          counts.push(answersForQ.filter(a => a === n).length);
        }
        const avg = (answersForQ.reduce((a, b) => a + b, 0) / answersForQ.length).toFixed(1);
        html += `<p class="analytics-block__avg">Purata: <strong>${avg}</strong> / ${end} (${answersForQ.length} jawapan)</p>`;
        html += `<canvas id="chart-${q.id}" height="90"></canvas>`;
        setTimeout(() => renderBarChart(`chart-${q.id}`, labels, counts), 0);
      } else if (CHOICE_TYPES.includes(q.type)) {
        const optionCounts = {};
        (q.options || []).forEach(opt => optionCounts[opt] = 0);
        answersForQ.forEach(a => {
          const arr = Array.isArray(a) ? a : [a];
          arr.forEach(v => { if (v in optionCounts) optionCounts[v]++; });
        });
        html += `<canvas id="chart-${q.id}" height="90"></canvas>`;
        setTimeout(() => renderBarChart(`chart-${q.id}`, Object.keys(optionCounts), Object.values(optionCounts)), 0);
      } else {
        html += `<div class="analytics-comments">` + answersForQ.map(a =>
          `<p class="analytics-comment">"${escapeAttr(a)}"</p>`
        ).join("") + `</div>`;
      }
      html += `</div>`;
    }

    el.innerHTML = html;
  } catch (err) {
    console.error(err);
    el.innerHTML = `<p style="padding:16px; color:#c0392b;">✗ ${err.message}</p>`;
  }
}

function renderBarChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data, backgroundColor: "#2F8F82", borderRadius: 6 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function collectForm() {
  state.acara.label_kecil = document.getElementById("f-label-kecil").value.trim();
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

  state.teks.tab_title = document.getElementById("t-tab-title").value.trim();
  state.teks.label_akses_pantas = document.getElementById("t-akses-pantas").value.trim();
  state.teks.label_maklumat_terkini = document.getElementById("t-maklumat-terkini").value.trim();
  state.teks.label_faq_title = document.getElementById("t-faq-title").value.trim();
  state.teks.label_feedback_title = document.getElementById("t-feedback-title").value.trim();
  state.teks.label_tambah_kalendar = document.getElementById("t-tambah-kalendar").value.trim();
  state.teks.label_feedback_cta_title = document.getElementById("t-feedback-cta-title").value.trim();
  state.teks.label_feedback_cta_desc = document.getElementById("t-feedback-cta-desc").value.trim();
  state.teks.footer_org = document.getElementById("t-footer-org").value.trim();
  state.teks.footer_copyright = document.getElementById("t-footer-copyright").value.trim();
  state.teks.label_admin_link = document.getElementById("t-admin-link").value.trim();
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
  state.maklumat_berkaitan.unshift({ teks: "", link: "" }); // masuk ATAS - boleh susun semula guna ↑↓ jika perlu
  renderInfoList();
});

document.getElementById("btn-add-faq").addEventListener("click", () => {
  state.faq.push({ soalan: "", jawapan: "" });
  renderFaqList();
});

document.getElementById("doc-upload-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById("doc-upload-status");

  if (file.size > 15 * 1024 * 1024) {
    statusEl.textContent = "✗ Fail terlalu besar (had 15MB).";
    e.target.value = "";
    return;
  }

  statusEl.textContent = "Memuat naik dokumen ke Google Drive...";
  try {
    const result = await uploadDocument(file);
    state.maklumat_berkaitan.unshift({ teks: result.name, link: result.url });
    renderInfoList();
    if (result.warning) {
      statusEl.textContent = `⚠ Dimuat naik, tapi: ${result.warning}`;
    } else {
      statusEl.textContent = "✓ Dokumen dimuat naik. Jangan lupa klik \"Simpan Semua Perubahan\" di bawah untuk sahkan.";
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = `✗ ${err.message}`;
  }
  e.target.value = "";
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

// ---- tab switching ----
let feedbackLoaded = false;
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("is-active", b === btn));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("is-active", p.dataset.tabPanel === target));
    if (target === "feedback" && !feedbackLoaded) {
      feedbackLoaded = true;
      loadFeedbackQuestions();
    }
  });
});

// ---- modal soalan: wiring butang ----
document.getElementById("btn-add-question").addEventListener("click", () => openQuestionModal(null));
document.getElementById("qm-close").addEventListener("click", closeQuestionModal);
document.getElementById("qm-cancel").addEventListener("click", closeQuestionModal);
document.getElementById("qm-save").addEventListener("click", saveQuestionFromModal);
document.getElementById("qm-type").addEventListener("change", toggleOptionsField);
document.getElementById("question-modal").addEventListener("click", (e) => {
  if (e.target.id === "question-modal") closeQuestionModal(); // klik backdrop = tutup
});


onAuthStateChanged(auth, (user) => {
  if (user) {
    enterDashboard();
  } else {
    document.getElementById("gate").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});
