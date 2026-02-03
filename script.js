/*
  StudyScan AI – Frontend-only demo logic
  --------------------------------------
  ✔ Uploads + links stored locally
  ✔ Simulated OCR + question detection
  ✔ Marks-based answer formatting
  ✔ Offline badge + cached answers
*/

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return [...document.querySelectorAll(selector)]; }

const storageKey = "studyscan_data";

const defaultData = {
  profile: {
    classLevel: "Degree",
    subject: "",
    board: "",
    marks: 10,
    tone: "exam",
    includeExamples: true,
    includeDiagrams: true,
    strictMode: true,
    offlineMode: "full",
    language: "en"
  },
  uploads: [],
  links: [],
  manualText: "",
  modules: [],
  questions: [],
  answers: []
};

function loadData() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  return saved ? { ...defaultData, ...saved } : { ...defaultData };
}

function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function updateOnlineBadge() {
  qsa("#online-badge").forEach(badge => {
    if (!badge) return;
    const isOnline = navigator.onLine;
    badge.textContent = isOnline ? "Online" : "Offline";
    badge.classList.toggle("online", isOnline);
  });
}

function formatUploadBadge(type) {
  const label = type.toUpperCase();
  return `<span class="pill">${label}</span>`;
}

function initLanding() {
  updateOnlineBadge();
  window.addEventListener("online", updateOnlineBadge);
  window.addEventListener("offline", updateOnlineBadge);
}

function initInputs() {
  updateOnlineBadge();
  window.addEventListener("online", updateOnlineBadge);
  window.addEventListener("offline", updateOnlineBadge);

  const data = loadData();

  qs("#class-level").value = data.profile.classLevel;
  qs("#subject").value = data.profile.subject;
  qs("#board").value = data.profile.board;
  qs("#marks").value = String(data.profile.marks);
  qs("#tone").value = data.profile.tone;
  qs("#include-examples").checked = data.profile.includeExamples;
  qs("#include-diagrams").checked = data.profile.includeDiagrams;
  qs("#strict-mode").checked = data.profile.strictMode;
  qs("#offline-mode").value = data.profile.offlineMode;
  qs("#language").value = data.profile.language;
  qs("#manual-text").value = data.manualText || "";

  renderUploads(data);
  renderLinks(data);
  renderQuestions(data.questions || []);
  renderExtractionPreview(data);

  qs("#btn-dashboard").onclick = () => location.href = "dashboard.html";

  const uploadZone = qs("#upload-zone");
  const fileInput = qs("#file-input");
  uploadZone.addEventListener("click", () => fileInput.click());
  uploadZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadZone.classList.add("border-info");
  });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("border-info"));
  uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadZone.classList.remove("border-info");
    const files = [...event.dataTransfer.files];
    handleFiles(files, data);
  });

  fileInput.addEventListener("change", (event) => {
    const files = [...event.target.files];
    handleFiles(files, data);
  });

  qs("#add-link").onclick = () => {
    const value = qs("#link-input").value.trim();
    if (!value) return;
    data.links.push({ url: value, addedAt: new Date().toISOString() });
    qs("#link-input").value = "";
    saveData(data);
    renderLinks(data);
  };

  qs("#run-scan").onclick = () => {
    syncProfile(data);
    data.manualText = qs("#manual-text").value.trim();
    runScan(data);
    saveData(data);
    renderQuestions(data.questions);
    renderExtractionPreview(data);
  };

  qs("#save-and-go").onclick = () => {
    syncProfile(data);
    data.manualText = qs("#manual-text").value.trim();
    saveData(data);
    location.href = "dashboard.html";
  };

  qs("#clear-all").onclick = () => {
    localStorage.removeItem(storageKey);
    location.reload();
  };
}

function syncProfile(data) {
  data.profile = {
    classLevel: qs("#class-level").value,
    subject: qs("#subject").value.trim(),
    board: qs("#board").value.trim(),
    marks: parseInt(qs("#marks").value, 10),
    tone: qs("#tone").value,
    includeExamples: qs("#include-examples").checked,
    includeDiagrams: qs("#include-diagrams").checked,
    strictMode: qs("#strict-mode").checked,
    offlineMode: qs("#offline-mode").value,
    language: qs("#language").value
  };
}

function handleFiles(files, data) {
  files.forEach(file => {
    data.uploads.push({
      name: file.name,
      type: file.name.split(".").pop() || "file",
      size: file.size,
      pages: Math.max(1, Math.round(file.size / 120000))
    });
  });
  saveData(data);
  renderUploads(data);
}

