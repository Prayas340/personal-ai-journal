import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  salt: string;
  passwordHash: string;
  provider: 'password' | 'google';
  createdAt: string;
  updatedAt: string;
}

// In-memory cache + file sync
const memoryUsers = new Map<string, StoredUser>();

// Find a writable storage file path
function getStoragePath(): string {
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'users.json');
  } catch {
    return path.join('/tmp', 'journal_users.json');
  }
}

// Load users on startup
function loadUsers(): void {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data: StoredUser[] = JSON.parse(raw);
      for (const u of data) {
        memoryUsers.set(u.email.toLowerCase(), u);
      }
    }
  } catch (err) {
    console.warn('[AuthStore] Could not load users from file:', err);
  }
}

// Save users to file
function persistUsers(): void {
  try {
    const filePath = getStoragePath();
    const data = Array.from(memoryUsers.values());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AuthStore] Could not persist users to file:', err);
  }
}

// Initialize on load
loadUsers();

/**
 * Hash a plain password with salt using standard scrypt
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Verify password against stored salt and hash using timing-safe comparison
 */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const calculatedHash = hashPassword(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Register a new user with email and password
 */
export function registerUser(email: string, password: string, displayName?: string): StoredUser {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (memoryUsers.has(cleanEmail)) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const safeName = (displayName || '').trim() || cleanEmail.split('@')[0];
  const uid = `usr_${crypto.randomBytes(8).toString('hex')}`;

  const newUser: StoredUser = {
    uid,
    email: cleanEmail,
    displayName: safeName.charAt(0).toUpperCase() + safeName.slice(1),
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(safeName)}&backgroundColor=4f46e5`,
    salt,
    passwordHash,
    provider: 'password',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memoryUsers.set(cleanEmail, newUser);
  persistUsers();
  return newUser;
}

/**
 * Authenticate an existing user with email and password
 */
export function authenticateUser(email: string, password: string): StoredUser {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Email is required.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }

  const user = memoryUsers.get(cleanEmail);
  if (!user) {
    throw new Error('No account found with this email. Please check your email or register.');
  }

  if (user.provider === 'google' && !user.passwordHash) {
    throw new Error('This account was created with Google Sign-In. Please click Continue with Google.');
  }

  const isValid = verifyPassword(password, user.salt, user.passwordHash);
  if (!isValid) {
    throw new Error('Incorrect password. Please verify your password and try again.');
  }

  return user;
}

/**
 * Find or create a user via Google OAuth (ID token or access token)
 */
export async function authenticateGoogleUser(token: string): Promise<StoredUser> {
  let googleEmail = '';
  let googleName = '';
  let googlePicture = '';

  // Try Google ID Token verification first
  try {
    const idRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (idRes.ok) {
      const idData = await idRes.json();
      if (idData.email) {
        googleEmail = idData.email.toLowerCase();
        googleName = idData.name || idData.given_name || googleEmail.split('@')[0];
        googlePicture = idData.picture || '';
      }
    }
  } catch {}

  // If not ID token, try Google userinfo via Access Token
  if (!googleEmail) {
    try {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.email) {
          googleEmail = infoData.email.toLowerCase();
          googleName = infoData.name || infoData.given_name || googleEmail.split('@')[0];
          googlePicture = infoData.picture || '';
        }
      }
    } catch {}
  }

  if (!googleEmail) {
    throw new Error('Invalid or expired Google authentication token.');
  }

  let user = memoryUsers.get(googleEmail);
  if (!user) {
    // Create new user for Google sign-in
    const uid = `usr_g_${crypto.randomBytes(8).toString('hex')}`;
    user = {
      uid,
      email: googleEmail,
      displayName: googleName || googleEmail.split('@')[0],
      photoURL: googlePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName || googleEmail)}&backgroundColor=4f46e5`,
      salt: '',
      passwordHash: '',
      provider: 'google',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryUsers.set(googleEmail, user);
    persistUsers();
  } else {
    // Update profile image if present
    if (googlePicture && user.photoURL !== googlePicture) {
      user.photoURL = googlePicture;
      user.updatedAt = new Date().toISOString();
      persistUsers();
    }
  }

  return user;
}

/**
 * Generate a cryptographically secure session token
 */
export function createSessionToken(user: StoredUser): string {
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  return `session-token-${user.uid}-${Date.now()}-${randomSuffix}`;
}

/**
 * Get user by UID
 */
export function getUserByUid(uid: string): StoredUser | null {
  for (const user of memoryUsers.values()) {
    if (user.uid === uid) return user;
  }
  return null;
}
