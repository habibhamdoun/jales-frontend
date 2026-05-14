import { Platform } from 'react-native';

const VIBRATION_INTENSITY_KEY = 'jales_vibration_intensity_percent';
export const DEFAULT_VIBRATION_INTENSITY = 50;

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
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    return;
  }

  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  await SecureStore.setItemAsync(key, value);
}

const clampPercent = (n: number): number =>
  Math.max(0, Math.min(100, Math.round(n)));

export async function getStoredVibrationIntensity(): Promise<number> {
  try {
    const raw = await readKey(VIBRATION_INTENSITY_KEY);
    if (raw == null || raw === '') return DEFAULT_VIBRATION_INTENSITY;
    const n = Number(raw);
    return Number.isFinite(n) ? clampPercent(n) : DEFAULT_VIBRATION_INTENSITY;
  } catch {
    return DEFAULT_VIBRATION_INTENSITY;
  }
}

export async function setStoredVibrationIntensity(percent: number): Promise<void> {
  const v = clampPercent(percent);
  await writeKey(VIBRATION_INTENSITY_KEY, String(v));
}