function renderUploads(data) {
  const container = qs("#upload-list");
  if (!container) return;
  if (!data.uploads.length) {
    container.innerHTML = `<p class="text-muted">No files uploaded yet.</p>`;
    return;
  }
  container.innerHTML = data.uploads.map((file, index) => `
    <div class="d-flex justify-content-between align-items-center question-card">
      <div>
        <strong>${file.name}</strong>
        <div class="text-muted small">${file.pages} pages · ${Math.round(file.size / 1024)} KB</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        ${formatUploadBadge(file.type)}
        <button class="btn btn-outline-light btn-sm" data-remove-upload="${index}">Remove</button>
      </div>
    </div>
  `).join("");

  qsa("[data-remove-upload]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.removeUpload, 10);
      data.uploads.splice(idx, 1);
      saveData(data);
      renderUploads(data);
    };
  });
}

function renderLinks(data) {
  const container = qs("#link-list");
  if (!container) return;
  if (!data.links.length) {
    container.innerHTML = `<p class="text-muted">No links added yet.</p>`;
    return;
  }
  container.innerHTML = data.links.map((link, index) => `
    <div class="d-flex justify-content-between align-items-center question-card">
      <div>
        <strong>${link.url}</strong>
        <div class="text-muted small">Added ${new Date(link.addedAt).toLocaleString()}</div>
      </div>
      <button class="btn btn-outline-light btn-sm" data-remove-link="${index}">Remove</button>
    </div>
  `).join("");

  qsa("[data-remove-link]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.removeLink, 10);
      data.links.splice(idx, 1);
      saveData(data);
      renderLinks(data);
    };
  });
}

function runScan(data) {
  const moduleNames = [
    "Unit 1 · Fundamentals",
    "Unit 2 · Core Concepts",
    "Unit 3 · Applications",
    "Unit 4 · Case Studies"
  ];

  data.modules = moduleNames.map((name, index) => ({
    name,
    topics: [`Topic ${index + 1}.1`, `Topic ${index + 1}.2`, `Topic ${index + 1}.3`]
  }));

  const baseQuestions = [
    "Define the key concept and list any two advantages.",
    "Explain the process with a neat diagram.",
    "Differentiate between primary and secondary approaches.",
    "Solve the numerical and justify each step.",
    "Describe the architecture and its applications.",
    "List the important formulas with conditions of use.",
    "Write short notes on recent advancements.",
    "Outline the algorithm and analyze complexity."
  ];

  data.questions = baseQuestions.map((text, index) => ({
    id: `q-${index + 1}`,
    text,
    marks: data.profile.marks,
    module: data.modules[index % data.modules.length].name,
    source: data.uploads[0]?.name || "Uploaded Content",
    page: (index + 2)
  }));

  data.answers = [];
}

