import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/src/services/api';
import { useAuth } from '@/src/auth/AuthContext';
import { useMonitoring } from '@/src/monitoring/MonitoringContext';
import {
  isActiveSessionCalibrationError,
  isWrongDeviceCalibrationError,
} from '@/src/services/postureCalibration';
import {
  averageBaselineSamples,
  deleteUserCalibration,
  putUserCalibration,
  sampleBaselinesFromSensors,
  hasAveragedBaselineNumbers,
  type BaselineBnoWireSample,
  type BaselineSample,
  type UserCalibrationPutBody,
} from '@/src/services/userCalibration';
import { clearCalibrationSnapshot } from '@/src/services/calibrationSnapshotStorage';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { StatPill } from '@/src/components/StatPill';
import {
  UpperBackIcon,
  LeftShoulderIcon,
  RightShoulderIcon,
} from '@/src/components/BodyPartIcons';
import { useTheme } from '@/src/theme/useTheme';
import {
  Activity,
  AlertCircle,
  Bluetooth,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  Save,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { useBle } from '@/src/hooks/useBle';
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { shoulderElevationAtan2Deg } from '@/src/utils/calibrationNeutral';
import type { ThemeTokens } from '@/src/theme/themes';

type CalibrationScreenNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'Calibration'
>;

const BASELINE_CAPTURE_MS = 10_000;
const BASELINE_SAMPLE_MS = 100;
const EXPECTED_SAMPLES = BASELINE_CAPTURE_MS / BASELINE_SAMPLE_MS;

const BNO_SAMPLE_TABLE_MAX = 40;

function BnoSamplesTable({
  theme,
  samples,
  moreHint,
}: {
  theme: ThemeTokens;
  samples: BaselineBnoWireSample[];
  /** Shown in parentheses after “+N more”, e.g. “all sent on Save”. */
  moreHint?: string;
}) {
  const shown = samples.slice(0, BNO_SAMPLE_TABLE_MAX);
  const overflow = samples.length - BNO_SAMPLE_TABLE_MAX;

  return (
    <View
      style={[
        bnoTableStyles.outer,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <View
        style={[
          bnoTableStyles.titleBar,
          { backgroundColor: theme.chip, borderBottomColor: theme.border },
        ]}
      >
        <View style={[bnoTableStyles.titleIcon, { backgroundColor: theme.primarySoft }]}>
          <Activity color={theme.primary} size={16} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText variant='caption' style={{ fontWeight: '800', color: theme.text }}>
            BNO capture timeline
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText} style={{ fontSize: 11, marginTop: 2 }}>
            {samples.length} sample{samples.length === 1 ? '' : 's'} · pitch, heading, roll
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          bnoTableStyles.headerRow,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <ThemedText
          style={[bnoTableStyles.hText, bnoTableStyles.hIdx, { color: theme.mutedText }]}
        >
          #
        </ThemedText>
        <ThemedText style={[bnoTableStyles.hText, bnoTableStyles.hTime, { color: theme.mutedText }]}>
          Time
        </ThemedText>
        <ThemedText style={[bnoTableStyles.hText, bnoTableStyles.hMeasure, { color: theme.mutedText, flex: 1 }]}>
          PITCH °
        </ThemedText>
        <ThemedText style={[bnoTableStyles.hText, bnoTableStyles.hMeasure, { color: theme.mutedText, flex: 1 }]}>
          HDG °
        </ThemedText>
        <ThemedText style={[bnoTableStyles.hText, bnoTableStyles.hMeasure, { color: theme.mutedText, flex: 1 }]}>
          ROLL °
        </ThemedText>
      </View>

      <ScrollView
        nestedScrollEnabled
        style={bnoTableStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {shown.map((s, i) => (
          <View
            key={`bno-${s.t_ms}-${i}`}
            style={[
              bnoTableStyles.dataRow,
              {
                borderBottomColor: theme.border,
                backgroundColor: i % 2 === 0 ? theme.surface : `${theme.primary}0A`,
              },
            ]}
          >
            <Text
              style={[bnoTableStyles.cellIdx, { color: theme.mutedText }]}
              numberOfLines={1}
            >
              {i + 1}
            </Text>
            <Text
              style={[bnoTableStyles.cellMono, bnoTableStyles.timeCell, { color: theme.text }]}
              numberOfLines={1}
            >
              <Text style={{ color: theme.text }}>{s.t_ms}</Text>
              <Text style={{ color: theme.mutedText, fontSize: 9 }}> ms</Text>
            </Text>
            <Text
              style={[bnoTableStyles.cellMono, bnoTableStyles.cellMeasure, { color: theme.text, flex: 1 }]}
              numberOfLines={1}
            >
              {s.pitch.toFixed(2)}
            </Text>
            <Text
              style={[bnoTableStyles.cellMono, bnoTableStyles.cellMeasure, { color: theme.text, flex: 1 }]}
              numberOfLines={1}
            >
              {s.heading.toFixed(2)}
            </Text>
            <Text
              style={[bnoTableStyles.cellMono, bnoTableStyles.cellMeasure, { color: theme.text, flex: 1 }]}
              numberOfLines={1}
            >
              {s.roll.toFixed(2)}
            </Text>
          </View>
        ))}
        {overflow > 0 ? (
          <View style={[bnoTableStyles.moreRow, { backgroundColor: theme.chip }]}>
            <ThemedText variant='caption' color={theme.mutedText} style={{ fontWeight: '600', textAlign: 'center' }}>
              … +{overflow} more
              {moreHint ? ` (${moreHint})` : ''}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const bnoTableStyles = StyleSheet.create({
  outer: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hIdx: {
    width: 32,
    textAlign: 'center',
  },
  hTime: {
    flex: 1.15,
    textAlign: 'center',
  },
  hMeasure: {
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 220,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellIdx: {
    width: 32,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  cellMono: {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  timeCell: {
    flex: 1.15,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  cellMeasure: {
    textAlign: 'center',
  },
  moreRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});

const CalibrationScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<CalibrationScreenNavigationProp>();

  const {
    device,
    bno,
    displayBno,
    displayMpu1,
    displayMpu2,
    mpu1,
    mpu2,
    isConnected,
    clearCalibrationMemoryOnly,
  } = useBle();

  const { token } = useAuth();
  const {
    isActive,
    hasUserServerCalibration,
    userCalibration,
    refreshUserCalibration,
    refreshThresholds,
  } = useMonitoring();

  const [calibrateMessage, setCalibrateMessage] = useState<string | null>(null);
  const [calibrateOk, setCalibrateOk] = useState(false);
  const [clearingUserCal, setClearingUserCal] = useState(false);
  const [isAveragingBaselines, setIsAveragingBaselines] = useState(false);
  const [avgSampleCount, setAvgSampleCount] = useState(0);
  const [lastAveragedBody, setLastAveragedBody] = useState<UserCalibrationPutBody | null>(
    null,
  );
  const [savingUserBaselines, setSavingUserBaselines] = useState(false);

  const bnoRef = useRef(bno);
  const mpu1Ref = useRef(mpu1);
  const mpu2Ref = useRef(mpu2);
  useEffect(() => { bnoRef.current = bno; }, [bno]);
  useEffect(() => { mpu1Ref.current = mpu1; }, [mpu1]);
  useEffect(() => { mpu2Ref.current = mpu2; }, [mpu2]);

  const avgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const avgStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avgSamplesRef = useRef<BaselineSample[]>([]);
  const bnoWireSamplesRef = useRef<BaselineBnoWireSample[]>([]);
  const captureWallStartRef = useRef<number>(0);
  const captureIsoStartRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (avgIntervalRef.current) clearInterval(avgIntervalRef.current);
      if (avgStopRef.current) clearTimeout(avgStopRef.current);
    };
  }, []);

  const handleBack = () => {
    navigation.navigate('ProfileMain');
  };

  const calibrationApiMessage = (e: unknown): string => {
    if (isActiveSessionCalibrationError(e)) {
      return 'End your session to calibrate or clear calibration.';
    }
    if (isWrongDeviceCalibrationError(e)) {
      return 'Wrong or unregistered device. Connect this shirt from Home and wait for it to link to your account.';
    }
    if (e instanceof ApiError) {
      return typeof e.message === 'string' && e.message
        ? e.message
        : `Request failed (${e.status}).`;
    }
    return e instanceof Error ? e.message : 'Something went wrong — try again.';
  };

  const stopBaselineAvgTimers = () => {
    if (avgIntervalRef.current) {
      clearInterval(avgIntervalRef.current);
      avgIntervalRef.current = null;
    }
    if (avgStopRef.current) {
      clearTimeout(avgStopRef.current);
      avgStopRef.current = null;
    }
  };

  const handleStartBaselineCapture = () => {
    if (!bno || !mpu1 || !mpu2) {
      setCalibrateMessage('Wait for BNO, MPU1, and MPU2 before recording.');
      setCalibrateOk(false);
      return;
    }
    if (isActive) {
      setCalibrateMessage('Stop monitoring before changing calibration.');
      setCalibrateOk(false);
      return;
    }
    stopBaselineAvgTimers();
    const wall0 = Date.now();
    captureWallStartRef.current = wall0;
    captureIsoStartRef.current = new Date(wall0).toISOString();
    avgSamplesRef.current = [];
    bnoWireSamplesRef.current = [];
    setAvgSampleCount(0);
    setLastAveragedBody(null);
    setIsAveragingBaselines(true);
    setCalibrateMessage(null);
    avgIntervalRef.current = setInterval(() => {
      const bb = bnoRef.current;
      const m1 = mpu1Ref.current;
      const m2 = mpu2Ref.current;
      if (!bb || !m1 || !m2) return;
      const t_ms = Date.now() - captureWallStartRef.current;
      bnoWireSamplesRef.current.push({
        t_ms,
        pitch: bb.pitch,
        heading: bb.heading,
        roll: bb.roll,
      });
      avgSamplesRef.current.push(sampleBaselinesFromSensors(bb, m1, m2));
      setAvgSampleCount(avgSamplesRef.current.length);
    }, BASELINE_SAMPLE_MS);
    avgStopRef.current = setTimeout(() => {
      stopBaselineAvgTimers();
      setIsAveragingBaselines(false);
      const averaged = averageBaselineSamples(avgSamplesRef.current);
      const hasKeys = hasAveragedBaselineNumbers(averaged);
      const isoEnd = new Date().toISOString();
      setLastAveragedBody(
        hasKeys
          ? {
              ...averaged,
              baseline_samples: [...bnoWireSamplesRef.current],
              baseline_capture_started_at: captureIsoStartRef.current,
              baseline_capture_ended_at: isoEnd,
            }
          : null,
      );
      if (avgSamplesRef.current.length > 0 && hasKeys) {
        setCalibrateMessage(
          `Captured ${avgSamplesRef.current.length} samples — tap Save baselines.`,
        );
        setCalibrateOk(true);
      } else {
        setCalibrateMessage('No usable samples. Hold still and try again.');
        setCalibrateOk(false);
      }
    }, BASELINE_CAPTURE_MS);
  };

  const handleSaveUserBaselines = async () => {
    if (!token) {
      setCalibrateMessage('Sign in to save baselines.');
      setCalibrateOk(false);
      return;
    }
    if (isActive) {
      setCalibrateMessage('Stop monitoring before saving calibration.');
      setCalibrateOk(false);
      return;
    }
    const body = lastAveragedBody;
    if (!body || !hasAveragedBaselineNumbers(body)) {
      setCalibrateMessage('Run the 10s capture first.');
      setCalibrateOk(false);
      return;
    }
    setSavingUserBaselines(true);
    setCalibrateMessage(null);
    setCalibrateOk(false);
    try {
      const res = await putUserCalibration(token, body);
      if (res.thresholdsSynced) await refreshThresholds();
      await refreshUserCalibration();
      setCalibrateMessage('Baselines saved. You can start monitoring from Home.');
      setCalibrateOk(true);
    } catch (e) {
      setCalibrateMessage(calibrationApiMessage(e));
      setCalibrateOk(false);
    } finally {
      setSavingUserBaselines(false);
    }
  };

  const handleClearUserAccountCalibration = async () => {
    if (!token) {
      setCalibrateMessage('Sign in to clear calibration.');
      setCalibrateOk(false);
      return;
    }
    if (isActive) {
      setCalibrateMessage('End your session to clear calibration.');
      setCalibrateOk(false);
      return;
    }
    setClearingUserCal(true);
    setCalibrateMessage(null);
    setCalibrateOk(false);
    try {
      await deleteUserCalibration(token);
      await clearCalibrationSnapshot();
      clearCalibrationMemoryOnly();
      await refreshUserCalibration();
      setLastAveragedBody(null);
      setCalibrateMessage('Calibration cleared.');
      setCalibrateOk(true);
    } catch (e) {
      setCalibrateMessage(calibrationApiMessage(e));
      setCalibrateOk(false);
    } finally {
      setClearingUserCal(false);
    }
  };

  const busy =
    isAveragingBaselines || savingUserBaselines || clearingUserCal;

  const liveBno = displayBno ?? bno;
  const liveMpu1 = displayMpu1 ?? mpu1;
  const liveMpu2 = displayMpu2 ?? mpu2;

  const sensorsReady = Boolean(liveBno && liveMpu1 && liveMpu2);
  const recordProgress = Math.min(1, avgSampleCount / EXPECTED_SAMPLES);

  const hasServerPreview =
    userCalibration &&
    (userCalibration.back_baseline_pitch != null ||
      userCalibration.left_shoulder_baseline != null ||
      userCalibration.right_shoulder_baseline != null);

  return (
    <Screen scrollable={false}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.backHit}>
          <ChevronLeft color={theme.text} size={26} />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <ThemedText variant='subtitle' style={styles.topTitle}>
            Calibration
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText} numberOfLines={1}>
            Teach JALES your neutral posture
          </ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {!isConnected ? (
          <ThemedCard
            variant='elevated'
            style={[
              styles.banner,
              {
                borderColor: `${theme.danger}44`,
                backgroundColor: isDark ? theme.surface : '#FEF2F2',
              },
            ]}
          >
            <View style={styles.bannerRow}>
              <View style={[styles.bannerIconWrap, { backgroundColor: `${theme.danger}22` }]}>
                <AlertCircle color={theme.danger} size={26} />
              </View>
              <View style={styles.bannerText}>
                <ThemedText variant='body' style={styles.bannerTitle}>
                  Shirt not connected
                </ThemedText>
                <ThemedText variant='caption' color={theme.mutedText} style={{ lineHeight: 20 }}>
                  Connect the shirt, then return here to capture baselines.
                </ThemedText>
              </View>
            </View>
            <ThemedButton
              title='Go to Connect'
              variant='outline'
              size='md'
              onPress={() => navigation.navigate('Connect')}
              style={[styles.ctaRounded, { marginTop: 16 }]}
            />
          </ThemedCard>
        ) : (
          <ThemedCard variant='elevated' style={styles.deviceCard}>
            <View style={styles.deviceRow}>
              <View
                style={[styles.deviceIcon, { backgroundColor: theme.primarySoft }]}
              >
                <Bluetooth color={theme.primary} size={22} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText variant='label' style={{ fontWeight: '700' }}>
                  {device?.name || device?.localName || 'JALES Shirt'}
                </ThemedText>
                <ThemedText variant='caption' color={theme.mutedText} numberOfLines={1}>
                  {device?.id}
                </ThemedText>
              </View>
              <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
            </View>
          </ThemedCard>
        )}

        {isConnected ? (
          <ThemedCard variant='elevated' style={styles.mainCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: theme.primarySoft }]}>
                <Sliders color={theme.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant='label' style={styles.sectionTitle}>
                  Neutral baselines
                </ThemedText>
                <ThemedText variant='caption' color={theme.mutedText} style={{ lineHeight: 18 }}>
                  Sit comfortably in your usual neutral. We capture upper back tilt and both
                  shoulders for monitoring.
                </ThemedText>
              </View>
            </View>

            <View style={[styles.heroStrip, { backgroundColor: theme.chip, borderColor: theme.border }]}>
              <View style={styles.heroIcons}>
                <UpperBackIcon size={36} />
                <LeftShoulderIcon size={32} />
                <RightShoulderIcon size={32} />
              </View>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.heroCaption}>
                Upper back · Left shoulder · Right shoulder
              </ThemedText>
            </View>

            <View style={styles.stepsRow}>
              {[
                { n: '1', t: 'Sit neutral', d: 'Relaxed, upright' },
                { n: '2', t: 'Record ~10s', d: 'Hold very still' },
                { n: '3', t: 'Save', d: 'Sync to account' },
              ].map((s, i) => (
                <View
                  key={s.n}
                  style={[
                    styles.stepCell,
                    i < 2 && {
                      borderRightWidth: StyleSheet.hairlineWidth,
                      borderRightColor: theme.border,
                    },
                  ]}
                >
                  <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText variant='caption' style={styles.stepBadgeText}>
                      {s.n}
                    </ThemedText>
                  </View>
                  <ThemedText variant='caption' style={{ fontWeight: '700', marginTop: 8 }}>
                    {s.t}
                  </ThemedText>
                  <ThemedText variant='caption' color={theme.mutedText} style={{ marginTop: 2, fontSize: 11 }}>
                    {s.d}
                  </ThemedText>
                </View>
              ))}
            </View>

            {hasUserServerCalibration ? (
              <View style={[styles.statusPill, { backgroundColor: `${theme.success}18` }]}>
                <CheckCircle2 color={theme.success} size={18} />
                <ThemedText variant='caption' style={{ color: theme.success, fontWeight: '700', marginLeft: 8 }}>
                  Baselines saved — you can monitor from Home
                </ThemedText>
              </View>
            ) : null}

            {hasServerPreview ? (
              <ThemedCard variant='outline' style={styles.nestedCard}>
                <ThemedText variant='caption' color={theme.mutedText} style={{ marginBottom: 10, fontWeight: '600' }}>
                  Saved on server
                </ThemedText>
                <View style={styles.metricRow}>
                  {userCalibration!.back_baseline_pitch != null ? (
                    <View style={[styles.metricTile, { backgroundColor: theme.chip }]}>
                      <UpperBackIcon size={22} style={{ marginBottom: 6 }} />
                      <ThemedText variant='body' style={{ fontWeight: '800' }}>
                        {Number(userCalibration!.back_baseline_pitch).toFixed(1)}°
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Upper back
                      </ThemedText>
                    </View>
                  ) : null}
                  {userCalibration!.left_shoulder_baseline != null ? (
                    <View style={[styles.metricTile, { backgroundColor: theme.chip }]}>
                      <LeftShoulderIcon size={20} style={{ marginBottom: 6 }} />
                      <ThemedText variant='body' style={{ fontWeight: '800' }}>
                        {Number(userCalibration!.left_shoulder_baseline).toFixed(1)}°
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Left
                      </ThemedText>
                    </View>
                  ) : null}
                  {userCalibration!.right_shoulder_baseline != null ? (
                    <View style={[styles.metricTile, { backgroundColor: theme.chip }]}>
                      <RightShoulderIcon size={20} style={{ marginBottom: 6 }} />
                      <ThemedText variant='body' style={{ fontWeight: '800' }}>
                        {Number(userCalibration!.right_shoulder_baseline).toFixed(1)}°
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Right
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                {typeof (userCalibration as Record<string, unknown>).five_second_sample_count ===
                'number' ? (
                  <ThemedText variant='caption' color={theme.mutedText} style={{ marginTop: 10 }}>
                    Last capture samples (server):{' '}
                    {String((userCalibration as Record<string, unknown>).five_second_sample_count)}
                  </ThemedText>
                ) : null}
                {Array.isArray(userCalibration!.baseline_samples) &&
                userCalibration!.baseline_samples!.length > 0 ? (
                  <View style={{ marginTop: 14 }}>
                    <BnoSamplesTable theme={theme} samples={userCalibration!.baseline_samples!} />
                  </View>
                ) : null}
                {(typeof userCalibration!.baseline_capture_started_at === 'string' &&
                  userCalibration!.baseline_capture_started_at) ||
                (typeof userCalibration!.baseline_capture_ended_at === 'string' &&
                  userCalibration!.baseline_capture_ended_at) ? (
                  <View style={{ marginTop: 10 }}>
                    {typeof userCalibration!.baseline_capture_started_at === 'string' ? (
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Capture start: {userCalibration!.baseline_capture_started_at}
                      </ThemedText>
                    ) : null}
                    {typeof userCalibration!.baseline_capture_ended_at === 'string' ? (
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Capture end: {userCalibration!.baseline_capture_ended_at}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </ThemedCard>
            ) : null}

            <ThemedText variant='caption' color={theme.mutedText} style={{ marginBottom: 8, fontWeight: '600' }}>
              Live preview
            </ThemedText>
            <View style={styles.livePills}>
              <StatPill
                label='Upper back (pitch)'
                value={
                  sensorsReady && liveBno
                    ? `${liveBno.pitch.toFixed(1)}°`
                    : '—'
                }
              />
              <StatPill
                label='Left shoulder'
                value={
                  sensorsReady && liveMpu1
                    ? `${shoulderElevationAtan2Deg(liveMpu1.ay, liveMpu1.az).toFixed(1)}°`
                    : '—'
                }
              />
              <StatPill
                label='Right shoulder'
                value={
                  sensorsReady && liveMpu2
                    ? `${shoulderElevationAtan2Deg(liveMpu2.ay, liveMpu2.az).toFixed(1)}°`
                    : '—'
                }
              />
            </View>

            {!sensorsReady ? (
              <View style={[styles.waitingRow, { backgroundColor: theme.chip }]}>
                <CircleDot color={theme.warning} size={16} />
                <ThemedText variant='caption' color={theme.mutedText} style={{ marginLeft: 8, flex: 1 }}>
                  Waiting for BNO and both MPUs…
                </ThemedText>
              </View>
            ) : null}

            {isAveragingBaselines ? (
              <View style={[styles.recordingBox, { borderColor: `${theme.primary}55`, backgroundColor: theme.primarySoft }]}>
                <View style={styles.recordingTitleRow}>
                  <Sparkles color={theme.primary} size={18} />
                  <ThemedText variant='body' style={{ fontWeight: '800', color: theme.primary, marginLeft: 8 }}>
                    Recording… {avgSampleCount} samples
                  </ThemedText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: `${theme.primary}33` }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(recordProgress * 100)}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
                <ThemedText variant='caption' color={theme.mutedText} style={{ marginTop: 8 }}>
                  Stay still until the bar completes.
                </ThemedText>
              </View>
            ) : null}

            {lastAveragedBody != null && hasAveragedBaselineNumbers(lastAveragedBody) ? (
              <ThemedCard variant='outline' style={styles.nestedCard}>
                <View style={styles.readyHeader}>
                  <Save color={theme.primary} size={18} />
                  <ThemedText variant='caption' color={theme.mutedText} style={{ marginLeft: 8, fontWeight: '700' }}>
                    Ready to save
                  </ThemedText>
                </View>
                <View style={styles.metricRow}>
                  {lastAveragedBody.back_baseline_pitch != null ? (
                    <View style={[styles.metricTile, { backgroundColor: theme.chip }]}>
                      <UpperBackIcon size={22} style={{ marginBottom: 6 }} />
                      <ThemedText variant='body' style={{ fontWeight: '800' }}>
                        {lastAveragedBody.back_baseline_pitch.toFixed(1)}°
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Upper back
                      </ThemedText>
                    </View>
                  ) : null}
                  {lastAveragedBody.left_shoulder_baseline != null ? (
                    <View style={[styles.metricTile, { backgroundColor: theme.chip }]}>
                      <LeftShoulderIcon size={20} style={{ marginBottom: 6 }} />
                      <ThemedText variant='body' style={{ fontWeight: '800' }}>
                        {lastAveragedBody.left_shoulder_baseline.toFixed(1)}°
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Left
                      </ThemedText>
                    </View>
                  ) : null}
                  {lastAveragedBody.right_shoulder_baseline != null ? (
                    <View style={[styles.metricTile, { backgroundColor: theme.chip }]}>
                      <RightShoulderIcon size={20} style={{ marginBottom: 6 }} />
                      <ThemedText variant='body' style={{ fontWeight: '800' }}>
                        {lastAveragedBody.right_shoulder_baseline.toFixed(1)}°
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Right
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                {lastAveragedBody.baseline_capture_started_at ? (
                  <ThemedText variant='caption' color={theme.mutedText} style={{ marginTop: 8 }}>
                    Started: {lastAveragedBody.baseline_capture_started_at}
                  </ThemedText>
                ) : null}
                {lastAveragedBody.baseline_capture_ended_at ? (
                  <ThemedText variant='caption' color={theme.mutedText}>
                    Ended: {lastAveragedBody.baseline_capture_ended_at}
                  </ThemedText>
                ) : null}
                {lastAveragedBody.baseline_samples &&
                lastAveragedBody.baseline_samples.length > 0 ? (
                  <View style={{ marginTop: 14 }}>
                    <BnoSamplesTable
                      theme={theme}
                      samples={lastAveragedBody.baseline_samples}
                      moreHint='all sent on Save'
                    />
                  </View>
                ) : null}
              </ThemedCard>
            ) : null}

            <ThemedButton
              title={isAveragingBaselines ? 'Recording…' : 'Record ~10 seconds'}
              variant='primary'
              size='md'
              onPress={handleStartBaselineCapture}
              disabled={
                !token ||
                isActive ||
                busy ||
                !bno ||
                !mpu1 ||
                !mpu2
              }
              loading={isAveragingBaselines}
              style={styles.ctaRounded}
            />
            <ThemedButton
              title={savingUserBaselines ? 'Saving…' : 'Save baselines'}
              variant='outline'
              size='md'
              onPress={() => void handleSaveUserBaselines()}
              disabled={
                !token ||
                isActive ||
                !lastAveragedBody ||
                !hasAveragedBaselineNumbers(lastAveragedBody) ||
                busy
              }
              loading={savingUserBaselines}
              style={[styles.ctaRounded, { marginTop: 12 }]}
            />

            <TouchableOpacity
              style={[
                styles.clearBtn,
                {
                  borderColor: `${theme.danger}88`,
                  opacity: !token || isActive || busy ? 0.45 : 1,
                },
              ]}
              onPress={() => void handleClearUserAccountCalibration()}
              disabled={!token || isActive || busy}
              activeOpacity={0.7}
            >
              {clearingUserCal ? (
                <ActivityIndicator color={theme.danger} size='small' />
              ) : (
                <>
                  <Trash2 color={theme.danger} size={18} />
                  <ThemedText variant='caption' style={{ color: theme.danger, fontWeight: '700', marginLeft: 8 }}>
                    Clear calibration
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>

            {calibrateMessage ? (
              <View
                style={[
                  styles.feedbackBox,
                  {
                    backgroundColor: calibrateOk ? `${theme.success}14` : `${theme.danger}12`,
                    borderColor: calibrateOk ? `${theme.success}44` : `${theme.danger}44`,
                  },
                ]}
              >
                <ThemedText
                  variant='caption'
                  style={{
                    color: calibrateOk ? theme.success : theme.danger,
                    fontWeight: '700',
                    lineHeight: 20,
                  }}
                >
                  {calibrateOk ? '✓ ' : '✗ '}
                  {calibrateMessage}
                </ThemedText>
              </View>
            ) : null}
          </ThemedCard>
        ) : null}

        <View style={styles.spacer} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backHit: {
    padding: 4,
    marginLeft: -4,
  },
  topTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  topTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  banner: {
    marginBottom: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, gap: 6 },
  bannerTitle: { fontWeight: '800', fontSize: 16 },
  deviceCard: { marginBottom: 16, borderRadius: 16, paddingVertical: 14 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mainCard: {
    marginBottom: 16,
    paddingVertical: 18,
    borderRadius: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  heroStrip: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 18,
    alignItems: 'center',
  },
  heroIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  heroCaption: {
    marginTop: 10,
    textAlign: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepCell: {
    flex: 1,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  nestedCard: {
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 88,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  livePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  recordingBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
  },
  recordingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaRounded: {
    borderRadius: 14,
  },
  clearBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feedbackBox: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  spacer: { height: 24 },
});

export default CalibrationScreen;
