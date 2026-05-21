/**
 * WARE (Folder) Storage Service
 * Manages saving and loading WARES with IndexedDB
 */

export interface Ware {
    id: string;
    name: string;
    documentIds: string[];
    color?: string; // Theme color (hex code)
    createdAt: number;
    updatedAt: number;
}

export interface WareUpdates {
    name?: string;
    documentIds?: string[];
    color?: string;
    updatedAt?: number;
}

const DB_NAME = 'AINoteTakerDB';
const STORE_NAME = 'wares';
const DB_VERSION = 2; // Increment to add wares store

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB with wares store
 */
const initDB = (): Promise<IDBDatabase> => {
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
            
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('name', 'name', { unique: false });
                objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
};

/**
 * Save a WARE
 */
export const saveWare = async (name: string, documentIds: string[] = [], color?: string): Promise<Ware> => {
    const database = await initDB();
    
    const now = Date.now();
    const ware: Ware = {
        id: `ware_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        documentIds,
        color: color || 'purple', // Default to purple if not specified
        createdAt: now,
        updatedAt: now
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(ware);

        request.onsuccess = () => resolve(ware);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Update an existing WARE
 */
export const updateWare = async (
    id: string,
    nameOrUpdates: string | WareUpdates,
    documentIds?: string[],
    color?: string
): Promise<Ware> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const existingWare = getRequest.result;
            const updates: WareUpdates = typeof nameOrUpdates === 'string'
                ? {
                    name: nameOrUpdates,
                    documentIds: documentIds ?? existingWare.documentIds,
                    color
                }
                : nameOrUpdates;
            const updatedWare: Ware = {
                ...existingWare,
                ...updates,
                name: updates.name ?? existingWare.name,
                documentIds: updates.documentIds ?? existingWare.documentIds,
                color: updates.color !== undefined ? updates.color : existingWare.color,
                updatedAt: updates.updatedAt ?? Date.now()
            };

            const putRequest = store.put(updatedWare);
            putRequest.onsuccess = () => resolve(updatedWare);
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
};

/**
 * Get all WARES
 */
export const getAllWares = async (): Promise<Ware[]> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const wares = request.result as Ware[];
            // Sort by most recently updated
            wares.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(wares);
        };
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get a specific WARE by ID
 */
export const getWare = async (id: string): Promise<Ware | null> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Delete a WARE
 */
export const deleteWare = async (id: string): Promise<void> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
