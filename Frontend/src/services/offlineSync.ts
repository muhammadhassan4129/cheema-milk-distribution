/**
 * Offline Sync Service - Cheema Dairy
 *
 * Kaam kaise karta hai:
 * 1. Internet nahi hai → data localStorage mein save hota hai + pending queue mein daalta hai
 * 2. Internet aaya → pending queue mein se har operation backend ko bhejta hai
 * 3. Sync complete → localStorage fresh data se update ho jata hai
 *
 * Features:
 * - Exponential backoff retry (1s, 2s, 4s delay between retries)
 * - Detailed error logging with errorMessage in SyncLog
 * - CastError / ObjectId mismatch detection
 * - Race condition prevention (isSyncing flag)
 *
 * Queue localStorage key: 'dairy_sync_queue'
 * Sync logs key: 'dairy_sync_logs'
 */

import { apiRequest, isOnline, syncLogsApi } from './api';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SyncOperation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timestamp: number;
  retries: number;
  lastError?: string;    // ✅ NEW: last error message
  context: string;
}

export interface SyncLog {
  timestamp: string;
  model: string;
  context: string;
  status: 'Success' | 'Failed';
  errorMessage: string | null;
  endpoint?: string;
  retryCount?: number;
}

const QUEUE_KEY = 'dairy_sync_queue';
const SYNC_LOGS_KEY = 'dairy_sync_logs';
const MAX_RETRIES = 3;
const MAX_LOGS = 200;

// ─── SyncLog Management ───────────────────────────────────────────────────

