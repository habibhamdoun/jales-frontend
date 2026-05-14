import { createContext, useContext } from 'react';
import type { DeviceDto } from '@/src/services/devices';
import type { SessionDto } from '@/src/services/sessions';
import type { Thresholds } from '@/src/services/thresholds';
import type { RulaEvaluation } from '@/src/services/posture';
import type { UserCalibrationRecord } from '@/src/services/userCalibration';
import type { ShoulderMotionBand } from '@/src/utils/calibrationNeutral';

export type MonitoringContextValue = {
  registeredDevice: DeviceDto | null;
  isRegisteringDevice: boolean;
  registerError: string | null;

  thresholds: Thresholds | null;

  /** Server row from GET /user/calibration (normalized); null if none or not loaded. */
  userCalibration: UserCalibrationRecord | null;
  /** True when GET /user/calibration has at least one numeric baseline (back and/or shoulders). */
  hasUserServerCalibration: boolean;
  refreshUserCalibration: () => Promise<void>;

  isActive: boolean;
  sessionId: string | null;
  sessionStartedAt: number | null;

  // Latest RULA evaluation from the backend; null until first response.
  latestEvaluation: RulaEvaluation | null;

  totalAlerts: number;
  postureScore: number;
  liveAverages: {
    upperBack: number;
    leftShoulder: number;
    rightShoulder: number;
  };

  /**
   * Auxiliary client-side shoulder hint (live MPU atan2 vs saved calibration steps).
   * Server shoulder scores still come from `/posture/evaluate` using its own pipeline.
   */
  shoulderMotionHint: {
    left: ShoulderMotionBand;
    right: ShoulderMotionBand;
  } | null;

  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<SessionDto | null>;
  reportBattery: (level: number) => Promise<void>;
  refreshThresholds: () => Promise<void>;

  // Restore-from-storage: drop the evaluation into state WITHOUT triggering
  // alerts, vibration, or aggregation. Used on app launch so a stale
  // persisted result populates the cards without firing buzz/notifications.
  hydrateEvaluation: (evaluation: RulaEvaluation | null) => void;
};

export const MonitoringContext = createContext<
  MonitoringContextValue | undefined
>(undefined);

export const useMonitoring = (): MonitoringContextValue => {
  const ctx = useContext(MonitoringContext);
  if (!ctx) {
    throw new Error(
      'useMonitoring must be used within a MonitoringProvider.',
    );
  }
  return ctx;
};
