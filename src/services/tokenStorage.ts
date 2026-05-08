import { Platform } from 'react-native';
import type { AuthUser } from '@/src/auth/AuthContext';

const TOKEN_KEY = 'jales_auth_token';
const USER_KEY = 'jales_auth_user';

let cachedSecureStore:
  | typeof import('expo-secure-store')
  | null
  | undefined = undefined;

async function getSecureStore() {
  if (cachedSecureStore !== undefined) return cachedSecureStore;
  try {
    cachedSecureStore = await import('expo-secure-store');
  } catch {
    cachedSecureStore = null;
  }
  return cachedSecureStore;
}

async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  const SecureStore = await getSecureStore();
  try {
    if (!SecureStore) return null;
    const value = await SecureStore.getItemAsync(key);
    return value ?? null;
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }

  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  await SecureStore.setItemAsync(key, value);
}

async function deleteKey(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }

  const SecureStore = await getSecureStore();
  try {
    if (!SecureStore) return;
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

export async function getStoredToken(): Promise<string | null> {
  return readKey(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await writeKey(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await deleteKey(TOKEN_KEY);
  await deleteKey(USER_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await readKey(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: AuthUser): Promise<void> {
  await writeKey(USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser(): Promise<void> {
  await deleteKey(USER_KEY);
}
