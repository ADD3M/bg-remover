# Cutout — in-browser background remover

A static site with a background-removal tool that runs entirely in the
visitor's browser (no server, no upload) and always exports a PNG.

## Files

- `index.html` — the tool
- `style.css` — all styling
- `app.js` — the background-removal logic (uses `@imgly/background-removal`)
- `privacy.html`, `cookies.html` — policy pages linked from the footer

## How it works

The tool loads [`@imgly/background-removal`](https://www.npmjs.com/package/@imgly/background-removal)
from jsDelivr as an ES module (no build step, no `npm install` needed). On
first use in a visitor's browser it downloads a small AI segmentation model
(cached afterwards by the browser), runs it locally via WebAssembly, and
returns a transparent-background PNG — the photo itself never leaves the
visitor's device.

## Deploying to GitHub Pages

1. Create a repository and add these files to its root (or to `/docs` if
   you prefer — just point Pages at whichever folder you use).
2. In the repo's **Settings → Pages**, set the source to that
   branch/folder.
3. Wait a minute for it to build, then visit the URL GitHub gives you.

No server configuration or build step is required — it's plain HTML/CSS/JS.

## Before you publish: fill these in

Two placeholders are left on purpose because only you know these details:

- **`privacy.html`** — the "Hosting" section has a bracketed paragraph to
  replace with your actual hosting setup (a ready-to-use GitHub Pages
  version is drafted for you inside the brackets).
- **`privacy.html`** and **`cookies.html`** — the "Contact" section at the
  bottom of each has `[replace with your contact email or a link to your
  project's repository]`.

Everything else describes the tool's actual behavior (no cookies, no
uploads, no analytics) and shouldn't need editing unless you change how the
Site works — for example, if you later add analytics, you'll want to
update both policy pages and add a cookie-consent banner before any
non-essential cookie is set.

## Notes

- The library is pinned to `@imgly/background-removal@1.6.0` on jsDelivr in
  the `import` line of `app.js`, so the site won't unexpectedly break on a
  future release. Bump the version there if you want to upgrade.
- `app.js` deliberately does **not** set a `publicPath` in the config. The
  JS library (small, loaded from jsDelivr above) and the AI model weights
  (tens of MB, hosted separately by IMG.LY on staticimgly.com) live at two
  different addresses — the library already defaults to the correct one for
  the model. Pointing `publicPath` at the jsDelivr URL instead breaks
  background removal for every image, since that location doesn't have the
  model files.
- `index.html` includes an **import map** for `onnxruntime-web`. The
  library dynamically `import()`s that package by bare name at runtime,
  which only resolves automatically inside a bundler — in a plain browser
  module script it needs the import map to know where to fetch it from.
  Without it, the model downloads fine and the tool then fails right after,
  while starting the WASM engine. If you ever bump the
  `@imgly/background-removal` version, check whether the `onnxruntime-web`
  version it depends on changed too (see its `package.json`
  `dependencies`), and update the two URLs in the import map to match.
- The library itself doesn't use the Cache Storage API for the model files
  it downloads — it relies on the plain browser HTTP cache, which a page
  can't selectively clear. So `app.js` wraps `fetch()` for requests to
  IMG.LY's model CDN (`staticimgly.com`) in a small Cache-Storage-backed
  layer of our own, which is what the "Clear cached model" button on the
  page actually clears. It never touches the photo you upload — that's
  handed to the library as a `File`, not a URL, so it never goes through
  `fetch()` at all.
- No web fonts or analytics are loaded from anywhere, by design — it keeps
  the privacy story simple and true.