export const getSyncLogs = (): SyncLog[] => {
  try {
    const stored = localStorage.getItem(SYNC_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const appendSyncLog = (log: SyncLog) => {
  try {
    const logs = getSyncLogs();
    logs.unshift(log);
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
    
    if (isOnline()) {
      syncLogsApi.create(log).catch(() => {});
    }
  } catch {}
};

// ─── Queue Management ──────────────────────────────────────────────────────

export const getQueue = (): SyncOperation[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: SyncOperation[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

/**
 * Offline operation queue mein add karo
 */
export const addToQueue = (
  endpoint: string,
  method: SyncOperation['method'],
  body?: unknown,
  context = ''
): string => {
  const op: SyncOperation = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    endpoint,
    method,
    body,
    timestamp: Date.now(),
    retries: 0,
    context,
  };

  const queue = getQueue();
  queue.push(op);
  saveQueue(queue);

  console.log(`[OfflineSync] Queued: ${method} ${endpoint} (${context})`);
  return op.id;
};

/**
 * Queue se operation hatao (successful ya max retries)
 */
const removeFromQueue = (opId: string) => {
  const queue = getQueue().filter((op) => op.id !== opId);
  saveQueue(queue);
};

/**
 * Pending operations ki count
 */
export const getPendingCount = (): number => getQueue().length;

// ─── Exponential Backoff ──────────────────────────────────────────────────

/**
 * Retry number ke hisaab se delay karo
 * retry 0 → 0ms, retry 1 → 1000ms, retry 2 → 2000ms, retry 3 → 4000ms
 */
const backoffDelay = (retryCount: number): Promise<void> => {
  if (retryCount === 0) return Promise.resolve();
  const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
  console.log(`[OfflineSync] Backoff: waiting ${delay}ms before retry ${retryCount}...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// ─── Error Classification ─────────────────────────────────────────────────

const classifyError = (err: unknown): string => {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('Cast to ObjectId failed') || msg.includes('CastError')) {
    return `CastError: Invalid MongoDB ObjectId in URL. Original: ${msg}`;
  }
  if (msg.includes('ValidationError') || msg.includes('validation failed')) {
    return `ValidationError: Schema validation failed. Original: ${msg}`;
  }
  if (msg.includes('duplicate key') || msg.includes('E11000')) {
    return `DuplicateKeyError: Record already exists. Original: ${msg}`;
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return `NetworkError: Cannot reach backend. Original: ${msg}`;
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
    return `TimeoutError: Request timed out. Original: ${msg}`;
  }
  return msg;
};

// ─── Sync Logic ────────────────────────────────────────────────────────────

let isSyncing = false;

/**
 * Sab pending operations backend ko bhejo
 * Exponential backoff + detailed errorMessage ke sath
 */
export const syncPendingOperations = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  if (!isOnline()) {
    console.log('[OfflineSync] Still offline, skipping sync');
    return { synced: 0, failed: 0 };
  }

  if (isSyncing) {
    console.log('[OfflineSync] Sync already in progress');
    return { synced: 0, failed: 0 };
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  console.log(`[OfflineSync] Starting sync of ${queue.length} pending operations...`);

  let synced = 0;
  let failed = 0;

  // Timestamp se sort (oldest first)
  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);

  for (const op of sorted) {
    // Exponential backoff delay (retry ke hisaab se)
    await backoffDelay(op.retries);

    try {
      await apiRequest(op.endpoint, {
        method: op.method,
        body: op.body,
      });

      removeFromQueue(op.id);
      synced++;

      appendSyncLog({
        timestamp: new Date().toISOString(),
        model: extractModel(op.endpoint),
        context: op.context,
        status: 'Success',
        errorMessage: null,
        endpoint: op.endpoint,
        retryCount: op.retries,
      });

      console.log(`[OfflineSync] ✓ Synced: ${op.method} ${op.endpoint} (${op.context})`);

    } catch (error) {
      const errorMessage = classifyError(error);
      op.retries++;
      op.lastError = errorMessage;

      // CastError ya ValidationError → permanent failure, retry se kuch nahi hoga
      const isPermanentError =
        errorMessage.startsWith('CastError') ||
        errorMessage.startsWith('ValidationError') ||
        errorMessage.startsWith('DuplicateKeyError');

      if (op.retries >= MAX_RETRIES || isPermanentError) {
        removeFromQueue(op.id);
        failed++;

        appendSyncLog({
          timestamp: new Date().toISOString(),
          model: extractModel(op.endpoint),
          context: op.context,
          status: 'Failed',
          errorMessage,
          endpoint: op.endpoint,
          retryCount: op.retries,
        });

        const reason = isPermanentError ? 'permanent error' : 'max retries reached';
        console.error(`[OfflineSync] ✗ Failed (${reason}): ${op.method} ${op.endpoint}`, errorMessage);
      } else {
        // Queue mein updated retry count save karo
        const currentQueue = getQueue();
        const idx = currentQueue.findIndex((q) => q.id === op.id);
        if (idx !== -1) {
          currentQueue[idx].retries = op.retries;
          currentQueue[idx].lastError = op.lastError;
          saveQueue(currentQueue);
        }
        failed++;
        console.warn(
          `[OfflineSync] ✗ Failed (retry ${op.retries}/${MAX_RETRIES}): ${op.endpoint} — ${errorMessage}`
        );
      }
    }
  }

  isSyncing = false;
  console.log(`[OfflineSync] Sync complete: ${synced} synced, ${failed} failed`);

  window.dispatchEvent(
    new CustomEvent('dairy-sync-complete', { detail: { synced, failed } })
  );

  // Sync complete hone ke baad dashboard refresh karo
  if (synced > 0) {
    window.dispatchEvent(new CustomEvent('dairy-purchase-saved'));
    window.dispatchEvent(new CustomEvent('dairy-sale-saved'));
  }

  return { synced, failed };
};

// Endpoint se model name extract karo (for logs)
const extractModel = (endpoint: string): string => {
  const parts = endpoint.split('/').filter(Boolean);
  return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Unknown';
};

// ─── Auto Sync on Online ──────────────────────────────────────────────────

/**
 * Internet connection wapas aaye toh automatically sync karo
 */
export const initOfflineSync = () => {
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Internet connection restored. Starting sync...');
    setTimeout(() => {
      syncPendingOperations().then(({ synced }) => {
        if (synced > 0) {
          console.log(`[OfflineSync] ${synced} operations synced to backend`);
        }
      });
    }, 2000);
  });

  window.addEventListener('offline', () => {
    console.log('[OfflineSync] Internet connection lost. Switching to offline mode.');
  });

  // App start pe bhi sync karo (agar kuch pending ho)
  if (isOnline() && getQueue().length > 0) {
    setTimeout(syncPendingOperations, 3000);
  }
};

// ─── Helper: Online/Offline Action ────────────────────────────────────────

/**
 * Har context action ke liye ye use karo:
 * 1. Backend try karo
 * 2. Fail ya offline → queue mein add karo
 *
 * @example
 * await onlineOrQueue(
 *   () => dispatchesApi.create(data),
 *   '/dispatches', 'POST', data, 'Add dispatch'
 * );
 */
export const onlineOrQueue = async (
  onlineAction: () => Promise<unknown>,
  endpoint: string,
  method: SyncOperation['method'],
  body?: unknown,
  context = ''
): Promise<{ fromBackend: boolean; queued: boolean }> => {
  if (isOnline()) {
    try {
      await onlineAction();
      return { fromBackend: true, queued: false };
    } catch (error) {
      const errorMessage = classifyError(error);
      console.warn(`[OfflineSync] Online action failed, queuing: ${context} — ${errorMessage}`);
      addToQueue(endpoint, method, body, context);
      return { fromBackend: false, queued: true };
    }
  } else {
    addToQueue(endpoint, method, body, context);
    return { fromBackend: false, queued: true };
  }
};

/**
 * Pull sync logs from backend and update local cache
 */
export const pullSyncLogs = async () => {
  if (!isOnline()) return;
  try {
    const res: any = await syncLogsApi.getAll();
    if (res.success && Array.isArray(res.data)) {
      const logs = res.data.map((log: any) => ({
        timestamp: log.timestamp || log.createdAt,
        model: log.model,
        context: log.context,
        status: log.status,
        errorMessage: log.errorMessage,
        endpoint: log.endpoint,
        retryCount: log.retryCount
      }));
      localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
    }
  } catch (err) {
    console.warn("[SyncLogs] Pull failed:", err);
  }
};
