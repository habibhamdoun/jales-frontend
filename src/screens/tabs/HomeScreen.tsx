import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppTabsParamList,
  ProfileStackParamList,
} from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ProgressRing } from '@/src/components/ProgressRing';
import { MetricCard } from '@/src/components/MetricCard';
import { useTheme } from '@/src/theme/useTheme';
import { mockPostureData } from '@/src/data/mock';
import {
  Activity,
  ArrowUp,
  Minus,
  Bluetooth,
  AlertCircle,
  Zap,
} from 'lucide-react-native';
import { useBle } from '@/src/hooks/useBle';

const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();

  // Get BLE device and data from context
  const { device, bno, mpu1, isConnected, postureAnalysis } = useBle();

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
      postureAnalysis.neck.totalScore + postureAnalysis.trunk.totalScore;
    const maxReba = 8; // Max of 4+4
    const scorePercent = 100 - (combinedRebaScore / maxReba) * 100;

    let status = 'GOOD';
    if (scorePercent < 25) status = 'BAD';
    else if (scorePercent < 50) status = 'WARNING';

    return { score: Math.round(scorePercent), status };
  };

  const { score: currentScore, status } = calculatePostureScore();

  const handleConnect = () => {
    //@ts-ignore
    navigation.navigate('Profile', { screen: 'Connect' });
  };

  const handleOpenCalibration = () => {
    //@ts-ignore
    navigation.navigate('Profile', { screen: 'Calibration' });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 2) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Get posture color
  const getPostureColor = (posture: string | null) => {
    switch (posture) {
      case 'GOOD':
        return '#4CAF50'; // Green
      case 'WARNING':
        return '#FF9800'; // Orange
      case 'BAD':
        return '#F44336'; // Red
      default:
        return theme.mutedText;
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <ThemedText variant='title'>JALES</ThemedText>
      </View>

      <View style={styles.scoreContainer}>
        <ProgressRing
          percentage={currentScore}
          size={160}
          strokeWidth={12}
          label='LIVE POSTURE'
          status={status}
        />
      </View>

      <View style={styles.metricsRow}>
        {postureAnalysis ? (
          <>
            <MetricCard
              icon={<Activity color={theme.primary} size={24} />}
              label='Neck Score'
              value={`${postureAnalysis.neck.totalScore}/4`}
              status={postureAnalysis.neck.totalScore <= 3 ? 'good' : 'warning'}
            />
            <MetricCard
              icon={<ArrowUp color={theme.primary} size={24} />}
              label='Trunk Score'
              value={`${postureAnalysis.trunk.totalScore}/5`}
              status={
                postureAnalysis.trunk.totalScore <= 2
                  ? 'good'
                  : postureAnalysis.trunk.totalScore <= 4
                    ? 'warning'
                    : 'danger'
              }
            />
            <MetricCard
              icon={<Minus color={theme.primary} size={24} />}
              label='Overall'
              value={`${currentScore}%`}
              status={
                status === 'GOOD'
                  ? 'good'
                  : status === 'WARNING'
                    ? 'warning'
                    : 'danger'
              }
            />
          </>
        ) : (
          <>
            <MetricCard
              icon={<Activity color={theme.primary} size={24} />}
              label='Neck Aligned'
              value={bno ? `${bno.heading.toFixed(1)}°` : 'N/A'}
              status='good'
            />
            <MetricCard
              icon={<ArrowUp color={theme.primary} size={24} />}
              label='Upper Back Aligned'
              value={bno ? `${bno.roll.toFixed(1)}°` : 'N/A'}
              status='good'
            />
            <MetricCard
              icon={<Minus color={theme.primary} size={24} />}
              label='Shoulders Aligned'
              value={bno ? `${bno.pitch.toFixed(1)}°` : 'N/A'}
              status='good'
            />
          </>
        )}
      </View>

      <ThemedCard style={styles.vibrationCard}>
        <View style={styles.vibrationRow}>
          <View>
            <ThemedText variant='caption' color={theme.mutedText}>
              Vibrations Triggered
            </ThemedText>
            <ThemedText variant='title' style={styles.vibrationCount}>
              {vibrationCount}
            </ThemedText>
          </View>
          <View
            style={[
              styles.vibrationIcon,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <Activity color={theme.primary} size={24} />
          </View>
        </View>
      </ThemedCard>

      <ThemedCard style={styles.correctionCard}>
        <View style={styles.correctionRow}>
          <Activity color={theme.primary} size={20} />
          <ThemedText variant='body' style={styles.correctionText}>
            Last Correction
          </ThemedText>
        </View>
        <ThemedText variant='label' color={theme.primary}>
          {lastCorrectionMinutesAgo}m ago
        </ThemedText>
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
            Trunk Pitch: {postureAnalysis.trunk.angles.pitch.toFixed(1)}°
            (Score: {postureAnalysis.trunk.totalScore})
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Trunk Roll: {postureAnalysis.trunk.angles.roll.toFixed(1)}°
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            {postureAnalysis.neck.label} | {postureAnalysis.trunk.label}
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

              {/* Trunk Posture */}
              <View style={styles.postureSection}>
                <ThemedText variant='body' style={styles.postureSectionTitle}>
                  Trunk
                </ThemedText>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Pitch
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.trunk.angles.pitch.toFixed(1)}°
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Roll
                    </ThemedText>
                    <ThemedText variant='body'>
                      {postureAnalysis.trunk.angles.roll.toFixed(1)}°
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.postureRow}>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      REBA
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.postureLabel}>
                      {postureAnalysis.trunk.label}
                    </ThemedText>
                  </View>
                  <View style={styles.postureMetric}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Score
                    </ThemedText>
                    <ThemedText variant='body' style={styles.postureScore}>
                      {postureAnalysis.trunk.totalScore}
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
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  spacer: {
    height: 32,
  },
});

export default HomeScreen;
