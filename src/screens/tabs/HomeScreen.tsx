import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ProgressRing } from '@/src/components/ProgressRing';
import { MetricCard } from '@/src/components/MetricCard';
import { useTheme } from '@/src/theme/useTheme';
import { mockPostureData } from '@/src/data/mock';
import { Activity, ArrowUp, Minus } from 'lucide-react-native';

const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  // Static connected device state for testing - set to null to test unconnected state
  const connectedDevice = {
    name: 'JALES Shirt #1',
    model: 'JALES Pro',
    battery: 85,
    lastSync: '2 mins ago',
  };

  const {
    currentScore,
    status,
    angles,
    vibrationCount,
    lastCorrectionMinutesAgo,
  } = mockPostureData;

  const handleConnect = () => {
    navigation.navigate('Connect');
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
          label='POSTURE'
          status={status}
        />
      </View>

      <View style={styles.metricsRow}>
        <MetricCard
          icon={<Activity color={theme.primary} size={24} />}
          label='Neck Aligned'
          value={`${angles.neck}°`}
          status='good'
        />
        <MetricCard
          icon={<ArrowUp color={theme.primary} size={24} />}
          label='Upper Back Aligned'
          value={`${angles.upperBack}°`}
          status='good'
        />
        <MetricCard
          icon={<Minus color={theme.primary} size={24} />}
          label='Shoulders Aligned'
          value={`${angles.shoulders}°`}
          status='good'
        />
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

      {!connectedDevice && (
        <ThemedButton
          title='Connect to JALES Shirt'
          variant='primary'
          size='lg'
          onPress={handleConnect}
          style={styles.connectButton}
        />
      )}

      {connectedDevice && (
        <ThemedCard style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <View>
              <ThemedText variant='label'>{connectedDevice.name}</ThemedText>
              <ThemedText variant='caption' color={theme.mutedText}>
                {connectedDevice.model} • {connectedDevice.battery}%
              </ThemedText>
            </View>
            <TouchableOpacity onPress={handleConnect}>
              <ThemedText variant='label' color={theme.primary}>
                Manage
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedCard>
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
    marginVertical: 16,
  },
  deviceCard: {
    marginTop: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacer: {
    height: 32,
  },
});

export default HomeScreen;
