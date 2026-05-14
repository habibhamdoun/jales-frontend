import { Platform } from 'react-native';
import type {
  CalibrationNeutralSnapshot,
  ShoulderDualCapture,
} from '@/src/utils/calibrationNeutral';

const KEY = 'jales_calibration_neutral_snapshot_v1';

/** Persisted after successful POST /posture/calibrate (v2). */
export type CalibrationCacheEnvelope = {
  version: 2;
  registeredDeviceId: string;
  snapshot: CalibrationNeutralSnapshot;
  /** Raw calibration row/refs from the server (shape is backend-defined). */
  serverCalibration: unknown;
  serverUpdatedAt?: string;
  /**
   * Three shoulder poses (MPU1 left, MPU2 right) captured during calibration;
   * used client-side vs live atan2 during monitoring.
   */
  shoulderThreeStep?: {
    captures: ShoulderDualCapture[];
  };
};

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

function isValidSnapshot(parsed: unknown): parsed is CalibrationNeutralSnapshot {
  if (!parsed || typeof parsed !== 'object') return false;
  const o = parsed as Record<string, unknown>;
  if (typeof o.capturedAt !== 'number' || !Number.isFinite(o.capturedAt)) {
    return false;
  }
  const bno = o.bno as Record<string, unknown> | undefined;
  const m1 = o.mpu1 as Record<string, unknown> | undefined;
  const m2 = o.mpu2 as Record<string, unknown> | undefined;
  if (!bno || !m1 || !m2) return false;
  const nums = (x: Record<string, unknown>, keys: string[]) =>
    keys.every((k) => typeof x[k] === 'number' && Number.isFinite(x[k] as number));
  if (!nums(bno, ['heading', 'roll', 'pitch'])) return false;
  if (!nums(m1, ['ax', 'ay', 'az', 'gx', 'gy', 'gz'])) return false;
  if (!nums(m2, ['ax', 'ay', 'az', 'gx', 'gy', 'gz'])) return false;
  return true;
}

