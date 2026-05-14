import { apiFetch, ApiError } from '@/src/services/api';
import type { BnoData, MpuData } from '@/src/utils/bleParsers';
import { shoulderElevationAtan2Deg } from '@/src/utils/calibrationNeutral';

export { isActiveSessionCalibrationError } from '@/src/services/postureCalibration';

/** One BNO row for server logs / optional persistence (matches PUT baseline_samples shape). */
export type BaselineBnoWireSample = {
  t_ms: number;
  pitch: number;
  heading: number;
  roll: number;
};

/** Body for PUT /user/calibration — all fields optional for merge; never send user_id. */
export type UserCalibrationPutBody = Partial<{
  back_baseline_pitch: number;
  left_shoulder_baseline: number;
  right_shoulder_baseline: number;
  back_threshold: number;
  shoulder_threshold: number;
  /** Raw BNO timeline during ~10s capture (server may log; optional DB fields). */
  baseline_samples?: BaselineBnoWireSample[];
  baseline_capture_started_at?: string;
  baseline_capture_ended_at?: string;
}>;

export type UserCalibrationRecord = UserCalibrationPutBody & {
  [key: string]: unknown;
};

export type PutUserCalibrationResponse = {
  calibration: unknown;
  thresholdsSynced: boolean;
};

export type GetUserCalibrationResponse = {
  calibration: UserCalibrationRecord | null;
};

export type DeleteUserCalibrationResponse = {
  clearLocalCalibrationCache?: boolean;
};

function unwrapDataRecord(data: unknown): Record<string, unknown> {
  const root = (data ?? {}) as Record<string, unknown>;
  const inner =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  return inner;
}

function innerLooksLikeCalibrationRow(inner: Record<string, unknown>): boolean {
  return (
    inner.back_baseline_pitch != null ||
    inner.left_shoulder_baseline != null ||
    inner.right_shoulder_baseline != null ||
    inner.back_threshold != null ||
    inner.shoulder_threshold != null ||
    inner.backBaselinePitch != null ||
    (Array.isArray(inner.baseline_samples) && inner.baseline_samples.length > 0)
  );
}

function pickCalibration(inner: Record<string, unknown>): unknown {
  if (inner.calibration !== undefined && inner.calibration !== null)
    return inner.calibration;
  if (innerLooksLikeCalibrationRow(inner)) return inner;
  return null;
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Normalize server calibration row for UI / gating. */
export function normalizeUserCalibrationRecord(raw: unknown): UserCalibrationRecord | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const back = toFiniteNumber(
    o.back_baseline_pitch ?? o.backBaselinePitch,
  );
  const left = toFiniteNumber(
    o.left_shoulder_baseline ?? o.leftShoulderBaseline,
  );
  const right = toFiniteNumber(
    o.right_shoulder_baseline ?? o.rightShoulderBaseline,
  );
  const backT = toFiniteNumber(o.back_threshold ?? o.backThreshold);
  const shoulderT = toFiniteNumber(o.shoulder_threshold ?? o.shoulderThreshold);

  const out: UserCalibrationRecord = { ...o };
  if (back != null) out.back_baseline_pitch = back;
  if (left != null) out.left_shoulder_baseline = left;
  if (right != null) out.right_shoulder_baseline = right;
  if (backT != null) out.back_threshold = backT;
  if (shoulderT != null) out.shoulder_threshold = shoulderT;

  if (Array.isArray(o.baseline_samples)) {
    const cleaned: BaselineBnoWireSample[] = [];
    for (const row of o.baseline_samples) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const t_ms = toFiniteNumber(r.t_ms);
      const pitch = toFiniteNumber(r.pitch);
      const heading = toFiniteNumber(r.heading);
      const roll = toFiniteNumber(r.roll);
      if (t_ms == null || pitch == null || heading == null || roll == null) continue;
      cleaned.push({ t_ms, pitch, heading, roll });
    }
    if (cleaned.length > 0) out.baseline_samples = cleaned;
  }

  const capStart =
    o.baseline_capture_started_at ?? o.baselineCaptureStartedAt;
  if (typeof capStart === 'string' && capStart.length > 0) {
    out.baseline_capture_started_at = capStart;
  }
  const capEnd = o.baseline_capture_ended_at ?? o.baselineCaptureEndedAt;
  if (typeof capEnd === 'string' && capEnd.length > 0) {
    out.baseline_capture_ended_at = capEnd;
  }

  const hasAnyBaseline =
    back != null || left != null || right != null;
  const hasAnyThreshold =
    backT != null || shoulderT != null;
  delete (out as Record<string, unknown>).neck_baseline_pitch;
  delete (out as Record<string, unknown>).neckBaselinePitch;
  delete (out as Record<string, unknown>).neck_threshold;
  delete (out as Record<string, unknown>).neckThreshold;
  if (!hasAnyBaseline && !hasAnyThreshold) return null;
  return out;
}

