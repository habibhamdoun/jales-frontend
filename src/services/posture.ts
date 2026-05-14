/**
 * Posture scoring is done on the server from raw BNO + MPU frames.
 * The client sends uncalibrated sensor packets on `/posture/evaluate` and `/readings`;
 * the backend loads `user_calibration` (preferred) or per-device `posture_calibration`,
 * derives relative trunk flexion and shoulder deviation, runs RULA-style part scores,
 * then optionally bumps part scores when deviation exceeds saved thresholds.
 */
import { apiFetch } from '@/src/services/api';
import type { ActionLevel } from './postureScoring';
import type { VibrationPattern } from './thresholds';
import {
  BADGE_COLORS,
  rulaOverallActionLevel,
  rulaOverallToDisplayPercent,
} from './postureScoring';

export type { ActionLevel } from './postureScoring';
export {
  scoreToColor,
  overallScoreFromEvaluation,
  rulaOverallActionLevel,
  rulaOverallToDisplayPercent,
} from './postureScoring';

/** Scored regions (trunk + shoulders only; matches server worst_body_part). */
export type BodyPart = 'trunk' | 'leftShoulder' | 'rightShoulder';

/** Calibrated-relative values from the server (not raw sensor zeros). */
export type PostureAngles = {
  /** Relative trunk flexion magnitude used for trunk scoring (BNO pitch delta vs calibration). */
  trunkFlexion: number;
  /** Optional numeric twist/tilt context when the API exposes degrees in `angles`. */
  trunkTwist?: number;
  trunkTilt?: number;
  leftShoulderAngle: number;
  rightShoulderAngle: number;
};

export type RulaEvaluation = {
  trunkScore: number;
  leftShoulderScore: number;
  rightShoulderScore: number;
  actionLevel: ActionLevel;
  sendAlert: boolean;          // false when user has disabled push notifications
  triggerVibration: boolean;   // always true on bad posture — independent of push setting
  /** Vibration strength 1–10 from user preference. */
  vibrationIntensity: number;
  /** Pattern name: gentle | normal | aggressive. */
  vibrationPattern: VibrationPattern;
  /** Number of motor pulses per cycle. */
  vibrationPulses: number;
  /** Pause between cycles in ms. Frontend uses this for the BLE repeat timer. */
  vibrationIntervalMs: number;
  /** Whether the user has push notifications enabled. */
  pushEnabled: boolean;
  /** Server trunk twist flag (heading heuristic or explicit evaluate override). */
  trunkTwistFlag?: boolean;
  /** Server trunk tilt flag (roll heuristic or explicit evaluate override). */
  trunkTiltFlag?: boolean;
  angles: PostureAngles;
  overallPercent?: number;
};

export type BnoFrame = { heading: number; roll: number; pitch: number };
export type MpuFrame = { Ax: number; Ay: number; Az: number; Gx: number; Gy: number; Gz: number };
export type RawSensorPacket = { bno: BnoFrame; mpu1: MpuFrame; mpu2: MpuFrame };

export type EvaluatePosturePayload = {
  device_id: string;
  recorded_at: string;
  bno: BnoFrame;
  mpu1: MpuFrame;
  mpu2: MpuFrame;
  session_id?: string;
};

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const evaluatePosture = async (
  token: string,
  payload: EvaluatePosturePayload,
): Promise<RulaEvaluation> => {
  const { data } = await apiFetch<unknown>('/posture/evaluate', {
    method: 'POST',
    body: payload,
    headers: authHeaders(token),
  });
  return normalizeRulaEvaluation(data);
};

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER
// ─────────────────────────────────────────────────────────────────────────────

const OVERALL_PERCENT_KEYS = [
  'overall_score', 'overallScore', 'overall_percent',
  'overallPercent', 'posture_percent', 'posturePercent',
] as const;

const tryOverallPercentFromRecord = (record: Record<string, unknown> | undefined): number | undefined => {
  if (!record) return undefined;
  for (const key of OVERALL_PERCENT_KEYS) {
    const v = record[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100) return Math.round(v);
    if (v != null && v !== '') {
      const c = Number(v);
      if (Number.isFinite(c) && c >= 0 && c <= 100) return Math.round(c);
    }
  }
  return undefined;
};

const overallPercentSources = (root: Record<string, unknown>): Record<string, unknown>[] => {
  const nested: Record<string, unknown>[] = [root];
  const push = (x: unknown) => {
    if (x && typeof x === 'object' && !Array.isArray(x)) nested.push(x as Record<string, unknown>);
  };
  push(root.reading); push(root.posture_reading); push(root.postureReading); push(root.record);
  const inner = root.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const d = inner as Record<string, unknown>;
    push(d); push(d.reading); push(d.posture_reading);
  }
  return nested;
};

const VALID_PATTERNS: VibrationPattern[] = ['gentle', 'normal', 'aggressive'];

