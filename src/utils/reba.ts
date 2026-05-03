/**
 * Posture analysis types for REBA-style classification
 */

export enum RebaCategory {
  EXTENSION = 'extension',
  FLEXION_0_20 = '0–20° flexion',
  FLEXION_20_PLUS = '>20° flexion',
  FLEXION_20_60 = '20–60° flexion',
  FLEXION_60_PLUS = '>60° flexion',
}

export interface RebaScore {
  baseScore: number;
  sideBendPenalty: number;
  totalScore: number;
  category: RebaCategory;
  label: string;
}

export interface PostureAngles {
  pitch: number;
  roll: number;
}

export interface PostureAnalysis {
  neck: RebaScore & { angles: PostureAngles };
  trunk: RebaScore & { angles: PostureAngles };
}

/**
 * REBA threshold configuration
 * Can be easily replaced with backend config later
 */
export const REBA_THRESHOLDS = {
  neck: {
    sideBendThreshold: 15, // degrees - more forgiving
    flexionBoundary1: 25, // degrees - more forgiving
  },
  trunk: {
    sideBendThreshold: 15, // degrees - more forgiving
    flexionBoundary1: 40, // degrees - more forgiving for sitting
    flexionBoundary2: 70, // degrees - more forgiving
  },
};

/**
 * Calculate REBA-style neck score based on pitch and roll angles
 * @param pitch - Neck pitch angle in degrees (positive = flexion, negative = extension)
 * @param roll - Neck roll angle in degrees (positive/negative = side bend)
 * @returns RebaScore with breakdown
 */
export const calculateNeckReba = (pitch: number, roll: number): RebaScore => {
  let baseScore = 0;
  let category: RebaCategory;
  let label = '';

  // Determine base score based on pitch angle
  if (pitch < 0) {
    // Extension
    baseScore = 2;
    category = RebaCategory.EXTENSION;
    label = 'Extension';
  } else if (pitch >= 0 && pitch <= REBA_THRESHOLDS.neck.flexionBoundary1) {
    // 0–20° flexion
    baseScore = 1;
    category = RebaCategory.FLEXION_0_20;
    label = '0–20° flexion';
  } else {
    // >20° flexion
    baseScore = 2;
    category = RebaCategory.FLEXION_20_PLUS;
    label = '>20° flexion';
  }

  // Add penalty for side bend
  const sideBendPenalty =
    Math.abs(roll) > REBA_THRESHOLDS.neck.sideBendThreshold ? 1 : 0;
  if (sideBendPenalty > 0) {
    label += ' + side bend';
  }

  return {
    baseScore,
    sideBendPenalty,
    totalScore: baseScore + sideBendPenalty,
    category,
    label,
  };
};

/**
 * Calculate REBA-style trunk score based on pitch and roll angles
 * @param pitch - Trunk pitch angle in degrees (positive = flexion, negative = extension)
 * @param roll - Trunk roll angle in degrees (positive/negative = side bend)
 * @returns RebaScore with breakdown
 */
export const calculateTrunkReba = (pitch: number, roll: number): RebaScore => {
  let baseScore = 0;
  let category: RebaCategory;
  let label = '';

  // Determine base score based on pitch angle
  if (pitch < 0) {
    // Extension
    baseScore = 2;
    category = RebaCategory.EXTENSION;
    label = 'Extension';
  } else if (pitch >= 0 && pitch <= REBA_THRESHOLDS.trunk.flexionBoundary1) {
    // 0–40° flexion (relaxed for normal sitting posture)
    baseScore = 1;
    category = RebaCategory.FLEXION_0_20;
    label = '0–40° flexion';
  } else if (
    pitch > REBA_THRESHOLDS.trunk.flexionBoundary1 &&
    pitch <= REBA_THRESHOLDS.trunk.flexionBoundary2
  ) {
    // 40–70° flexion
    baseScore = 2;
    category = RebaCategory.FLEXION_20_60;
    label = '40–70° flexion';
  } else {
    // >70° flexion
    baseScore = 3;
    category = RebaCategory.FLEXION_60_PLUS;
    label = '>70° flexion';
  }

  // Add penalty for side bend
  const sideBendPenalty =
    Math.abs(roll) > REBA_THRESHOLDS.trunk.sideBendThreshold ? 1 : 0;
  if (sideBendPenalty > 0) {
    label += ' + side bend';
  }

  return {
    baseScore,
    sideBendPenalty,
    totalScore: baseScore + sideBendPenalty,
    category,
    label,
  };
};

/**
 * Calculate full posture analysis for neck and trunk
 * @param neckPitch - Neck pitch angle
 * @param neckRoll - Neck roll angle
 * @param trunkPitch - Trunk pitch angle
 * @param trunkRoll - Trunk roll angle
 * @returns Complete posture analysis with REBA scores
 */
export const calculatePostureAnalysis = (
  neckPitch: number,
  neckRoll: number,
  trunkPitch: number,
  trunkRoll: number,
): PostureAnalysis => {
  const neckScore = calculateNeckReba(neckPitch, neckRoll);
  const trunkScore = calculateTrunkReba(trunkPitch, trunkRoll);

  return {
    neck: {
      ...neckScore,
      angles: { pitch: neckPitch, roll: neckRoll },
    },
    trunk: {
      ...trunkScore,
      angles: { pitch: trunkPitch, roll: trunkRoll },
    },
  };
};
