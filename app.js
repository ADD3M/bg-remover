// Cutout — client-side background removal.
//
// Everything happens in the visitor's own browser. The image the person
// uploads is never sent to any server: it is handed straight to a
// WebAssembly/ONNX model that runs locally. The only network requests this
// page makes are for the (one-time, cached) AI model files themselves.
//
// Library: @imgly/background-removal
// Docs: https://www.npmjs.com/package/@imgly/background-removal
//
// If you outgrow the jsDelivr-hosted copy of the model, download it from
// IMG.LY's CDN and point `publicPath` below at your own copy instead —
// see "Custom Asset Serving" in the library's README.

import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.6.0/dist/index.mjs";

const LIB_VERSION = "1.6.0";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");

const statusEl = document.getElementById("status");
const statusFill = document.getElementById("statusFill");
const statusText = document.getElementById("statusText");

const resultEl = document.getElementById("result");
const resultImg = document.getElementById("resultImg");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");

const errorEl = document.getElementById("error");
const errorText = document.getElementById("errorText");
const errorReset = document.getElementById("errorReset");

const panels = [dropzone, statusEl, resultEl, errorEl];

let currentObjectUrl = null;
let currentFileBaseName = "image";

function showPanel(panel) {
  for (const el of panels) el.hidden = el !== panel;
}

function describeProgress(key, pct) {
  const k = String(key || "").toLowerCase();
  if (k.includes("fetch")) return `Downloading the model… ${pct}%`;
  if (k.includes("compute") || k.includes("inference")) return `Removing the background… ${pct}%`;
  return `Working… ${pct}%`;
}

function setProgress(key, current, total) {
  if (!total) return;
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  statusFill.style.width = pct + "%";
  statusText.textContent = describeProgress(key, pct);
}

async function handleFile(file) {
  if (!file) return;

  if (!file.type || !file.type.startsWith("image/")) {
    showError("That doesn't look like an image file. Try a PNG, JPG or WEBP.");
    return;
  }

  currentFileBaseName = file.name.replace(/\.[^./\\]+$/, "") || "image";

  statusFill.style.width = "4%";
  statusText.textContent = "Loading the model…";
  showPanel(statusEl);

  try {
    const blob = await removeBackground(file, {
      publicPath: `https://cdn.jsdelivr.net/npm/@imgly/background-removal@${LIB_VERSION}/dist/`,
      output: { format: "image/png", quality: 1 },
      progress: setProgress,
    });

    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(blob);
    resultImg.src = currentObjectUrl;
    showPanel(resultEl);
  } catch (err) {
    console.error("Background removal failed:", err);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    showError(
      offline
        ? "You seem to be offline, and the model couldn't be downloaded. Reconnect and try again."
        : "Something went wrong removing the background. Please try again, or try a different image."
    );
  }
}

function showError(message) {
  errorText.textContent = message;
  showPanel(errorEl);
}

function reset() {
  fileInput.value = "";
  showPanel(dropzone);
}

// -- Dropzone interactions --

browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => handleFile(fileInput.files && fileInput.files[0]));

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-dragover");
  })
);

["dragleave", "dragend"].forEach((evt) =>
  dropzone.addEventListener(evt, () => dropzone.classList.remove("is-dragover"))
);

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("is-dragover");
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  handleFile(file);
});

// -- Result actions --

downloadBtn.addEventListener("click", () => {
  if (!currentObjectUrl) return;
  const a = document.createElement("a");
  a.href = currentObjectUrl;
  a.download = `${currentFileBaseName}-no-bg.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

resetBtn.addEventListener("click", reset);
errorReset.addEventListener("click", reset);
