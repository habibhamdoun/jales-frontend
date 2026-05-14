import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { AppTabsParamList } from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ScoreDots } from '@/src/components/ScoreDots';
import { useTheme } from '@/src/theme/useTheme';
import { useAuth } from '@/src/auth/AuthContext';
import { ensureDailySummary } from '@/src/services/summaries';
import { listSessions, type SessionDto } from '@/src/services/sessions';
import {
  dtoToHomeDaySnapshot,
  type HomeDaySnapshot,
} from '@/src/services/summaryViewModels';
import {
  Activity,
  Bluetooth,
  BluetoothOff,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Info,
  LayoutGrid,
  Moon,
  PlayCircle,
  Sparkles,
  Sun,
  Zap,
  Smile,
  Meh,
  Frown,
} from 'lucide-react-native';
import {
  UpperBackIcon,
  LeftShoulderIcon,
  RightShoulderIcon,
} from '@/src/components/BodyPartIcons';
import { useBle } from '@/src/hooks/useBle';
import { useMonitoring } from '@/src/monitoring/MonitoringContext';
import {
  displayPosturePercentFromEvaluation,
  posturePercentToBadge,
  scoreToColor,
} from '@/src/services/posture';
import {
  appendOngoingLocalSessionSegment,
  formatLocalDayTicks,
  formatWindowTicks,
  goodPostureFallbackSegments,
  localDayBounds,
  monitoringWindowBounds,
  scoreToTimelineTone,
  sessionsIntersectingDay,
  sessionsToTimelineSegments,
  type TimelineSegment,
  type TimelineTone,
} from '@/src/utils/dayTimeline';

// Hero orb geometry. Outer = total artboard (bloom included);
// the progress ring sits on RING_RADIUS, the inner gradient sphere on ORB_INNER.
const ORB_OUTER = 240;
const RING_STROKE = 10;
const RING_RADIUS = ORB_OUTER / 2 - RING_STROKE / 2 - 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const ORB_INNER = 168;

/** Live hint from 3-step shoulder calibration vs MPU atan2 (MonitoringProvider). */
function shoulderCalMotionLabel(band: 'good' | 'elevated' | 'high'): string {
  switch (band) {
    case 'good':
      return '3-step cal: good';
    case 'elevated':
      return '3-step cal: elevated';
    case 'high':
      return '3-step cal: high';
  }
}

/** Matches timeline “warn” segments and dayTimeline score bands. */
const TIMELINE_WARN_COLOR = '#F59E0B';

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

const HomeScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();
  const { token, user } = useAuth();

  const { device, bno, displayBno, isConnected } = useBle();

  const {
    isActive,
    sessionId,
    sessionStartedAt,
    totalAlerts,
    latestEvaluation,
    registeredDevice,
    isRegisteringDevice,
    registerError,
    hasUserServerCalibration,
    startMonitoring,
    stopMonitoring,
    shoulderMotionHint,
  } = useMonitoring();

  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const [daySnapshot, setDaySnapshot] = useState<HomeDaySnapshot | null>(null);
  const [todaySessions, setTodaySessions] = useState<SessionDto[]>([]);

  const loadTodaySummary = useCallback(async () => {
    if (!token) {
      setDaySnapshot(null);
      setTodaySessions([]);
      return;
    }
    try {
      const [dto, sessions] = await Promise.all([
        ensureDailySummary(token),
        listSessions(token, 40),
      ]);
      setDaySnapshot(dtoToHomeDaySnapshot(dto));
      setTodaySessions(Array.isArray(sessions) ? sessions : []);
    } catch {
      setDaySnapshot(null);
      setTodaySessions([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadTodaySummary();
    }, [loadTodaySummary]),
  );

  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (wasActiveRef.current && !isActive && token) {
      void loadTodaySummary();
    }
    wasActiveRef.current = isActive;
  }, [isActive, token, loadTodaySummary]);

  /** Baselines can be OK while BLE / device register still block Start monitoring — log the gate. */
  useEffect(() => {
    if (isActive || isToggling) return;
    const blocked: string[] = [];
    if (!isConnected) blocked.push('Bluetooth not connected');
    if (!hasUserServerCalibration) blocked.push('No user baselines (GET /user/calibration)');
    if (!registeredDevice) blocked.push('No registeredDevice (POST /devices/register)');
    if (isRegisteringDevice) blocked.push('Device registration in progress');
    if (blocked.length > 0) {
      console.log('[Home] Start monitoring disabled:', blocked.join(' · '));
    }
  }, [
    isActive,
    isToggling,
    isConnected,
    hasUserServerCalibration,
    registeredDevice,
    isRegisteringDevice,
  ]);

  const greetingPack = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { line: 'Good morning', Icon: Sun };
    if (h < 17) return { line: 'Good afternoon', Icon: Sun };
    return { line: 'Good evening', Icon: Moon };
  }, []);

  const displayFirstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return 'there';
    const part = n.split(/\s+/)[0];
    return part && part.length > 0 ? part : 'there';
  }, [user?.name]);

  const dayTimeline = useMemo(() => {
    const { start: dayStart, end: dayEnd } = localDayBounds();
    const inDay = sessionsIntersectingDay(todaySessions, dayStart, dayEnd);
    const currentStartMs =
      isActive && sessionStartedAt != null ? sessionStartedAt : null;

    const win = monitoringWindowBounds(
      inDay,
      currentStartMs,
      dayStart,
      dayEnd,
    );

    if (win != null) {
      let segments = sessionsToTimelineSegments(
        inDay,
        win.windowStart,
        win.windowEnd,
      );
      const hasOpenSessionInList = inDay.some((s) => !s.end_time);
      if (isActive && sessionStartedAt != null && !hasOpenSessionInList) {
        const livePct = displayPosturePercentFromEvaluation(latestEvaluation);
        const liveTone =
          livePct == null ? 'neutral' : scoreToTimelineTone(livePct);
        segments = appendOngoingLocalSessionSegment(
          segments,
          win.windowStart,
          win.windowEnd,
          sessionStartedAt,
          liveTone,
        );
      }
      return {
        segments,
        tickLabels: formatWindowTicks(win.windowStart, win.windowEnd),
      };
    }

    const fullDayTicks = formatLocalDayTicks();
    if (daySnapshot != null) {
      return {
        segments: goodPostureFallbackSegments(
          daySnapshot.good_posture_percentage,
        ),
        tickLabels: fullDayTicks,
      };
    }
    return { segments: [] as TimelineSegment[], tickLabels: fullDayTicks };
  }, [
    todaySessions,
    daySnapshot,
    isActive,
    sessionStartedAt,
    latestEvaluation,
  ]);

  const timelineFill = (tone: TimelineTone) => {
    switch (tone) {
      case 'good':
        return theme.primary;
      case 'warn':
        return TIMELINE_WARN_COLOR;
      case 'bad':
        return theme.danger;
      default:
        return theme.mutedText;
    }
  };

  // Hero-orb animated values: ring fills smoothly when percentage changes,
  // pulse loops a subtle scale so the orb feels alive when data is flowing.
  const ringProgress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive || !sessionStartedAt) {
      setSessionElapsedMs(0);
      return;
    }
    setSessionElapsedMs(Date.now() - sessionStartedAt);
    const timer = setInterval(() => {
      setSessionElapsedMs(Date.now() - sessionStartedAt);
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, sessionStartedAt]);

  const handleStartMonitoring = async () => {
    setIsToggling(true);
    try {
      await startMonitoring();
    } catch (err) {
      Alert.alert(
        'Could not start session',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsToggling(false);
    }
  };

  const handleStopMonitoring = async () => {
    setIsToggling(true);
    try {
      const ended = await stopMonitoring();
      if (ended) {
        Alert.alert(
          'Session complete',
          `Posture score: ${ended.posture_score ?? '—'}\nAlerts: ${ended.total_alerts ?? 0}`,
        );
      }
    } catch (err) {
      Alert.alert(
        'Could not end session',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsToggling(false);
    }
  };

  // Live score only while monitoring and we have an evaluation with a usable %.
  const liveEval = isActive ? latestEvaluation : null;
  const displayPctRunning = displayPosturePercentFromEvaluation(liveEval);
  const hasLivePostureScore =
    isActive &&
    liveEval != null &&
    displayPctRunning != null &&
    Number.isFinite(displayPctRunning);

  const hasLiveData = hasLivePostureScore;

  const heroPercent = hasLivePostureScore
    ? Math.max(0, Math.min(100, displayPctRunning))
    : 0;

  type IdleBannerMode = 'connect' | 'calibrate' | 'start' | 'warming';
  const idleBannerMode: IdleBannerMode | null = hasLivePostureScore
    ? null
    : !isConnected
      ? 'connect'
      : !hasUserServerCalibration
        ? 'calibrate'
        : !isActive
          ? 'start'
          : 'warming';

  const IDLE_BANNER: Record<
    IdleBannerMode,
    { title: string; hint: string; Icon: typeof Bluetooth }
  > = {
    connect: {
      title: 'Connect your shirt',
      hint: 'Pair the JALES Shirt over Bluetooth, then start monitoring to see your live score.',
      Icon: Bluetooth,
    },
    calibrate: {
      title: 'Calibrate before monitoring',
      hint: 'Open Sensor calibration under Profile, hold neutral ~10s, then save baselines. Monitoring stays off until that is done.',
      Icon: Sparkles,
    },
    start: {
      title: 'Start monitoring',
      hint: 'Tap Start monitoring below while wearing the shirt to track posture and fill the score.',
      Icon: PlayCircle,
    },
    warming: {
      title: 'Getting your first score',
      hint: 'Stay still for a few seconds while we process the first reading.',
      Icon: Activity,
    },
  };

  const badge = posturePercentToBadge(
    hasLivePostureScore ? displayPctRunning : null,
  );

  const MoodIcon =
    badge.tone === 'none'
      ? Smile
      : badge.tone === 'bad'
        ? Frown
        : badge.tone === 'warn'
          ? Meh
          : Smile;

  const StatusBannerIcon =
    badge.tone === 'good'
      ? CheckCircle2
      : badge.tone === 'warn'
        ? AlertTriangle
        : badge.tone === 'bad'
          ? AlertCircle
          : Info;

  const HeroOrbIcon =
    idleBannerMode != null ? IDLE_BANNER[idleBannerMode].Icon : MoodIcon;

  const liveBannerHint =
    badge.tone === 'good'
      ? "You're sitting well — keep it up."
      : badge.tone === 'warn'
        ? 'Take a moment to straighten your back.'
        : badge.tone === 'bad'
          ? 'Stop and reset your posture now.'
          : 'Keep monitoring for updated feedback.';

  const idleBannerCopy =
    idleBannerMode == null ? null : IDLE_BANNER[idleBannerMode];
  const IdleBannerStatusIcon = idleBannerCopy?.Icon ?? Bluetooth;

  // Same value as the orb; kept as `monitoringScore` so any stale reference
  // (or cached bundles) still resolve to the latest-reading %, not a missing binding.
  const monitoringScore = heroPercent;

  // Animate the progress ring whenever the score moves.
  useEffect(() => {
    Animated.timing(ringProgress, {
      toValue: heroPercent / 100,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [heroPercent, ringProgress]);

  // Pulse loop while live data is flowing; held flat otherwise.
  useEffect(() => {
    if (!hasLiveData) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.035,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hasLiveData, pulse]);

  // Solid colors per state (no gradient on the orb itself). All three radial
  // stops resolve to the same fill so the sphere reads as one flat color;
  // `glow` is a softer tint used only for the outer halo behind the orb.
  const scoreColors =
    idleBannerMode != null
      ? {
          light: '#94A3B8',
          mid: '#94A3B8',
          dark: '#94A3B8',
          glow: '#CBD5E1',
        }
      : badge.tone === 'none'
    ? {
        light: '#64748B',
        mid: '#64748B',
        dark: '#64748B',
        glow: '#CBD5E1',
      }
    : badge.tone === 'bad'
      ? {
          // Solid red.
          light: '#EF4444',
          mid: '#EF4444',
          dark: '#EF4444',
          glow: '#FCA5A5',
        }
      : badge.tone === 'warn'
        ? {
            // Solid yellowish-orange.
            light: '#F59E0B',
            mid: '#F59E0B',
            dark: '#F59E0B',
            glow: '#FCD34D',
          }
        : {
            // Solid teal (matches theme.primary).
            light: '#14B8A6',
            mid: '#14B8A6',
            dark: '#14B8A6',
            glow: '#5EEAD4',
          };

  const handleConnect = () => {
    //@ts-ignore
    navigation.navigate('Profile', { screen: 'Connect' });
  };

  const handleOpenCalibration = () => {
    //@ts-ignore
    navigation.navigate('Profile', { screen: 'Calibration' });
  };

  // Three body-part cards (trunk + shoulders): live scores from /posture/evaluate.
  type BodyCard = {
    key: string;
    label: string;
    icon: React.ReactNode;
    score: number | null;
    angleDegrees: number | null;
  };

  const noSignal = !liveEval;
  const dimColor = theme.mutedText;
  const liveIconTint = theme.primary;
  const iconTint = noSignal ? dimColor : liveIconTint;

  const bodyCards: BodyCard[] = noSignal
    ? [
        {
          key: 'upper-back',
          label: 'Upper Back',
          icon: <UpperBackIcon color={iconTint} size={26} />,
          score: null,
          angleDegrees: null,
        },
        {
          key: 'left-shoulder',
          label: 'Left Shoulder',
          icon: <LeftShoulderIcon color={iconTint} size={26} />,
          score: null,
          angleDegrees: null,
        },
        {
          key: 'right-shoulder',
          label: 'Right Shoulder',
          icon: <RightShoulderIcon color={iconTint} size={26} />,
          score: null,
          angleDegrees: null,
        },
      ]
    : [
        {
          key: 'upper-back',
          label: 'Upper Back',
          icon: <UpperBackIcon color={iconTint} size={26} />,
          score: liveEval!.trunkScore,
          angleDegrees: liveEval!.angles.trunkFlexion,
        },
        {
          key: 'left-shoulder',
          label: 'Left Shoulder',
          icon: <LeftShoulderIcon color={iconTint} size={26} />,
          score: liveEval!.leftShoulderScore,
          angleDegrees: liveEval!.angles.leftShoulderAngle,
        },
        {
          key: 'right-shoulder',
          label: 'Right Shoulder',
          icon: <RightShoulderIcon color={iconTint} size={26} />,
          score: liveEval!.rightShoulderScore,
          angleDegrees: liveEval!.angles.rightShoulderAngle,
        },
      ];

  const upperBackCard =
    bodyCards.find((c) => c.key === 'upper-back') ?? bodyCards[0];
  const shoulderCards = bodyCards.filter((c) => c.key !== 'upper-back');

  const renderBodyMapUpperBack = () => {
    const card = upperBackCard;
    const offline = card.score == null;
    const partColor = offline
      ? dimColor
      : scoreToColor(card.score ?? null);
    return (
      <ThemedCard
        key={card.key}
        style={[
          styles.bodyCard,
          styles.bodyCardTrunk,
          softCardRim,
          offline && styles.bodyCardOffline,
          !offline && {
            borderColor: partColor,
            backgroundColor: `${partColor}0D`,
          },
        ]}
      >
        <View style={styles.bodyCardTrunkInner}>
          <View style={styles.bodyCardTrunkMain}>
            <View style={styles.bodyCardIconWrap}>{card.icon}</View>
            <View style={styles.bodyCardTrunkText}>
              <View style={styles.bodyCardTrunkTitleRow}>
                <ThemedText
                  style={[
                    styles.bodyCardLabel,
                    { color: offline ? dimColor : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {card.label}
                </ThemedText>
                <View
                  style={[
                    styles.bodyCardStatusDot,
                    { backgroundColor: partColor },
                  ]}
                />
              </View>
              {offline ? (
                <ThemedText
                  style={[styles.bodyCardNoSignal, { color: dimColor }]}
                >
                  No signal
                </ThemedText>
              ) : null}
            </View>
          </View>
          {!offline ? (
            <View style={styles.bodyCardTrunkMetrics}>
              <ThemedText
                style={[styles.bodyCardScore, { color: partColor }]}
              >
                {card.score} / 4
              </ThemedText>
              <ThemedText
                style={[styles.bodyCardAngle, { color: theme.mutedText }]}
              >
                {Math.round(card.angleDegrees ?? 0)}°
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ThemedCard>
    );
  };

  const GreetingIcon = greetingPack.Icon;

  const softCardRim = useMemo(
    () => ({
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    }),
    [theme.border],
  );

  return (
    <View style={styles.root}>
      <Screen scrollable>
        <View
          style={[
            styles.headerShell,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View pointerEvents='none' style={styles.headerDecorLayer}>
            <View
              style={[
                styles.headerBlobLarge,
                { backgroundColor: `${theme.primary}12` },
              ]}
            />
            <View
              style={[
                styles.headerBlobSmall,
                { backgroundColor: `${theme.chart2}14` },
              ]}
            />
            <Svg
              width='100%'
              height='100%'
              style={StyleSheet.absoluteFill}
              preserveAspectRatio='none'
            >
              <Defs>
                <LinearGradient id='homeHeaderWash' x1='0' y1='0' x2='1' y2='1'>
                  <Stop offset='0%' stopColor={theme.primary} stopOpacity={0.08} />
                  <Stop offset='55%' stopColor={theme.primary} stopOpacity={0} />
                  <Stop offset='100%' stopColor={theme.chart3} stopOpacity={0.06} />
                </LinearGradient>
              </Defs>
              <Rect x='0' y='0' width='100%' height='100%' fill='url(#homeHeaderWash)' />
            </Svg>
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerMain}>
              <View style={styles.greetingLine}>
                <GreetingIcon
                  color={theme.primary}
                  size={15}
                  strokeWidth={2.5}
                />
                <ThemedText
                  variant='caption'
                  style={[styles.greetingWordmark, { color: theme.primary }]}
                >
                  {greetingPack.line}
                </ThemedText>
              </View>
              <ThemedText
                variant='title'
                color={theme.text}
                style={styles.headerHeadline}
              >
                Hi, {displayFirstName}
              </ThemedText>
              <View style={styles.headerTagline}>
                <Sparkles
                  color={theme.mutedText}
                  size={14}
                  strokeWidth={2.2}
                />
                <ThemedText variant='caption' color={theme.mutedText}>
                  JALES · posture studio
                </ThemedText>
              </View>
            </View>

            <View style={styles.headerStatusColumn}>
              <View
                style={[
                  styles.headerStatusPill,
                  {
                    backgroundColor: !isConnected
                      ? `${theme.mutedText}16`
                      : isActive
                        ? `${theme.success}1F`
                        : `${theme.primary}1A`,
                  },
                ]}
              >
                {!isConnected ? (
                  <BluetoothOff
                    color={theme.mutedText}
                    size={15}
                    strokeWidth={2.4}
                  />
                ) : isActive ? (
                  <Activity
                    color={theme.success}
                    size={15}
                    strokeWidth={2.4}
                  />
                ) : (
                  <Bluetooth
                    color={theme.primary}
                    size={15}
                    strokeWidth={2.4}
                  />
                )}
                <ThemedText
                  variant='caption'
                  style={[
                    styles.headerStatusLabel,
                    {
                      color: !isConnected
                        ? theme.mutedText
                        : isActive
                          ? theme.success
                          : theme.primary,
                    },
                  ]}
                >
                  {!isConnected ? 'Offline' : isActive ? 'Live' : 'Linked'}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.heroStage,
            {
              backgroundColor: isDark ? `${theme.primary}12` : `${theme.primary}08`,
              borderColor: isDark ? `${theme.primary}28` : `${theme.primary}16`,
            },
          ]}
        >
          <View style={styles.heroArea}>
            <Animated.View
              style={[
                styles.scoreGlowWrap,
                {
                  shadowColor: scoreColors.glow,
                  transform: [{ scale: pulse }],
                },
              ]}
            >
            {/* Layer 1: outer bloom (soft halo extending past the orb) */}
            <Svg
              width={ORB_OUTER}
              height={ORB_OUTER}
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <RadialGradient id='outerGlow' cx='50%' cy='50%' r='50%'>
                  <Stop offset='52%' stopColor={scoreColors.glow} stopOpacity='0' />
                  <Stop
                    offset='66%'
                    stopColor={scoreColors.glow}
                    stopOpacity='0.32'
                  />
                  <Stop
                    offset='82%'
                    stopColor={scoreColors.glow}
                    stopOpacity='0.16'
                  />
                  <Stop
                    offset='100%'
                    stopColor={scoreColors.glow}
                    stopOpacity='0'
                  />
                </RadialGradient>
              </Defs>
              <SvgCircle
                cx={ORB_OUTER / 2}
                cy={ORB_OUTER / 2}
                r={ORB_OUTER / 2 - 4}
                fill='url(#outerGlow)'
              />
            </Svg>

            {/* Layer 2: progress ring (animated, color-coded). */}
            <Svg
              width={ORB_OUTER}
              height={ORB_OUTER}
              style={StyleSheet.absoluteFill}
            >
              {/* Track */}
              <SvgCircle
                cx={ORB_OUTER / 2}
                cy={ORB_OUTER / 2}
                r={RING_RADIUS}
                stroke='rgba(255,255,255,0.7)'
                strokeWidth={RING_STROKE}
                fill='none'
              />
              {/* Animated progress arc */}
              <AnimatedSvgCircle
                cx={ORB_OUTER / 2}
                cy={ORB_OUTER / 2}
                r={RING_RADIUS}
                stroke={scoreColors.mid}
                strokeWidth={RING_STROKE}
                strokeLinecap='round'
                fill='none'
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [RING_CIRCUMFERENCE, 0],
                })}
                transform={`rotate(-90 ${ORB_OUTER / 2} ${ORB_OUTER / 2})`}
              />
            </Svg>

            {/* Layer 3: solid-color sphere (no highlight, no rim). */}
            <Svg
              width={ORB_INNER}
              height={ORB_INNER}
              style={styles.scoreInnerSphere}
            >
              <SvgCircle
                cx={ORB_INNER / 2}
                cy={ORB_INNER / 2}
                r={ORB_INNER / 2 - 2}
                fill={scoreColors.mid}
              />
            </Svg>

            {/* Layer 4: just the mood icon + score inside the orb. */}
            <View style={styles.scoreOrbContent}>
              <HeroOrbIcon
                color='rgba(255,255,255,0.92)'
                size={40}
                strokeWidth={2}
              />
              <ThemedText style={styles.scoreNumber}>{heroPercent}</ThemedText>
            </View>
          </Animated.View>
          </View>

          {/* Status banner — connect / start / warming, or live posture */}
          {idleBannerCopy ? (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: `${theme.primary}14`,
                  borderColor: theme.border,
                  borderLeftColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
            >
            <View
              style={[
                styles.statusBannerIconWrap,
                { backgroundColor: `${theme.primary}22` },
              ]}
            >
              <IdleBannerStatusIcon
                color={theme.primary}
                size={22}
                strokeWidth={2.35}
              />
            </View>
            <View style={styles.statusBannerText}>
              <ThemedText
                variant='label'
                style={[styles.statusBannerTitle, { color: theme.primary }]}
              >
                {idleBannerCopy.title}
              </ThemedText>
              <ThemedText
                variant='caption'
                color={theme.mutedText}
                style={styles.statusBannerHint}
              >
                {idleBannerCopy.hint}
              </ThemedText>
            </View>
          </View>
          ) : (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: `${badge.color}14`,
                  borderColor: theme.border,
                  borderLeftColor: badge.color,
                  shadowColor: badge.color,
                },
              ]}
            >
            <View
              style={[
                styles.statusBannerIconWrap,
                { backgroundColor: `${badge.color}22` },
              ]}
            >
              <StatusBannerIcon
                color={badge.color}
                size={22}
                strokeWidth={2.35}
              />
            </View>
            <View style={styles.statusBannerText}>
              <ThemedText
                variant='label'
                style={[styles.statusBannerTitle, { color: badge.color }]}
              >
                {badge.label}
              </ThemedText>
              <ThemedText
                variant='caption'
                color={theme.mutedText}
                style={styles.statusBannerHint}
              >
                {liveBannerHint}
              </ThemedText>
            </View>
          </View>
          )}
        </View>

        {/* Body-part grid: trunk + shoulders; each card’s tint follows that part’s
            RULA score (1–4); orb + badge still use overall %. */}
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionHeaderIcon,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <LayoutGrid color={theme.primary} size={18} strokeWidth={2.2} />
          </View>
          <View style={styles.sectionHeaderText}>
            <ThemedText
              variant='caption'
              style={[styles.sectionKicker, { color: theme.primary }]}
            >
              Live zones
            </ThemedText>
            <ThemedText
              variant='label'
              color={theme.text}
              style={styles.sectionTitle}
            >
              Body map
            </ThemedText>
          </View>
        </View>
        <View style={styles.bodyMap}>
          <View style={styles.bodyMapTrunkRow}>{renderBodyMapUpperBack()}</View>
          <View style={styles.bodyMapShoulderRow}>
            {shoulderCards.map((card) => {
              const offline = card.score == null;
              const partColor = offline
                ? dimColor
                : scoreToColor(card.score ?? null);
              return (
                <ThemedCard
                  key={card.key}
                  style={[
                    styles.bodyCard,
                    styles.bodyCardShoulder,
                    softCardRim,
                    offline && styles.bodyCardOffline,
                    !offline && {
                      borderColor: partColor,
                      backgroundColor: `${partColor}0D`,
                    },
                  ]}
                >
                  <View style={styles.bodyCardHeader}>
                    <View style={styles.bodyCardIconWrap}>{card.icon}</View>
                    <View
                      style={[
                        styles.bodyCardStatusDot,
                        { backgroundColor: partColor },
                      ]}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.bodyCardLabel,
                      { color: offline ? dimColor : theme.text },
                    ]}
                  >
                    {card.label}
                  </ThemedText>
                  {offline ? (
                    <ThemedText
                      style={[styles.bodyCardNoSignal, { color: dimColor }]}
                    >
                      No signal
                    </ThemedText>
                  ) : (
                    <>
                      <ThemedText
                        style={[styles.bodyCardScore, { color: partColor }]}
                      >
                        {card.score} / 4
                      </ThemedText>
                      <ThemedText
                        style={[styles.bodyCardAngle, { color: theme.mutedText }]}
                      >
                        {Math.round(card.angleDegrees ?? 0)}°
                      </ThemedText>
                    </>
                  )}
                </ThemedCard>
              );
            })}
          </View>
        </View>

        {/* Per-body-part RULA breakdown: dots + angles for trunk and shoulders. */}
        {liveEval && (
          <>
            <View style={[styles.sectionHeader, styles.sectionHeaderTight]}>
              <View
                style={[
                  styles.sectionHeaderIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Activity color={theme.primary} size={18} strokeWidth={2.2} />
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText
                  variant='caption'
                  style={[styles.sectionKicker, { color: theme.primary }]}
                >
                  Detail
                </ThemedText>
                <ThemedText
                  variant='label'
                  color={theme.text}
                  style={styles.sectionTitle}
                >
                  Posture breakdown
                </ThemedText>
              </View>
            </View>
            <ThemedCard style={[styles.breakdownCard, softCardRim]}>
            <ThemedText variant='label' style={styles.breakdownTitle}>
              Scores & angles
            </ThemedText>

            <View
              style={[styles.breakdownRow, { borderBottomColor: theme.border }]}
            >
              <View style={styles.breakdownLabelGroup}>
                <UpperBackIcon color={theme.primary} size={18} />
                <ThemedText variant='body' style={styles.breakdownLabel}>
                  Upper Back
                </ThemedText>
              </View>
              <View style={styles.breakdownValueGroup}>
                <ScoreDots score={liveEval.trunkScore} />
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.breakdownScoreText}
                >
                  {liveEval.trunkScore} / 4
                </ThemedText>
              </View>
            </View>

            <View
              style={[styles.breakdownRow, { borderBottomColor: theme.border }]}
            >
              <View style={styles.breakdownLabelGroup}>
                <LeftShoulderIcon color={theme.primary} size={18} />
                <ThemedText variant='body' style={styles.breakdownLabel}>
                  Left Shoulder
                </ThemedText>
              </View>
              <View style={styles.breakdownValueGroup}>
                <ScoreDots score={liveEval.leftShoulderScore} />
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.breakdownScoreText}
                >
                  {liveEval.leftShoulderScore} / 4
                </ThemedText>
                {isActive && shoulderMotionHint ? (
                  <ThemedText
                    variant='caption'
                    style={{
                      marginTop: 2,
                      color:
                        shoulderMotionHint.left === 'good'
                          ? theme.success
                          : shoulderMotionHint.left === 'elevated'
                            ? theme.warning
                            : theme.danger,
                      fontWeight: '600',
                    }}
                  >
                    {shoulderCalMotionLabel(shoulderMotionHint.left)}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.breakdownRow,
                styles.breakdownRowLast,
                { borderBottomColor: theme.border },
              ]}
            >
              <View style={styles.breakdownLabelGroup}>
                <RightShoulderIcon color={theme.primary} size={18} />
                <ThemedText variant='body' style={styles.breakdownLabel}>
                  Right Shoulder
                </ThemedText>
              </View>
              <View style={styles.breakdownValueGroup}>
                <ScoreDots score={liveEval.rightShoulderScore} />
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.breakdownScoreText}
                >
                  {liveEval.rightShoulderScore} / 4
                </ThemedText>
                {isActive && shoulderMotionHint ? (
                  <ThemedText
                    variant='caption'
                    style={{
                      marginTop: 2,
                      color:
                        shoulderMotionHint.right === 'good'
                          ? theme.success
                          : shoulderMotionHint.right === 'elevated'
                            ? theme.warning
                            : theme.danger,
                      fontWeight: '600',
                    }}
                  >
                    {shoulderCalMotionLabel(shoulderMotionHint.right)}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.breakdownAnglesRow,
                { borderTopColor: theme.border },
              ]}
            >
              <View style={styles.breakdownAngleItem}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Upper back
                </ThemedText>
                <ThemedText variant='caption'>
                  {liveEval.angles.trunkFlexion.toFixed(0)}°
                </ThemedText>
              </View>
              <View style={styles.breakdownAngleItem}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Left S.
                </ThemedText>
                <ThemedText variant='caption'>
                  {liveEval.angles.leftShoulderAngle.toFixed(0)}°
                </ThemedText>
              </View>
              <View style={styles.breakdownAngleItem}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Right S.
                </ThemedText>
                <ThemedText variant='caption'>
                  {liveEval.angles.rightShoulderAngle.toFixed(0)}°
                </ThemedText>
              </View>
            </View>
            {(liveEval.trunkTwistFlag !== undefined ||
              liveEval.trunkTiltFlag !== undefined) && (
              <View
                style={[
                  styles.breakdownAnglesRow,
                  { borderTopColor: theme.border, justifyContent: 'flex-start' },
                ]}
              >
                <ThemedText variant='caption' color={theme.mutedText}>
                  Trunk twist / tilt (server):{' '}
                  {liveEval.trunkTwistFlag === true
                    ? 'twist'
                    : liveEval.trunkTwistFlag === false
                      ? 'no twist'
                      : '—'}
                  {' · '}
                  {liveEval.trunkTiltFlag === true
                    ? 'tilt'
                    : liveEval.trunkTiltFlag === false
                      ? 'no tilt'
                      : '—'}
                </ThemedText>
              </View>
            )}
          </ThemedCard>
          </>
        )}

        <View style={[styles.sectionHeader, styles.sectionHeaderTight]}>
          <View
            style={[
              styles.sectionHeaderIcon,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <BarChart3 color={theme.primary} size={18} strokeWidth={2.2} />
          </View>
          <View style={styles.sectionHeaderText}>
            <ThemedText
              variant='caption'
              style={[styles.sectionKicker, { color: theme.primary }]}
            >
              Today
            </ThemedText>
            <ThemedText
              variant='label'
              color={theme.text}
              style={styles.sectionTitle}
            >
              Activity & timeline
            </ThemedText>
          </View>
        </View>
        <ThemedCard style={[styles.timelineCard, softCardRim]}>
          <View style={styles.summaryLine}>
            <View style={styles.summaryLabelGroup}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    borderColor: theme.primary,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <Zap color={theme.primary} size={17} />
              </View>
              <ThemedText style={styles.summaryTitle} color={theme.text}>
                {isActive ? 'Session alerts' : "Today's alerts"}
              </ThemedText>
            </View>
            <ThemedText style={styles.summaryValue} color={theme.text}>
              {isActive
                ? String(totalAlerts)
                : daySnapshot != null
                  ? String(daySnapshot.total_alerts)
                  : '—'}
            </ThemedText>
          </View>

          <View
            style={[styles.summaryDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.summaryLine}>
            <View style={styles.summaryLabelGroup}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    borderColor: theme.primary,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <Activity color={theme.primary} size={17} />
              </View>
              <ThemedText style={styles.summaryTitle} color={theme.text}>
                {isActive ? 'Live score' : "Today's score"}
              </ThemedText>
            </View>
            <ThemedText style={styles.summaryValue} color={theme.text}>
              {isActive
                ? `${heroPercent}%`
                : daySnapshot != null
                  ? `${Math.round(daySnapshot.posture_score)}%`
                  : '—'}
            </ThemedText>
          </View>

          <View style={styles.timelineWrap}>
            <Svg
              viewBox='0 0 100 22'
              preserveAspectRatio='none'
              width='100%'
              height={38}
            >
              <Rect
                x={0}
                y={8}
                width={100}
                height={6}
                rx={3}
                fill={theme.border}
              />
              {dayTimeline.segments.map((seg, i) => (
                <Rect
                  key={`seg-${i}`}
                  x={seg.leftPct}
                  y={8}
                  width={Math.max(seg.widthPct, 0.35)}
                  height={6}
                  fill={timelineFill(seg.tone)}
                />
              ))}
            </Svg>
            <View style={styles.timelineTicks}>
              {dayTimeline.tickLabels.map((time, index) => (
                <ThemedText
                  key={`tick-${index}`}
                  style={[styles.timelineTick, { color: theme.mutedText }]}
                >
                  {time}
                </ThemedText>
              ))}
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.primary }]}
              />
              <View style={styles.legendTextBlock}>
                <ThemedText style={styles.legendTitle} color={theme.text}>
                  Good
                </ThemedText>
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.legendSub}
                >
                  About 70–100% score
                </ThemedText>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: TIMELINE_WARN_COLOR },
                ]}
              />
              <View style={styles.legendTextBlock}>
                <ThemedText style={styles.legendTitle} color={theme.text}>
                  Fair
                </ThemedText>
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.legendSub}
                >
                  About 50–69% score
                </ThemedText>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.danger }]}
              />
              <View style={styles.legendTextBlock}>
                <ThemedText style={styles.legendTitle} color={theme.text}>
                  Poor
                </ThemedText>
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.legendSub}
                >
                  Under 50% score
                </ThemedText>
              </View>
            </View>
          </View>
          <View
            style={[styles.legendFooterRow, { borderTopColor: theme.border }]}
          >
            <View
              style={[
                styles.legendDotSmall,
                { backgroundColor: theme.border },
              ]}
            />
            <ThemedText variant='caption' color={theme.mutedText}>
              Light gray track = time not covered by a session in this view.
            </ThemedText>
          </View>
        </ThemedCard>

        {!isConnected ? (
          <View
            style={[
              styles.notConnectedBanner,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.notConnectedIconRing,
                { backgroundColor: `${theme.primary}18` },
              ]}
            >
              <Bluetooth color={theme.primary} size={28} strokeWidth={2.2} />
            </View>
            <ThemedText style={styles.notConnectedTitle} color={theme.text}>
              Connect your shirt
            </ThemedText>
            <ThemedText
              variant='caption'
              color={theme.mutedText}
              style={styles.notConnectedSubtitle}
            >
              Pair the JALES Shirt over Bluetooth to stream posture data and
              start a session.
            </ThemedText>
            <ThemedButton
              title='Set up connection'
              variant='primary'
              size='lg'
              onPress={handleConnect}
              style={styles.notConnectedButton}
            />
          </View>
        ) : (
          <>
            <ThemedCard style={styles.deviceCard}>
              <View style={styles.deviceCardContent}>
                <View
                  style={[
                    styles.deviceCardIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <Bluetooth color={theme.primary} size={24} />
                </View>
                <View style={styles.deviceCardInfo}>
                  <ThemedText variant='label'>
                    {device?.name || device?.localName || 'Connected Device'}
                  </ThemedText>
                  <ThemedText variant='caption' color={theme.mutedText}>
                    {device?.id}
                  </ThemedText>
                </View>
                <TouchableOpacity onPress={handleConnect}>
                  <ThemedText variant='label' color={theme.primary}>
                    Manage
                  </ThemedText>
                </TouchableOpacity>
              </View>
              {!bno && !displayBno ? (
                <View
                  style={[
                    styles.infoBanner,
                    {
                      backgroundColor: theme.primarySoft,
                      borderColor: `${theme.primary}2E`,
                    },
                  ]}
                >
                  <Activity
                    color={theme.primary}
                    size={18}
                    strokeWidth={2.4}
                  />
                  <ThemedText
                    variant='caption'
                    color={theme.mutedText}
                    style={styles.infoBannerText}
                  >
                    {hasUserServerCalibration
                      ? 'Waiting for motion sensor data. The first score may take a few seconds after you start.'
                      : 'Waiting for sensor data. Finish calibration (Profile → Sensor calibration) before starting monitoring.'}
                  </ThemedText>
                </View>
              ) : null}
            </ThemedCard>

            {isConnected && !hasUserServerCalibration && !isActive ? (
              <ThemedCard
                style={{
                  marginBottom: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  backgroundColor: `${theme.warning}12`,
                  borderColor: `${theme.warning}55`,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: 14,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle color={theme.warning} size={22} strokeWidth={2.2} />
                  <ThemedText variant='label' style={{ flex: 1 }}>
                    Calibration required
                  </ThemedText>
                </View>
                <ThemedText variant='caption' color={theme.mutedText} style={{ lineHeight: 20 }}>
                  Hold a neutral posture on the shirt for about 10 seconds, then save baselines. Monitoring stays disabled until this is done.
                </ThemedText>
                <ThemedButton
                  title='Open calibration'
                  variant='primary'
                  size='md'
                  onPress={handleOpenCalibration}
                />
              </ThemedCard>
            ) : null}

            <ThemedCard style={styles.monitoringCard}>
              <View style={styles.monitoringHeaderRow}>
                <View style={styles.monitoringHeaderText}>
                  <ThemedText variant='label' style={styles.monitoringTitle}>
                    Posture Session
                  </ThemedText>
                  <ThemedText variant='caption' color={theme.mutedText}>
                    {isActive
                      ? `Active · ${formatElapsed(sessionElapsedMs)}`
                      : registeredDevice
                        ? 'Ready to start'
                        : isRegisteringDevice
                          ? 'Registering device…'
                          : registerError
                            ? `Register failed: ${registerError}`
                            : 'Connect a device first'}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.monitoringBadge,
                    {
                      backgroundColor: isActive
                        ? 'rgba(13,185,139,0.18)'
                        : theme.primarySoft,
                    },
                  ]}
                >
                  <ThemedText
                    variant='caption'
                    color={isActive ? theme.success : theme.primary}
                  >
                    {isActive ? 'LIVE' : 'IDLE'}
                  </ThemedText>
                </View>
              </View>

              {registerError ? (
                <View
                  style={[
                    styles.warningBanner,
                    {
                      backgroundColor: `${theme.danger}10`,
                      borderColor: `${theme.danger}33`,
                    },
                  ]}
                >
                  <AlertCircle
                    color={theme.danger}
                    size={18}
                    strokeWidth={2.4}
                  />
                  <ThemedText
                    variant='caption'
                    style={[styles.warningBannerText, { color: theme.danger }]}
                  >
                    {registerError}
                  </ThemedText>
                </View>
              ) : null}

              {isActive && (
                <View style={styles.monitoringStatsRow}>
                  <View style={styles.monitoringStat}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Posture
                    </ThemedText>
                    <ThemedText variant='subtitle'>
                      {heroPercent}%
                    </ThemedText>
                  </View>
                  <View style={styles.monitoringStat}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Alerts
                    </ThemedText>
                    <ThemedText variant='subtitle'>{totalAlerts}</ThemedText>
                  </View>
                  <View style={styles.monitoringStat}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Session
                    </ThemedText>
                    <ThemedText variant='subtitle' numberOfLines={1}>
                      {sessionId ? sessionId.slice(0, 6) : '—'}
                    </ThemedText>
                  </View>
                </View>
              )}

              <ThemedButton
                title={isActive ? 'Stop Monitoring' : 'Start Monitoring'}
                variant={isActive ? 'outline' : 'primary'}
                size='lg'
                onPress={isActive ? handleStopMonitoring : handleStartMonitoring}
                disabled={
                  isToggling ||
                  (!isActive &&
                    (!isConnected ||
                      !hasUserServerCalibration ||
                      !registeredDevice ||
                      isRegisteringDevice))
                }
                loading={isToggling}
                style={styles.monitoringButton}
              />
            </ThemedCard>

            <ThemedCard style={styles.calibrationCard}>
              <View style={styles.calibrationCardContent}>
                <View
                  style={[
                    styles.calibrationCardIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <Zap color={theme.primary} size={24} />
                </View>
                <View style={styles.calibrationCardInfo}>
                  <ThemedText variant='label'>Calibration</ThemedText>
                  <ThemedText variant='caption' color={theme.mutedText}>
                    {hasUserServerCalibration
                      ? 'Baselines saved — you can start monitoring.'
                      : 'Required before monitoring: save your neutral baselines.'}
                  </ThemedText>
                </View>
                <TouchableOpacity onPress={handleOpenCalibration}>
                  <ThemedText variant='label' color={theme.primary}>
                    Open
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedCard>
          </>
        )}

        <View style={styles.spacer} />
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerShell: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  headerDecorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlobLarge: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -72,
    right: -56,
  },
  headerBlobSmall: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    bottom: -36,
    left: -28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
  },
  greetingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  greetingWordmark: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerHeadline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerTagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  headerStatusColumn: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    flexShrink: 0,
  },
  headerStatusLabel: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  heroStage: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroArea: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderTight: {
    marginTop: 0,
  },
  sectionHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionKicker: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  scoreGlowWrap: {
    width: ORB_OUTER,
    height: ORB_OUTER,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 14,
  },
  scoreInnerSphere: {
    position: 'absolute',
    top: (ORB_OUTER - ORB_INNER) / 2,
    left: (ORB_OUTER - ORB_INNER) / 2,
  },
  scoreOrbContent: {
    position: 'absolute',
    width: ORB_INNER,
    height: ORB_INNER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 64,
    lineHeight: 64,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -2,
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  statusBanner: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 12,
    borderRadius: 18,
    marginBottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  statusBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerText: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  statusBannerTitle: {
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  statusBannerHint: {
    marginTop: 4,
    lineHeight: 19,
    fontSize: 13,
  },
  bodyMap: {
    gap: 12,
    marginBottom: 18,
  },
  bodyMapTrunkRow: {
    width: '100%',
  },
  bodyMapShoulderRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  bodyCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  bodyCardTrunk: {
    width: '100%',
  },
  bodyCardTrunkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  bodyCardTrunkMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  bodyCardTrunkText: {
    flex: 1,
    minWidth: 0,
  },
  bodyCardTrunkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bodyCardTrunkMetrics: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  bodyCardShoulder: {
    flex: 1,
    minWidth: 0,
  },
  bodyCardOffline: {
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  bodyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bodyCardIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCardStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bodyCardLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  bodyCardScore: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  bodyCardAngle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  bodyCardNoSignal: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  breakdownCard: {
    marginBottom: 16,
    paddingVertical: 16,
  },
  breakdownTitle: {
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownRowLast: {
    borderBottomWidth: 0,
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  breakdownLabel: {
    fontWeight: '600',
  },
  breakdownValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownScoreText: {
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  breakdownAnglesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  breakdownAngleItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineCard: {
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryLine: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    marginLeft: 12,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  timelineWrap: {
    marginTop: 10,
  },
  timelineTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    paddingHorizontal: 2,
  },
  timelineTick: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  timelineLegendCaption: {
    marginTop: 12,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 12,
    rowGap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minWidth: '28%',
    flexGrow: 1,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  legendTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  legendTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  legendSub: {
    marginTop: 2,
    lineHeight: 16,
    fontSize: 11,
  },
  legendFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    flexShrink: 0,
  },
  notConnectedBanner: {
    marginTop: 16,
    marginBottom: 4,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  notConnectedIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notConnectedTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  notConnectedSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    fontSize: 14,
  },
  notConnectedButton: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoBannerText: {
    flex: 1,
    lineHeight: 19,
    fontSize: 13,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  warningBannerText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
    fontSize: 13,
  },
  deviceCard: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceCardInfo: {
    flex: 1,
  },
  calibrationCard: {
    marginBottom: 16,
  },
  calibrationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calibrationCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  calibrationCardInfo: {
    flex: 1,
  },
  spacer: {
    height: 32,
  },
  monitoringCard: {
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
  },
  monitoringHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monitoringHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  monitoringTitle: {
    marginBottom: 2,
  },
  monitoringBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  monitoringStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monitoringStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  monitoringButton: {
    marginTop: 4,
  },
});

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default HomeScreen;
