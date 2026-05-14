import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getStoredLastEvaluation,
  setStoredLastEvaluation,
  clearStoredLastEvaluation,
} from '@/src/services/tokenStorage';
import { useAuth } from '@/src/auth/AuthContext';
import { useBle } from '@/src/hooks/useBle';
import {
  registerDevice,
  updateDeviceBattery,
  type DeviceDto,
} from '@/src/services/devices';
import {
  clearCalibrationSnapshot,
  loadShoulderThreeStepCaptures,
  persistCalibrationFromServerGet,
} from '@/src/services/calibrationSnapshotStorage';
import { getPostureCalibration } from '@/src/services/postureCalibration';
import {
  getUserCalibration,
  hasUserCalibrationBaselines,
  type UserCalibrationRecord,
} from '@/src/services/userCalibration';
import {
  endSession,
  startSession,
  type SessionDto,
  type SessionEndPayload,
} from '@/src/services/sessions';
import {
  evaluatePosture,
  displayPosturePercentFromEvaluation,
  pickWorstBodyPart,
  messageForWorstBodyPart,
  posturePercentToBadge,
  type RulaEvaluation,
} from '@/src/services/posture';
import { ApiError } from '@/src/services/api';
import { getThresholds, type Thresholds } from '@/src/services/thresholds';
import { sendWorstBodyPartAlert } from '@/src/services/notifications';
import {
  MonitoringContext,
  type MonitoringContextValue,
} from './MonitoringContext';
import {
  classifyShoulderElevationBand,
  shoulderElevationAtan2Deg,
} from '@/src/utils/calibrationNeutral';
import type { ShoulderDualCapture } from '@/src/utils/calibrationNeutral';

const EVALUATE_INTERVAL_MS  = 1000;
const ORANGE_PERSISTENCE_MS = 12_000;
const RED_ALERT_INTERVAL_MS = 5_000;

type DisplayTone = 'good' | 'warn' | 'bad' | 'none';

type LiveAverages = {
  upperBack: number;
  leftShoulder: number;
  rightShoulder: number;
};

const ZERO_AVERAGES: LiveAverages = { upperBack: 0, leftShoulder: 0, rightShoulder: 0 };

const REGISTER_TIMEOUT_MS = 25_000;

