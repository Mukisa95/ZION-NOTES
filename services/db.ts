/**
 * Unified IndexedDB initializer
 * All services share this single DB connection so that the version is
 * always consistent and `onupgradeneeded` creates every object-store in
 * one place.  Incrementing DB_VERSION here is the only thing needed when
 * adding a new store.
 */

export const DB_NAME = 'AINoteTakerDB';
export const DB_VERSION = 4; // Bumped to force creation of new object stores (wares, syncQueue)

// Store names — import these constants instead of using raw strings
export const STORE_DOCUMENTS = 'documents';
export const STORE_WARES = 'wares';
export const STORE_SYNC_QUEUE = 'syncQueue';

let _db: IDBDatabase | null = null;

export const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      _db = request.result;

      // If the database is deleted externally the connection becomes invalid
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };

      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // ── documents store ──────────────────────────────────────────────────
      if (!database.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const docStore = database.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('name', 'name', { unique: false });
        docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // ── wares store ──────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains(STORE_WARES)) {
        const wareStore = database.createObjectStore(STORE_WARES, { keyPath: 'id' });
        wareStore.createIndex('name', 'name', { unique: false });
        wareStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // ── syncQueue store ──────────────────────────────────────────────────
      if (!database.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = database.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};
