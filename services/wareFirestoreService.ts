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
import { Ware } from './wareStorage';

// Firestore collection name
const WARES_COLLECTION = 'wares';

// Save WARE to Firestore
export const saveWareToFirestore = async (userId: string, ware: Ware): Promise<void> => {
  try {
    const docRef = doc(db, WARES_COLLECTION, ware.id);
    const data = {
      ...ware,
      userId,
      updatedAt: Timestamp.fromMillis(ware.updatedAt),
      createdAt: Timestamp.fromMillis(ware.createdAt)
    };
    await setDoc(docRef, data);
  } catch (error) {
    console.error('Error saving WARE to Firestore:', error);
    throw error;
  }
};

// Helper function to safely convert Firestore Timestamp to milliseconds
const toMillis = (timestamp: any): number => {
  if (!timestamp) return Date.now();
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (timestamp.seconds) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  return Date.now();
};

// Get a single WARE from Firestore
export const getWareFromFirestore = async (userId: string, wareId: string): Promise<Ware | null> => {
  try {
    const docRef = doc(db, WARES_COLLECTION, wareId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().userId === userId) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        documentIds: data.documentIds || [],
        color: data.color || 'purple',
        createdAt: toMillis(data.createdAt),
        updatedAt: toMillis(data.updatedAt)
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting WARE from Firestore:', error);
    throw error;
  }
};

// Get all WARES for a user from Firestore
export const getAllWaresFromFirestore = async (userId: string): Promise<Ware[]> => {
  try {
    // Try with orderBy first (requires index)
    let q;
    try {
      q = query(
        collection(db, WARES_COLLECTION),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const wares: Ware[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        wares.push({
          id: doc.id,
          name: data.name,
          documentIds: data.documentIds || [],
          color: data.color || 'purple',
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt)
        });
      });
      
      // Sort manually if needed (already sorted by query, but just in case)
      return wares.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (indexError: any) {
      // If index error, fallback to query without orderBy and sort in memory
      if (indexError.message && indexError.message.includes('index')) {
        console.log('Index not ready, using fallback query without orderBy');
        q = query(
          collection(db, WARES_COLLECTION),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        const wares: Ware[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          wares.push({
            id: doc.id,
            name: data.name,
            documentIds: data.documentIds || [],
            color: data.color || 'purple',
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt)
          });
        });
        
        // Sort by updatedAt descending in memory
        return wares.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      throw indexError;
    }
  } catch (error) {
    console.error('Error getting WARES from Firestore:', error);
    throw error;
  }
};

// Update WARE in Firestore
export const updateWareInFirestore = async (userId: string, wareId: string, updates: Partial<Ware>): Promise<void> => {
  try {
    const docRef = doc(db, WARES_COLLECTION, wareId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().userId === userId) {
      const updateData: any = {
        ...docSnap.data(),
        ...updates
      };
      
      // Convert updatedAt to Timestamp if it's a number
      if (updateData.updatedAt && typeof updateData.updatedAt === 'number') {
        updateData.updatedAt = Timestamp.fromMillis(updateData.updatedAt);
      } else if (!updateData.updatedAt) {
        updateData.updatedAt = Timestamp.now();
      }
      
      // Preserve createdAt as Timestamp if it exists
      if (updateData.createdAt && typeof updateData.createdAt === 'number') {
        updateData.createdAt = Timestamp.fromMillis(updateData.createdAt);
      }
      
      await setDoc(docRef, updateData);
    } else {
      throw new Error('WARE not found or access denied');
    }
  } catch (error) {
    console.error('Error updating WARE in Firestore:', error);
    throw error;
  }
};

// Delete WARE from Firestore
export const deleteWareFromFirestore = async (userId: string, wareId: string): Promise<void> => {
  try {
    const docRef = doc(db, WARES_COLLECTION, wareId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().userId === userId) {
      await deleteDoc(docRef);
    } else {
      throw new Error('WARE not found or access denied');
    }
  } catch (error) {
    console.error('Error deleting WARE from Firestore:', error);
    throw error;
  }
};

