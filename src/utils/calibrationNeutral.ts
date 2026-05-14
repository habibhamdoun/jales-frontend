import type { BnoData, MpuData } from './bleParsers';
import { radiansToDegrees } from './posture';

/** Matches the RULA-friendly bands described on the calibration screen (with small tolerance). */
export type NeutralBandStatus = {
  trunkPitchOk: boolean;
  trunkHeadingOk: boolean;
  trunkRollOk: boolean;
  leftShoulderElevationOk: boolean;
  rightShoulderElevationOk: boolean;
};

/**
 * Raw BNO / MPU “neutral band” check (not used by live monitoring UI).
 * Server shoulder scoring uses normalized atan2(Ay,Az); if you wire this up,
 * align shoulder degrees with that normalization to avoid disagreeing with `/posture/evaluate`.
 */
export function neutralBandStatus(
  bno: BnoData,
  mpu1: MpuData,
  mpu2: MpuData,
): NeutralBandStatus {
  const leftEl = shoulderElevationAtan2Deg(mpu1.ay, mpu1.az);
  const rightEl = shoulderElevationAtan2Deg(mpu2.ay, mpu2.az);
  return {
    trunkPitchOk: bno.pitch >= 0 && bno.pitch <= 10,
    trunkHeadingOk: Math.abs(bno.heading) < 10,
    trunkRollOk: Math.abs(bno.roll) < 10,
    leftShoulderElevationOk: leftEl >= 0 && leftEl <= 20,
    rightShoulderElevationOk: rightEl >= 0 && rightEl <= 20,
  };
}

export function neutralBandsAllGood(s: NeutralBandStatus): boolean {
  return (
    s.trunkPitchOk &&
    s.trunkHeadingOk &&
    s.trunkRollOk &&
    s.leftShoulderElevationOk &&
    s.rightShoulderElevationOk
  );
}

export type CalibrationNeutralSnapshot = {
  bno: BnoData;
  mpu1: MpuData;
  mpu2: MpuData;
  capturedAt: number;
};

/** Shoulder elevation from accelerometer, degrees (atan2(Ay, Az)). */
export function shoulderElevationAtan2Deg(ay: number, az: number): number {
  return radiansToDegrees(Math.atan2(ay, az));
}

export function cloneCalibrationSnapshot(
  bno: BnoData,
  mpu1: MpuData,
  mpu2: MpuData,
): CalibrationNeutralSnapshot {
  return {
    bno: { ...bno },
    mpu1: { ...mpu1 },
    mpu2: { ...mpu2 },
    capturedAt: Date.now(),
  };
}

/** BNO targets: upper-trunk pitch 0–10° (mid 5°), twist & tilt &lt;10° → 0°. */
export const PERFECT_TABLE_BNO: BnoData = {
  heading: 0,
  roll: 0,
  pitch: 5,
};

const DEFAULT_MPU_MAG = 8192;

function mpuAccelMagnitude(m: MpuData): number {
  const s = Math.sqrt(m.ax * m.ax + m.ay * m.ay + m.az * m.az);
  return s > 1e-6 ? s : DEFAULT_MPU_MAG;
}

/**
 * MPU accel vector scaled to `mag`, with trunk pitch (~5°) in the X–Z plane and
 * shoulder elevation (~10°) in the Y–Z plane (atan2(Ay, Az) in 0–20° band).
 * Gyros zeroed (static neutral).
 */
export function perfectTableMpu(
  mag: number,
  trunkPitchDeg: number,
  shoulderElevDeg: number,
): MpuData {
  const tp = (trunkPitchDeg * Math.PI) / 180;
  const se = (shoulderElevDeg * Math.PI) / 180;
  const m = Math.max(256, mag);
  const az = m * Math.cos(se) * Math.cos(tp);
  const ay = m * Math.sin(se);
  const ax = m * Math.sin(tp) * Math.cos(se);
  return {
    ax: Math.round(ax),
    ay: Math.round(ay),
    az: Math.round(az),
    gx: 0,
    gy: 0,
    gz: 0,
  };
}

/**
 * “Perfect calibration” snapshot aligned to the product table (RULA 1 / no penalty bands).
 * Uses live MPU magnitude when available so raw scale stays in the same ballpark as the shirt.
 */
export function buildPerfectCalibrationSnapshot(opts?: {
  mpu1?: MpuData | null;
  mpu2?: MpuData | null;
}): CalibrationNeutralSnapshot {
  const mag1 = opts?.mpu1 ? mpuAccelMagnitude(opts.mpu1) : DEFAULT_MPU_MAG;
  const mag2 = opts?.mpu2 ? mpuAccelMagnitude(opts.mpu2) : DEFAULT_MPU_MAG;
  return {
    bno: { ...PERFECT_TABLE_BNO },
    mpu1: perfectTableMpu(mag1, 5, 10),
    mpu2: perfectTableMpu(mag2, 5, 10),
    capturedAt: Date.now(),
  };
}

/** One row: MPU1 (left) + MPU2 (right) shoulder elevation degrees (atan2 Ay, Az). */
export type ShoulderDualCapture = { leftDeg: number; rightDeg: number };

export type ShoulderMotionBand = 'good' | 'elevated' | 'high';

/**
 * Three calibration captures should move from relaxed → more loaded shoulder (increasing elevation).
 * `threeSamplesDeg` are the three recorded angles for one side.
 * - good: at or below the lowest capture (+ tolerance)
 * - high: at or above the highest capture (− tolerance) — matches your “worst” demo pose or worse
 * - elevated: between
 */
export function classifyShoulderElevationBand(
  currentDeg: number,
  threeSamplesDeg: number[],
  toleranceDeg = 8,
): ShoulderMotionBand {
  if (threeSamplesDeg.length < 3) return 'good';
  const low = Math.min(...threeSamplesDeg);
  const high = Math.max(...threeSamplesDeg);
  if (!Number.isFinite(currentDeg)) return 'good';
  if (currentDeg <= low + toleranceDeg) return 'good';
  if (currentDeg >= high - toleranceDeg) return 'high';
  return 'elevated';
}
