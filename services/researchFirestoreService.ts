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
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ResearchProject } from '../types';

const RESEARCH_COLLECTION = 'documents';

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

const projectFromFirestore = (id: string, data: any): ResearchProject => ({
  ...(data as ResearchProject),
  id,
  createdAt: toMillis(data.createdAt),
  updatedAt: toMillis(data.updatedAt),
});

// ─── Save (create) ────────────────────────────────────────────────────────────

export const saveResearchProjectToFirestore = async (
  userId: string,
  project: ResearchProject
): Promise<void> => {
  const docRef = doc(db, RESEARCH_COLLECTION, project.id);
  await setDoc(docRef, {
    ...project,
    userId,
    createdAt: Timestamp.fromMillis(project.createdAt),
    updatedAt: Timestamp.fromMillis(project.updatedAt),
  });
};

// ─── Get single ───────────────────────────────────────────────────────────────

export const getResearchProjectFromFirestore = async (
  userId: string,
  projectId: string
): Promise<ResearchProject | null> => {
  const docRef = doc(db, RESEARCH_COLLECTION, projectId);
  const snap = await getDoc(docRef);
  if (snap.exists() && snap.data().userId === userId) {
    return projectFromFirestore(snap.id, snap.data());
  }
  return null;
};

// ─── Get all for user ─────────────────────────────────────────────────────────

export const getAllResearchProjectsFromFirestore = async (
  userId: string
): Promise<ResearchProject[]> => {
  try {
    const q = query(
      collection(db, RESEARCH_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => projectFromFirestore(d.id, d.data()));
  } catch (err: any) {
    // Fallback when composite index not yet ready
    if (err?.message?.includes('index')) {
      const q = query(
        collection(db, RESEARCH_COLLECTION),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .filter(d => d.id.startsWith('rp_'))
        .map(d => projectFromFirestore(d.id, d.data()))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    throw err;
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateResearchProjectInFirestore = async (
  userId: string,
  projectId: string,
  updates: Partial<ResearchProject>
): Promise<void> => {
  const docRef = doc(db, RESEARCH_COLLECTION, projectId);
  const snap = await getDoc(docRef);
  if (!snap.exists() || snap.data().userId !== userId) {
    throw new Error('Research project not found or access denied');
  }
  const existing = snap.data();
  const merged: any = {
    ...existing,
    ...updates,
    updatedAt: Timestamp.now(),
  };
  if (merged.createdAt && typeof merged.createdAt === 'number') {
    merged.createdAt = Timestamp.fromMillis(merged.createdAt);
  }
  await setDoc(docRef, merged);
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteResearchProjectFromFirestore = async (
  userId: string,
  projectId: string
): Promise<void> => {
  const docRef = doc(db, RESEARCH_COLLECTION, projectId);
  const snap = await getDoc(docRef);
  if (!snap.exists() || snap.data().userId !== userId) {
    throw new Error('Research project not found or access denied');
  }
  await deleteDoc(docRef);
};
