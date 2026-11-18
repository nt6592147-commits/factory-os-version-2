import type { OfflineQueueItem } from '../types/factory';

const DB_NAME = 'factory_memory_offline_queue';
const STORE_NAME = 'queued_operations';
const DB_VERSION = 1;

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientRequestId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedOperations(): Promise<OfflineQueueItem[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineQueueItem[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function enqueueOfflineOperation(item: OfflineQueueItem): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Use clientRequestId as primary key to prevent duplicate submissions
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeQueuedOperation(clientRequestId: string): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(clientRequestId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateQueuedOperationStatus(
  clientRequestId: string,
  status: OfflineQueueItem['status'],
  errorMessage?: string
): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(clientRequestId);
    getReq.onsuccess = () => {
      const existing = getReq.result as OfflineQueueItem | undefined;
      if (existing) {
        store.put({ ...existing, status, errorMessage });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
