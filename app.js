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
// Two DIFFERENT CDN locations are involved, and it matters which is used
// for which:
//   1. The JS library itself — small, so it's loaded below from jsDelivr.
//   2. The AI model weights (.onnx) and WASM runtime — tens of MB, so
//      IMG.LY hosts these separately on staticimgly.com and the library
//      already knows that address by default. Do NOT set `publicPath` to
//      the jsDelivr URL below — that directory only has the JS bundle, not
//      the model, and doing so makes every single image fail the same way.
//      Only set `publicPath` if you've deliberately copied the model files
//      to your own server — see "Custom Asset Serving" in the docs above.

import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.6.0/dist/index.mjs";

// -- Model caching --------------------------------------------------------
//
// The background-removal library fetches the (large, one-time) model and
// WASM runtime files with the browser's normal, plain `fetch()` — it does
// not use the Cache Storage API itself, so there is nothing built in that
// a page can explicitly clear. To make the "Clear cached model" button
// below actually do something, we put our own cache in front of it: any
// request to IMG.LY's model CDN is served from a named Cache Storage
// bucket we control, falling back to the network (and populating the
// cache) the first time. This never touches the photo you upload — that
// never goes through fetch() at all, since it's handed to the library as
// a File, not a URL.
const MODEL_CACHE_NAME = "cutout-model-cache-v1";
const MODEL_ASSET_HOST = "staticimgly.com";

function installModelCache() {
  if (typeof window === "undefined" || !window.caches || window.__cutoutFetchPatched) return;
  window.__cutoutFetchPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const method = (init && init.method) || (input && input.method) || "GET";
    const url = typeof input === "string" ? input : input && input.url;
    const isModelAsset = url && method.toUpperCase() === "GET" && new URL(url, location.href).hostname === MODEL_ASSET_HOST;

    if (!isModelAsset) return originalFetch(input, init);

    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) return cached;

      const response = await originalFetch(input, init);
      if (response && response.ok) {
        cache.put(url, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      // Cache Storage unavailable or misbehaving — fall back to a plain
      // network request rather than breaking the tool over it.
      return originalFetch(input, init);
    }
  };
}

installModelCache();

// -- DOM references --------------------------------------------------------

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

const clearCacheBtn = document.getElementById("clearCacheBtn");
const clearCacheMsg = document.getElementById("clearCacheMsg");

const panels = [dropzone, statusEl, resultEl, errorEl];

let currentObjectUrl = null;
let currentFileBaseName = "image";

function showPanel(panel) {
  for (const el of panels) el.hidden = el !== panel;
}

function setProgress(key, current, total) {
  if (!total) return;
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  statusFill.style.width = pct + "%";
  statusText.textContent = `Removing the background… ${pct}%`;
}

async function handleFile(file) {
  if (!file) return;

  if (!file.type || !file.type.startsWith("image/")) {
    showError("That doesn't look like an image file. Try a PNG, JPG or WEBP.");
    return;
  }

  currentFileBaseName = file.name.replace(/\.[^./\\]+$/, "") || "image";

  statusFill.style.width = "4%";
  statusText.textContent = "Removing the background…";
  showPanel(statusEl);

  try {
    const blob = await removeBackground(file, {
      // No publicPath here on purpose — see the note at the top of this
      // file. Leaving it unset lets the library fetch the model from its
      // own correct default CDN.
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

// -- Clear cached model --

if (clearCacheBtn) {
  if (!window.caches) {
    clearCacheBtn.disabled = true;
    clearCacheBtn.title = "Not supported in this browser";
  } else {
    clearCacheBtn.addEventListener("click", async () => {
      clearCacheBtn.disabled = true;
      try {
        const existed = await caches.delete(MODEL_CACHE_NAME);
        clearCacheMsg.textContent = existed
          ? "Cleared. The next image will re-download the model."
          : "Nothing was cached.";
      } catch {
        clearCacheMsg.textContent = "Couldn't clear the cache — please try again.";
      } finally {
        clearCacheBtn.disabled = false;
        setTimeout(() => {
          clearCacheMsg.textContent = "";
        }, 4000);
      }
    });
  }
}
