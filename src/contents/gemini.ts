import type { PlasmoCSConfig } from 'plasmo';
import { SELECTORS, queryAny, queryAllIncludingShadows, findErrorText, findRateLimitText } from '../gemini/geminiAutomation';
import { addLog } from '../storage/storageHelper';

export const config: PlasmoCSConfig = {
  matches: ['https://gemini.google.com/*'],
  all_frames: false,
};

if (window === window.top) {
  console.log('[Gemini CS] Injected into Gemini top-level page');
  chrome.runtime.sendMessage({ action: 'CONTENT_READY' });
}

let monitorInterval: NodeJS.Timeout | null = null;
let isGenerating = false;
let generationStartedAt = 0;
let hasReported = false; // Guards against reporting completion/failure more than once
const preExistingImageUrls = new Set<string>();

if (window === window.top) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_GENERATION') {
      startGenerationFlow(message.prompt);
      sendResponse({ status: 'started' });
    }
    return true;
  });
}

// Fetch an image (incl. blob: URLs that only exist in this tab's context) and
// convert it to a data URL so the background service worker can download it.
async function fetchImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[Gemini CS] Failed to convert image to data URL:', e);
    return null;
  }
}

// Report a completed job. We convert the image to a data URL IN-PAGE because
// blob: URLs only exist in this tab and remote image URLs may be authenticated,
// so the background can't always fetch them. Falls back to the raw URL on failure.
async function reportJobCompleted(src: string) {
  if (hasReported) return;
  hasReported = true;
  let imageData: string | undefined;
  if (src.startsWith('data:')) {
    imageData = src;
  } else {
    const converted = await fetchImageAsDataUrl(src);
    if (converted) {
      imageData = converted;
    } else {
      await addLog('warn', '[Content Script] Could not convert image in-page; falling back to raw URL for download.');
    }
  }
  chrome.runtime.sendMessage({ action: 'JOB_COMPLETED', imageUrl: src, imageData });
}

// Helper to wait for element to exist in DOM
async function waitForElement(selectors: string[], timeoutMs = 15000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const el = queryAny(selectors);
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Gemini prompt input area not found'));
      }
    }, 250);
  });
}

// Helper to wait for send button to become enabled
async function waitForSendButton(timeoutMs = 10000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const el = queryAny(SELECTORS.sendButton);
      if (el && !el.hasAttribute('disabled')) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Send button remained disabled or not found'));
      }
    }, 250);
  });
}

// Listener registered in top-level check above

async function startGenerationFlow(prompt: string) {
  console.log('[Gemini CS] Starting generation for prompt:', prompt);
  await addLog('info', `[Content Script] Received START_GENERATION command. Prompt length: ${prompt.length} chars.`);
  
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }

  isGenerating = false;
  hasReported = false;
  generationStartedAt = Date.now();

  try {
    // 1. Wait for and locate prompt input
    await addLog('info', '[Content Script] Waiting for prompt input area to render...');
    const textarea = await waitForElement(SELECTORS.textarea, 30000);
    await addLog('info', '[Content Script] Prompt input area found. Injecting text...');

    // 2. Inject prompt text
    injectText(textarea, prompt);
    await addLog('info', '[Content Script] Prompt text injected. Waiting for send button to enable...');

    // 3. Wait for send button to be enabled (background tabs are throttled, give it room)
    const sendBtn = await waitForSendButton(30000);
    
    // Snapshot ALL images already on the page right before sending, so findNewImage()
    // can later detect the newly-generated one regardless of its host/markup.
    const initialText = document.body.innerText || '';
    preExistingImageUrls.clear();
    const preImgs: HTMLElement[] = [];
    queryAllIncludingShadows('img', document, preImgs);
    preImgs.forEach((el) => {
      const img = el as HTMLImageElement;
      const s = img.currentSrc || img.src;
      if (s) preExistingImageUrls.add(s);
    });

    await addLog('info', `[Content Script] Send button enabled. Captured ${preExistingImageUrls.size} pre-existing images. Clicking send...`);
    
    // 4. Click send button
    sendBtn.click();
    await addLog('info', '[Content Script] Send button clicked. Monitoring generation...');
    
    // 5. Start monitoring
    startMonitoring(initialText, prompt);
  } catch (err: any) {
    console.error('[Gemini CS] Generation flow failed:', err.message);
    await addLog('error', `[Content Script] Generation flow failed: ${err.message}`);
    chrome.runtime.sendMessage({ action: 'JOB_FAILED', error: err.message });
  }
}

function injectText(textarea: HTMLElement, text: string) {
  console.log('[Gemini CS] Injecting text to textarea...');
  textarea.focus();

  // Try simulating paste event first (standard for Quill/contenteditable editors)
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });
    textarea.dispatchEvent(pasteEvent);
  } catch (e) {
    console.warn('[Gemini CS] Clipboard paste simulation failed:', e);
  }

  // Fallback if paste simulation did not populate the editor
  const currentText = textarea.innerText || textarea.textContent || '';
  if (currentText.trim().length < 5) {
    console.log('[Gemini CS] Paste simulation did not populate textarea. Falling back to execCommand...');
    try {
      textarea.innerHTML = '';
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(textarea);
        range.collapse(false);
        selection.addRange(range);
      }
      document.execCommand('insertText', false, text);
    } catch (e) {
      console.warn('[Gemini CS] execCommand fallback failed:', e);
    }
  }

  // Second fallback: set innerText directly
  const finalCheckText = textarea.innerText || textarea.textContent || '';
  if (finalCheckText.trim().length < 5) {
    console.log('[Gemini CS] execCommand failed to populate textarea. Setting innerText directly...');
    textarea.innerText = text;
  }

  // Dispatch standard events for framework change detection
  try {
    textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    textarea.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Simulate minor keypress triggers
    textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'a' }));
    textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'a' }));
  } catch (e) {
    console.warn('[Gemini CS] event dispatch failed:', e);
  }
}

