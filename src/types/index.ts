export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Provider = 'chatgpt' | 'gemini';

export interface Job {
  id: string;
  provider: Provider;
  movementName: string;
  englishName: string;
  category: string;
  targetMuscles: string;
  prompt: string;
  status: JobStatus;
  retryCount: number;
  error?: string;
  tabId?: number;
  imageUrl?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ExtensionSettings {
  // Which providers to run each prompt on
  useChatgpt: boolean;
  useGemini: boolean;
  // Concurrency: how many tabs run in parallel for each provider
  chatgptWorkers: number;
  geminiWorkers: number;
  notificationSound: boolean;
  autoDownload: boolean;
  retryLimit: number;
  promptTemplate: string;
  closeTabOnComplete: boolean;
  // When true, the whole queue pauses if a provider reports a rate limit.
  // When false (default), the rate-limited job just fails/moves on and the queue keeps going.
  pauseOnRateLimit: boolean;
  // Retro "BulkShot" UI theme tweaks (persisted so popup + options stay in sync).
  uiTheme: 'Paper' | 'Dusk';
  uiAccent: string;
  uiWaves: boolean;
}

export interface QueueState {
  jobs: Job[];
  isRunning: boolean;
  isPaused: boolean;
}

export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export type ExtensionMessage =
  | { action: 'START_QUEUE'; jobs: Omit<Job, 'id' | 'status' | 'retryCount' | 'prompt'>[] }
  | { action: 'PAUSE_QUEUE' }
  | { action: 'RESUME_QUEUE' }
  | { action: 'STOP_QUEUE' }
  | { action: 'CLEAR_QUEUE' }
  | { action: 'UPDATE_SETTINGS'; settings: Partial<ExtensionSettings> }
  | { action: 'GET_STATE' }
  | { action: 'TEST_SOUND' }
  | { action: 'TEST_NOTIFICATION' }
  | { action: 'CONTENT_READY' }
  | { action: 'JOB_COMPLETED'; imageUrl: string; imageData?: string }
  | { action: 'JOB_FAILED'; error: string }
  | { action: 'JOB_RATE_LIMITED' }
  | { action: 'DOWNLOAD_COMPLETE'; success: boolean; error?: string }
  | { action: 'STATE_UPDATED'; state: QueueState; stats: QueueStats; settings: ExtensionSettings }
  | { action: 'START_GENERATION'; prompt: string };

export interface LogEntry {
  timestamp: number;
  type: 'info' | 'warn' | 'error';
  message: string;
}

