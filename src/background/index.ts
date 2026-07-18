import offscreenUrl from 'url:~src/offscreen.html';
import type { Job, ExtensionSettings, QueueState, QueueStats } from '../types';
import { getSettings, saveSettings, getQueueState, saveQueueState, compilePrompt, addLog, getLogs, clearLogs, getReferenceImages } from '../storage/storageHelper';
import { showNotification } from '../notifications/notificationHelper';
import { downloadImage } from '../downloads/downloadHelper';

// Active job trackers in memory (maps tabId -> jobId)
const activeWorkers = new Map<number, string>();
// Maps jobId -> startTime
const jobStartTime = new Map<string, number>();

// Set up background listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
});

// Watch for manual tab closure by the user
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeWorkers.has(tabId)) {
    const jobId = activeWorkers.get(tabId)!;
    addLog('warn', `Worker tab ${tabId} was closed manually before completion.`);
    console.warn(`[Background] Worker tab ${tabId} for job ${jobId} was closed manually.`);
    handleJobFailure(jobId, 'Tab was closed manually by the user');
  }
});

// Background message orchestrator
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeMessage(message, sender, sendResponse);
  return true; // async support
});

// Periodic monitor for timeouts (every 10 seconds)
setInterval(async () => {
  const state = await getQueueState();
  if (!state.isRunning || state.isPaused) return;

  const now = Date.now();
  const TIMEOUT_MS = 9 * 60 * 1000; // 9 minutes — longer than the content script's own 8-min window

  for (const [tabId, jobId] of activeWorkers.entries()) {
    const start = jobStartTime.get(jobId);
    if (start && now - start > TIMEOUT_MS) {
      addLog('error', `Job ${jobId} on tab ${tabId} timed out after 9 minutes.`);
      console.warn(`[Background] Job ${jobId} on tab ${tabId} timed out.`);
      // Remove from tracking BEFORE closing the tab so onRemoved doesn't double-fail the job.
      activeWorkers.delete(tabId);
      jobStartTime.delete(jobId);
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          // ignore already closed tabs
        }
      });
      handleJobFailure(jobId, 'Image generation timed out after 9 minutes');
    }
  }
}, 10000);

