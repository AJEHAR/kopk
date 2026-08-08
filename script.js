// ============================================================
// Laman ni baca SEMUA maklumat dari Firestore (koleksi "site",
// dokumen "config"). Untuk update -> guna /admin, bukan edit
// fail ni terus.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EXTERNAL_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
const INFO_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/></svg>`;
const ARROW_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
const CHEVRON_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>`;

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// tambah ?v=<versi> pada URL gambar supaya browser paksa muat semula
// bila admin update gambar (elak isu cache lama tersangkut)
function withVersion(path, version) {
  if (!path) return path;
  return version ? `${path}?v=${version}` : path;
}

// jaring keselamatan: kalau admin lupa taip https:// depan link,
// browser akan anggap ia path relatif (contoh: kopk.syazr.com/callroom.syazr.com).
// auto-tambah https:// supaya link luar sentiasa betul.
function normalizeUrl(url) {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

// Logo tetap fail statik dalam repo (jarang tukar, bukan sebahagian admin)
// Naikkan STATIC_ASSET_VERSION ni secara manual bila anda ganti fail logo,
// supaya browser orang lain paksa muat semula versi baru.
const STATIC_ASSET_VERSION = 1;
const STATIC_LOGOS = [
  { src: "images/logo-jata-negara.png", alt: "Jata Negara" },
  { src: "images/logo-mss-pahang.png", alt: "MSS Pahang" },
  { src: "images/logo-tambahan.png", alt: "Logo Tambahan", aktif: false },
];

function renderLogos(containerIds) {
  const html = STATIC_LOGOS
    .filter(l => l.aktif !== false)
    .map(l => `<img src="${withVersion(l.src, STATIC_ASSET_VERSION)}" alt="${l.alt}" loading="lazy">`)
    .join("");
  containerIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

// jana link "Tambah ke Kalendar Google" berdasarkan tarikh acara
function wireAddToCalendar(acara) {
  const btn = document.getElementById("btn-add-calendar");
  if (!btn) return;

  // guna tarikh buka/tutup pendaftaran sebagai anggaran tempoh acara jika
  // tarikh_acara (teks bebas) tak boleh di-parse; lebih baik guna tarikh
  // pendaftaran tutup sebagai penanda supaya sentiasa ada tarikh sah
  const start = acara.tarikh_buka_pendaftaran ? new Date(acara.tarikh_buka_pendaftaran) : null;
  const end = acara.tarikh_tutup_pendaftaran ? new Date(acara.tarikh_tutup_pendaftaran) : null;
  if (!start || isNaN(start) || !end || isNaN(end)) {
    btn.style.display = "none";
    return;
  }

  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const title = encodeURIComponent(acara.nama_penuh || "Kejohanan Olahraga Pendidikan Khas MSS Pahang");
  const details = encodeURIComponent(`Tempoh pendaftaran: ${acara.tarikh_acara || ""}\nLokasi: ${acara.lokasi || ""}`);
  const location = encodeURIComponent(acara.lokasi || "");

  btn.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
}

function renderText(teks) {
  if (!teks) return;
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== "") el.textContent = val;
  };
  document.title = teks.tab_title || "az=R - KOPK";
  setText("label-akses-pantas", teks.label_akses_pantas);
  setText("label-maklumat-terkini", teks.label_maklumat_terkini);
  setText("label-faq-title", teks.label_faq_title);
  setText("label-feedback-title", teks.label_feedback_title);
  setText("label-tambah-kalendar", teks.label_tambah_kalendar);
  if (teks.label_fb_nama) {
    document.getElementById("label-fb-nama").innerHTML = `${escapeHtml(teks.label_fb_nama)} <span class="hint">(pilihan)</span>`;
  }
  if (teks.label_fb_emel) {
    document.getElementById("label-fb-emel").innerHTML = `${escapeHtml(teks.label_fb_emel)} <span class="hint">(pilihan)</span>`;
  }
  setText("label-fb-mesej", teks.label_fb_mesej);
  setText("label-fb-rating", teks.label_fb_rating);
  setText("label-fb-submit", teks.label_fb_submit);
  setText("footer-org", teks.footer_org);
  setText("footer-copyright-text", teks.footer_copyright);
  setText("label-admin-link", teks.label_admin_link);
}

