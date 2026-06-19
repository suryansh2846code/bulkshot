<div align="center">

<img src="assets/icon.png" width="88" alt="BulkShot logo" />

# BulkShot

**Where prompts meet pixels.**

Bulk-generate hundreds of images from a single prompt template — using your own
ChatGPT and Gemini tabs, automated right inside your browser.

Free &amp; open source · Chrome (Manifest V3) · built with [Plasmo](https://www.plasmo.com/)

</div>

---

## What it is

BulkShot is a Chrome extension that turns one prompt into a whole gallery. Write a
template with a `{}` placeholder, paste a list of subjects (or upload a PDF), and
BulkShot opens background tabs on **ChatGPT** and/or **Gemini**, submits each prompt,
detects the finished image, and downloads it automatically — while you keep working.

It drives the real `chatgpt.com` and `gemini.google.com` pages using your existing
logged-in session. No API keys, no servers — everything runs locally in your browser.

## Features

- 🧩 **Bulk prompts** — one template + a list = hundreds of images. Put `{}` where the
  job name goes.
- 🌿 **Two providers** — ChatGPT (DALL·E) and Gemini (Imagen). Pick one or both; jobs
  are split round-robin across the providers you enable.
- ⚙️ **Per-provider workers** — choose how many tabs run in parallel for each provider.
- 📄 **Flexible input** — paste one job per line, or upload a text-based PDF and
  BulkShot extracts the list. Edit, search, add, and select before launching.
- 📦 **Auto download** — each image saves to your Downloads folder the moment it's
  ready, tagged by provider — no manual right-clicking, no waiting for the batch.
- 🔁 **Resilient queue** — automatic retries, manual pause/resume/stop, live progress,
  and an optional "pause on rate limit" safety toggle (off by default).
- 🎨 **Retro UI** — a calm desktop-OS theme with **Paper** (light) and **Dusk** (dark)
  modes and an accent-color picker.

## Install (load unpacked)

The extension isn't on the Chrome Web Store — it's open source, so you build and load
it yourself:

```bash
git clone https://github.com/suryansh2846code/bulk-shot-.git
cd bulk-shot-
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `build/chrome-mv3-prod` folder

Pin the BulkShot icon to your toolbar and click it to open the console.

> Make sure you're logged in to `chatgpt.com` and/or `gemini.google.com` in the same
> browser profile before running a queue.

## Usage

1. **Console** — enable ChatGPT and/or Gemini, set the workers per provider, and write
   your prompt template (use `{}` where the job name should be inserted).
2. **Job list** — paste one job per line, or upload a PDF. Review/edit the preview list
   and select the ones you want.
3. **Start** — hit *Start Generation Queue*. BulkShot opens background tabs, submits
   each prompt, and the view switches to **Monitor**.
4. **Monitor** — watch live progress, per-job status (with provider tags), retries, and
   open any finished image. Completed images download automatically.

### Prompt template

`{}` is replaced with each job name. Everything else stays literal:

```
A clean medical anatomy infographic of the {} yoga pose,
labelled muscles, calm warm palette, soft background.
```

`{{ITEM}}`, `{{MOVEMENT_NAME}}`, `{{ENGLISH_NAME}}`, `{{CATEGORY}}` and
`{{TARGET_MUSCLES}}` are also supported.

### Settings

Providers &amp; per-provider workers · job retry threshold · auto-download ·
notification chime · close tab on complete · pause-on-rate-limit · theme &amp; accent.

## How it works

- **Background service worker** (`src/background`) owns the queue: it splits jobs across
  enabled providers, opens worker tabs, enforces per-provider concurrency, handles
  retries/timeouts, and triggers downloads.
- **Content scripts** (`src/contents/chatgpt.ts`, `src/contents/gemini.ts`) run on the
  provider pages: they inject the prompt, click send, watch the DOM for the newly
  generated image (largest new `<img>` after submit), and report completion — converting
  blob images to data URLs in-page so the background can download them.
- **UI** (`src/popup`, `src/options`) is React, sharing a retro component kit in
  `src/ui/retro.tsx`. State syncs through `src/hooks/useQueueState.ts`.

## Tech stack

[Plasmo](https://www.plasmo.com/) · React 18 · TypeScript · Tailwind ·
[pdf.js](https://mozilla.github.io/pdf.js/) for PDF parsing.

## Development

```bash
npm run dev     # watch build -> load build/chrome-mv3-dev as unpacked
npm run build   # production build -> build/chrome-mv3-prod
```

`postinstall` copies the pdf.js worker into `assets/` via `scripts/copy-worker.js`.

## Landing page

A static landing page lives in [`landing/`](landing/index.html) (no build step).
To publish it with **GitHub Pages**: repo *Settings → Pages → Deploy from branch
`main`*, folder `/landing`.

## License

[MIT](LICENSE).
