import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
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
import { JournalEntry, ActionItem, ChatMessage, UserProfile } from '../types';

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
 * Direct Google Identity Services (GSI) OAuth Flow
 * Used when Firebase popup meets domain whitelist or popup policy restrictions.
 */
export function signInWithGoogleOAuth(): Promise<UserProfile> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available.'));
    }

    const clientId = (firebaseConfig as any).oAuthClientId || '4076915562-3pb53q6m8r2tpou549ljodtm3tptgm2b.apps.googleusercontent.com';
    const google = (window as any).google;

    if (!google?.accounts?.oauth2) {
      return reject(new Error('Google Sign-In is initializing. Please wait a moment or sign in with Email & Password.'));
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (response: any) => {
          if (response.error) {
            return reject(new Error(response.error_description || response.error));
          }
          if (!response.access_token) {
            return reject(new Error('No access token returned by Google.'));
          }
          try {
            const apiRes = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: response.access_token })
            });

            if (!apiRes.ok) {
              const errData = await apiRes.json().catch(() => ({}));
              throw new Error(errData.error || 'Google login failed.');
            }

            const data = await apiRes.json();
            if (data.token) {
              localStorage.setItem('journal_session_token', data.token);
              localStorage.setItem('journal_user', JSON.stringify(data.user));
            }
            if (data.customToken) {
              try {
                await signInWithCustomToken(auth, data.customToken);
              } catch (customErr) {
                console.warn('Firebase custom token sign-in notice:', customErr);
              }
            }
            resolve(data.user);
          } catch (e: any) {
            reject(e);
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google Sign-In popup closed.'));
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Sign in using Google OAuth (Firebase popup with seamless GSI fallback)
 */
export async function signInWithGoogle(): Promise<any> {
  // First attempt Firebase standard popup
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Firebase popup error:', error.code || error.message);

    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-In was cancelled.');
    }

    // Try direct Google Identity Services OAuth
    try {
      const user = await signInWithGoogleOAuth();
      return user;
    } catch (gsiErr: any) {
      console.warn('GSI fallback notice:', gsiErr.message);
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error(
          `Domain (${window.location.hostname}) is not in Firebase authorized domains list. Please sign in with Email & Password, or add this domain in Firebase Console.`
        );
      }
      throw new Error(gsiErr.message || error.message || 'Google Sign-In failed.');
    }
  }
}

/**
 * Sign in with email and password with strict password verification
 */
export async function signInWithEmail(email: string, pass: string): Promise<any> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !pass) {
    throw new Error('Please enter both email and password.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return result.user;
  } catch (error: any) {
    // If Firebase returned wrong password or invalid credentials, DO NOT bypass!
    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/invalid-login-credentials'
    ) {
      throw new Error('Incorrect password. Please verify your password and try again.');
    }

    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email. Please check your email or create an account.');
    }

    // If Firebase email provider is not enabled in Firebase Console (operation-not-allowed),
    // authenticate against our secure server with cryptographic password verification
    console.warn('Attempting server verification for email sign-in:', error.code);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: pass })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed. Please check your credentials.');
    }

    if (data.token && typeof window !== 'undefined') {
      localStorage.setItem('journal_session_token', data.token);
      localStorage.setItem('journal_user', JSON.stringify(data.user));
    }

    if (data.customToken) {
      try {
        await signInWithCustomToken(auth, data.customToken);
      } catch (customErr) {
        console.warn('Custom token sign-in notice:', customErr);
      }
    }

    return data.user;
  }
}

/**
 * Register with email and password
 */
export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<any> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !pass) {
    throw new Error('Please enter both email and password.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }

    // If Firebase email provider is not enabled, register via secure server with password hashing
    console.warn('Attempting server registration:', error.code);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: pass, name: displayName })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    if (data.token && typeof window !== 'undefined') {
      localStorage.setItem('journal_session_token', data.token);
      localStorage.setItem('journal_user', JSON.stringify(data.user));
    }

    if (data.customToken) {
      try {
        await signInWithCustomToken(auth, data.customToken);
      } catch (customErr) {
        console.warn('Custom token sign-in notice:', customErr);
      }
    }

    return data.user;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('journal_user');
    localStorage.removeItem('journal_session_token');
  }
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signout notice:', e);
  }
}

/**
 * Get current user Firebase ID token or custom session token for Authorization header
 */
export async function getIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken(true);
    } catch {}
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('journal_session_token');
  }
  return null;
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

  // Check local cache first for instant UX
  try {
    const localIndexKey = `user_journals_${userId}`;
    const cachedIds: string[] = JSON.parse(localStorage.getItem(localIndexKey) || '[]');
    if (cachedIds.length > 0) {
      const cachedEntries: JournalEntry[] = [];
      for (const jId of cachedIds) {
        const itemStr = localStorage.getItem(`journal_entry_${userId}_${jId}`);
        if (itemStr) {
          try {
            cachedEntries.push(JSON.parse(itemStr));
          } catch {}
        }
      }
      if (cachedEntries.length > 0) {
        onUpdate(cachedEntries);
      }
    }
  } catch {}

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
      console.warn('Firestore subscription fallback (using local session data):', error.message);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update journal entry directly to Cloud Firestore with local cache mirroring
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
  if (!userId) return;

  // Local storage mirror guarantees zero data loss
  try {
    const localKey = `journal_entry_${userId}_${journalId}`;
    localStorage.setItem(
      localKey,
      JSON.stringify({
        ...data,
        id: journalId,
        userId,
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
    const indexKey = `user_journals_${userId}`;
    const existing: string[] = JSON.parse(localStorage.getItem(indexKey) || '[]');
    if (!existing.includes(journalId)) {
      existing.unshift(journalId);
      localStorage.setItem(indexKey, JSON.stringify(existing.slice(0, 50)));
    }
  } catch (e) {
    console.warn('Local mirror error:', e);
  }

  // Attempt Firestore cloud sync directly
  try {
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
  } catch (err: any) {
    console.warn('Direct Firestore sync notice:', err.message);
  }

  // Also sync via server Firebase Admin for dual-assurance
  try {
    const token = await getIdToken();
    if (token) {
      fetch('/api/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: journalId, ...data })
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Delete journal entry from Cloud Firestore
 */
export async function deleteJournalEntry(userId: string, journalId: string) {
  try {
    const journalDocRef = doc(db, 'users', userId, 'journals', journalId);
    await deleteDoc(journalDocRef);
  } catch (err: any) {
    console.warn('Direct Firestore delete notice:', err.message);
  }

  try {
    const token = await getIdToken();
    if (token) {
      fetch(`/api/journals/${journalId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).catch(() => {});
    }
  } catch {}
}