export function hasAveragedBaselineNumbers(body: UserCalibrationPutBody | null): boolean {
  if (!body) return false;
  return (
    body.back_baseline_pitch != null ||
    body.left_shoulder_baseline != null ||
    body.right_shoulder_baseline != null
  );
}

/**
 * True when `user_calibration` has at least one saved numeric baseline
 * (upper back pitch and/or shoulder atan2 angles). Used to enable monitoring
 * and to prefer user calibration over per-device posture_calibration on the client.
 */
export function hasUserCalibrationBaselines(row: UserCalibrationRecord | null): boolean {
  if (!row) return false;
  const back = toFiniteNumber(row.back_baseline_pitch ?? row.backBaselinePitch);
  const left = toFiniteNumber(row.left_shoulder_baseline ?? row.leftShoulderBaseline);
  const right = toFiniteNumber(row.right_shoulder_baseline ?? row.rightShoulderBaseline);
  return back != null || left != null || right != null;
}

export async function getUserCalibration(
  token: string,
): Promise<GetUserCalibrationResponse> {
  try {
    const { data } = await apiFetch<unknown>('/user/calibration', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const inner = unwrapDataRecord(data);
    const rawCal = pickCalibration(inner);
    const normalized =
      rawCal == null ? null : normalizeUserCalibrationRecord(rawCal);
    return {
      calibration: normalized,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return { calibration: null };
    }
    throw e;
  }
}

export async function putUserCalibration(
  token: string,
  body: UserCalibrationPutBody,
): Promise<PutUserCalibrationResponse> {
  const { data } = await apiFetch<unknown>('/user/calibration', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const inner = unwrapDataRecord(data);
  const cal = pickCalibration(inner);
  const thresholdsSynced = Boolean(
    inner.thresholdsSynced ?? inner.thresholds_synced,
  );
  return {
    calibration: cal ?? inner,
    thresholdsSynced,
  };
}

export async function deleteUserCalibration(
  token: string,
): Promise<DeleteUserCalibrationResponse> {
  const { data } = await apiFetch<unknown>('/user/calibration', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const obj = unwrapDataRecord(data);
  return {
    clearLocalCalibrationCache:
      obj.clearLocalCalibrationCache === true ||
      obj.clear_local_calibration_cache === true,
  };
}

export type BaselineSample = {
  back_baseline_pitch: number;
  left_shoulder_baseline: number;
  right_shoulder_baseline: number;
};

/**
 * One reading for the ~10s average flow. Maps sensors to API baseline fields:
 * back_baseline_pitch → BNO pitch (shirt BNO = upper-back / trunk lean); shoulders → atan2(Ay,Az) on MPU1/MPU2.
 */
export function sampleBaselinesFromSensors(
  bno: BnoData,
  mpu1: MpuData,
  mpu2: MpuData,
): BaselineSample {
  return {
    back_baseline_pitch: bno.pitch,
    left_shoulder_baseline: shoulderElevationAtan2Deg(mpu1.ay, mpu1.az),
    right_shoulder_baseline: shoulderElevationAtan2Deg(mpu2.ay, mpu2.az),
  };
}

export function averageBaselineSamples(samples: BaselineSample[]): UserCalibrationPutBody {
  if (samples.length === 0) return {};
  const n = samples.length;
  const sum = samples.reduce(
    (acc, s) => ({
      back_baseline_pitch: acc.back_baseline_pitch + s.back_baseline_pitch,
      left_shoulder_baseline: acc.left_shoulder_baseline + s.left_shoulder_baseline,
      right_shoulder_baseline: acc.right_shoulder_baseline + s.right_shoulder_baseline,
    }),
    {
      back_baseline_pitch: 0,
      left_shoulder_baseline: 0,
      right_shoulder_baseline: 0,
    },
  );
  return {
    back_baseline_pitch: Math.round((sum.back_baseline_pitch / n) * 1000) / 1000,
    left_shoulder_baseline: Math.round((sum.left_shoulder_baseline / n) * 1000) / 1000,
    right_shoulder_baseline: Math.round((sum.right_shoulder_baseline / n) * 1000) / 1000,
  };
}
