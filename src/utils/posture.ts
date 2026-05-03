/**
 * Posture angle calculation utilities
 * Converts sensor data to meaningful posture angles
 */

import { MpuData } from './bleParsers';

/**
 * Convert radians to degrees
 */
export const radiansToDegrees = (radians: number): number => {
  return (radians * 180) / Math.PI;
};

/**
 * Convert degrees to radians
 */
export const degreesToRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Calculate trunk pitch and roll angles from MPU accelerometer data
 *
 * ASSUMPTIONS:
 * - MPU is mounted on the trunk with X-axis pointing forward
 * - Y-axis pointing to the side (left)
 * - Z-axis pointing upward
 * - Mounting orientation may need adjustment via these constants
 *
 * The accelerometer measures gravitational acceleration (in addition to true acceleration).
 * For static or slow-moving posture analysis, we can use it as an inclinometer by
 * calculating the angle relative to gravity.
 *
 * @param accel - Accelerometer data { ax, ay, az }
 * @returns Object with pitch and roll angles in degrees
 */
export const calculateTrunkAnglesFromAccel = (accel: {
  ax: number;
  ay: number;
  az: number;
}): { pitch: number; roll: number } => {
  const { ax, ay, az } = accel;

  // Normalize acceleration vector to reduce noise sensitivity
  // This ensures the magnitude doesn't affect angle calculation
  const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
  
  if (magnitude === 0) {
    return { pitch: 0, roll: 0 };
  }

  const axNorm = ax / magnitude;
  const ayNorm = ay / magnitude;
  const azNorm = az / magnitude;

  // Deadzone: ignore very small changes to filter out noise
  // If the normalized component is very small, treat as zero
  const NOISE_THRESHOLD = 0.05; // ~3 degree threshold
  const axCleaned = Math.abs(axNorm) < NOISE_THRESHOLD ? 0 : axNorm;
  const ayCleaned = Math.abs(ayNorm) < NOISE_THRESHOLD ? 0 : ayNorm;

  // Pitch: rotation around Y-axis (forward/backward tilt)
  // Positive pitch = flexion (forward fold)
  // Formula: pitch = atan2(ax, az)
  // Using normalized values reduces noise impact
  const pitchRad = Math.atan2(axCleaned, azNorm);
  const pitch = radiansToDegrees(pitchRad);

  // Roll: rotation around X-axis (left/right tilt)
  // Positive roll = right side bend
  // Formula: roll = atan2(ay, az)
  // Using normalized values reduces noise impact
  const rollRad = Math.atan2(ayCleaned, azNorm);
  const roll = radiansToDegrees(rollRad);

  return {
    pitch,
    roll,
  };
};

/**
 * Calculate relative trunk angles by subtracting a neutral reference
 *
 * This allows posture to be measured relative to the subject's calibrated neutral position
 * rather than absolute device orientation.
 *
 * @param currentAngles - Current calculated angles { pitch, roll }
 * @param neutralAngles - Reference neutral angles { pitch, roll }
 * @returns Relative angles { pitch, roll }
 */
export const calculateRelativeTrunkAngles = (
  currentAngles: { pitch: number; roll: number },
  neutralAngles: { pitch: number; roll: number },
): { pitch: number; roll: number } => {
  return {
    pitch: currentAngles.pitch - neutralAngles.pitch,
    roll: currentAngles.roll - neutralAngles.roll,
  };
};

/**
 * Calculate all trunk angles from MPU data
 * Convenience function that combines accel-to-angle calculation with neutral reference subtraction
 *
 * @param mpuData - Raw MPU sensor data
 * @param neutralAngles - Optional neutral reference angles, if not provided returns absolute angles
 * @returns Current and relative trunk angles
 */
export const getTrunkAngles = (
  mpuData: MpuData | null,
  neutralAngles?: { pitch: number; roll: number },
): { absolute: { pitch: number; roll: number } | null; relative: { pitch: number; roll: number } | null } => {
  if (!mpuData) {
    return { absolute: null, relative: null };
  }

  const absolute = calculateTrunkAnglesFromAccel({
    ax: mpuData.ax,
    ay: mpuData.ay,
    az: mpuData.az,
  });

  let relative: { pitch: number; roll: number } | null = null;
  if (neutralAngles) {
    relative = calculateRelativeTrunkAngles(absolute, neutralAngles);
  }

  return { absolute, relative };
};