function renderExtractionPreview(data) {
  const container = qs("#extraction-preview");
  if (!container) return;
  if (!data.modules.length) {
    container.innerHTML = `<p class="text-muted">Run a scan to preview extracted text, modules, and detected questions.</p>`;
    return;
  }

  const modules = data.modules.map(module => `
    <div class="question-card">
      <strong>${module.name}</strong>
      <div class="text-muted small">${module.topics.join(" · ")}</div>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="mb-3">
      <h6 class="text-uppercase text-muted">Modules detected</h6>
      <div class="d-grid gap-2">${modules}</div>
    </div>
    <div>
      <h6 class="text-uppercase text-muted">OCR sample</h6>
      <p class="text-muted">"${data.manualText || "Sample OCR text: The system collects requirements, applies the core concept, and evaluates outcomes with references."}"</p>
    </div>
  `;
}

function renderQuestions(questions) {
  const container = qs("#question-list");
  const count = qs("#question-count");
  if (!container || !count) return;
  count.textContent = `${questions.length} questions`;
  if (!questions.length) {
    container.innerHTML = `<p class="text-muted">No questions detected yet.</p>`;
    return;
  }
  container.innerHTML = questions.map(question => `
    <div class="question-card">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <strong>${question.text}</strong>
          <div class="text-muted small">${question.module}</div>
        </div>
        <span class="pill">${question.marks} Marks</span>
      </div>
    </div>
  `).join("");
}

function initDashboard() {
  updateOnlineBadge();
  window.addEventListener("online", updateOnlineBadge);
  window.addEventListener("offline", updateOnlineBadge);

  const data = loadData();

  qs("#btn-edit").onclick = () => location.href = "inputs.html";

  const statFiles = qs("#stat-files");
  const statQuestions = qs("#stat-questions");
  const statAnswers = qs("#stat-answers");
  const statOffline = qs("#stat-offline");

  if (statFiles) statFiles.textContent = data.uploads.length;
  if (statQuestions) statQuestions.textContent = data.questions.length;
  if (statAnswers) statAnswers.textContent = data.answers.length;
  if (statOffline) statOffline.textContent = data.profile.offlineMode === "full" ? "Full" : data.profile.offlineMode;

  renderWorkspaceUploads(data);
  renderWorkspaceLinks(data);
  renderAnswers(data);
  updateProgress(data);

  qs("#generate-answers").onclick = () => {
    if (!data.questions.length) {
      alert("No questions detected yet. Run a scan first.");
      return;
    }
    data.answers = data.questions.map(question => buildAnswer(question, data.profile, data));
    saveData(data);
    renderAnswers(data);
    updateProgress(data);
  };

  qs("#clear-answers").onclick = () => {
    data.answers = [];
    saveData(data);
    renderAnswers(data);
    updateProgress(data);
  };
}

function buildAnswer(question, profile, data) {
  const citation = `${question.source} · Page ${question.page}`;
  const toneLabel = profile.tone === "simple" ? "Simple" : profile.tone === "exam" ? "Exam-style" : "Detailed";
  const intro = `(${toneLabel}) ${question.text}`;

  const templates = {
    2: ["Definition", "2 key points"],
    5: ["Definition", "Explanation", "Example"],
    8: ["Intro", "Key steps", "Example", "Summary"],
    10: ["Intro", "Structured headings", "Diagram", "Example", "Conclusion"],
    15: ["Intro", "Detailed headings", "Derivation/Steps", "Applications", "Conclusion"]
  };

  const blocks = templates[profile.marks] || templates[10];
  const points = blocks.map(block => `• ${block} from uploaded content.`);

  if (profile.includeExamples) {
    points.push("• Example aligned to the uploaded notes.");
  }
  if (profile.includeDiagrams) {
    points.push("• Diagram description with labeled steps.");
  }

  const strictNote = profile.strictMode
    ? "Strict mode: Answer grounded only in uploads."
    : "Hybrid mode: Includes general knowledge where helpful.";

  return {
    id: question.id,
    question: question.text,
    content: `${intro}\n${points.join("\n")}\n${strictNote}`,
    citation
  };
}

function renderWorkspaceUploads(data) {
  const container = qs("#upload-summary");
  if (!container) return;
  if (!data.uploads.length) {
    container.innerHTML = `<p class="text-muted">No uploads yet. Go to Upload Studio to add files.</p>`;
    return;
  }
  container.innerHTML = data.uploads.map(file => `
    <div class="d-flex justify-content-between align-items-center question-card">
      <div>
        <strong>${file.name}</strong>
        <div class="text-muted small">${file.pages} pages</div>
      </div>
      ${formatUploadBadge(file.type)}
    </div>
  `).join("");
}

function renderWorkspaceLinks(data) {
  const container = qs("#link-summary");
  if (!container) return;
  if (!data.links.length) {
    container.innerHTML = `<p class="text-muted">No links added.</p>`;
    return;
  }
  container.innerHTML = data.links.map(link => `
    <div class="question-card">
      <strong>${link.url}</strong>
      <div class="text-muted small">Transcript cached for offline access.</div>
    </div>
  `).join("");
}

function renderAnswers(data) {
  const container = qs("#answer-list");
  if (!container) return;
  if (!data.answers.length) {
    container.innerHTML = `<p class="text-muted">No answers generated yet. Click “Generate Answers” to begin.</p>`;
    return;
  }

  container.innerHTML = data.answers.map(answer => `
    <div class="answer-card mb-3">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <h6>${answer.question}</h6>
        <span class="pill">${answer.citation}</span>
      </div>
      <pre class="text-light mt-2">${answer.content}</pre>
      <div class="answer-actions d-flex gap-2 mt-3">
        <button class="btn btn-outline-light" data-action="regenerate" data-id="${answer.id}">Regenerate</button>
        <button class="btn btn-outline-light" data-action="more" data-id="${answer.id}">Add more points</button>
        <button class="btn btn-outline-light" data-action="shorter" data-id="${answer.id}">Make it shorter</button>
        <button class="btn btn-outline-light" data-action="diagram" data-id="${answer.id}">Add diagram</button>
      </div>
    </div>
  `).join("");

  qsa("[data-action]").forEach(button => {
    button.onclick = () => handleAnswerAction(button.dataset.action, button.dataset.id, data);
  });
}

function handleAnswerAction(action, id, data) {
  const answer = data.answers.find(item => item.id === id);
  if (!answer) return;

  if (action === "regenerate") {
    const question = data.questions.find(q => q.id === id);
    if (question) {
      const refreshed = buildAnswer(question, data.profile, data);
      answer.content = refreshed.content;
    }
  }

  if (action === "more") {
    answer.content += "\n• Additional point from the same module.";
  }

  if (action === "shorter") {
    answer.content = answer.content.split("\n").slice(0, 3).join("\n") + "\n• Summary kept short.";
  }

  if (action === "diagram") {
    answer.content += "\n• Diagram: Labeled flow from input → processing → output.";
  }

  saveData(data);
  renderAnswers(data);
  updateProgress(data);
}

function updateProgress(data) {
  const progressBar = qs("#progress-bar");
  const progressLabel = qs("#progress-label");
  if (!progressBar || !progressLabel) return;

  const total = data.questions.length;
  const answered = data.answers.length;
  const percent = total ? Math.round((answered / total) * 100) : 0;

  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `Answered ${answered}/${total}`;
}

// Router
window.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "inputs") initInputs();
  if (page === "dashboard") initDashboard();
  if (page === "landing") initLanding();
});
