import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// ── Strict TypeScript Types ──────────────────────────────────────────────────

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
export type DownloadType = 'video' | 'audio';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  progress: number; // 0 to 100
  speed: string; // e.g. "2.4 MB/s" or "0 KB/s"
  eta: string; // e.g. "00:45", "01:20", or "--"
  status: DownloadStatus;
  filepath: string; // Native file URI or Blob URL
  fileSize: string; // Formatted size e.g. "45.8 MB"
  type: DownloadType;
  loadedBytes: number;
  totalBytes: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
  mimeType?: string;
}

export interface DownloadStoreState {
  downloads: DownloadItem[];
  maxConcurrent: number;
  isHydrated: boolean;

  // Actions
  addDownload: (url: string, title: string, type: DownloadType) => Promise<string>;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  pauseAll: () => void;
  resumeAll: () => void;
  retryAllFailed: () => void;
  setMaxConcurrent: (max: number) => void;
  initialize: () => Promise<void>;
}

// ── IndexedDB Persistence Configuration ─────────────────────────────────────

const DB_NAME = 'playnexa_smart_downloader_db';
const DB_VERSION = 1;
const DOWNLOADS_STORE = 'downloads';
const BLOBS_STORE = 'download_blobs';

let dbInstancePromise: Promise<IDBPDatabase> | null = null;

async function getDB(): Promise<IDBPDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DOWNLOADS_STORE)) {
        const store = db.createObjectStore(DOWNLOADS_STORE, { keyPath: 'id' });
        store.createIndex('by_status', 'status');
        store.createIndex('by_created', 'createdAt');
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
      }
    },
  });

  return dbInstancePromise;
}

async function persistDownloadItem(item: DownloadItem): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(DOWNLOADS_STORE, item);
  } catch (err) {
    console.error('[SmartDownloader DB] Failed to save download item:', err);
  }
}

async function persistAllDownloads(items: DownloadItem[]): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction(DOWNLOADS_STORE, 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  } catch (err) {
    console.error('[SmartDownloader DB] Failed to save all downloads:', err);
  }
}

async function deletePersistedDownload(id: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction([DOWNLOADS_STORE, BLOBS_STORE], 'readwrite');
    await tx.objectStore(DOWNLOADS_STORE).delete(id);
    await tx.objectStore(BLOBS_STORE).delete(id);
    await tx.done;
  } catch (err) {
    console.error('[SmartDownloader DB] Failed to delete download item:', err);
  }
}

async function saveWebBlob(id: string, blob: Blob, mimeType: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(BLOBS_STORE, { id, blob, mimeType, savedAt: Date.now() });
  } catch (err) {
    console.error('[SmartDownloader DB] Failed to save web blob:', err);
  }
}

// ── Utility Helpers: Formatting & File Handling ─────────────────────────────

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 KB/s';
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  }
  return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
}

export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--';
  if (seconds === 0) return '00:00';
  const sec = Math.round(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function sanitizeFileName(title: string, type: DownloadType, url: string): string {
  let cleanTitle = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim()
    .slice(0, 120);

  if (!cleanTitle) {
    cleanTitle = `download_${Date.now()}`;
  }

  // Derive extension
  const ext = type === 'audio' ? '.mp3' : '.mp4';
  if (!cleanTitle.toLowerCase().endsWith(ext)) {
    // Check if url had an extension
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const match = pathname.match(/\.(mp4|m4a|mp3|webm|mkv|aac|ogg|wav)$/i);
      if (match) {
        cleanTitle += `.${match[1]}`;
      } else {
        cleanTitle += ext;
      }
    } catch {
      cleanTitle += ext;
    }
  }

  return cleanTitle;
}

// ── Native & Web Storage Strategy ───────────────────────────────────────────

async function saveFileToStorage(
  fileName: string,
  blob: Blob,
  id: string,
  mimeType: string
): Promise<string> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // Request permissions if needed
      try {
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (permErr) {
        console.warn('[SmartDownloader] Storage permission check skipped:', permErr);
      }

      // Convert Blob to Base64 for Capacitor Filesystem writing
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Ensure PlayNexa directory exists in Documents
      const directory = Directory.Documents;
      const folderPath = 'PlayNexa';

      try {
        await Filesystem.mkdir({
          path: folderPath,
          directory,
          recursive: true,
        });
      } catch {
        // Directory may already exist
      }

      const filePath = `${folderPath}/${fileName}`;
      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory,
        recursive: true,
      });

      // Retrieve full Native URI
      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory,
      });

      return uriResult.uri || filePath;
    } catch (nativeErr) {
      console.error('[SmartDownloader] Native Filesystem save failed, falling back to Blob URL:', nativeErr);
    }
  }

  // Web / PWA Fallback: Persist in IndexedDB and create Object URL
  await saveWebBlob(id, blob, mimeType);
  const blobUrl = URL.createObjectURL(blob);
  return blobUrl;
}

