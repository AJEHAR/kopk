// ============================================================
// Page Maklum Balas - SEMUA soalan diambil dari Firestore
// (koleksi feedback_questions, status=active, susun ikut "order").
// TIADA soalan hardcode - admin urus penuh dari /admin.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, where, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const RATING_LABELS = {
  rating5: { min: "Tidak Puas", max: "Sangat Puas", start: 0, end: 5 },
  rating10: { min: "Sangat Tidak Setuju", max: "Sangat Setuju", start: 1, end: 10 },
};

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderLogos(containerIds) {
  const logos = [
    { src: "../images/logo-jata-negara.png", alt: "Jata Negara" },
    { src: "../images/logo-mss-pahang.png", alt: "MSS Pahang" },
  ];
  const html = logos.map(l => `<img src="${l.src}" alt="${l.alt}">`).join("");
  containerIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

function renderQuestion(q, index) {
  const num = String(index + 1).padStart(2, "0");
  const requiredMark = q.required ? '<span class="fq-required">*</span>' : "";

  let bodyHtml = "";

  if (q.type === "rating5" || q.type === "rating10") {
    const cfg = RATING_LABELS[q.type];
    const defaultValue = q.type === "rating5" ? cfg.end : null; // skor kepuasan: default Sangat Puas
    const opts = Array.from({ length: cfg.end - cfg.start + 1 }, (_, i) => i + cfg.start)
      .map(n => `<button type="button" class="fq-rating__opt${n === defaultValue ? " is-selected" : ""}" data-value="${n}">${n}</button>`)
      .join("");
    bodyHtml = `
      <div class="fq-rating" data-answer-container${defaultValue !== null ? ` data-selected="${defaultValue}"` : ""}>
        <span class="fq-rating__label">${cfg.min}</span>
        <div class="fq-rating__scale">${opts}</div>
        <span class="fq-rating__label">${cfg.max}</span>
      </div>
    `;
  } else if (q.type === "single_choice") {
    bodyHtml = `
      <div class="fq-choices" data-answer-container>
        ${(q.options || []).map((opt, i) => `
          <label class="fq-choice">
            <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}">
            ${escapeHtml(opt)}
          </label>
        `).join("")}
      </div>
    `;
  } else if (q.type === "multi_choice") {
    bodyHtml = `
      <div class="fq-choices" data-answer-container>
        ${(q.options || []).map((opt, i) => `
          <label class="fq-choice">
            <input type="checkbox" name="q_${q.id}" value="${escapeHtml(opt)}">
            ${escapeHtml(opt)}
          </label>
        `).join("")}
      </div>
    `;
  } else if (q.type === "short_text") {
    bodyHtml = `<input type="text" class="fq-input" data-answer-container maxlength="300">`;
  } else if (q.type === "long_text") {
    bodyHtml = `<textarea class="fq-textarea" rows="4" data-answer-container maxlength="2000"></textarea>`;
  }

  return `
    <div class="fq-item" data-qid="${q.id}" data-qtype="${q.type}" data-required="${q.required ? "1" : "0"}">
      <div class="fq-item__header">
        <span class="fq-item__num">${num}</span>
        <p class="fq-item__question">${escapeHtml(q.question)}${requiredMark}</p>
      </div>
      ${bodyHtml}
      <p class="fq-item__error">Sila jawab soalan ini.</p>
    </div>
  `;
}

