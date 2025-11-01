import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { SavedDocument } from './documentStorage';

// Firestore collection name
const DOCUMENTS_COLLECTION = 'documents';

// Firestore has a 1MB document size limit
const FIRESTORE_MAX_SIZE = 1048576; // 1MB in bytes
const CONTENT_MAX_SIZE = 900000; // Leave room for metadata (900KB)

// Calculate approximate size of data in bytes
const getDataSize = (data: any): number => {
  return new Blob([JSON.stringify(data)]).size;
};

// Compress large base64 images in HTML content
const compressContent = (html: string): string => {
  // Find all base64 images
  const imgRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"[^>]*>/g;
  let compressed = html;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const base64Data = match[1];
    // If image data is very large, replace with placeholder
    if (base64Data.length > 100000) { // ~75KB
      console.warn('Large image detected in document, replacing with placeholder');
      compressed = compressed.replace(
        match[0],
        '<p style="color: orange; font-style: italic;">⚠️ Large image removed to save to cloud. Please use smaller images or save locally.</p>'
      );
    }
  }
  
  return compressed;
};

// Save document to Firestore
export const saveDocumentToFirestore = async (userId: string, document: SavedDocument): Promise<void> => {
  try {
    console.log('Firestore save attempt:', { userId, documentId: document.id, documentName: document.name });
    
    // Check content size and compress if needed
    let content = document.content;
    const contentSize = new Blob([content]).size;
    
    if (contentSize > CONTENT_MAX_SIZE) {
      console.warn(`Document content size (${contentSize} bytes) exceeds safe limit. Compressing...`);
      content = compressContent(content);
      
      // Check again after compression
      const compressedSize = new Blob([content]).size;
      if (compressedSize > CONTENT_MAX_SIZE) {
        throw new Error(
          'Document is too large to save to cloud (>900KB). ' +
          'Please reduce document size, remove large images, or save locally instead. ' +
          `Current size: ${Math.round(compressedSize / 1024)}KB`
        );
      }
    }
    
    const docRef = doc(db, DOCUMENTS_COLLECTION, document.id);
    const data = {
      ...document,
      content, // Use potentially compressed content
      userId,
      lastModified: Timestamp.fromMillis(document.lastModified || document.updatedAt || Date.now()),
      createdAt: Timestamp.now()
    };
    
    // Final size check
    const dataSize = getDataSize(data);
    if (dataSize > FIRESTORE_MAX_SIZE) {
      throw new Error(
        'Document payload exceeds Firestore limit (1MB). ' +
        'Please reduce document size, remove images, or save locally. ' +
        `Current size: ${Math.round(dataSize / 1024)}KB`
      );
    }
    
    console.log('Firestore data to save:', { ...data, content: `${content.length} chars` });
    await setDoc(docRef, data);
    console.log('Firestore save successful');
  } catch (error) {
    console.error('Error saving document to Firestore:', error);
    throw error;
  }
};

// Get a single document from Firestore
export const getDocumentFromFirestore = async (userId: string, documentId: string): Promise<SavedDocument | null> => {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().userId === userId) {
      const data = docSnap.data();
      console.log('Retrieved document from Firestore:', documentId, 'Content preview:', data.content.substring(0, 100));
      return {
        id: docSnap.id,
        name: data.name,
        content: data.content,
        lastModified: data.lastModified.toMillis(),
        wordCount: data.wordCount
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting document from Firestore:', error);
    throw error;
  }
};

// Get all documents for a user from Firestore  
export const getAllDocumentsFromFirestore = async (userId: string): Promise<SavedDocument[]> => {
  try {
    console.log('Firestore query attempt for user:', userId);
    const q = query(
      collection(db, DOCUMENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('lastModified', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Firestore query result:', querySnapshot.size, 'documents found');
    
    const documents: SavedDocument[] = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      console.log('Processing document:', docSnapshot.id, data.name, 'Compressed:', data.content.startsWith('GZIP:') || data.content.startsWith('LZ:'));
      documents.push({
        id: docSnapshot.id,
        name: data.name,
        content: data.content,
        lastModified: data.lastModified.toMillis(),
        wordCount: data.wordCount
      });
    });
    
    console.log('Final documents array:', documents.length, 'documents');
    return documents;
  } catch (error) {
    console.error('Error getting documents from Firestore:', error);
    throw error;
  }
};

// Update document in Firestore
export const updateDocumentInFirestore = async (userId: string, documentId: string, updates: Partial<SavedDocument>): Promise<void> => {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().userId === userId) {
      // Check and compress content if it's being updated
      let processedUpdates = { ...updates };
      if (updates.content) {
        const contentSize = new Blob([updates.content]).size;
        
        if (contentSize > CONTENT_MAX_SIZE) {
          console.warn(`Document content size (${contentSize} bytes) exceeds safe limit. Compressing...`);
          processedUpdates.content = compressContent(updates.content);
          
          // Check again after compression
          const compressedSize = new Blob([processedUpdates.content]).size;
          if (compressedSize > CONTENT_MAX_SIZE) {
            throw new Error(
              'Document is too large to save to cloud (>900KB). ' +
              'Please reduce document size, remove large images, or save locally instead. ' +
              `Current size: ${Math.round(compressedSize / 1024)}KB`
            );
          }
        }
      }
      
      const dataToSave = {
        ...docSnap.data(),
        ...processedUpdates,
        lastModified: Timestamp.fromMillis(updates.lastModified || Date.now())
      };
      
      // Final size check
      const dataSize = getDataSize(dataToSave);
      if (dataSize > FIRESTORE_MAX_SIZE) {
        throw new Error(
          'Document payload exceeds Firestore limit (1MB). ' +
          'Please reduce document size, remove images, or save locally. ' +
          `Current size: ${Math.round(dataSize / 1024)}KB`
        );
      }
      
      await setDoc(docRef, dataToSave);
    } else {
      throw new Error('Document not found or access denied');
    }
  } catch (error) {
    console.error('Error updating document in Firestore:', error);
    throw error;
  }
};

// Delete document from Firestore
export const deleteDocumentFromFirestore = async (userId: string, documentId: string): Promise<void> => {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().userId === userId) {
      await deleteDoc(docRef);
    } else {
      throw new Error('Document not found or access denied');
    }
  } catch (error) {
    console.error('Error deleting document from Firestore:', error);
    throw error;
  }
};

