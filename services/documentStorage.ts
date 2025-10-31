/**
 * Local Document Storage Service
 * Manages saving and loading documents with IndexedDB
 */

export interface SavedDocument {
    id: string;
    name: string;
    content: string;
    createdAt?: number;
    updatedAt?: number;
    lastModified?: number;
    wordCount: number;
}

const DB_NAME = 'AINoteTakerDB';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
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
 * Save a document
 */
export const saveDocument = async (name: string, content: string): Promise<SavedDocument> => {
    const database = await initDB();
    
    // Count words
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = tempDiv.textContent || '';
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    const now = Date.now();
    const doc: SavedDocument = {
        id: `doc_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        content,
        createdAt: now,
        updatedAt: now,
        wordCount
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(doc);

        request.onsuccess = () => resolve(doc);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Update an existing document
 */
export const updateDocument = async (id: string, name: string, content: string): Promise<SavedDocument> => {
    const database = await initDB();
    
    // Count words
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = tempDiv.textContent || '';
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const existingDoc = getRequest.result;
            const updatedDoc: SavedDocument = {
                ...existingDoc,
                name,
                content,
                updatedAt: Date.now(),
                wordCount
            };

            const putRequest = store.put(updatedDoc);
            putRequest.onsuccess = () => resolve(updatedDoc);
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
};

/**
 * Get all saved documents
 */
export const getAllDocuments = async (): Promise<SavedDocument[]> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const docs = request.result as SavedDocument[];
            // Sort by most recently updated
            docs.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(docs);
        };
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get a specific document by ID
 */
export const getDocument = async (id: string): Promise<SavedDocument | null> => {
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
 * Delete a document
 */
export const deleteDocument = async (id: string): Promise<void> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Store current document ID in localStorage
 */
export const setCurrentDocumentId = (id: string | null) => {
    if (id) {
        localStorage.setItem('current_document_id', id);
    } else {
        localStorage.removeItem('current_document_id');
    }
};

/**
 * Get current document ID from localStorage
 */
export const getCurrentDocumentId = (): string | null => {
    return localStorage.getItem('current_document_id');
};