function wireQuestionInteractions() {
  // rating: klik untuk pilih
  document.querySelectorAll(".fq-rating").forEach(container => {
    const opts = container.querySelectorAll(".fq-rating__opt");
    opts.forEach(opt => {
      opt.addEventListener("click", () => {
        opts.forEach(o => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        container.dataset.selected = opt.dataset.value;
        container.closest(".fq-item").classList.remove("has-error");
      });
    });
  });

  // choices: highlight bila dipilih
  document.querySelectorAll(".fq-choice input").forEach(input => {
    input.addEventListener("change", () => {
      const label = input.closest(".fq-choice");
      if (input.type === "radio") {
        label.closest(".fq-choices").querySelectorAll(".fq-choice").forEach(l => l.classList.remove("is-checked"));
      }
      label.classList.toggle("is-checked", input.checked);
      label.closest(".fq-item").classList.remove("has-error");
    });
  });

  // teks: buang error bila mula taip
  document.querySelectorAll(".fq-input, .fq-textarea").forEach(input => {
    input.addEventListener("input", () => input.closest(".fq-item").classList.remove("has-error"));
  });
}

function getAnswerForItem(item) {
  const type = item.dataset.qtype;
  if (type === "rating5" || type === "rating10") {
    const container = item.querySelector(".fq-rating");
    return container.dataset.selected ? Number(container.dataset.selected) : null;
  }
  if (type === "single_choice") {
    const checked = item.querySelector('input[type="radio"]:checked');
    return checked ? checked.value : null;
  }
  if (type === "multi_choice") {
    const checked = Array.from(item.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
    return checked.length ? checked : null;
  }
  if (type === "short_text") {
    const val = item.querySelector(".fq-input").value.trim();
    return val || null;
  }
  if (type === "long_text") {
    const val = item.querySelector(".fq-textarea").value.trim();
    return val || null;
  }
  return null;
}

async function loadQuestions() {
  const loadingEl = document.getElementById("fq-loading");
  const emptyEl = document.getElementById("fq-empty");
  const formEl = document.getElementById("fq-form");
  const questionsEl = document.getElementById("fq-questions");

  try {
    const q = query(
      collection(db, "feedback_questions"),
      where("status", "==", "active"),
      orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    loadingEl.style.display = "none";

    if (questions.length === 0) {
      emptyEl.style.display = "block";
      return;
    }

    questionsEl.innerHTML = questions.map((q, i) => renderQuestion(q, i)).join("");
    formEl.dataset.questions = JSON.stringify(questions.map(q => ({ id: q.id, question: q.question, type: q.type })));
    formEl.style.display = "block";
    wireQuestionInteractions();
  } catch (err) {
    console.error(err);
    loadingEl.textContent = "Ralat memuatkan soalan. Sila cuba lagi.";
  }
}

function wireSubmit() {
  const form = document.getElementById("fq-form");
  const statusEl = document.getElementById("fq-status");
  const btn = document.getElementById("fq-submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // honeypot
    if (document.getElementById("fq-honeypot").value) return;

    const questionsMeta = JSON.parse(form.dataset.questions || "[]");
    const items = Array.from(document.querySelectorAll(".fq-item"));
    let hasError = false;
    const answers = [];

    items.forEach(item => {
      const qid = item.dataset.qid;
      const meta = questionsMeta.find(q => q.id === qid);
      const required = item.dataset.required === "1";
      const answer = getAnswerForItem(item);

      if (required && (answer === null || answer === undefined)) {
        item.classList.add("has-error");
        hasError = true;
        return;
      }

      if (answer !== null && answer !== undefined) {
        answers.push({ questionId: qid, questionText: meta?.question || "", type: meta?.type || "", answer });
      }
    });

    if (hasError) {
      statusEl.textContent = "Sila lengkapkan semua soalan wajib (ditanda merah).";
      statusEl.className = "fq-status is-err";
      document.querySelector(".fq-item.has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (answers.length === 0) {
      statusEl.textContent = "Sila jawab sekurang-kurangnya satu soalan.";
      statusEl.className = "fq-status is-err";
      return;
    }

    btn.disabled = true;
    statusEl.textContent = "Menghantar...";
    statusEl.className = "fq-status";

    try {
      await addDoc(collection(db, "feedback_submissions"), {
        submittedAt: serverTimestamp(),
        answers,
      });
      document.getElementById("fq-form").style.display = "none";
      document.getElementById("fq-thankyou").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      statusEl.textContent = "✗ Gagal menghantar. Sila cuba lagi.";
      statusEl.className = "fq-status is-err";
      btn.disabled = false;
    }
  });
}

renderLogos(["header-logos", "footer-logos"]);
loadQuestions();
wireSubmit();