function renderHero(acara) {
  document.title = "az=R - KOPK";
  document.getElementById("hero-eyebrow").textContent = acara.label_kecil || "";
  document.getElementById("hero-title").textContent = acara.nama_penuh;
  document.getElementById("hero-tarikh-text").textContent = acara.tarikh_acara;
  document.getElementById("hero-lokasi-text").textContent = acara.lokasi;
  document.getElementById("footer-name").textContent = acara.nama_penuh;
  document.getElementById("footer-year").textContent = new Date().getFullYear();

  if (acara.gambar_hero) {
    const bg = document.getElementById("hero-bg");
    const mobileSource = document.getElementById("hero-bg-mobile-source");
    bg.src = withVersion(acara.gambar_hero, acara.asset_version);
    bg.alt = acara.nama_penuh;
    // versi mobile: fail statik "hero-mobile.jpg" (crop khas potret), sama folder
    mobileSource.srcset = withVersion("images/hero-mobile.jpg", acara.asset_version);
  }

  // kegelapan latar hero - boleh dilaraskan dari /admin (default 0.85 jika belum diset)
  const overlay = document.getElementById("hero-overlay");
  const opacity = typeof acara.hero_overlay_opacity === "number" ? acara.hero_overlay_opacity : 0.85;
  overlay.style.opacity = opacity;
}

function renderCards(kotak, version) {
  const el = document.getElementById("cards");
  el.innerHTML = kotak.map((k, i) => `
    <a class="card" href="${normalizeUrl(k.link)}" target="_blank" rel="noopener noreferrer" data-reveal data-card-index="${i}">
      <img class="card__img" src="${withVersion(k.gambar, version)}" alt="" loading="lazy">
      <div class="card__body">
        <p class="card__label">${k.label} ${ARROW_ICON}</p>
        <p class="card__desc">${k.keterangan || ""}</p>
      </div>
    </a>
  `).join("");
}

function renderInfoList(items) {
  const el = document.getElementById("info-list");
  el.innerHTML = (items || []).map(item => {
    const hasLink = item.link && item.link.trim().length > 0;
    const tag = hasLink ? "a" : "div";
    const attrs = hasLink ? `href="${normalizeUrl(item.link)}" target="_blank" rel="noopener noreferrer"` : "";
    return `
      <${tag} class="info-item ${hasLink ? "info-item--link" : ""}" ${attrs}>
        <span class="info-item__text"><span class="info-item__icon-badge">${INFO_ICON}</span>${item.teks}</span>
        ${hasLink ? `<span class="info-item__icon">${EXTERNAL_ICON}</span>` : ""}
      </${tag}>
    `;
  }).join("");
}

function renderFaq(faq) {
  const section = document.getElementById("faq-section");
  const el = document.getElementById("faq-list");
  if (!faq || faq.length === 0) {
    if (section) section.style.display = "none";
    return;
  }
  el.innerHTML = faq.map((item, i) => `
    <div class="faq-item" data-index="${i}">
      <button type="button" class="faq-item__question">
        <span>${item.soalan || ""}</span>
        ${CHEVRON_ICON}
      </button>
      <div class="faq-item__answer"><p>${item.jawapan || ""}</p></div>
    </div>
  `).join("");

  el.querySelectorAll(".faq-item__question").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".faq-item").classList.toggle("is-open");
    });
  });
}

