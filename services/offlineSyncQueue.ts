/**
 * Offline Sync Queue
 * Records Firestore operations attempted while offline and replays them on reconnect.
 * Uses a dedicated 'syncQueue' object store in the existing AINoteTakerDB.
 */

import {
  saveDocumentToFirestore,
  updateDocumentInFirestore,
  deleteDocumentFromFirestore,
} from './firestoreService';
import {
  saveWareToFirestoreRaw,
  updateWareInFirestoreRaw,
  deleteWareFromFirestoreRaw,
} from './wareFirestoreService';

export type SyncOperation = 'save' | 'update' | 'delete';
export type SyncCollection = 'documents' | 'wares';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  collection: SyncCollection;
  payload: any;
  timestamp: number;
}

const DB_NAME = 'AINoteTakerDB';
const QUEUE_STORE = 'syncQueue';
// Current DB version — must match or exceed existing version
const DB_VERSION = 3;

let db: IDBDatabase | null = null;

// ---------------------------------------------------------------------------
// DB Init
// ---------------------------------------------------------------------------
const initQueueDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Ensure the syncQueue store exists; earlier stores are preserved automatically.
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        const store = database.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Add an operation to the offline sync queue. */
export const enqueueSyncOperation = async (
  operation: SyncOperation,
  collection: SyncCollection,
  payload: any
): Promise<void> => {
  const database = await initQueueDB();
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    operation,
    collection,
    payload,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.add(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

/** How many operations are waiting to sync. */
export const getPendingCount = async (): Promise<number> => {
  const database = await initQueueDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([QUEUE_STORE], 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

/** Get all pending items sorted by timestamp ascending. */
const getAllPendingItems = async (): Promise<SyncQueueItem[]> => {
  const database = await initQueueDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([QUEUE_STORE], 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as SyncQueueItem[]).sort(
        (a, b) => a.timestamp - b.timestamp
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
};

/** Remove a successfully replayed item from the queue. */
const dequeueItem = async (id: string): Promise<void> => {
  const database = await initQueueDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

/**
 * Replay all queued operations against Firestore.
 * Each successfully replayed item is removed from the queue.
 * Items that still fail (e.g. Firestore rejection) are left in the queue.
 *
 * @param userId  The current authenticated user's UID.
 * @param onProgress Optional callback called after each item: (remaining) => void
 * @returns Number of items that were successfully flushed.
 */
export const flushSyncQueue = async (
  userId: string,
  onProgress?: (remaining: number) => void
): Promise<number> => {
  const items = await getAllPendingItems();
  if (items.length === 0) return 0;

  let flushed = 0;

  for (const item of items) {
    try {
      if (item.collection === 'documents') {
        if (item.operation === 'save' || item.operation === 'update') {
          await saveDocumentToFirestore(userId, item.payload);
        } else if (item.operation === 'delete') {
          await deleteDocumentFromFirestore(userId, item.payload.id);
        }
      } else if (item.collection === 'wares') {
        if (item.operation === 'save' || item.operation === 'update') {
          await saveWareToFirestoreRaw(userId, item.payload);
        } else if (item.operation === 'delete') {
          await deleteWareFromFirestoreRaw(userId, item.payload.id);
        }
      }

      await dequeueItem(item.id);
      flushed++;

      if (onProgress) {
        const remaining = items.length - flushed;
        onProgress(remaining);
      }
    } catch (err) {
      // Leave item in queue — will retry next time we come online
      console.warn('Offline sync: failed to replay item, will retry:', item.id, err);
    }
  }

  return flushed;
};

/** Clear the entire queue (use with caution — data loss if not already synced). */
export const clearSyncQueue = async (): Promise<void> => {
  const database = await initQueueDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};
