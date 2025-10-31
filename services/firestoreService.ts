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

// Save document to Firestore
export const saveDocumentToFirestore = async (userId: string, document: SavedDocument): Promise<void> => {
  try {
    console.log('Firestore save attempt:', { userId, documentId: document.id, documentName: document.name });
    const docRef = doc(db, DOCUMENTS_COLLECTION, document.id);
    const data = {
      ...document,
      userId,
      lastModified: Timestamp.fromMillis(document.lastModified || document.updatedAt || Date.now()),
      createdAt: Timestamp.now()
    };
    console.log('Firestore data to save:', data);
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
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing document:', doc.id, data.name);
      documents.push({
        id: doc.id,
        name: data.name,
        content: data.content,
        lastModified: data.lastModified.toMillis(),
        wordCount: data.wordCount
      });
    });
    
    console.log('Final documents array:', documents);
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
      await setDoc(docRef, {
        ...docSnap.data(),
        ...updates,
        lastModified: Timestamp.fromMillis(updates.lastModified || Date.now())
      });
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