function wireFeedbackForm() {
  const form = document.getElementById("feedback-form");
  if (!form) return;
  const statusEl = document.getElementById("feedback-status");

  // ---- star rating (klik untuk pilih, hover untuk pratonton) ----
  const starContainer = document.getElementById("star-rating");
  const stars = Array.from(starContainer.querySelectorAll(".star"));

  function paintStars(upTo, className) {
    stars.forEach(s => s.classList.toggle(className, Number(s.dataset.value) <= upTo));
  }

  stars.forEach(star => {
    star.addEventListener("click", () => {
      starContainer.dataset.rating = star.dataset.value;
      paintStars(Number(star.dataset.value), "is-filled");
    });
    star.addEventListener("mouseenter", () => paintStars(Number(star.dataset.value), "is-hover"));
    star.addEventListener("mouseleave", () => paintStars(0, "is-hover"));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // honeypot: medan tersembunyi - kalau bot isi ni, senyap-senyap abaikan
    const honeypot = document.getElementById("fb-honeypot").value;
    if (honeypot) return;

    const mesej = document.getElementById("fb-mesej").value.trim();
    const rating = Number(starContainer.dataset.rating) || 0;

    if (!mesej) {
      statusEl.textContent = "Sila isi mesej.";
      statusEl.className = "feedback-status is-err";
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    statusEl.textContent = "Menghantar...";
    statusEl.className = "feedback-status";

    try {
      await addDoc(collection(db, "feedback"), {
        nama: document.getElementById("fb-nama").value.trim(),
        emel: document.getElementById("fb-emel").value.trim(),
        mesej,
        rating,
        dihantar_pada: serverTimestamp(),
        dibaca: false,
      });
      form.reset();
      starContainer.dataset.rating = "0";
      paintStars(0, "is-filled");
      statusEl.textContent = "✓ Terima kasih! Maklum balas anda telah dihantar.";
      statusEl.className = "feedback-status is-ok";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "✗ Gagal menghantar. Sila cuba lagi.";
      statusEl.className = "feedback-status is-err";
    } finally {
      btn.disabled = false;
    }
  });
}

function startCountdown(acara) {
  const target = new Date(acara.tarikh_tutup_pendaftaran).getTime();
  const opened = new Date(acara.tarikh_buka_pendaftaran).getTime();
  const el = document.getElementById("countdown");
  const caption = document.getElementById("countdown-caption");

  const fmt = (d) => d.toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });

  function cell(num, label) {
    return `<div class="countdown__cell"><span class="countdown__num">${String(num).padStart(2, "0")}</span><span class="countdown__label">${label}</span></div>`;
  }

  function tick() {
    const now = Date.now();

    if (now < opened) {
      el.classList.remove("is-closed");
      const diff = opened - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      el.innerHTML = cell(d, "Hari") + cell(h, "Jam") + cell(Math.floor((diff / 60000) % 60), "Minit");
      caption.innerHTML = `Pendaftaran <strong>dibuka</strong> pada ${fmt(new Date(opened))}`;
      return;
    }

    const diff = target - now;
    if (diff <= 0) {
      el.classList.add("is-closed");
      el.innerHTML = `<div class="countdown__cell"><span class="countdown__num">TUTUP</span><span class="countdown__label">Pendaftaran</span></div>`;
      caption.innerHTML = `Pendaftaran telah <strong>ditutup</strong> pada ${fmt(new Date(target))}`;
      return;
    }

    el.classList.remove("is-closed");
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff / 3600000) % 24);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);

    el.innerHTML = cell(d, "Hari") + cell(h, "Jam") + cell(m, "Minit") + cell(s, "Saat");
    caption.innerHTML = `Pendaftaran <strong>ditutup</strong> pada ${fmt(new Date(target))}`;
  }

  tick();
  return setInterval(tick, 1000);
}

function initMotion() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof gsap === "undefined" || reduced) {
    document.querySelectorAll("[data-reveal]").forEach(el => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.timeline({ defaults: { ease: "power3.out" } })
    .to(".hero .hero__eyebrow", { opacity: 1, y: 0, duration: 0.7 }, 0.1)
    .to(".hero .hero__title", { opacity: 1, y: 0, duration: 0.9 }, 0.2)
    .to(".hero .hero__meta", { opacity: 1, y: 0, duration: 0.8 }, 0.36)
    .to(".hero #countdown", { opacity: 1, y: 0, duration: 0.8 }, 0.48)
    .to(".hero .countdown-caption", { opacity: 1, y: 0, duration: 0.7 }, 0.58);

  gsap.to("#hero-bg", {
    yPercent: 14, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  gsap.utils.toArray(".section__head, .info-panel, .feedback-form, #faq-list").forEach(el => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });

  gsap.to(".card", {
    opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12,
    scrollTrigger: { trigger: ".cards", start: "top 80%" }
  });
}

let countdownIntervalId = null;
let isFirstLoad = true;

function renderAll(data) {
  renderLogos(["header-logos", "footer-logos"]);
  renderText(data.teks);
  renderHero(data.acara);
  wireAddToCalendar(data.acara);
  renderCards(data.kotak, data.acara.asset_version);
  renderInfoList(data.maklumat_berkaitan);
  renderFaq(data.faq);

  if (countdownIntervalId) clearInterval(countdownIntervalId);
  countdownIntervalId = startCountdown(data.acara);

  if (isFirstLoad) {
    wireFeedbackForm();
    initMotion();
    isFirstLoad = false;
  } else {
    // update seterusnya (real-time, tanpa refresh) - papar terus tanpa
    // tunggu scroll-trigger baru (elemen ni baru sahaja dijana semula)
    document.querySelectorAll("#cards [data-reveal]").forEach(el => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
  }
}

function init() {
  const ref = doc(db, "site", "config");
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      document.getElementById("hero-title").textContent =
        "Ralat: data belum disediakan lagi (dokumen site/config tiada di Firestore).";
      return;
    }
    renderAll(snap.data());
  }, (err) => {
    console.error(err);
    document.getElementById("hero-title").textContent =
      "Ralat: tak dapat baca data. Sila semak Firestore & firebase-config.js.";
  });
}

init();

// daftar Service Worker untuk offline-ready (senyap - tak ganggu UX kalau gagal)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service Worker gagal daftar (tak kritikal):", err);
    });
  });
}