/** Compare BLE id to DB `mac_address` despite `:` vs `-` and casing differences. */
function normalizeBleMac(s: string | null | undefined): string {
  return String(s ?? '').replace(/[:-]/g, '').toLowerCase();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const {
    device,
    isConnected,
    livePacket,
    triggerVibration,
    clearNeutralDisplayLock,
    hydrateCalibrationFromStorage,
    clearCalibrationMemoryOnly,
    batteryLevel,                 // ← battery from BLE
  } = useBle();

  const triggerVibrationRef = useRef(triggerVibration);
  useEffect(() => { triggerVibrationRef.current = triggerVibration; }, [triggerVibration]);

  const [registeredDevice,    setRegisteredDevice]    = useState<DeviceDto | null>(null);
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const [registerError,       setRegisterError]       = useState<string | null>(null);
  const registeredDeviceRef = useRef(registeredDevice);
  registeredDeviceRef.current = registeredDevice;
  const deviceRef = useRef(device);
  deviceRef.current = device;
  const [thresholds,          setThresholds]          = useState<Thresholds | null>(null);
  const [userCalibration,     setUserCalibration]     = useState<UserCalibrationRecord | null>(null);
  const [isActive,            setIsActive]            = useState(false);
  const [sessionId,           setSessionId]           = useState<string | null>(null);
  const [sessionStartedAt,    setSessionStartedAt]    = useState<number | null>(null);
  const [latestEvaluation,    setLatestEvaluation]    = useState<RulaEvaluation | null>(null);
  const [totalAlerts,         setTotalAlerts]         = useState(0);
  const [postureScore,        setPostureScore]        = useState(100);
  const [liveAverages,        setLiveAverages]        = useState<LiveAverages>(ZERO_AVERAGES);
  const [shoulderMotionHint,  setShoulderMotionHint]  = useState<MonitoringContextValue['shoulderMotionHint']>(null);

  const totalEvaluationsRef  = useRef(0);
  const badEvaluationsRef    = useRef(0);
  const sumActionLevelRef    = useRef(0);
  const sumDisplayPercentRef = useRef(0);
  const sumAnglesRef         = useRef({ upperBack: 0, leftShoulder: 0, rightShoulder: 0 });

  const orangeStreakSinceRef = useRef<number | null>(null);
  const orangeAlertFiredRef  = useRef(false);
  const redStreakSinceRef    = useRef<number | null>(null);
  const lastRedFireAtRef     = useRef<number | null>(null);
  const lastDisplayToneRef   = useRef<DisplayTone | null>(null);

  const isActiveRef         = useRef(false);
  const sessionIdRef        = useRef<string | null>(null);
  const deviceIdRef         = useRef<string | null>(null);
  const livePacketRef       = useRef(livePacket);
  const latestEvaluationRef = useRef<RulaEvaluation | null>(null);
  const tokenRef            = useRef(token);
  const shoulderStepsRef    = useRef<ShoulderDualCapture[] | null>(null);

  const evaluateIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightEvaluateRef  = useRef(false);
  const isMountedRef         = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => { isActiveRef.current         = isActive;                             }, [isActive]);
  useEffect(() => { sessionIdRef.current         = sessionId;                            }, [sessionId]);
  useEffect(() => { deviceIdRef.current          = registeredDevice?.id ?? null;         }, [registeredDevice]);
  useEffect(() => { livePacketRef.current        = livePacket;                           }, [livePacket]);
  useEffect(() => { latestEvaluationRef.current  = latestEvaluation;                     }, [latestEvaluation]);
  useEffect(() => { tokenRef.current             = token;                                }, [token]);

  useEffect(() => {
    if (!registeredDevice?.id) { shoulderStepsRef.current = null; return; }
    let cancelled = false;
    void loadShoulderThreeStepCaptures().then((caps) => {
      if (!cancelled && isMountedRef.current) shoulderStepsRef.current = caps;
    });
    return () => { cancelled = true; };
  }, [registeredDevice?.id, isActive]);

  const resetSessionAccumulators = useCallback(() => {
    totalEvaluationsRef.current  = 0;
    badEvaluationsRef.current    = 0;
    sumActionLevelRef.current    = 0;
    sumDisplayPercentRef.current = 0;
    sumAnglesRef.current         = { upperBack: 0, leftShoulder: 0, rightShoulder: 0 };
    orangeStreakSinceRef.current = null;
    orangeAlertFiredRef.current  = false;
    redStreakSinceRef.current    = null;
    lastRedFireAtRef.current     = null;
    lastDisplayToneRef.current   = null;
    setTotalAlerts(0);
    setPostureScore(100);
    setLiveAverages(ZERO_AVERAGES);
    setShoulderMotionHint(null);
  }, []);

  const refreshThresholds = useCallback(async () => {
    if (!token) { setThresholds(null); return; }
    try {
      const data = await getThresholds(token);
      if (isMountedRef.current) setThresholds(data);
    } catch (error) { console.warn('[Monitoring] Failed to load thresholds:', error); }
  }, [token]);

  const refreshUserCalibration = useCallback(async () => {
    if (!token) {
      if (isMountedRef.current) setUserCalibration(null);
      return;
    }
    try {
      const { calibration } = await getUserCalibration(token);
      if (isMountedRef.current) setUserCalibration(calibration);
    } catch (error) {
      console.warn('[Monitoring] User calibration GET failed:', error);
      if (isMountedRef.current) setUserCalibration(null);
    }
  }, [token]);

  const hasUserServerCalibration = useMemo(
    () => hasUserCalibrationBaselines(userCalibration),
    [userCalibration],
  );

  useEffect(() => {
    if (userCalibration == null) {
      console.log('[Monitoring] user_calibration baselines: (null — not loaded or no row)');
      return;
    }
    const n = Array.isArray(userCalibration.baseline_samples)
      ? userCalibration.baseline_samples.length
      : 0;
    console.log('[Monitoring] user_calibration baselines', {
      back_baseline_pitch: userCalibration.back_baseline_pitch ?? null,
      left_shoulder_baseline: userCalibration.left_shoulder_baseline ?? null,
      right_shoulder_baseline: userCalibration.right_shoulder_baseline ?? null,
      back_threshold: userCalibration.back_threshold ?? null,
      shoulder_threshold: userCalibration.shoulder_threshold ?? null,
      baseline_samples_count: n,
      hasUserCalibrationBaselines: hasUserCalibrationBaselines(userCalibration),
    });
  }, [userCalibration]);

  useEffect(() => { refreshThresholds(); }, [refreshThresholds]);

  useEffect(() => {
    void refreshUserCalibration();
  }, [refreshUserCalibration]);

  // ── Device registration ───────────────────────────────────────────────────
  // Do not depend on `device` / `registeredDevice` object identity — battery PATCH
  // replaces `registeredDevice` often and BLE may churn `device` references.
  // Use stable `device.id` + refs. Normalize MACs so DB vs BLE format does not
  // cause a perpetual re-register loop (stuck "Registering…").
  const deviceIdForRegister = device?.id ?? null;

  useEffect(() => {
    if (!token || !isConnected || !deviceIdForRegister) return;
    const rd = registeredDeviceRef.current;
    if (
      rd?.id &&
      normalizeBleMac(rd.mac_address) === normalizeBleMac(deviceIdForRegister)
    ) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsRegisteringDevice(true);
      setRegisterError(null);
      const d = deviceRef.current;
      const device_name = d?.name || d?.localName || 'JALES Shirt';
      try {
        const reg = await withTimeout(
          registerDevice(token, {
            mac_address: deviceIdForRegister,
            device_name,
          }),
          REGISTER_TIMEOUT_MS,
          'Device register',
        );
        if (!cancelled && isMountedRef.current) setRegisteredDevice(reg);
      } catch (error: unknown) {
        console.warn('[Monitoring] Device register failed:', error);
        if (!cancelled && isMountedRef.current)
          setRegisterError(
            error instanceof Error ? error.message : 'Device register failed',
          );
      } finally {
        if (isMountedRef.current) setIsRegisteringDevice(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (isMountedRef.current) setIsRegisteringDevice(false);
    };
  }, [token, isConnected, deviceIdForRegister]);

  // ── Per-device posture calibration sync (skipped when user has baselines) ─
  useEffect(() => {
    if (!token || !registeredDevice?.id) return;
    if (hasUserCalibrationBaselines(userCalibration)) return;
    let cancelled = false;
    const run = async () => {
      try {
        await hydrateCalibrationFromStorage(registeredDevice.id);
        const { calibration } = await getPostureCalibration(token, registeredDevice.id);
        if (cancelled || !isMountedRef.current) return;
        if (calibration === null) {
          await clearCalibrationSnapshot();
          clearCalibrationMemoryOnly();
          if (!cancelled && isMountedRef.current) shoulderStepsRef.current = null;
          return;
        }
        await persistCalibrationFromServerGet(registeredDevice.id, calibration);
        if (!cancelled && isMountedRef.current) {
          await hydrateCalibrationFromStorage(registeredDevice.id);
          const caps = await loadShoulderThreeStepCaptures();
          if (!cancelled && isMountedRef.current) shoulderStepsRef.current = caps;
        }
      } catch (e) { console.warn('[Monitoring] Calibration sync failed:', e); }
    };
    void run();
    return () => { cancelled = true; };
  }, [
    token,
    registeredDevice?.id,
    userCalibration,
    hydrateCalibrationFromStorage,
    clearCalibrationMemoryOnly,
  ]);

  useEffect(() => {
    if (!isConnected) {
      setRegisteredDevice(null);
      setIsRegisteringDevice(false);
      orangeStreakSinceRef.current = null; orangeAlertFiredRef.current  = false;
      redStreakSinceRef.current    = null; lastRedFireAtRef.current     = null;
      lastDisplayToneRef.current   = null;
    }
  }, [isConnected]);

  // ── Battery auto-reporting ────────────────────────────────────────────────
  // Whenever the Arduino sends a new battery notification, update the DB.
  const reportBattery = useCallback(async (level: number) => {
    if (!token || !registeredDevice?.id) return;
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    try {
      const updated = await updateDeviceBattery(token, registeredDevice.id, clamped);
      if (isMountedRef.current) {
        setRegisteredDevice((prev) =>
          prev && prev.id === updated.id ? { ...prev, ...updated } : updated,
        );
      }
    } catch (error) { console.warn('[Monitoring] Battery update failed:', error); }
  }, [token, registeredDevice]);

  // Auto-report battery whenever BLE sends a new reading
  useEffect(() => {
    if (batteryLevel === null) return;
    void reportBattery(batteryLevel);
  }, [batteryLevel, reportBattery]);

  // ─────────────────────────────────────────────────────────────────────────
  // POSTURE EVALUATION
  // ─────────────────────────────────────────────────────────────────────────

  const applyEvaluation = useCallback((evaluation: RulaEvaluation) => {
    const displayPct   = displayPosturePercentFromEvaluation(evaluation);
    const tone         = posturePercentToBadge(displayPct).tone as DisplayTone;
    const prev         = lastDisplayToneRef.current;
    lastDisplayToneRef.current = tone;

    if (tone === 'good' || tone === 'none') {
      orangeStreakSinceRef.current = null; orangeAlertFiredRef.current = false;
      redStreakSinceRef.current    = null; lastRedFireAtRef.current    = null;
    } else if (tone === 'warn') {
      redStreakSinceRef.current = null; lastRedFireAtRef.current = null;
      if (prev !== 'warn') { orangeStreakSinceRef.current = Date.now(); orangeAlertFiredRef.current = false; }
    } else {
      orangeStreakSinceRef.current = null; orangeAlertFiredRef.current = false;
      if (prev !== 'bad') { redStreakSinceRef.current = Date.now(); lastRedFireAtRef.current = null; }
    }

    if (isActiveRef.current) {
      totalEvaluationsRef.current += 1;
      // Match server severity: use API action_level, not max(part scores).
      if (evaluation.actionLevel >= 3) badEvaluationsRef.current += 1;
      sumActionLevelRef.current    += evaluation.actionLevel;
      sumDisplayPercentRef.current += (displayPct ?? 0);
      sumAnglesRef.current.upperBack     += evaluation.angles.trunkFlexion;
      sumAnglesRef.current.leftShoulder  += evaluation.angles.leftShoulderAngle;
      sumAnglesRef.current.rightShoulder += evaluation.angles.rightShoulderAngle;
      const total      = totalEvaluationsRef.current;
      const avgDisplay = total > 0 ? sumDisplayPercentRef.current / total : 100;
      setPostureScore(Math.round(avgDisplay));
      setLiveAverages({
        upperBack:     sumAnglesRef.current.upperBack     / total,
        leftShoulder:  sumAnglesRef.current.leftShoulder  / total,
        rightShoulder: sumAnglesRef.current.rightShoulder / total,
      });
    }
  }, []);

  const runEvaluateTick = useCallback(async () => {
    if (inFlightEvaluateRef.current) return;
    const currentToken     = tokenRef.current;
    const currentPacket    = livePacketRef.current;
    const currentDeviceId  = deviceIdRef.current;
    const currentSessionId = sessionIdRef.current;
    if (!currentToken || !currentPacket || !currentDeviceId || !currentSessionId) return;

    inFlightEvaluateRef.current = true;
    try {
      // Raw packet only — backend merges user_calibration (preferred) or device snapshot, then scores.
      const evaluation = await evaluatePosture(currentToken, {
        device_id:   currentDeviceId,
        session_id:  currentSessionId,
        recorded_at: new Date().toISOString(),
        bno:         currentPacket.bno,
        mpu1:        currentPacket.mpu1,
        mpu2:        currentPacket.mpu2,
      });
      if (!isMountedRef.current) return;
      setLatestEvaluation(evaluation);
      applyEvaluation(evaluation);
    } catch (error) {
      console.warn('[Monitoring] Evaluate failed:', error);
    } finally {
      const caps = shoulderStepsRef.current;
      const pkt  = livePacketRef.current;
      if (isMountedRef.current) {
        if (caps && caps.length === 3 && pkt) {
          const lNow   = shoulderElevationAtan2Deg(pkt.mpu1.Ay, pkt.mpu1.Az);
          const rNow   = shoulderElevationAtan2Deg(pkt.mpu2.Ay, pkt.mpu2.Az);
          const leftS  = caps.map((x) => x.leftDeg);
          const rightS = caps.map((x) => x.rightDeg);
          setShoulderMotionHint({
            left:  classifyShoulderElevationBand(lNow, leftS),
            right: classifyShoulderElevationBand(rNow, rightS),
          });
        } else {
          setShoulderMotionHint(null);
        }
      }
      inFlightEvaluateRef.current = false;
    }
  }, [applyEvaluation]);

  const livePacketReady    = Boolean(livePacket);
  const registeredDeviceId = registeredDevice?.id;

  useEffect(() => {
    const shouldRun =
      isActive && Boolean(token) && isConnected &&
      Boolean(registeredDeviceId) && Boolean(sessionId) && livePacketReady;

    if (!shouldRun) {
      if (evaluateIntervalRef.current) { clearInterval(evaluateIntervalRef.current); evaluateIntervalRef.current = null; }
      return;
    }
    if (evaluateIntervalRef.current) return;
    runEvaluateTick();
    evaluateIntervalRef.current = setInterval(runEvaluateTick, EVALUATE_INTERVAL_MS);
    return () => {
      if (evaluateIntervalRef.current) { clearInterval(evaluateIntervalRef.current); evaluateIntervalRef.current = null; }
    };
  }, [isActive, token, isConnected, registeredDeviceId, sessionId, livePacketReady, runEvaluateTick]);

  // ── Alert + vibration loop ────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isActiveRef.current) return;
      const evaluation = latestEvaluationRef.current;
      if (!evaluation) return;
      const displayPct = displayPosturePercentFromEvaluation(evaluation);
      const tone       = posturePercentToBadge(displayPct).tone as DisplayTone;
      if (tone === 'good' || tone === 'none') return;

      const worstPart = pickWorstBodyPart(evaluation);
      const message   = messageForWorstBodyPart(worstPart);

      if (tone === 'warn') {
        if (orangeAlertFiredRef.current) return;
        const since = orangeStreakSinceRef.current;
        if (since == null || Date.now() - since < ORANGE_PERSISTENCE_MS) return;
        orangeAlertFiredRef.current = true;
        setTotalAlerts((prev) => prev + 1);
        sendWorstBodyPartAlert(message, 3).catch(() => {});
        triggerVibrationRef.current().catch((e) => console.warn('[Monitoring] Orange vibration failed:', e));
        return;
      }

      const redSince = redStreakSinceRef.current;
      if (redSince == null) return;
      const now      = Date.now();
      const lastFire = lastRedFireAtRef.current;
      const elapsed  = lastFire == null ? now - redSince : now - lastFire;
      if (elapsed < RED_ALERT_INTERVAL_MS) return;
      lastRedFireAtRef.current = now;
      setTotalAlerts((prev) => prev + 1);
      sendWorstBodyPartAlert(message, 4).catch(() => {});
      triggerVibrationRef.current().catch((e) => console.warn('[Monitoring] Red vibration failed:', e));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SESSION CONTROL
  // ─────────────────────────────────────────────────────────────────────────

  const startMonitoring = useCallback(async () => {
    if (!token) throw new Error('You must be signed in to start monitoring.');
    if (!hasUserCalibrationBaselines(userCalibration)) {
      throw new Error(
        'Calibrate first: Profile → Sensor calibration, capture ~10s in neutral, then tap Save baselines.',
      );
    }
    if (!registeredDevice?.id) {
      throw new Error(
        isRegisteringDevice
          ? 'Still linking the shirt — try again in a second.'
          : 'No registered device. Connect a JALES Shirt first.',
      );
    }
    if (isActiveRef.current) return;

    resetSessionAccumulators();
    if (isMountedRef.current) { setLatestEvaluation(null); setShoulderMotionHint(null); }
    clearNeutralDisplayLock();

    const result = await startSession(token, registeredDevice.id);
    if (!isMountedRef.current) return;

    setSessionId(result.session_id);
    sessionIdRef.current = result.session_id;
    setSessionStartedAt(Number.isNaN(Date.parse(result.start_time)) ? Date.now() : Date.parse(result.start_time));
    setIsActive(true);
    isActiveRef.current = true;
  }, [token, registeredDevice, isRegisteringDevice, resetSessionAccumulators, clearNeutralDisplayLock, userCalibration]);

  const stopMonitoring = useCallback(async (): Promise<SessionDto | null> => {
    if (!isActiveRef.current) return null;
    if (!token || !sessionIdRef.current) { setIsActive(false); isActiveRef.current = false; return null; }

    setIsActive(false);
    isActiveRef.current = false;

    const total          = totalEvaluationsRef.current;
    const avgActionLevel = total > 0 ? sumActionLevelRef.current    / total : 1;
    const avgDisplayPct  = total > 0 ? sumDisplayPercentRef.current / total : 100;

    const payload: SessionEndPayload = {
      avg_upper_back_angle:     round1(total > 0 ? sumAnglesRef.current.upperBack     / total : 0),
      avg_left_shoulder_angle:  round1(total > 0 ? sumAnglesRef.current.leftShoulder  / total : 0),
      avg_right_shoulder_angle: round1(total > 0 ? sumAnglesRef.current.rightShoulder / total : 0),
      avg_action_level:         round1(avgActionLevel),
      avg_overall_score:        round1(avgDisplayPct),
      total_alerts:             totalAlerts,
      posture_score:            round1(avgDisplayPct),
    };

    const finishedSessionId = sessionIdRef.current;
    try {
      const ended = await endSession(token, finishedSessionId, payload);
      return ended;
    } catch (error) {
      console.warn('[Monitoring] End session failed:', error);
      return null;
    } finally {
      if (isMountedRef.current) {
        setSessionId(null); setSessionStartedAt(null);
        setLatestEvaluation(null); setShoulderMotionHint(null);
      }
      sessionIdRef.current = null;
    }
  }, [token, totalAlerts]);

  useEffect(() => {
    if (isConnected) return;
    if (!sessionIdRef.current) return;
    stopMonitoring().catch(() => {});
  }, [isConnected, stopMonitoring]);

  // ─────────────────────────────────────────────────────────────────────────
  // EVALUATION HYDRATION
  // ─────────────────────────────────────────────────────────────────────────

  const hydrateEvaluation = useCallback((evaluation: RulaEvaluation | null) => {
    if (!isMountedRef.current) return;
    setLatestEvaluation(evaluation);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getStoredLastEvaluation().then((parsed) => {
      if (cancelled || !parsed) return;
      if (latestEvaluationRef.current) return;
      hydrateEvaluation(parsed);
    }).catch((error) => { console.warn('[Monitoring] Storage hydrate failed:', error); });
    return () => { cancelled = true; };
  }, [hydrateEvaluation]);

  useEffect(() => {
    if (latestEvaluation == null) { clearStoredLastEvaluation().catch(() => {}); return; }
    setStoredLastEvaluation(latestEvaluation).catch((error) => {
      console.warn('[Monitoring] Storage persist failed:', error);
    });
  }, [latestEvaluation]);

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────

  const value: MonitoringContextValue = useMemo(
    () => ({
      registeredDevice, isRegisteringDevice, registerError,
      thresholds,
      userCalibration,
      hasUserServerCalibration,
      refreshUserCalibration,
      isActive, sessionId, sessionStartedAt,
      latestEvaluation, totalAlerts, postureScore, liveAverages,
      shoulderMotionHint,
      startMonitoring, stopMonitoring, reportBattery,
      refreshThresholds, hydrateEvaluation,
    }),
    [
      registeredDevice, isRegisteringDevice, registerError,
      thresholds,
      userCalibration,
      hasUserServerCalibration,
      refreshUserCalibration,
      isActive, sessionId, sessionStartedAt,
      latestEvaluation, totalAlerts, postureScore, liveAverages,
      shoulderMotionHint,
      startMonitoring, stopMonitoring, reportBattery,
      refreshThresholds, hydrateEvaluation,
    ],
  );

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};

const round1 = (n: number): number => Math.round(n * 10) / 10;