// ── Active Download Task Controllers & Speed Tracker ────────────────────────

interface ActiveTask {
  controller: AbortController;
  lastProgressUpdate: number;
  lastLoadedBytes: number;
  smoothedSpeed: number;
  rafId: number | null;
}

const activeTasks = new Map<string, ActiveTask>();

// ── Zustand Store Implementation ────────────────────────────────────────────

export const useDownloadStore = create<DownloadStoreState>((set, get) => {
  // Background Queue Processing Engine
  let isQueueProcessing = false;

  const processQueue = async () => {
    if (isQueueProcessing) return;
    isQueueProcessing = true;

    try {
      const state = get();
      const activeDownloads = state.downloads.filter((d) => d.status === 'downloading');
      const availableSlots = state.maxConcurrent - activeDownloads.length;

      if (availableSlots <= 0) {
        isQueueProcessing = false;
        return;
      }

      const queuedItems = state.downloads
        .filter((d) => d.status === 'queued')
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, availableSlots);

      for (const item of queuedItems) {
        startDownloadTask(item.id);
      }
    } finally {
      isQueueProcessing = false;
    }
  };

  const startDownloadTask = async (id: string) => {
    const current = get().downloads.find((d) => d.id === id);
    if (!current || current.status === 'downloading') return;

    const controller = new AbortController();
    const taskMeta: ActiveTask = {
      controller,
      lastProgressUpdate: performance.now(),
      lastLoadedBytes: 0,
      smoothedSpeed: 0,
      rafId: null,
    };
    activeTasks.set(id, taskMeta);

    // Update status to 'downloading'
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'downloading',
              error: undefined,
            }
          : d
      ),
    }));

    try {
      const response = await fetch(current.url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const contentType = response.headers.get('content-type') || (current.type === 'audio' ? 'audio/mpeg' : 'video/mp4');

      let loadedBytes = 0;
      const chunks: Uint8Array[] = [];
      const reader = response.body?.getReader();

      if (!reader) {
        // Fallback for environments without streaming response body
        const blob = await response.blob();
        loadedBytes = blob.size;
        const finalSize = totalBytes > 0 ? totalBytes : loadedBytes;
        const fileName = sanitizeFileName(current.title, current.type, current.url);
        const filepath = await saveFileToStorage(fileName, blob, id, contentType);

        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: 'completed',
                  progress: 100,
                  speed: '0 KB/s',
                  eta: '00:00',
                  loadedBytes: finalSize,
                  totalBytes: finalSize,
                  fileSize: formatBytes(finalSize),
                  filepath,
                  completedAt: Date.now(),
                  mimeType: contentType,
                }
              : d
          ),
        }));

        const updated = get().downloads.find((d) => d.id === id);
        if (updated) persistDownloadItem(updated);
        activeTasks.delete(id);
        processQueue();
        return;
      }

      // Stream Chunks with Throttle / RAF Updates
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          loadedBytes += value.length;

          const now = performance.now();
          const elapsed = (now - taskMeta.lastProgressUpdate) / 1000;

          // Update speed & ETA at regular intervals (minimum 100ms) to avoid CPU churn
          if (elapsed >= 0.1) {
            const bytesSinceLast = loadedBytes - taskMeta.lastLoadedBytes;
            const instantSpeed = bytesSinceLast / elapsed;

            // Exponential Moving Average for silky smooth speed values
            taskMeta.smoothedSpeed =
              taskMeta.smoothedSpeed === 0
                ? instantSpeed
                : taskMeta.smoothedSpeed * 0.7 + instantSpeed * 0.3;

            taskMeta.lastProgressUpdate = now;
            taskMeta.lastLoadedBytes = loadedBytes;

            const progress =
              totalBytes > 0
                ? Math.min(99.9, Math.round((loadedBytes / totalBytes) * 1000) / 10)
                : 0;

            const remainingBytes = Math.max(0, totalBytes - loadedBytes);
            const remainingSeconds =
              taskMeta.smoothedSpeed > 0 && totalBytes > 0
                ? remainingBytes / taskMeta.smoothedSpeed
                : 0;

            const speedText = formatSpeed(taskMeta.smoothedSpeed);
            const etaText = formatEta(remainingSeconds);
            const sizeText = formatBytes(totalBytes > 0 ? totalBytes : loadedBytes);

            // Throttle store dispatch using requestAnimationFrame
            if (typeof window !== 'undefined') {
              if (taskMeta.rafId) cancelAnimationFrame(taskMeta.rafId);
              taskMeta.rafId = requestAnimationFrame(() => {
                set((state) => ({
                  downloads: state.downloads.map((d) =>
                    d.id === id && d.status === 'downloading'
                      ? {
                          ...d,
                          progress,
                          speed: speedText,
                          eta: etaText,
                          loadedBytes,
                          totalBytes: totalBytes > 0 ? totalBytes : loadedBytes,
                          fileSize: sizeText,
                        }
                      : d
                  ),
                }));
              });
            }
          }
        }
      }

      // Finalize Assembled Download
      const combinedBlob = new Blob(chunks as unknown as BlobPart[], { type: contentType });
      const finalBytes = combinedBlob.size;
      const fileName = sanitizeFileName(current.title, current.type, current.url);
      const filepath = await saveFileToStorage(fileName, combinedBlob, id, contentType);

      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'completed',
                progress: 100,
                speed: '0 KB/s',
                eta: '00:00',
                loadedBytes: finalBytes,
                totalBytes: finalBytes,
                fileSize: formatBytes(finalBytes),
                filepath,
                completedAt: Date.now(),
                mimeType: contentType,
              }
            : d
        ),
      }));

      const completedItem = get().downloads.find((d) => d.id === id);
      if (completedItem) persistDownloadItem(completedItem);
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.toLowerCase().includes('abort'));

      if (isAbort) {
        // Paused or Cancelled
        console.log(`[SmartDownloader] Download ${id} aborted.`);
      } else {
        console.error(`[SmartDownloader] Download ${id} failed:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Download failed';
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: 'failed',
                  speed: '0 KB/s',
                  eta: '--',
                  error: errorMessage,
                }
              : d
          ),
        }));

        const failedItem = get().downloads.find((d) => d.id === id);
        if (failedItem) persistDownloadItem(failedItem);
      }
    } finally {
      activeTasks.delete(id);
      processQueue();
    }
  };

  return {
    downloads: [],
    maxConcurrent: 3,
    isHydrated: false,

    initialize: async () => {
      if (get().isHydrated) return;

      try {
        const db = await getDB();
        if (!db) {
          set({ isHydrated: true });
          return;
        }

        const stored = await db.getAll(DOWNLOADS_STORE);

        // Normalize stale 'downloading' states to 'paused' upon fresh hydration
        const normalized = stored.map((item: DownloadItem) => {
          if (item.status === 'downloading') {
            return {
              ...item,
              status: 'paused' as DownloadStatus,
              speed: '0 KB/s',
              eta: '--',
            };
          }
          return item;
        });

        set({
          downloads: normalized,
          isHydrated: true,
        });

        // Trigger queue for any previously queued downloads
        processQueue();
      } catch (err) {
        console.error('[SmartDownloader Store] Failed to hydrate downloads from IDB:', err);
        set({ isHydrated: true });
      }
    },

    addDownload: async (url: string, title: string, type: DownloadType): Promise<string> => {
      const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newItem: DownloadItem = {
        id,
        url,
        title: title || 'Untitled Media',
        progress: 0,
        speed: '0 KB/s',
        eta: '--',
        status: 'queued',
        filepath: '',
        fileSize: 'Calculating...',
        type,
        loadedBytes: 0,
        totalBytes: 0,
        createdAt: Date.now(),
      };

      set((state) => ({
        downloads: [newItem, ...state.downloads],
      }));

      await persistDownloadItem(newItem);
      processQueue();
      return id;
    },

    pauseDownload: (id: string) => {
      const task = activeTasks.get(id);
      if (task) {
        task.controller.abort();
        activeTasks.delete(id);
      }

      set((state) => {
        const updated = state.downloads.map((d) =>
          d.id === id && (d.status === 'downloading' || d.status === 'queued')
            ? { ...d, status: 'paused' as DownloadStatus, speed: '0 KB/s', eta: 'Paused' }
            : d
        );
        return { downloads: updated };
      });

      const pausedItem = get().downloads.find((d) => d.id === id);
      if (pausedItem) persistDownloadItem(pausedItem);

      processQueue();
    },

    resumeDownload: (id: string) => {
      set((state) => {
        const updated = state.downloads.map((d) =>
          d.id === id && (d.status === 'paused' || d.status === 'failed')
            ? { ...d, status: 'queued' as DownloadStatus, speed: '0 KB/s', eta: '--', error: undefined }
            : d
        );
        return { downloads: updated };
      });

      const resumedItem = get().downloads.find((d) => d.id === id);
      if (resumedItem) persistDownloadItem(resumedItem);

      processQueue();
    },

    cancelDownload: (id: string) => {
      const task = activeTasks.get(id);
      if (task) {
        task.controller.abort();
        activeTasks.delete(id);
      }

      set((state) => ({
        downloads: state.downloads.filter((d) => d.id !== id),
      }));

      deletePersistedDownload(id);
      processQueue();
    },

    retryDownload: (id: string) => {
      get().resumeDownload(id);
    },

    removeDownload: (id: string) => {
      get().cancelDownload(id);
    },

    clearCompleted: () => {
      const completedIds = get()
        .downloads.filter((d) => d.status === 'completed')
        .map((d) => d.id);

      set((state) => ({
        downloads: state.downloads.filter((d) => d.status !== 'completed'),
      }));

      for (const id of completedIds) {
        deletePersistedDownload(id);
      }
    },

    pauseAll: () => {
      const activeList = get().downloads.filter(
        (d) => d.status === 'downloading' || d.status === 'queued'
      );
      for (const item of activeList) {
        get().pauseDownload(item.id);
      }
    },

    resumeAll: () => {
      const pausedList = get().downloads.filter((d) => d.status === 'paused');
      for (const item of pausedList) {
        get().resumeDownload(item.id);
      }
    },

    retryAllFailed: () => {
      const failedList = get().downloads.filter((d) => d.status === 'failed');
      for (const item of failedList) {
        get().resumeDownload(item.id);
      }
    },

    setMaxConcurrent: (max: number) => {
      const clamped = Math.max(1, Math.min(10, max));
      set({ maxConcurrent: clamped });
      processQueue();
    },
  };
});

// ── Media Playback & Native Storage File Resolver Helpers ───────────────────

export async function getPlayableMediaUrl(item: DownloadItem): Promise<string> {
  // If native Capacitor platform and starts with file:// or native path
  if (Capacitor.isNativePlatform() && item.filepath) {
    if (item.filepath.startsWith('file://') || item.filepath.startsWith('/')) {
      try {
        return Capacitor.convertFileSrc(item.filepath);
      } catch {
        return item.filepath;
      }
    }
  }

  // If in browser and has existing blob url
  if (item.filepath && item.filepath.startsWith('blob:')) {
    try {
      const check = await fetch(item.filepath, { method: 'HEAD' });
      if (check.ok) return item.filepath;
    } catch {
      // Blob URL likely expired across page reload, retrieve below
    }
  }

  // Retrieve blob directly from IndexedDB BLOBS_STORE
  try {
    const db = await getDB();
    if (db) {
      const blobRecord = await db.get(BLOBS_STORE, item.id);
      if (blobRecord && blobRecord.blob) {
        return URL.createObjectURL(blobRecord.blob);
      }
    }
  } catch (err) {
    console.error('[SmartDownloader] Error resolving blob from IDB:', err);
  }

  return item.filepath || item.url;
}

export async function deleteDownloadedMediaFile(item: DownloadItem): Promise<void> {
  if (Capacitor.isNativePlatform() && item.filepath) {
    try {
      const fileName = sanitizeFileName(item.title, item.type, item.url);
      await Filesystem.deleteFile({
        path: `PlayNexa/${fileName}`,
        directory: Directory.Documents,
      });
    } catch (e) {
      console.warn('[SmartDownloader] Native file delete error:', e);
    }
  }
  await deletePersistedDownload(item.id);
}

// Auto-initialize store on client side mount
if (typeof window !== 'undefined') {
  useDownloadStore.getState().initialize();
}