export const normalizeRulaEvaluation = (raw: unknown): RulaEvaluation => {
  const obj  = (raw ?? {}) as Record<string, unknown>;
  const root =
    (obj.evaluation as Record<string, unknown> | undefined) ??
    (obj.result    as Record<string, unknown> | undefined) ??
    (obj.data      as Record<string, unknown> | undefined) ??
    obj;

  const num = (...keys: string[]): number => {
    for (const key of keys) {
      const value = root[key];
      if (typeof value === 'boolean') continue;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const coerced = Number(value);
      if (Number.isFinite(coerced) && value !== undefined && value !== null) return coerced;
    }
    return 0;
  };

  const bool = (fallback: boolean, ...keys: string[]): boolean => {
    for (const key of keys) {
      const value = root[key];
      if (typeof value === 'boolean') return value;
    }
    return fallback;
  };

  const rawAngles = (root.angles ?? {}) as Record<string, unknown>;

  const readFiniteNumber = (src: Record<string, unknown>, key: string): number | undefined => {
    if (!(key in src)) return undefined;
    const value = src[key];
    if (typeof value === 'boolean') return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const coerced = Number(value);
    if (Number.isFinite(coerced) && value !== undefined && value !== null) return coerced;
    return undefined;
  };

  const firstFiniteNumber = (sources: Record<string, unknown>[], keys: string[]): number => {
    for (const key of keys) {
      for (const src of sources) {
        const n = readFiniteNumber(src, key);
        if (n !== undefined) return n;
      }
    }
    return 0;
  };

  const angleNumIfPresent = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      if (!(key in rawAngles)) continue;
      const n = readFiniteNumber(rawAngles, key);
      if (n !== undefined) return n;
    }
    return undefined;
  };

  const readOptionalBool = (src: Record<string, unknown>, ...keys: string[]): boolean | undefined => {
    for (const key of keys) {
      if (!(key in src)) continue;
      const v = src[key];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number' && (v === 0 || v === 1)) return v !== 0;
    }
    return undefined;
  };

  const actionLevelRaw = num('actionLevel', 'action_level');
  const actionLevel    = Math.max(1, Math.min(4, Math.round(actionLevelRaw || 1))) as ActionLevel;

  // vibrationIntensity — clamp 1–10, default 5
  const rawIntensity      = num('vibrationIntensity', 'vibration_intensity');
  const vibrationIntensity = rawIntensity > 0 ? Math.max(1, Math.min(10, Math.round(rawIntensity))) : 5;

  // vibrationPattern — validate enum, default 'normal'
  const rawPattern       = String(root.vibrationPattern ?? root.vibration_pattern ?? 'normal').toLowerCase();
  const vibrationPattern: VibrationPattern = VALID_PATTERNS.includes(rawPattern as VibrationPattern)
    ? (rawPattern as VibrationPattern) : 'normal';

  // vibrationPulses and vibrationIntervalMs
  const vibrationPulses      = Math.max(0, Math.round(num('vibrationPulses', 'vibration_pulses')));
  const vibrationIntervalMs  = Math.max(0, Math.round(num('vibrationIntervalMs', 'vibration_interval_ms')));

  // pushEnabled — default true
  const rawPush  = root.pushEnabled ?? root.push_enabled;
  const pushEnabled = rawPush === undefined || rawPush === null ? true : Boolean(rawPush);

  let overallPercent: number | undefined;
  for (const src of overallPercentSources(root)) {
    overallPercent = tryOverallPercentFromRecord(src);
    if (overallPercent !== undefined) break;
  }

  const trunkTwistOpt = angleNumIfPresent('trunkTwist', 'trunk_twist');
  const trunkTiltOpt = angleNumIfPresent('trunkTilt', 'trunk_tilt');

  const trunkFlexion = firstFiniteNumber([rawAngles, root], [
    'trunkFlexion',
    'trunk_flexion',
    'upper_back_angle',
    'upperBackAngle',
  ]);

  const twistFlag =
    readOptionalBool(root, 'trunkTwistFlag', 'trunk_twist_flag', 'trunkTwist', 'trunk_twist', 'twist')
    ?? readOptionalBool(rawAngles, 'trunkTwistFlag', 'trunk_twist_flag', 'trunkTwist', 'trunk_twist', 'twist');
  const tiltFlag =
    readOptionalBool(root, 'trunkTiltFlag', 'trunk_tilt_flag', 'trunkTilt', 'trunk_tilt', 'tilt')
    ?? readOptionalBool(rawAngles, 'trunkTiltFlag', 'trunk_tilt_flag', 'trunkTilt', 'trunk_tilt', 'tilt');

  return {
    trunkScore:    num('trunkScore', 'trunk_score'),
    leftShoulderScore:  num('leftShoulderScore', 'left_shoulder_score', 'shoulderScore', 'shoulder_score'),
    rightShoulderScore: num('rightShoulderScore', 'right_shoulder_score', 'shoulderScore', 'shoulder_score'),
    actionLevel,
    sendAlert:          bool(false, 'sendAlert', 'send_alert'),
    triggerVibration:   bool(false, 'triggerVibration', 'trigger_vibration'),
    vibrationIntensity,
    vibrationPattern,
    vibrationPulses,
    vibrationIntervalMs,
    pushEnabled,
    ...(overallPercent !== undefined ? { overallPercent } : {}),
    ...(twistFlag !== undefined ? { trunkTwistFlag: twistFlag } : {}),
    ...(tiltFlag !== undefined ? { trunkTiltFlag: tiltFlag } : {}),
    angles: {
      trunkFlexion,
      ...(trunkTwistOpt !== undefined ? { trunkTwist: trunkTwistOpt } : {}),
      ...(trunkTiltOpt !== undefined ? { trunkTilt: trunkTiltOpt } : {}),
      leftShoulderAngle:  firstFiniteNumber([rawAngles, root], [
        'leftShoulderAngle',
        'left_shoulder_angle',
        'shoulderAngle',
        'shoulder_angle',
      ]),
      rightShoulderAngle: firstFiniteNumber([rawAngles, root], [
        'rightShoulderAngle',
        'right_shoulder_angle',
        'shoulderAngle',
        'shoulder_angle',
      ]),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BADGES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export type ActionLevelBadge = {
  label: string; tone: 'good' | 'warn' | 'bad' | 'none'; color: string; symbol: string;
};

export const actionLevelToBadge = (level: ActionLevel | null | undefined): ActionLevelBadge => {
  if (level == null)  return { label: 'No Data',      tone: 'none', color: BADGE_COLORS.none, symbol: '' };
  if (level <= 2)     return { label: 'Good posture', tone: 'good', color: BADGE_COLORS.good, symbol: '✅' };
  if (level === 3)    return { label: 'Adjust soon',  tone: 'warn', color: BADGE_COLORS.warn, symbol: '⚠️' };
  return                     { label: 'Fix now',      tone: 'bad',  color: BADGE_COLORS.bad,  symbol: '🔴' };
};

export const posturePercentToBadge = (percent: number | null | undefined): ActionLevelBadge => {
  if (percent == null || !Number.isFinite(percent))
    return { label: 'No Data', tone: 'none', color: BADGE_COLORS.none, symbol: '' };
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  if (p >= 70) return { label: 'Good posture', tone: 'good', color: BADGE_COLORS.good, symbol: '✅' };
  if (p >= 40) return { label: 'Adjust soon',  tone: 'warn', color: BADGE_COLORS.warn, symbol: '⚠️' };
  return              { label: 'Fix now',       tone: 'bad',  color: BADGE_COLORS.bad,  symbol: '🔴' };
};

export const displayPosturePercentFromEvaluation = (
  evaluation: RulaEvaluation | null | undefined,
): number | null => {
  if (!evaluation) return null;
  if (typeof evaluation.overallPercent === 'number' && Number.isFinite(evaluation.overallPercent))
    return Math.max(0, Math.min(100, Math.round(evaluation.overallPercent)));
  const level = rulaOverallActionLevel(evaluation);
  if (level == null) return null;
  return rulaOverallToDisplayPercent(level);
};

const bodyPartAngle = (part: BodyPart, angles: PostureAngles): number => {
  switch (part) {
    case 'trunk':         return Math.abs(angles.trunkFlexion);
    case 'leftShoulder':  return Math.abs(angles.leftShoulderAngle);
    case 'rightShoulder': return Math.abs(angles.rightShoulderAngle);
  }
};

export const bodyPartScore = (part: BodyPart, evaluation: RulaEvaluation): number => {
  switch (part) {
    case 'trunk':         return evaluation.trunkScore;
    case 'leftShoulder':  return evaluation.leftShoulderScore;
    case 'rightShoulder': return evaluation.rightShoulderScore;
  }
};

export const pickWorstBodyPart = (evaluation: RulaEvaluation): BodyPart => {
  const parts: BodyPart[] = ['trunk', 'leftShoulder', 'rightShoulder'];
  let worst      = parts[0];
  let worstScore = bodyPartScore(parts[0], evaluation);
  let worstAngle = bodyPartAngle(parts[0], evaluation.angles);
  for (let i = 1; i < parts.length; i++) {
    const part  = parts[i];
    const score = bodyPartScore(part, evaluation);
    const angle = bodyPartAngle(part, evaluation.angles);
    if (score > worstScore || (score === worstScore && angle > worstAngle)) {
      worst = part; worstScore = score; worstAngle = angle;
    }
  }
  return worst;
};

export const messageForWorstBodyPart = (part: BodyPart): string => {
  switch (part) {
    case 'leftShoulder':  return 'Your left shoulder is raised — lower your arm.';
    case 'rightShoulder': return 'Your right shoulder is raised — lower your arm.';
    case 'trunk':         return "You're leaning forward — sit up straight.";
  }
};

export const bodyPartLabel = (part: BodyPart): string => {
  switch (part) {
    case 'trunk':         return 'Upper Back';
    case 'leftShoulder':  return 'Left Shoulder';
    case 'rightShoulder': return 'Right Shoulder';
  }
};