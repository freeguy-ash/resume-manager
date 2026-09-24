/**
 * Resume Manager
 * Edits a data object shaped exactly like repo1/data.json, mirrors it live
 * into the preview iframe (a copy of repo1's site under ./preview/), and
 * exports the result so it can be committed back into repo1.
 */

const SAMPLE_DATA = {
  name: "Ashwin Venkatesan",
  title: "Student at Anna University",
  bio: "Two years of building data-heavy interfaces and design systems. I care about performance, accessibility, and making complicated tools feel calm to use.",
  contact: {
    email: "ashwin080107@gmail.com",
    phone: "+91 9345890620",
    location: "Coimbatore, Tamil Nadu (open to remote)",
    github: "github.com/ashwin",
    linkedin: "linkedin.com/ashwin",
  },
  skills: {
    languages: ["C", "Python", "Java"],
    frontend: "[Have to learn]",
    backend: "[Have to learn]",
    practice: "Blockchain",
  },
  experience: [
    { role: "Senior Frontend Engineer", company: "Orbitline, mission-planning software", period: "2022 to present", current: true, bullets: [] },
    { role: "Frontend Engineer", company: "Northlight Analytics", period: "2018 to 2022", current: false, bullets: [] },
    { role: "Web Developer", company: "Kestrel Studio", period: "2015 to 2018", current: false, bullets: [] },
  ],
  education: {
    degree: "B.Tech, Artificial Intelligence and Data Science",
    school: "Anna University Regional Campus Coimbatore",
  },
  integrations: {
    githubUsername: "ashwin",
    leetcodeUsername: "ashwin",
  },
};

const editor = document.getElementById("editor");
const expList = document.getElementById("experience-list");
const expTemplate = document.getElementById("experience-row-template");
const preview = document.getElementById("preview");

// ---------- nested path helpers ----------
function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}
function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ---------- experience rows ----------
function addExpRow(job = { role: "", company: "", period: "", current: false, bullets: [] }) {
  const node = expTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="role"]').value = job.role || "";
  node.querySelector('[data-field="company"]').value = job.company || "";
  node.querySelector('[data-field="period"]').value = job.period || "";
  node.querySelector('[data-field="current"]').checked = !!job.current;
  node.querySelector('[data-field="bullets"]').value = (job.bullets || []).join("\n");
  node.querySelector("[data-remove]").addEventListener("click", () => {
    node.remove();
    reindexExpRows();
    scheduleUpdate();
  });
  expList.append(node);
}

function reindexExpRows() {
  [...expList.querySelectorAll("[data-exp-row]")].forEach((row, i) => {
    row.querySelector(".exp-index").textContent = `Role ${i + 1}`;
  });
}

function renderExperienceList(experience) {
  expList.innerHTML = "";
  (experience || []).forEach(addExpRow);
  reindexExpRows();
}

function readExperience() {
  return [...expList.querySelectorAll("[data-exp-row]")].map((row) => ({
    role: row.querySelector('[data-field="role"]').value,
    company: row.querySelector('[data-field="company"]').value,
    period: row.querySelector('[data-field="period"]').value,
    current: row.querySelector('[data-field="current"]').checked,
    bullets: row
      .querySelector('[data-field="bullets"]')
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  }));
}

// ---------- form <-> data ----------
function hydrateForm(data) {
  editor.querySelectorAll("[name]").forEach((input) => {
    let val = getByPath(data, input.name);
    if (input.name === "skills.languages") val = (val || []).join(", ");
    input.value = val === undefined || val === null ? "" : val;
  });
  renderExperienceList(data.experience);
}

function readForm() {
  const data = {};
  editor.querySelectorAll("[name]").forEach((input) => {
    let val = input.value;
    if (input.name === "skills.languages") {
      val = val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    setByPath(data, input.name, val);
  });
  data.experience = readExperience();
  return data;
}

// ---------- live preview ----------
function sendToPreview() {
  const data = readForm();
  preview.contentWindow?.postMessage({ type: "PORTFOLIO_UPDATE", payload: data }, "*");
}

let updateTimer = null;
function scheduleUpdate() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(sendToPreview, 250);
}

editor.addEventListener("input", scheduleUpdate);
editor.addEventListener("change", scheduleUpdate);
preview.addEventListener("load", sendToPreview);

// ---------- toolbar ----------
document.getElementById("add-exp-btn").addEventListener("click", () => {
  addExpRow();
  reindexExpRows();
  scheduleUpdate();
});

document.getElementById("export-btn").addEventListener("click", () => {
  const data = readForm();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      hydrateForm(data);
      sendToPreview();
    } catch (err) {
      alert("That file isn't valid JSON — check it and try importing again.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("Reset all fields to the sample resume data? Unsaved edits will be lost.")) return;
  hydrateForm(SAMPLE_DATA);
  sendToPreview();
});

// ---------- boot ----------
hydrateForm(SAMPLE_DATA);