async function handleRuntimeMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (r: any) => void) {
  const settings = await getSettings();
  let state = await getQueueState();

  switch (message.action) {
    case 'START_QUEUE':
      console.log('[Background] Initializing queue with jobs:', message.jobs);

      // Determine which providers are enabled. Jobs are SPLIT across the enabled
      // providers in round-robin order (e.g. 4 jobs + both providers => 2 ChatGPT, 2 Gemini),
      // so each prompt runs on exactly one provider.
      const enabledProviders: ('chatgpt' | 'gemini')[] = [];
      if (settings.useChatgpt) enabledProviders.push('chatgpt');
      if (settings.useGemini) enabledProviders.push('gemini');
      // Safety fallback: never let the queue produce zero workers.
      if (enabledProviders.length === 0) enabledProviders.push('chatgpt');

      const newJobs: Job[] = (message.jobs as any[]).map((j, idx) => ({
        id: `job_${Date.now()}_${idx}`,
        provider: enabledProviders[idx % enabledProviders.length],
        movementName: j.movementName,
        englishName: j.englishName || '',
        category: j.category || '',
        targetMuscles: j.targetMuscles || '',
        prompt: compilePrompt(settings.promptTemplate, j),
        status: 'pending',
        retryCount: 0,
      }));

      // Count how many jobs landed on each provider for the log line.
      const splitCounts = newJobs.reduce((acc, j) => {
        acc[j.provider] = (acc[j.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      state.jobs = newJobs;
      state.isRunning = true;
      state.isPaused = false;
      await saveQueueState(state);
      await addLog(
        'info',
        `Queue initialized with ${newJobs.length} jobs (split: ${enabledProviders.map(p => `${splitCounts[p] || 0} ${p}`).join(', ')}).`
      );
      broadcastState();
      
      // Begin processing
      processQueue();
      sendResponse({ status: 'started' });
      break;

    case 'PAUSE_QUEUE':
      console.log('[Background] Pausing queue');
      state.isPaused = true;
      await saveQueueState(state);
      await addLog('info', 'Queue paused.');
      broadcastState();
      sendResponse({ status: 'paused' });
      break;

    case 'RESUME_QUEUE':
      console.log('[Background] Resuming queue');
      state.isPaused = false;
      state.isRunning = true;
      await saveQueueState(state);
      await addLog('info', 'Queue resumed.');
      broadcastState();
      processQueue();
      sendResponse({ status: 'resumed' });
      break;

    case 'STOP_QUEUE':
      console.log('[Background] Stopping queue');
      // Reset running jobs to pending and close tabs
      state.isRunning = false;
      state.isPaused = false;
      for (const job of state.jobs) {
        if (job.status === 'running') {
          job.status = 'pending';
        }
      }
      await saveQueueState(state);
      await addLog('warn', 'Queue stopped by user. Resetting running workers to pending.');
      
      // Close all worker tabs
      for (const tabId of activeWorkers.keys()) {
        chrome.tabs.remove(tabId, () => {
          if (chrome.runtime.lastError) {}
        });
      }
      activeWorkers.clear();
      jobStartTime.clear();
      
      broadcastState();
      sendResponse({ status: 'stopped' });
      break;

    case 'CLEAR_QUEUE':
      console.log('[Background] Clearing queue');
      // Close any tabs
      for (const tabId of activeWorkers.keys()) {
        chrome.tabs.remove(tabId, () => {
          if (chrome.runtime.lastError) {}
        });
      }
      activeWorkers.clear();
      jobStartTime.clear();

      state.jobs = [];
      state.isRunning = false;
      state.isPaused = false;
      await saveQueueState(state);
      await addLog('info', 'Queue cleared.');
      await clearLogs();
      broadcastState();
      sendResponse({ status: 'cleared' });
      break;

    case 'CLEAR_LOGS':
      await clearLogs();
      sendResponse({ status: 'cleared' });
      break;

    case 'UPDATE_SETTINGS':
      await saveSettings(message.settings);
      broadcastState();
      sendResponse({ status: 'settings_updated' });
      break;

    case 'GET_STATE':
      const stats = calculateStats(state.jobs);
      const logs = await getLogs();
      sendResponse({ state, stats, settings, logs });
      break;

    case 'TEST_SOUND':
      console.log('[Background] Triggering test sound');
      await playNotificationSound();
      sendResponse({ status: 'sound_played' });
      break;

    case 'TEST_NOTIFICATION':
      showNotification('Test Notification', 'Notification working correctly!');
      sendResponse({ status: 'notification_shown' });
      break;

    case 'CONTENT_READY':
      const senderTabId = sender.tab?.id;
      if (senderTabId && activeWorkers.has(senderTabId)) {
        const jobId = activeWorkers.get(senderTabId)!;
        const job = state.jobs.find(j => j.id === jobId);
        if (job && job.status === 'running') {
          console.log(`[Background] Tab ready for job ${jobId}. Injecting prompt...`);
          // Attach saved reference images to every prompt when the option is on,
          // so each generation shares the same style reference.
          const referenceImages = settings.useReferenceImages ? await getReferenceImages() : [];
          if (referenceImages.length > 0) {
            await addLog('info', `Tab ${senderTabId} loaded for "${job.movementName}". Injecting prompt with ${referenceImages.length} reference image(s)...`);
          } else {
            await addLog('info', `Tab ${senderTabId} loaded for "${job.movementName}". Injecting prompt...`);
          }
          chrome.tabs.sendMessage(senderTabId, {
            action: 'START_GENERATION',
            prompt: job.prompt,
            images: referenceImages,
          });
        }
      }
      sendResponse({ status: 'processed' });
      break;

    case 'JOB_COMPLETED':
      const completedTabId = sender.tab?.id;
      if (completedTabId && activeWorkers.has(completedTabId)) {
        const jobId = activeWorkers.get(completedTabId)!;
        console.log(`[Background] Job ${jobId} completed successfully.`);
        const job = state.jobs.find(j => j.id === jobId);
        await addLog('info', `Job completed successfully on ${job ? job.provider.toUpperCase() : '?'}: "${job ? job.movementName : jobId}".`);

        // Clean up tab tracking first to prevent manual-close trigger
        activeWorkers.delete(completedTabId);
        jobStartTime.delete(jobId);

        // Download and finalize (imageData is a data URL captured in-page, needed for blob: images)
        await handleJobSuccess(jobId, message.imageUrl, message.imageData);

        // Close tab if configured
        if (settings.closeTabOnComplete) {
          chrome.tabs.remove(completedTabId, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      }
      sendResponse({ status: 'processed' });
      break;

    case 'JOB_FAILED':
      const failedTabId = sender.tab?.id;
      if (failedTabId && activeWorkers.has(failedTabId)) {
        const jobId = activeWorkers.get(failedTabId)!;
        console.error(`[Background] Job ${jobId} failed:`, message.error);
        const job = state.jobs.find(j => j.id === jobId);
        await addLog('error', `Job failed [${job ? job.movementName : jobId}]: ${message.error}`);
        
        activeWorkers.delete(failedTabId);
        jobStartTime.delete(jobId);

        await handleJobFailure(jobId, message.error);

        if (settings.closeTabOnComplete) {
          chrome.tabs.remove(failedTabId, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      }
      sendResponse({ status: 'processed' });
      break;

    case 'JOB_RATE_LIMITED':
      const limitedTabId = sender.tab?.id;
      if (limitedTabId && activeWorkers.has(limitedTabId)) {
        const jobId = activeWorkers.get(limitedTabId)!;
        const job = state.jobs.find(j => j.id === jobId);
        const providerLabel = job?.provider === 'gemini' ? 'Gemini' : 'ChatGPT';

        activeWorkers.delete(limitedTabId);
        jobStartTime.delete(jobId);

        if (settings.pauseOnRateLimit) {
          // Safety mode: pause the whole queue so the account isn't flagged.
          console.warn(`[Background] Rate limit on job ${jobId}. Pausing queue.`);
          await addLog('warn', `Rate limit on "${job ? job.movementName : jobId}" (${providerLabel}). Pausing queue.`);

          const latestState = await getQueueState();
          const jobToRetry = latestState.jobs.find(j => j.id === jobId);
          if (jobToRetry) jobToRetry.status = 'pending';
          latestState.isPaused = true;
          await saveQueueState(latestState);

          showNotification(
            'Queue Paused (Rate Limit)',
            `Rate limit detected on ${providerLabel}. The queue has been paused to prevent account flags.`
          );
          broadcastState();
        } else {
          // Default: don't pause — just fail this job and keep the queue moving.
          console.warn(`[Background] Rate limit on job ${jobId}. Continuing queue (auto-pause off).`);
          await addLog('warn', `Rate limit on "${job ? job.movementName : jobId}" (${providerLabel}). Skipping it; queue continues.`);
          await handleJobFailure(jobId, `Rate limited on ${providerLabel}`);
        }

        if (settings.closeTabOnComplete) {
          chrome.tabs.remove(limitedTabId, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      }
      sendResponse({ status: 'processed' });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
}

// Serialize queue processing. Without this, two tabs finishing at nearly the same
// time both call processQueue(), read the same stale state, and launch the SAME
// pending job twice — which looks like "a new tab regenerating an extra image".
let isProcessing = false;
let processQueuePending = false;

async function processQueue() {
  if (isProcessing) {
    // A run is already in flight; ask it to run once more when it finishes.
    processQueuePending = true;
    return;
  }
  isProcessing = true;
  try {
    await processQueueInner();
  } finally {
    isProcessing = false;
    if (processQueuePending) {
      processQueuePending = false;
      // Re-run to pick up slots that freed up during the previous pass.
      processQueue();
    }
  }
}

async function processQueueInner() {
  const state = await getQueueState();
  const settings = await getSettings();

  if (!state.isRunning || state.isPaused) {
    console.log('[Background] Queue processing is inactive.');
    return;
  }

  // Count currently running jobs per provider (each provider has its own worker limit)
  const runningByProvider: Record<'chatgpt' | 'gemini', number> = { chatgpt: 0, gemini: 0 };
  for (const j of state.jobs) {
    if (j.status === 'running') runningByProvider[j.provider]++;
  }
  const totalRunning = runningByProvider.chatgpt + runningByProvider.gemini;

  const workerLimits: Record<'chatgpt' | 'gemini', number> = {
    chatgpt: Math.max(1, settings.chatgptWorkers),
    gemini: Math.max(1, settings.geminiWorkers),
  };

  // Find next pending jobs
  const pendingJobs = state.jobs.filter(j => j.status === 'pending');
  if (pendingJobs.length === 0) {
    // If nothing is running either, the queue is finished!
    if (totalRunning === 0) {
      console.log('[Background] All jobs finished!');
      state.isRunning = false;
      await saveQueueState(state);
      showNotification('Batch Generation Complete', 'All movement images have been generated successfully.');
      broadcastState();
    }
    return;
  }

  // Fill each provider's free worker slots independently.
  const jobsToStart: Job[] = [];
  const availableByProvider: Record<'chatgpt' | 'gemini', number> = {
    chatgpt: workerLimits.chatgpt - runningByProvider.chatgpt,
    gemini: workerLimits.gemini - runningByProvider.gemini,
  };
  for (const job of pendingJobs) {
    if (availableByProvider[job.provider] > 0) {
      jobsToStart.push(job);
      availableByProvider[job.provider]--;
    }
  }

  if (jobsToStart.length === 0) {
    console.log('[Background] All provider worker pools are full. Waiting...');
    return;
  }

  for (const job of jobsToStart) {
    job.status = 'running';
    job.startedAt = Date.now();

    // Pick the target site based on the job's provider
    const workerUrl = job.provider === 'gemini'
      ? 'https://gemini.google.com/app'
      : 'https://chatgpt.com/';

    // Create new worker tab
    chrome.tabs.create(
      {
        url: workerUrl,
        active: false // Open in background to prevent stealing user focus
      },
      (tab) => {
        if (!tab || tab.id === undefined) {
          console.error('[Background] Failed to create worker tab for job:', job.id);
          job.status = 'failed';
          job.error = 'Failed to create Chrome tab';
          saveQueueState(state).then(broadcastState);
          return;
        }

        activeWorkers.set(tab.id, job.id);
        jobStartTime.set(job.id, Date.now());
        console.log(`[Background] Spawned ${job.provider} tab ${tab.id} for job ${job.id}`);
        addLog('info', `Spawned ${job.provider.toUpperCase()} worker tab ${tab.id} for "${job.movementName}".`);
      }
    );
  }

  await saveQueueState(state);
  broadcastState();
}

async function handleJobSuccess(jobId: string, imageUrl: string, imageData?: string) {
  const state = await getQueueState();
  const settings = await getSettings();
  const job = state.jobs.find(j => j.id === jobId);

  if (job) {
    job.status = 'completed';
    job.imageUrl = imageUrl;
    job.completedAt = Date.now();
    await saveQueueState(state);

    console.log(`[Background] Finalizing success for ${job.movementName} (${job.provider})`);

    // Trigger auto-download if enabled (tag with provider so ChatGPT/Gemini outputs are distinguishable).
    // Prefer the in-page data URL: blob: URLs from the worker tab are not reachable from the background.
    if (settings.autoDownload) {
      // Try the in-page data URL first (works for blob: images that the service
      // worker can't reach), then fall back to the raw remote URL if that fails
      // (e.g. the in-page fetch was CORS-blocked and no data URL was produced).
      const sources = [imageData, imageUrl].filter((s): s is string => !!s);
      const ok = await downloadImage(sources, `${job.movementName} (${job.provider})`);
      if (ok) {
        await addLog('info', `Downloaded image for "${job.movementName}" (${job.provider.toUpperCase()}).`);
      } else {
        const kind = imageData ? 'data-url' : imageUrl.startsWith('blob:') ? 'blob-url' : 'remote-url';
        await addLog('error', `Download failed for "${job.movementName}" (${job.provider.toUpperCase()}). Tried: ${kind}.`);
      }
    }

    // Play chime sound
    if (settings.notificationSound) {
      await playNotificationSound();
    }

    // Show desktop notification
    showNotification('Generation Complete', `${job.movementName} completed successfully.`);
  }

  broadcastState();
  
  // Continue queue execution
  processQueue();
}

async function handleJobFailure(jobId: string, error: string) {
  const state = await getQueueState();
  const settings = await getSettings();
  const job = state.jobs.find(j => j.id === jobId);

  if (job) {
    job.retryCount++;
    job.error = error;
    
    if (job.retryCount < settings.retryLimit) {
      console.log(`[Background] Job ${jobId} failed. Retrying (Attempt ${job.retryCount + 1}/${settings.retryLimit})...`);
      job.status = 'pending'; // retry
    } else {
      console.error(`[Background] Job ${jobId} failed completely after ${job.retryCount} retries.`);
      job.status = 'failed';
      
      // Notify user of complete failure
      showNotification('Generation Failed', `Failed to generate image for ${job.movementName}: ${error}`);
    }

    await saveQueueState(state);
  }

  broadcastState();
  processQueue();
}

async function playNotificationSound() {
  try {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
      // Resolve offscreenUrl to pass to createDocument
      await chrome.offscreen.createDocument({
        url: offscreenUrl,
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Synthesize notification chime for batch image events',
      });
    }

    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'play-audio',
    });
  } catch (err) {
    console.error('[Background] Audio playback error:', err);
  }
}

function calculateStats(jobs: Job[]): QueueStats {
  const stats: QueueStats = { total: jobs.length, pending: 0, running: 0, completed: 0, failed: 0 };
  for (const j of jobs) {
    if (j.status === 'pending') stats.pending++;
    else if (j.status === 'running') stats.running++;
    else if (j.status === 'completed') stats.completed++;
    else if (j.status === 'failed') stats.failed++;
  }
  return stats;
}

async function broadcastState() {
  const state = await getQueueState();
  const stats = calculateStats(state.jobs);
  const settings = await getSettings();
  
  // Send state update to popup and options
  chrome.runtime.sendMessage({
    action: 'STATE_UPDATED',
    state,
    stats,
    settings,
  }).catch(() => {
    // Ignore error if popup or options page are closed
  });
}
