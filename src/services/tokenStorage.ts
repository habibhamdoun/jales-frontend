import { Platform } from 'react-native';
import type { AuthUser } from '@/src/auth/AuthContext';
import type { RulaEvaluation } from '@/src/services/posture';

const TOKEN_KEY = 'jales_auth_token';
const USER_KEY = 'jales_auth_user';
const LAST_EVAL_KEY = 'last_posture_result';

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

// Persist the most recent scored RULA evaluation so the home screen can
// rehydrate it on app launch. SecureStore is used as the storage backend
// because it's the only KV store already in the native binary; the payload
// is well under SecureStore's per-entry size limit.
export async function getStoredLastEvaluation(): Promise<RulaEvaluation | null> {
  const raw = await readKey(LAST_EVAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RulaEvaluation;
  } catch {
    return null;
  }
}

export async function setStoredLastEvaluation(
  evaluation: RulaEvaluation,
): Promise<void> {
  await writeKey(LAST_EVAL_KEY, JSON.stringify(evaluation));
}

export async function clearStoredLastEvaluation(): Promise<void> {
  await deleteKey(LAST_EVAL_KEY);
}