function isValidShoulderThreeStep(
  v: unknown,
): v is { captures: ShoulderDualCapture[] } {
  if (!v || typeof v !== 'object') return false;
  const cap = (v as { captures?: unknown }).captures;
  if (!Array.isArray(cap) || cap.length !== 3) return false;
  for (const row of cap) {
    if (!row || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    if (typeof r.leftDeg !== 'number' || !Number.isFinite(r.leftDeg)) return false;
    if (typeof r.rightDeg !== 'number' || !Number.isFinite(r.rightDeg)) return false;
  }
  return true;
}

function isEnvelope(parsed: unknown): parsed is CalibrationCacheEnvelope {
  if (!parsed || typeof parsed !== 'object') return false;
  const o = parsed as Record<string, unknown>;
  if (o.version !== 2) return false;
  if (typeof o.registeredDeviceId !== 'string' || o.registeredDeviceId === '') {
    return false;
  }
  if (!isValidSnapshot(o.snapshot)) return false;
  if (!('serverCalibration' in o)) return false;
  if (
    o.shoulderThreeStep !== undefined &&
    !isValidShoulderThreeStep(o.shoulderThreeStep)
  ) {
    return false;
  }
  return true;
}

export type LoadedCalibrationStore =
  | { kind: 'envelope'; envelope: CalibrationCacheEnvelope }
  | { kind: 'legacy'; snapshot: CalibrationNeutralSnapshot };

export async function loadCalibrationStore(): Promise<LoadedCalibrationStore | null> {
  try {
    const raw = await readKey(KEY);
    if (raw == null || raw === '') return null;
    const parsed: unknown = JSON.parse(raw);
    if (isEnvelope(parsed)) {
      return { kind: 'envelope', envelope: parsed };
    }
    if (isValidSnapshot(parsed)) {
      return { kind: 'legacy', snapshot: parsed };
    }
    return null;
  } catch {
    return null;
  }
}

/** Snapshot for BLE UI / trunk reference (legacy or envelope). */
export async function loadCalibrationSnapshot(): Promise<CalibrationNeutralSnapshot | null> {
  const row = await loadCalibrationStore();
  if (!row) return null;
  if (row.kind === 'legacy') return row.snapshot;
  return row.envelope.snapshot;
}

export async function loadCalibrationRegisteredDeviceId(): Promise<string | null> {
  const row = await loadCalibrationStore();
  if (!row || row.kind === 'legacy') return null;
  return row.envelope.registeredDeviceId;
}

export async function saveCalibrationEnvelope(
  envelope: CalibrationCacheEnvelope,
): Promise<void> {
  await writeKey(KEY, JSON.stringify(envelope));
}

/** @deprecated Prefer saveCalibrationEnvelope after server POST. */
export async function saveCalibrationSnapshot(
  snapshot: CalibrationNeutralSnapshot,
): Promise<void> {
  await writeKey(KEY, JSON.stringify(snapshot));
}

export async function clearCalibrationSnapshot(): Promise<void> {
  await deleteKey(KEY);
}

export async function loadShoulderThreeStepCaptures(): Promise<
  ShoulderDualCapture[] | null
> {
  const row = await loadCalibrationStore();
  if (row?.kind !== 'envelope') return null;
  const s = row.envelope.shoulderThreeStep?.captures;
  if (Array.isArray(s) && isValidShoulderThreeStep({ captures: s })) {
    return s as ShoulderDualCapture[];
  }
  return null;
}

function readFinite(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** If the server embeds raw frames on the calibration row, map them into our snapshot shape. */
export function tryUnknownToCalibrationSnapshot(
  cal: unknown,
): CalibrationNeutralSnapshot | null {
  if (!cal || typeof cal !== 'object' || Array.isArray(cal)) return null;
  const root = cal as Record<string, unknown>;
  const bno = root.bno as Record<string, unknown> | undefined;
  const m1 = (root.mpu1 ?? root.Mpu1) as Record<string, unknown> | undefined;
  const m2 = (root.mpu2 ?? root.Mpu2) as Record<string, unknown> | undefined;
  if (!bno || !m1 || !m2) return null;
  const heading = readFinite(bno, 'heading');
  const roll = readFinite(bno, 'roll');
  const pitch = readFinite(bno, 'pitch');
  if (heading == null || roll == null || pitch == null) return null;
  const mpu = (m: Record<string, unknown>) => {
    const ax = readFinite(m, 'ax', 'Ax');
    const ay = readFinite(m, 'ay', 'Ay');
    const az = readFinite(m, 'az', 'Az');
    const gx = readFinite(m, 'gx', 'Gx');
    const gy = readFinite(m, 'gy', 'Gy');
    const gz = readFinite(m, 'gz', 'Gz');
    if (
      ax == null ||
      ay == null ||
      az == null ||
      gx == null ||
      gy == null ||
      gz == null
    ) {
      return null;
    }
    return { ax, ay, az, gx, gy, gz };
  };
  const p1 = mpu(m1);
  const p2 = mpu(m2);
  if (!p1 || !p2) return null;
  return {
    bno: { heading, roll, pitch },
    mpu1: p1,
    mpu2: p2,
    capturedAt: Date.now(),
  };
}

/**
 * Persist server calibration metadata; keep or replace snapshot from server body or prior local row.
 */
export async function persistCalibrationFromServerGet(
  registeredDeviceId: string,
  serverCalibration: unknown,
): Promise<void> {
  const fromServer = tryUnknownToCalibrationSnapshot(serverCalibration);
  const local = await loadCalibrationStore();
  let snapshot: CalibrationNeutralSnapshot | null = fromServer;
  if (!snapshot && local?.kind === 'envelope') {
    if (local.envelope.registeredDeviceId === registeredDeviceId) {
      snapshot = local.envelope.snapshot;
    }
  }
  if (!snapshot && local?.kind === 'legacy') {
    snapshot = local.snapshot;
  }
  if (!snapshot) return;

  let shoulderThreeStep: CalibrationCacheEnvelope['shoulderThreeStep'] = undefined;
  if (
    local?.kind === 'envelope' &&
    local.envelope.registeredDeviceId === registeredDeviceId &&
    local.envelope.shoulderThreeStep &&
    isValidShoulderThreeStep(local.envelope.shoulderThreeStep)
  ) {
    shoulderThreeStep = local.envelope.shoulderThreeStep;
  }

  let serverUpdatedAt: string | undefined;
  if (serverCalibration && typeof serverCalibration === 'object' && !Array.isArray(serverCalibration)) {
    const o = serverCalibration as Record<string, unknown>;
    if (typeof o.updated_at === 'string') serverUpdatedAt = o.updated_at;
    else if (typeof o.updatedAt === 'string') serverUpdatedAt = o.updatedAt;
  }

  const envelope: CalibrationCacheEnvelope = {
    version: 2,
    registeredDeviceId,
    snapshot,
    serverCalibration,
    serverUpdatedAt,
    ...(shoulderThreeStep ? { shoulderThreeStep } : {}),
  };
  await saveCalibrationEnvelope(envelope);
}
