/**
 * Sanitizes a filename to prevent directory traversal and invalid characters.
 * Removes characters like .., /, \ to keep the file restricted to its target directory.
 */
export function sanitizeFilename(name: string): string {
  // Collapse newlines/tabs and other control chars into spaces (multi-line job
  // names would otherwise produce an invalid filename and fail the download).
  let clean = name.replace(/\s+/g, " ");
  // Replace directory traversal segments
  clean = clean.replace(/\.\./g, '');
  // Remove slash and backslash characters to prevent sub-directory escape
  clean = clean.replace(/[/\\]/g, '_');
  // Remove other invalid file characters: < > : " | ? *
  clean = clean.replace(/[<>:"|?*]/g, '');
  // Collapse repeated whitespace and trim.
  clean = clean.replace(/\s+/g, ' ').trim();
  // Cap length so the full path stays within filesystem limits.
  if (clean.length > 150) clean = clean.slice(0, 150).trim();
  if (!clean) {
    clean = 'unnamed_image';
  }
  return clean;
}

/**
 * Kicks off a single download and RESOLVES ONLY once Chrome reports the download
 * actually finished (or failed). Chrome hands back a downloadId the instant the
 * request is queued — long before bytes land — so resolving on the id alone
 * reports interrupted downloads (e.g. a 403 on a remote image URL) as success.
 * We watch chrome.downloads.onChanged for the terminal 'complete'/'interrupted'
 * state instead.
 */
function startDownload(url: string, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try { chrome.downloads.onChanged.removeListener(onChanged); } catch {}
      resolve(ok);
    };

    let thisDownloadId: number | undefined;
    const onChanged = (delta: chrome.downloads.DownloadDelta) => {
      if (thisDownloadId === undefined || delta.id !== thisDownloadId) return;
      if (delta.state?.current === 'complete') finish(true);
      else if (delta.state?.current === 'interrupted') {
        console.error('Download interrupted:', delta.error?.current);
        finish(false);
      }
    };
    chrome.downloads.onChanged.addListener(onChanged);

    chrome.downloads.download(
      { url, filename, conflictAction: 'uniquify', saveAs: false },
      (downloadId) => {
        if (chrome.runtime.lastError || downloadId === undefined) {
          console.error('Download failed to start:', chrome.runtime.lastError?.message);
          finish(false);
          return;
        }
        thisDownloadId = downloadId;
        // Safety net: if onChanged never fires a terminal state (some data: URL
        // downloads complete synchronously without a delta), assume success after
        // a short grace period.
        setTimeout(() => finish(true), 8000);
      }
    );
  });
}

/**
 * Downloads a generated image to the Downloads folder. Tries the given sources in
 * order (typically the in-page data URL first, then the raw remote URL) and
 * returns true as soon as one download completes. A `blob:` URL is skipped when
 * offered to the background, since blob URLs from a tab are unreachable here.
 */
export async function downloadImage(source: string | string[], movementName: string): Promise<boolean> {
  const safeName = sanitizeFilename(movementName);
  const filename = `${safeName}.png`;

  const candidates = (Array.isArray(source) ? source : [source])
    .filter((s): s is string => !!s)
    // A blob: URL only exists inside the originating tab; the service worker
    // can't download it, so never bother trying.
    .filter((s) => !s.startsWith('blob:'));

  for (const url of candidates) {
    const ok = await startDownload(url, filename);
    if (ok) return true;
    console.warn('Download source failed, trying next candidate if any:', url.slice(0, 24));
  }
  return false;
}