function getLastMessageElement(): HTMLElement | null {
  const msgContents = document.querySelectorAll('message-content, .model-response');
  if (msgContents.length > 0) {
    return msgContents[msgContents.length - 1] as HTMLElement;
  }
  return null;
}

function findNewImage(): string | null {
  // Host-agnostic detection: look for the largest NEW <img> that appeared after we
  // sent the prompt. We restrict the search to the last assistant response element
  // to avoid grabbing images from previous messages in the history.
  const lastMsg = getLastMessageElement();
  const searchRoot = lastMsg || document;

  const images: HTMLElement[] = [];
  queryAllIncludingShadows('img', searchRoot, images);

  let best: { src: string; area: number } | null = null;
  for (const el of images) {
    const img = el as HTMLImageElement;
    const src = img.currentSrc || img.src;
    if (!src) continue;
    if (preExistingImageUrls.has(src)) continue;
    if (src.includes('avatar') || src.includes('profile')) continue;
    if (src.startsWith('data:image/svg+xml')) continue;
    if (src.length < 30) continue;

    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    // Generated infographics are large; skip small icons/thumbnails.
    if (w < 200 || h < 200) continue;

    const area = w * h;
    if (!best || area > best.area) best = { src, area };
  }
  return best ? best.src : null;
}

function startMonitoring(initialText: string, prompt: string) {
  console.log('[Gemini CS] Starting DOM monitor loop...');
  addLog('info', '[Content Script] DOM monitor loop starting...');
  let checkedCount = 0;
  
  // Give Gemini 1 second to start registering the prompt state transition
  setTimeout(() => {
    monitorInterval = setInterval(async () => {
      checkedCount++;
      
      // Check for Rate Limit
      if (findRateLimitText(initialText, prompt)) {
        console.warn('[Gemini CS] Rate limit detected!');
        await addLog('warn', '[Content Script] Rate limit detected on page!');
        chrome.runtime.sendMessage({ action: 'JOB_RATE_LIMITED' });
        stopMonitoring();
        return;
      }

      // Check for standard errors
      const errorText = findErrorText(initialText, prompt);
      if (errorText) {
        // Only trigger failure if we are actively generating and it's not a generic false positive
        if (checkedCount > 5) {
          console.error('[Gemini CS] Page error detected:', errorText);
          await addLog('error', `[Content Script] Page error detected: "${errorText}"`);
          chrome.runtime.sendMessage({ action: 'JOB_FAILED', error: errorText });
          stopMonitoring();
          return;
        }
      }

      // Detect generation state via loading/progress indicator or disabled send button
      const progressIndicator = queryAny(SELECTORS.loadingIndicator);
      const sendBtn = queryAny(SELECTORS.sendButton);
      const isBusy = !!progressIndicator || (sendBtn && sendBtn.hasAttribute('disabled'));
      
      if (isBusy) {
        if (!isGenerating) {
          console.log('[Gemini CS] Generation started (busy indicator/disabled send button detected)');
          await addLog('info', '[Content Script] Generation started (loading/busy state detected).');
          isGenerating = true;
        }
      }

      // Only check for new image if the page is NOT currently busy generating
      if (!isBusy) {
        const newImgSrc = findNewImage();
        if (newImgSrc) {
          console.log('[Gemini CS] New generated image detected in monitor loop:', newImgSrc);
          await addLog('info', `[Content Script] Success: New generated image found in DOM!`);
          await reportJobCompleted(newImgSrc);
          stopMonitoring();
          return;
        }

        // If we were actively generating and the busy state cleared but image isn't found immediately,
        // wait for a brief period and keep checking.
        if (isGenerating) {
          console.log('[Gemini CS] Generation stopped, waiting for image to render...');
          await addLog('info', '[Content Script] Busy state cleared. Waiting for generated image...');
          setTimeout(checkForCompletedImage, 1500);
          stopMonitoring();
          return;
        }
      }

      // Safe fallback: If it's been 2.5 minutes and we haven't completed, check if image is already there
      if (checkedCount > 150) { 
        console.log('[Gemini CS] Timeout check: looking for image anyway...');
        await addLog('warn', '[Content Script] 2.5 minutes elapsed without completion. Checking for image anyway...');
        checkForCompletedImage();
        stopMonitoring();
      }
    }, 1000);
  }, 1000);
}

async function checkForCompletedImage() {
  const newImgSrc = findNewImage();
  if (newImgSrc) {
    console.log('[Gemini CS] Generated image found:', newImgSrc);
    await addLog('info', `[Content Script] Found new valid generated image! URL length: ${newImgSrc.length} chars.`);
    await reportJobCompleted(newImgSrc);
    return;
  }

  // If we couldn't find the image but generation stopped, check if we timed out.
  // Image generation can take several minutes (longer when many background worker
  // tabs are throttled), so allow a generous window before giving up.
  const elapsed = Date.now() - generationStartedAt;
  if (elapsed > 480000) { // 8 minutes timeout
    await addLog('error', '[Content Script] Image generation timed out without rendering image.');
    chrome.runtime.sendMessage({ action: 'JOB_FAILED', error: 'Image generation timed out without rendering image' });
  } else {
    // If not timed out, retry check in 3 seconds
    console.log('[Gemini CS] Image not found yet. Retrying in 3s...');
    await addLog('info', '[Content Script] Image not found yet. Retrying in 3s...');
    setTimeout(checkForCompletedImage, 3000);
  }
}

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  isGenerating = false;
}
