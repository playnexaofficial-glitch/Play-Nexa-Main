// Stores File objects in IndexedDB
// So they survive page reloads
// Works on both web and APK (webview)

const DB_NAME = 'playnexa-files'
const DB_VERSION = 1
const AUDIO_STORE = 'audio-files'
const VIDEO_STORE = 'video-files'

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, {
          keyPath: 'id',
        })
      }
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, {
          keyPath: 'id',
        })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface StoredFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  addedAt: number
}

export async function saveAudioFiles(
  files: File[]
): Promise<StoredFile[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(AUDIO_STORE, 'readwrite')
    const store = tx.objectStore(AUDIO_STORE)
    const stored: StoredFile[] = []
    for (const file of files) {
      const item: StoredFile = {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        addedAt: Date.now(),
      }
      store.put(item)
      stored.push(item)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(stored)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return []
  }
}

export async function loadAudioFiles(): Promise<StoredFile[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(AUDIO_STORE, 'readonly')
    const store = tx.objectStore(AUDIO_STORE)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function saveVideoFiles(
  files: File[]
): Promise<StoredFile[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(VIDEO_STORE, 'readwrite')
    const store = tx.objectStore(VIDEO_STORE)
    const stored: StoredFile[] = []
    for (const file of files) {
      const item: StoredFile = {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        addedAt: Date.now(),
      }
      store.put(item)
      stored.push(item)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(stored)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return []
  }
}

export async function loadVideoFiles(): Promise<StoredFile[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(VIDEO_STORE, 'readonly')
    const store = tx.objectStore(VIDEO_STORE)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(AUDIO_STORE, 'readwrite')
    tx.objectStore(AUDIO_STORE).delete(id)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

export async function deleteVideoFile(id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(VIDEO_STORE, 'readwrite')
    tx.objectStore(VIDEO_STORE).delete(id)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

export async function clearAudioFiles(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(AUDIO_STORE, 'readwrite')
    tx.objectStore(AUDIO_STORE).clear()
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

export async function clearVideoFiles(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(VIDEO_STORE, 'readwrite')
    tx.objectStore(VIDEO_STORE).clear()
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}
