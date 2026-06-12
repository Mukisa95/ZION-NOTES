/**
 * WARE (Folder) Storage Service
 * Manages saving and loading WARES with IndexedDB (unified DB via db.ts)
 */

import { getDB, STORE_WARES } from './db';

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

/**
 * Save a WARE
 */
export const saveWare = async (name: string, documentIds: string[] = [], color?: string): Promise<Ware> => {
    const database = await getDB();

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
        const transaction = database.transaction([STORE_WARES], 'readwrite');
        const store = transaction.objectStore(STORE_WARES);
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
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_WARES], 'readwrite');
        const store = transaction.objectStore(STORE_WARES);
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
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_WARES], 'readonly');
        const store = transaction.objectStore(STORE_WARES);
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
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_WARES], 'readonly');
        const store = transaction.objectStore(STORE_WARES);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Delete a WARE
 */
export const deleteWare = async (id: string): Promise<void> => {
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_WARES], 'readwrite');
        const store = transaction.objectStore(STORE_WARES);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Upsert a WARE (used when merging Firestore data locally)
 */
export const upsertWare = async (ware: Ware): Promise<void> => {
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_WARES], 'readwrite');
        const store = transaction.objectStore(STORE_WARES);
        const request = store.put(ware);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
