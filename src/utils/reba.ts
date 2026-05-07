/**
 * Posture analysis utilities for the JALES sensor layout:
 * - BNO: neck orientation
 * - MPU1: upper back alignment
 * - MPU2 + MPU3: shoulder alignment
 */

export enum RebaCategory {
  EXTENSION = 'extension',
  ALIGNED = 'aligned',
  MODERATE = 'moderate',
  SEVERE = 'severe',
}

export interface RebaScore {
  baseScore: number;
  sideBendPenalty: number;
  inversionPenalty: number;
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
  upperBack: RebaScore & { angles: PostureAngles };
  shoulders: RebaScore & { angles: PostureAngles };
  trunk: RebaScore & { angles: PostureAngles };
}

export const POSTURE_THRESHOLDS = {
  neck: {
    alignedPitch: 20,
    alignedRoll: 12,
    moderatePitch: 45,
    moderateRoll: 25,
    extremeAngle: 65,
  },
  upperBack: {
    alignedPitch: 20,
    alignedRoll: 12,
    moderatePitch: 45,
    moderateRoll: 25,
    extremeAngle: 70,
  },
  shoulders: {
    alignedTilt: 8,
    moderateTilt: 18,
    alignedPitch: 25,
    moderatePitch: 45,
    extremeAngle: 70,
  },
};

const hasExtremeTilt = (
  pitch: number,
  roll: number,
  extremeAngle: number,
): boolean => {
  return Math.abs(pitch) > extremeAngle || Math.abs(roll) > extremeAngle;
};

const createScore = (
  baseScore: number,
  sideBendPenalty: number,
  inversionPenalty: number,
  category: RebaCategory,
  label: string,
): RebaScore => {
  return {
    baseScore,
    sideBendPenalty,
    inversionPenalty,
    totalScore: baseScore + sideBendPenalty + inversionPenalty,
    category,
    label,
  };
};

const calculateSegmentScore = (
  pitch: number,
  roll: number,
  thresholds: {
    alignedPitch: number;
    alignedRoll: number;
    moderatePitch: number;
    moderateRoll: number;
    extremeAngle: number;
  },
  labels: {
    aligned: string;
    moderatePitch: string;
    severePitch: string;
    moderateRoll: string;
    severeRoll: string;
    extension: string;
  },
): RebaScore => {
  const absPitch = Math.abs(pitch);
  const absRoll = Math.abs(roll);
  const inversionPenalty = hasExtremeTilt(
    pitch,
    roll,
    thresholds.extremeAngle,
  )
    ? 2
    : 0;

  let baseScore = 1;
  let category = RebaCategory.ALIGNED;
  let label = labels.aligned;

  if (pitch < -thresholds.alignedPitch) {
    baseScore = absPitch > thresholds.moderatePitch ? 3 : 2;
    category =
      absPitch > thresholds.moderatePitch
        ? RebaCategory.SEVERE
        : RebaCategory.EXTENSION;
    label = labels.extension;
  } else if (absPitch > thresholds.moderatePitch) {
    baseScore = 3;
    category = RebaCategory.SEVERE;
    label = labels.severePitch;
  } else if (absPitch > thresholds.alignedPitch) {
    baseScore = 2;
    category = RebaCategory.MODERATE;
    label = labels.moderatePitch;
  }

  const sideBendPenalty = absRoll > thresholds.alignedRoll ? 1 : 0;
  if (absRoll > thresholds.moderateRoll) {
    label =
      label === labels.aligned
        ? labels.severeRoll
        : `${label} + ${labels.severeRoll}`;
  } else if (sideBendPenalty > 0) {
    label =
      label === labels.aligned
        ? labels.moderateRoll
        : `${label} + ${labels.moderateRoll}`;
  }

  if (inversionPenalty > 0) {
    label += ' + extreme tilt';
  }

  return createScore(
    baseScore,
    sideBendPenalty,
    inversionPenalty,
    category,
    label,
  );
};

export const calculateNeckReba = (
  pitch: number,
  roll: number,
): RebaScore => {
  return calculateSegmentScore(pitch, roll, POSTURE_THRESHOLDS.neck, {
    aligned: 'Neck aligned',
    moderatePitch: 'Neck flexion',
    severePitch: 'Severe neck flexion',
    moderateRoll: 'Neck side tilt',
    severeRoll: 'Severe neck side tilt',
    extension: 'Neck extension',
  });
};

export const calculateUpperBackReba = (
  pitch: number,
  roll: number,
): RebaScore => {
  return calculateSegmentScore(pitch, roll, POSTURE_THRESHOLDS.upperBack, {
    aligned: 'Upper back aligned',
    moderatePitch: 'Upper back forward lean',
    severePitch: 'Severe upper back lean',
    moderateRoll: 'Upper back side bend',
    severeRoll: 'Severe upper back side bend',
    extension: 'Upper back extension',
  });
};

export const calculateTrunkReba = calculateUpperBackReba;

export const calculateShoulderReba = (
  pitch: number,
  roll: number,
): RebaScore => {
  const thresholds = POSTURE_THRESHOLDS.shoulders;
  const absPitch = Math.abs(pitch);
  const absRoll = Math.abs(roll);
  const inversionPenalty = hasExtremeTilt(
    pitch,
    roll,
    thresholds.extremeAngle,
  )
    ? 2
    : 0;

  let baseScore = 1;
  let category = RebaCategory.ALIGNED;
  let label = 'Shoulders aligned';

  if (absRoll > thresholds.moderateTilt) {
    baseScore = 3;
    category = RebaCategory.SEVERE;
    label = 'Severe shoulder tilt';
  } else if (absRoll > thresholds.alignedTilt) {
    baseScore = 2;
    category = RebaCategory.MODERATE;
    label = 'Shoulder tilt';
  }

  const sideBendPenalty = absPitch > thresholds.alignedPitch ? 1 : 0;
  if (absPitch > thresholds.moderatePitch) {
    label += ' + severe forward/back tilt';
  } else if (sideBendPenalty > 0) {
    label += ' + forward/back tilt';
  }

  if (inversionPenalty > 0) {
    label += ' + extreme tilt';
  }

  return createScore(
    baseScore,
    sideBendPenalty,
    inversionPenalty,
    category,
    label,
  );
};

export const calculatePostureAnalysis = (
  neckPitch: number,
  neckRoll: number,
  upperBackPitch: number,
  upperBackRoll: number,
  shoulderPitch = 0,
  shoulderRoll = 0,
): PostureAnalysis => {
  const neckScore = calculateNeckReba(neckPitch, neckRoll);
  const upperBackScore = calculateUpperBackReba(
    upperBackPitch,
    upperBackRoll,
  );
  const shoulderScore = calculateShoulderReba(shoulderPitch, shoulderRoll);

  return {
    neck: {
      ...neckScore,
      angles: { pitch: neckPitch, roll: neckRoll },
    },
    upperBack: {
      ...upperBackScore,
      angles: { pitch: upperBackPitch, roll: upperBackRoll },
    },
    shoulders: {
      ...shoulderScore,
      angles: { pitch: shoulderPitch, roll: shoulderRoll },
    },
    trunk: {
      ...upperBackScore,
      angles: { pitch: upperBackPitch, roll: upperBackRoll },
    },
  };
};
