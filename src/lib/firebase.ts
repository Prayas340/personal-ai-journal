import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry, ActionItem, ChatMessage } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific provisioned databaseId
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Firebase Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

/**
 * Register with email and password
 */
export async function registerWithEmail(email: string, pass: string) {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  return result.user;
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  return await signOut(auth);
}

/**
 * Get current user Firebase ID token for Authorization header
 */
export async function getIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return await currentUser.getIdToken(true);
}

/**
 * Real-time listener for user's isolated Firestore journals
 * Path: users/{userId}/journals/{journalId}
 */
export function subscribeToUserJournals(
  userId: string,
  onUpdate: (journals: JournalEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const journalsRef = collection(db, 'users', userId, 'journals');
  const q = query(journalsRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId,
          title: data.title || 'Untitled Session',
          messages: data.messages || [],
          summary: data.summary || '',
          tags: data.tags || [],
          actionItems: data.actionItems || [],
          sentiment: data.sentiment || 'Focused',
          sentimentScore: data.sentimentScore ?? 0.8,
          timestamp: data.timestamp ? data.timestamp.toDate?.() || data.timestamp : new Date().toISOString(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate?.() || data.updatedAt : undefined
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update journal entry directly to Cloud Firestore
 * Path: users/{userId}/journals/{journalId}
 */
export async function saveJournalEntry(
  userId: string,
  journalId: string,
  data: {
    title: string;
    messages: ChatMessage[];
    summary: string;
    tags: string[];
    actionItems?: ActionItem[];
    sentiment?: string;
    sentimentScore?: number;
  }
) {
  const journalDocRef = doc(db, 'users', userId, 'journals', journalId);
  await setDoc(
    journalDocRef,
    {
      ...data,
      userId,
      timestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/**
 * Delete journal entry from Cloud Firestore
 */
export async function deleteJournalEntry(userId: string, journalId: string) {
  const journalDocRef = doc(db, 'users', userId, 'journals', journalId);
  await deleteDoc(journalDocRef);
}
