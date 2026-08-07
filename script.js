// ============================================================
// Laman ni baca SEMUA maklumat dari Firestore (koleksi "site",
// dokumen "config"). Untuk update -> guna /admin, bukan edit
// fail ni terus.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EXTERNAL_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
const ARROW_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M8 7h9v9"/></svg>`;

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
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
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

async function loadContent() {
  const snap = await getDoc(doc(db, "site", "config"));
  if (!snap.exists()) throw new Error("Data belum disediakan lagi (dokumen site/config tiada di Firestore).");
  return snap.data();
}

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

function renderHero(acara) {
  document.title = acara.nama_penuh;
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
        <span class="info-item__text"><span class="info-item__dot"></span>${item.teks}</span>
        ${hasLink ? `<span class="info-item__icon">${EXTERNAL_ICON}</span>` : ""}
      </${tag}>
    `;
  }).join("");
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
  setInterval(tick, 1000);
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

  gsap.utils.toArray(".section__head, .info-panel").forEach(el => {
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

async function init() {
  try {
    const data = await loadContent();
    renderLogos(["header-logos", "footer-logos"]);
    renderHero(data.acara);
    renderCards(data.kotak, data.acara.asset_version);
    renderInfoList(data.maklumat_berkaitan);
    startCountdown(data.acara);
    initMotion();
  } catch (err) {
    console.error(err);
    document.getElementById("hero-title").textContent =
      "Ralat: tak dapat baca data. Sila semak Firestore & firebase-config.js.";
  }
}

init();
