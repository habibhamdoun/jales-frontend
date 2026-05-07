import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { useTheme } from '@/src/theme/useTheme';
import { mockPostureData } from '@/src/data/mock';
import {
  Activity,
  ArrowUp,
  Minus,
  Bluetooth,
  AlertCircle,
  Zap,
  Smile,
  MessageCircle,
} from 'lucide-react-native';
import { useBle } from '@/src/hooks/useBle';

const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();

  // Get BLE device and data from context
  const { device, bno, mpu1, mpu2, mpu3, isConnected, postureAnalysis } =
    useBle();

  const mockData = mockPostureData;
  const { vibrationCount, lastCorrectionMinutesAgo } = mockData;

  // Calculate dynamic posture score from REBA data
  const calculatePostureScore = (): { score: number; status: string } => {
    if (!postureAnalysis) {
      return { score: mockData.currentScore, status: mockData.status };
    }

    // Combined score: lower REBA is better (1-4 range typically)
    // Convert REBA to a 0-100 scale where 60+ is good
    const combinedRebaScore =
      postureAnalysis.neck.totalScore +
      postureAnalysis.upperBack.totalScore +
      postureAnalysis.shoulders.totalScore;
    const maxReba = 15;
    const scorePercent = 100 - (combinedRebaScore / maxReba) * 100;

    let status = 'GOOD';
    if (scorePercent < 25) status = 'BAD';
    else if (scorePercent < 50) status = 'WARNING';

    return { score: Math.round(scorePercent), status };
  };

  const { score: postureScore, status: postureStatus } =
    calculatePostureScore();
  const hasLiveData = isConnected && Boolean(bno || mpu1);
  const currentScore = hasLiveData ? postureScore : 0;
  const status = hasLiveData ? postureStatus : 'NO DEVICE';
  const scoreColors = !hasLiveData
    ? {
        light: '#A8B2B8',
        mid: '#808C94',
        dark: '#66727A',
        glow: '#B7C1C7',
      }
    : postureStatus === 'BAD'
      ? {
          light: '#FF7A66',
          mid: '#F04A2A',
          dark: '#B92E1A',
          glow: '#FF8A78',
        }
      : postureStatus === 'WARNING'
        ? {
            light: '#FFD36A',
            mid: '#F5A623',
            dark: '#C77800',
            glow: '#FFD36A',
          }
        : {
            light: '#0DB98B',
            mid: '#009B72',
            dark: '#007E60',
            glow: '#4BE3B6',
          };

  const handleConnect = () => {
    //@ts-ignore
    navigation.navigate('Profile', { screen: 'Connect' });
  };

  const handleOpenCalibration = () => {
    //@ts-ignore
    navigation.navigate('Profile', { screen: 'Calibration' });
  };

  const handleOpenChat = () => {
    navigation.navigate('Chat');
  };

  const alignmentCards = !hasLiveData
    ? [
        {
          icon: <Activity color={theme.mutedText} size={22} />,
          label: 'Neck',
          value: 'No data',
          statusColor: theme.mutedText,
        },
        {
          icon: <ArrowUp color={theme.mutedText} size={22} />,
          label: 'Upper Back',
          value: 'No data',
          statusColor: theme.mutedText,
        },
        {
          icon: <Minus color={theme.mutedText} size={22} />,
          label: 'Shoulders',
          value: 'No data',
          statusColor: theme.mutedText,
        },
      ]
    : postureAnalysis
      ? [
          {
            icon: <Activity color={theme.primary} size={22} />,
            label: 'Neck',
            value:
              postureAnalysis.neck.totalScore <= 3 ? 'Aligned' : 'Misaligned',
            statusColor:
              postureAnalysis.neck.totalScore <= 3
                ? theme.success
                : theme.danger,
          },
          {
            icon: <ArrowUp color={theme.primary} size={22} />,
            label: 'Upper Back',
            value:
              postureAnalysis.upperBack.totalScore <= 2 ? 'Aligned' : 'Misaligned',
            statusColor:
              postureAnalysis.upperBack.totalScore <= 2
                ? theme.success
                : theme.danger,
          },
          {
            icon: <Minus color={theme.primary} size={22} />,
            label: 'Shoulders',
            value:
              postureAnalysis.shoulders.totalScore <= 2
                ? 'Aligned'
                : 'Misaligned',
            statusColor:
              postureAnalysis.shoulders.totalScore <= 2
                ? theme.success
                : theme.danger,
          },
        ]
      : [
          {
            icon: <Activity color={theme.primary} size={22} />,
            label: 'Neck',
            value: bno ? 'Aligned' : 'Waiting',
            statusColor: bno ? theme.success : theme.mutedText,
          },
          {
            icon: <ArrowUp color={theme.primary} size={22} />,
            label: 'Upper Back',
            value: mpu1 ? 'Aligned' : 'Waiting',
            statusColor: mpu1 ? theme.success : theme.mutedText,
          },
          {
            icon: <Minus color={theme.primary} size={22} />,
            label: 'Shoulders',
            value: bno ? 'Aligned' : 'Waiting',
            statusColor: bno ? theme.success : theme.mutedText,
          },
        ];

  return (
    <View style={styles.root}>
      <Screen scrollable>
      <View style={styles.header}>
        <ThemedText variant='title'>JALES</ThemedText>
      </View>

      <View style={styles.heroArea}>
        <View style={[styles.scoreGlowWrap, { shadowColor: scoreColors.glow }]}>
          <Svg width={204} height={204} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id='scoreGlow' cx='42%' cy='28%' r='76%'>
                <Stop
                  offset='0%'
                  stopColor={scoreColors.light}
                  stopOpacity='1'
                />
                <Stop
                  offset='58%'
                  stopColor={scoreColors.mid}
                  stopOpacity='1'
                />
                <Stop
                  offset='100%'
                  stopColor={scoreColors.dark}
                  stopOpacity='1'
                />
              </RadialGradient>
              <RadialGradient id='outerGlow' cx='50%' cy='50%' r='50%'>
                <Stop offset='58%' stopColor='#10B987' stopOpacity='0' />
                <Stop
                  offset='70%'
                  stopColor={scoreColors.glow}
                  stopOpacity='0.42'
                />
                <Stop
                  offset='84%'
                  stopColor={scoreColors.glow}
                  stopOpacity='0.25'
                />
                <Stop
                  offset='100%'
                  stopColor={scoreColors.glow}
                  stopOpacity='0'
                />
              </RadialGradient>
            </Defs>
            <SvgCircle cx='102' cy='102' r='98' fill='url(#outerGlow)' />
            <SvgCircle
              cx='102'
              cy='102'
              r='78'
              fill={scoreColors.glow}
              opacity='0.22'
            />
            <SvgCircle cx='102' cy='102' r='74' fill='url(#scoreGlow)' />
            <SvgCircle
              cx='102'
              cy='102'
              r='73'
              fill='none'
              stroke='rgba(255,255,255,0.10)'
              strokeWidth='1.2'
            />
          </Svg>
          <View style={styles.scoreOrbContent}>
            <Smile
              color='rgba(236,255,248,0.74)'
              size={34}
              strokeWidth={1.75}
            />
            <ThemedText style={styles.scoreStatus}>{status}</ThemedText>
            <ThemedText style={styles.scorePercent}>{currentScore}%</ThemedText>
            <ThemedText style={styles.scoreLabel}>
              {hasLiveData ? 'POSTURE' : ''}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.alignmentRow}>
        {alignmentCards.map((card) => (
          <ThemedCard key={card.label} style={styles.alignmentCard}>
            <View
              style={[styles.alignmentIcon, { borderColor: theme.primarySoft }]}
            >
              {card.icon}
            </View>
            <ThemedText style={styles.alignmentLabel}>{card.label}</ThemedText>
            <ThemedText
              style={[styles.alignmentValue, { color: card.statusColor }]}
            >
              {card.value}
            </ThemedText>
          </ThemedCard>
        ))}
      </View>

      <ThemedCard style={styles.timelineCard}>
        <View style={styles.summaryLine}>
          <View style={styles.summaryLabelGroup}>
            <View style={[styles.summaryIcon, { borderColor: theme.primary }]}>
              <Zap color={theme.primary} size={17} />
            </View>
            <ThemedText style={styles.summaryTitle}>
              Vibrations Triggered
            </ThemedText>
          </View>
          <ThemedText style={styles.summaryValue}>
            {hasLiveData ? vibrationCount : '--'}
          </ThemedText>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryLine}>
          <View style={styles.summaryLabelGroup}>
            <View style={[styles.summaryIcon, { borderColor: theme.primary }]}>
              <Activity color={theme.primary} size={17} />
            </View>
            <ThemedText style={styles.summaryTitle}>Last Correction</ThemedText>
          </View>
          <ThemedText style={styles.summaryValue}>
            {hasLiveData ? `${lastCorrectionMinutesAgo}m ago` : '--'}
          </ThemedText>
        </View>

        <View style={styles.timelineWrap}>
          <Svg width='100%' height={36}>
            <Defs>
              <LinearGradient
                id='timelineGradient'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='0%'
              >
                <Stop offset='0%' stopColor='#04A76E' />
                <Stop offset='47%' stopColor='#04A76E' />
                <Stop offset='48%' stopColor='#F04A2A' />
                <Stop offset='57%' stopColor='#F04A2A' />
                <Stop offset='58%' stopColor='#04A76E' />
                <Stop offset='91%' stopColor='#04A76E' />
                <Stop offset='92%' stopColor='#F04A2A' />
                <Stop offset='100%' stopColor='#F04A2A' />
              </LinearGradient>
            </Defs>
            <Rect x='2' y='12' width='99%' height='6' rx='3' fill='#E9EFEC' />
            <Rect
              x='2'
              y='12'
              width='99%'
              height='6'
              rx='3'
              fill='url(#timelineGradient)'
            />
          </Svg>
          <View style={styles.timelineTicks}>
            {['10AM', '12AM', '12AM', '4AM', '10AM'].map((time, index) => (
              <ThemedText key={`${time}-${index}`} style={styles.timelineTick}>
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
            <ThemedText style={styles.legendText}>Good Alignment</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: theme.danger }]}
            />
            <ThemedText style={styles.legendText}>Poor Alignment</ThemedText>
          </View>
        </View>
      </ThemedCard>

      {/* Angle Debug Info */}
      {postureAnalysis && (
        <ThemedCard style={styles.statusCard}>
          <ThemedText variant='label' style={styles.statusLabel}>
            Angle Data (Debug)
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Neck Pitch: {postureAnalysis.neck.angles.pitch.toFixed(1)}° (Score:{' '}
            {postureAnalysis.neck.totalScore})
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Neck Roll: {postureAnalysis.neck.angles.roll.toFixed(1)}°
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Upper Back Pitch: {postureAnalysis.upperBack.angles.pitch.toFixed(1)}°
            (Score: {postureAnalysis.upperBack.totalScore})
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Upper Back Roll: {postureAnalysis.upperBack.angles.roll.toFixed(1)}°
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Shoulders Tilt: {postureAnalysis.shoulders.angles.roll.toFixed(1)}�
            (Score: {postureAnalysis.shoulders.totalScore})
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            {postureAnalysis.neck.label} | {postureAnalysis.upperBack.label} |{' '}
            {postureAnalysis.shoulders.label}
          </ThemedText>
        </ThemedCard>
      )}

      {/* Connection Status Debug */}
      <ThemedCard style={styles.statusCard}>
        <ThemedText variant='label' style={styles.statusLabel}>
          Connection Status
        </ThemedText>
        <ThemedText variant='caption' color={theme.mutedText}>
          Device: {device?.name || device?.id || 'None'}
        </ThemedText>
        <ThemedText variant='caption' color={theme.mutedText}>
          Connected: {isConnected ? '✓ YES' : '✗ NO'}
        </ThemedText>
        <ThemedText variant='caption' color={theme.mutedText}>
          Data Received: {bno || mpu1 ? '✓ YES' : '✗ NO'}
        </ThemedText>
        <ThemedText variant='caption' color={theme.mutedText}>
          Parsed Data: {bno ? '✓ YES' : '✗ NO'}
        </ThemedText>
      </ThemedCard>

      {!isConnected || !bno ? (
        <ThemedCard style={styles.notConnectedCard}>
          <View style={styles.notConnectedContent}>
            <AlertCircle color={theme.mutedText} size={32} />
            <ThemedText
              variant='body'
              color={theme.mutedText}
              style={styles.notConnectedText}
            >
              Device not connected
            </ThemedText>
          </View>
          <ThemedButton
            title='Connect to JALES Shirt'
            variant='primary'
            size='lg'
            onPress={handleConnect}
            style={styles.connectButton}
          />
        </ThemedCard>
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
          </ThemedCard>

          {/* Calibration Quick Access Card */}
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
                <ThemedText variant='label'>Sensor Calibration</ThemedText>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Calibrate individual sensors
                </ThemedText>
              </View>
              <TouchableOpacity onPress={handleOpenCalibration}>
                <ThemedText variant='label' color={theme.primary}>
                  Open
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedCard>

          {/* Posture Angles & REBA Section */}
          {postureAnalysis ? (
            <ThemedCard style={styles.postureCard}>
              <ThemedText variant='label' style={styles.postureTitle}>
                Posture Angles
              </ThemedText>

              {/* Neck Posture */}
              <View style={styles.postureSection}>
                <ThemedText variant='body' style={styles.postureSectionTitle}>
                  Neck
                </ThemedText>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Pitch
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.neck.angles.pitch.toFixed(1)}°
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Roll
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.neck.angles.roll.toFixed(1)}°
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      REBA
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.postureLabel}>
                      {postureAnalysis.neck.label}
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Score
                    </ThemedText>
                    <ThemedText variant='body' style={styles.postureScore}>
                      {postureAnalysis.neck.totalScore}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Upper Back Posture */}
              <View style={styles.postureSection}>
                <ThemedText variant='body' style={styles.postureSectionTitle}>
                  Upper Back
                </ThemedText>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Pitch
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.upperBack.angles.pitch.toFixed(1)}°
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Roll
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.upperBack.angles.roll.toFixed(1)}°
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      REBA
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.postureLabel}>
                      {postureAnalysis.upperBack.label}
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Score
                    </ThemedText>
                    <ThemedText variant='body' style={styles.postureScore}>
                      {postureAnalysis.upperBack.totalScore}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.postureSection}>
                <ThemedText variant='body' style={styles.postureSectionTitle}>
                  Shoulders
                </ThemedText>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Avg Pitch
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.shoulders.angles.pitch.toFixed(1)}�
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Left/Right Tilt
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.shoulders.angles.roll.toFixed(1)}�
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Status
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.postureLabel}>
                      {postureAnalysis.shoulders.label}
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Score
                    </ThemedText>
                    <ThemedText variant='body' style={styles.postureScore}>
                      {postureAnalysis.shoulders.totalScore}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </ThemedCard>
          ) : null}

          {/* Live Sensor Data Display */}
          <ThemedCard style={styles.sensorCard}>
            <ThemedText variant='label' style={styles.sensorCardTitle}>
              Live Sensor Data
            </ThemedText>

            <View style={styles.sensorDataGrid}>
              {/* Neck Angle */}
              <View style={styles.sensorDataItem}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Heading
                </ThemedText>
                <ThemedText variant='title' style={styles.sensorDataValue}>
                  {bno?.heading !== undefined
                    ? `${bno.heading.toFixed(1)}°`
                    : '—'}
                </ThemedText>
              </View>

              {/* Roll */}
              <View style={styles.sensorDataItem}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Roll
                </ThemedText>
                <ThemedText variant='title' style={styles.sensorDataValue}>
                  {bno?.roll !== undefined ? `${bno.roll.toFixed(1)}°` : '—'}
                </ThemedText>
              </View>

              {/* Pitch */}
              <View style={styles.sensorDataItem}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Pitch
                </ThemedText>
                <ThemedText variant='title' style={styles.sensorDataValue}>
                  {bno?.pitch !== undefined ? `${bno.pitch.toFixed(1)}°` : '—'}
                </ThemedText>
              </View>
            </View>

            {/* Additional Sensor Data (accelerometer and gyroscope) */}
            {mpu1 && (
              <View style={styles.additionalSensorData}>
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.additionalDataTitle}
                >
                  Accelerometer & Gyroscope
                </ThemedText>
                <View style={styles.additionalDataItems}>
                  <View style={styles.additionalDataItem}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Accel X
                    </ThemedText>
                    <ThemedText variant='body'>{mpu1.ax.toFixed(1)}</ThemedText>
                  </View>
                  <View style={styles.additionalDataItem}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Accel Y
                    </ThemedText>
                    <ThemedText variant='body'>{mpu1.ay.toFixed(1)}</ThemedText>
                  </View>
                  <View style={styles.additionalDataItem}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Accel Z
                    </ThemedText>
                    <ThemedText variant='body'>{mpu1.az.toFixed(1)}</ThemedText>
                  </View>
                </View>
                <View style={[styles.additionalDataItems, { marginTop: 12 }]}>
                  <View style={styles.additionalDataItem}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Gyro X
                    </ThemedText>
                    <ThemedText variant='body'>{mpu1.gx.toFixed(1)}</ThemedText>
                  </View>
                  <View style={styles.additionalDataItem}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Gyro Y
                    </ThemedText>
                    <ThemedText variant='body'>{mpu1.gy.toFixed(1)}</ThemedText>
                  </View>
                  <View style={styles.additionalDataItem}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Gyro Z
                    </ThemedText>
                    <ThemedText variant='body'>{mpu1.gz.toFixed(1)}</ThemedText>
                  </View>
                </View>
              </View>
            )}
          </ThemedCard>

          {/* Binary BLE Data Debug Log */}
          {(bno || mpu1) && (
            <ThemedCard style={styles.rawDataCard}>
              <ThemedText variant='label' style={styles.rawDataTitle}>
                🔧 DEBUG: Binary Sensor Data
              </ThemedText>

              {bno && (
                <View style={styles.rawDataContent}>
                  <ThemedText
                    variant='caption'
                    color={theme.mutedText}
                    style={styles.rawDataLabel}
                  >
                    BNO (Orientation):
                  </ThemedText>
                  <ThemedText
                    variant='caption'
                    color={theme.mutedText}
                    style={styles.rawDataText}
                  >
                    Heading: {bno.heading.toFixed(2)}°{`\n`}
                    Roll: {bno.roll.toFixed(2)}°{`\n`}
                    Pitch: {bno.pitch.toFixed(2)}°
                  </ThemedText>
                </View>
              )}

              {mpu1 && (
                <View style={styles.rawDataContent}>
                  <ThemedText
                    variant='caption'
                    color={theme.mutedText}
                    style={styles.rawDataLabel}
                  >
                    MPU1 (Accel & Gyro):
                  </ThemedText>
                  <ThemedText
                    variant='caption'
                    color={theme.mutedText}
                    style={styles.rawDataText}
                  >
                    Accel: X={mpu1.ax.toFixed(1)}, Y={mpu1.ay.toFixed(1)}, Z=
                    {mpu1.az.toFixed(1)}
                    {`\n`}
                    Gyro: X={mpu1.gx.toFixed(1)}, Y={mpu1.gy.toFixed(1)}, Z=
                    {mpu1.gz.toFixed(1)}
                  </ThemedText>
                </View>
              )}

              <ThemedText
                variant='caption'
                color={theme.mutedText}
                style={styles.rawDataTimestamp}
              >
                Updated: {new Date().toLocaleTimeString()}
              </ThemedText>
            </ThemedCard>
          )}
        </>
      )}

      <View style={styles.spacer} />

      </Screen>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleOpenChat}
        style={[styles.chatWidget, { backgroundColor: theme.primary }]}
      >
        <MessageCircle color='#FFFFFF' size={30} strokeWidth={2.2} />
        <View style={styles.chatBadge} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  heroArea: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  scoreGlowWrap: {
    width: 204,
    height: 204,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  scoreOrbContent: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  scoreStatus: {
    color: 'rgba(240,255,250,0.9)',
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  scorePercent: {
    color: 'rgba(240,255,250,0.88)',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '500',
    textAlign: 'center',
  },
  scoreLabel: {
    color: 'rgba(240,255,250,0.76)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  alignmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  alignmentCard: {
    flex: 1,
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(19, 68, 54, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 2,
  },
  alignmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  alignmentLabel: {
    color: '#22282E',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },
  alignmentValue: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  timelineCard: {
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    backgroundColor: '#FFFFFF',
  },
  summaryTitle: {
    color: '#252B31',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1F252C',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    marginLeft: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
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
    color: '#3A4148',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: '#333A40',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  vibrationCard: {
    marginBottom: 16,
  },
  vibrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vibrationCount: {
    marginTop: 4,
  },
  vibrationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionCard: {
    marginBottom: 16,
  },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  correctionText: {
    marginLeft: 8,
  },
  connectButton: {
    marginTop: 12,
  },
  notConnectedCard: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 24,
  },
  notConnectedContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  notConnectedText: {
    marginTop: 12,
    textAlign: 'center',
  },
  deviceCard: {
    marginTop: 16,
    marginBottom: 16,
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
  calibrationTitle: {
    marginBottom: 8,
  },
  calibrationDescription: {
    marginBottom: 16,
    lineHeight: 16,
  },
  calibrateButton: {
    marginBottom: 12,
  },
  calibrationMessageCard: {
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  calibrationMessageText: {
    fontWeight: '600',
  },
  sensorCard: {
    marginBottom: 16,
  },
  sensorCardTitle: {
    marginBottom: 16,
  },
  sensorDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sensorDataItem: {
    alignItems: 'center',
    flex: 1,
  },
  sensorDataValue: {
    marginTop: 8,
  },
  additionalSensorData: {
    marginTop: 16,
  },
  additionalDataTitle: {
    marginBottom: 12,
  },
  additionalDataItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  additionalDataItem: {
    alignItems: 'center',
    flex: 1,
  },
  rawDataCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  rawDataTitle: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  rawDataContent: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rawDataLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  rawDataText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    lineHeight: 16,
  },
  rawDataTimestamp: {
    fontSize: 10,
    textAlign: 'right',
  },
  statusCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statusLabel: {
    marginBottom: 8,
    color: '#FF9800',
  },
  postureCard: {
    marginBottom: 16,
  },
  postureTitle: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  postureSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  postureSectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  postureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postureMetric: {
    flex: 1,
    paddingHorizontal: 8,
  },
  postureLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  postureScore: {
    marginTop: 4,
    fontWeight: '600',
  },
  chatWidget: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    shadowColor: '#009B72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  chatBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#F04A2A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  spacer: {
    height: 32,
  },
});

export default HomeScreen;
