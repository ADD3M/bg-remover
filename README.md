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

- The model is pinned to `@imgly/background-removal@1.6.0` in `app.js` (two
  spots: the `import` line and the `publicPath` inside the config) so the
  site won't unexpectedly break on a future library release. Bump both
  together if you want to upgrade.
- No web fonts or analytics are loaded from anywhere, by design — it keeps
  the privacy story simple and true.
