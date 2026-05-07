import { Platform } from 'react-native';

const TOKEN_KEY = 'jales_auth_token';

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

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  const SecureStore = await getSecureStore();
  try {
    if (!SecureStore) return null;
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token ?? null;
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const SecureStore = await getSecureStore();
  try {
    if (!SecureStore) return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

