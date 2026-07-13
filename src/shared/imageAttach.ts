// Shared helper used by the ChatGPT and Gemini content scripts to attach the
// user's saved reference images into the site's composer before the prompt is
// sent. Keeping style-reference images consistent across a batch is the whole
// point, so this runs the same way on both providers.

type Logger = (type: 'info' | 'warn' | 'error', message: string) => Promise<void> | void;

// Convert a stored data URL back into a File so it can be handed to the page the
// same way a real drag/drop or paste would.
async function dataUrlToFile(dataUrl: string, baseName: string): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mime = blob.type || 'image/png';
    const ext = (mime.split('/')[1] || 'png').split('+')[0];
    return new File([blob], `${baseName}.${ext}`, { type: mime });
  } catch (e) {
    console.warn('[imageAttach] Failed to decode reference image:', e);
    return null;
  }
}

// Deep querySelectorAll that also descends into shadow roots (the composer's
// file input is sometimes nested inside web components on Gemini).
function deepQueryAll(selector: string, root: Document | ShadowRoot = document, out: HTMLElement[] = []): HTMLElement[] {
  try {
    root.querySelectorAll(selector).forEach((el) => {
      if (!out.includes(el as HTMLElement)) out.push(el as HTMLElement);
    });
  } catch {
    // ignore invalid selector
  }
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) deepQueryAll(selector, el.shadowRoot, out);
  });
  return out;
}

// Count blob:/data: thumbnail images currently on the page. When an attachment
// finishes uploading the site renders a preview thumbnail, so a rise in this
// count is a good "the image landed" signal without provider-specific selectors.
function countThumbnails(): number {
  const imgs = deepQueryAll('img');
  let n = 0;
  for (const el of imgs) {
    const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src || '';
    if (src.startsWith('blob:') || src.startsWith('data:image')) n++;
  }
  return n;
}

function waitForThumbnails(minCount: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (countThumbnails() >= minCount) {
        clearInterval(iv);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(iv);
        resolve(false);
      }
    }, 300);
  });
}

// Build a DataTransfer holding every reference file (used by both the paste and
// the file-input paths).
function buildDataTransfer(files: File[]): DataTransfer {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt;
}

/**
 * Attach the given reference images (data URLs) into the composer.
 *
 * Strategy: dispatch a synthetic `paste` carrying the files onto the composer
 * (both ChatGPT and Gemini accept pasted images), then wait for the upload
 * thumbnails to render. If none appear, fall back to a hidden <input type=file>.
 * Best-effort throughout — it never rejects, so a flaky attachment can't wedge
 * the whole queue; the caller proceeds to send regardless.
 *
 * @returns the number of thumbnails observed after attaching.
 */
export async function attachReferenceImages(
  composer: HTMLElement,
  dataUrls: string[],
  log: Logger,
  site: string,
): Promise<number> {
  if (!dataUrls || dataUrls.length === 0) return 0;

  const files: File[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const f = await dataUrlToFile(dataUrls[i], `bulkshot_ref_${i + 1}`);
    if (f) files.push(f);
  }
  if (files.length === 0) {
    await log('warn', `[${site} CS] No reference images could be decoded; sending prompt without them.`);
    return 0;
  }

  const baseline = countThumbnails();
  await log('info', `[${site} CS] Attaching ${files.length} reference image(s) via paste...`);

  // --- Path 1: synthetic paste onto the composer ---
  try {
    composer.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: buildDataTransfer(files),
    });
    composer.dispatchEvent(pasteEvent);
  } catch (e) {
    await log('warn', `[${site} CS] Paste-attach threw: ${(e as Error).message}`);
  }

  let ok = await waitForThumbnails(baseline + 1, 8000);

  // --- Path 2: fall back to a hidden file input if paste produced nothing ---
  if (!ok) {
    const inputs = deepQueryAll('input[type="file"]') as HTMLInputElement[];
    const fileInput = inputs.find((el) => {
      const accept = (el.getAttribute('accept') || '').toLowerCase();
      return accept === '' || accept.includes('image') || accept.includes('*');
    });
    if (fileInput) {
      await log('info', `[${site} CS] Paste yielded no preview; retrying via file input...`);
      try {
        fileInput.files = buildDataTransfer(files).files;
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        ok = await waitForThumbnails(baseline + 1, 15000);
      } catch (e) {
        await log('warn', `[${site} CS] File-input attach threw: ${(e as Error).message}`);
      }
    } else {
      await log('warn', `[${site} CS] No usable file input found for reference-image fallback.`);
    }
  }

  const finalCount = Math.max(0, countThumbnails() - baseline);
  if (ok) {
    await log('info', `[${site} CS] Reference image(s) attached (${finalCount} preview(s) detected).`);
  } else {
    await log('warn', `[${site} CS] Could not confirm reference-image upload; sending prompt anyway.`);
  }
  return finalCount;
}
