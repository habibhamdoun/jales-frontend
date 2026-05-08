import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ToggleRow } from '@/src/components/ToggleRow';
import { SliderRow } from '@/src/components/SliderRow';
import { useTheme } from '@/src/theme/useTheme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { scheduleLocalNotification } from '../../services/notifications';
import { triggerVibrationPattern } from '@/src/services/haptics';
import { mockConnectedDevice } from '@/src/data/mock';
import { APP_VERSION } from '@/src/utils/constants';
import { ThemedInput } from '@/src/components/themed/ThemedInput';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/services/api';
import {
  getThresholds,
  Thresholds,
  updateThresholds,
} from '@/src/services/thresholds';

const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { token, signOut } = useAuth();

  // Static settings state for testing
  const [settings, setSettings] = useState({
    vibrationIntensity: 50,
    sensitivity: 70,
    reminderFrequency: 'Every 30 mins',
    vibrationAlerts: true,
    pushNotifications: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    neckSensitivity: 'High',
    shoulderCorrectionThreshold: '5°',
    upperBackCorrectionThreshold: '10°',
  });

  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState({
    neck_threshold: '',
    upper_back_threshold: '',
    shoulder_threshold: '',
  });
  const [thresholdsLoading, setThresholdsLoading] = useState(false);
  const [thresholdsSaving, setThresholdsSaving] = useState(false);

  // Static updateSettings function for testing
  const updateSettings = (updates: any) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    console.log('Updated settings:', { ...settings, ...updates });
  };

  // Static disconnectDevice function for testing
  const disconnectDevice = () => {
    console.log('Mock device disconnected');
  };

  const handleTestFeedback = async () => {
    await scheduleLocalNotification(
      'Test Notification',
      'This is a test posture reminder!',
    );
    triggerVibrationPattern(settings.vibrationIntensity);
  };

  const handleDisconnect = () => {
    disconnectDevice();
    Alert.alert('Disconnected', 'Device has been disconnected successfully.');
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!token) return;
      setThresholdsLoading(true);
      try {
        const data = await getThresholds(token);
        if (!alive) return;
        setThresholds(data);
        setThresholdDraft({
          neck_threshold: String(data.neck_threshold),
          upper_back_threshold: String(data.upper_back_threshold),
          shoulder_threshold: String(data.shoulder_threshold),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          Alert.alert('Session expired', 'Please log in again.');
        } else {
          Alert.alert(
            'Failed to load thresholds',
            err instanceof Error ? err.message : 'Please try again.',
          );
        }
      } finally {
        if (alive) setThresholdsLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [token]);

  const parsedDraft = useMemo(() => {
    const toNumber = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      neck_threshold: toNumber(thresholdDraft.neck_threshold),
      upper_back_threshold: toNumber(thresholdDraft.upper_back_threshold),
      shoulder_threshold: toNumber(thresholdDraft.shoulder_threshold),
    };
  }, [thresholdDraft]);

  const hasInvalidDraft =
    parsedDraft.neck_threshold === null ||
    parsedDraft.upper_back_threshold === null ||
    parsedDraft.shoulder_threshold === null;

  const handleSaveThresholds = async () => {
    if (!token) return;
    if (!thresholds) return;
    if (hasInvalidDraft) {
      Alert.alert('Invalid values', 'Please enter numeric thresholds.');
      return;
    }

    const neck = parsedDraft.neck_threshold;
    const upperBack = parsedDraft.upper_back_threshold;
    const shoulder = parsedDraft.shoulder_threshold;
    if (neck == null || upperBack == null || shoulder == null) {
      Alert.alert('Invalid values', 'Please enter numeric thresholds.');
      return;
    }

    const payload: Record<string, number> = {};
    if (neck !== thresholds.neck_threshold) payload.neck_threshold = neck;
    if (upperBack !== thresholds.upper_back_threshold)
      payload.upper_back_threshold = upperBack;
    if (shoulder !== thresholds.shoulder_threshold)
      payload.shoulder_threshold = shoulder;

    if (Object.keys(payload).length === 0) {
      Alert.alert('No changes', 'Your thresholds are already up to date.');
      return;
    }

    setThresholdsSaving(true);
    try {
      const updated = await updateThresholds(token, payload);
      setThresholds(updated);
      setThresholdDraft({
        neck_threshold: String(updated.neck_threshold),
        upper_back_threshold: String(updated.upper_back_threshold),
        shoulder_threshold: String(updated.shoulder_threshold),
      });
      Alert.alert('Saved', 'Thresholds updated successfully.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert('Session expired', 'Please log in again.');
        return;
      }
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setThresholdsSaving(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <ChevronLeft
          color={theme.text}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <ThemedText variant='subtitle'>Settings</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          FEEDBACK & ALERTS
        </ThemedText>
        <ThemedCard>
          <SliderRow
            label='Vibration Intensity'
            value={settings.vibrationIntensity}
            onValueChange={(value) =>
              updateSettings({ vibrationIntensity: value })
            }
          />
          <SliderRow
            label='Alert Sensitivity'
            value={settings.sensitivity}
            onValueChange={(value) => updateSettings({ sensitivity: value })}
          />
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>Notification Frequency</ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                {settings.reminderFrequency}
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
          <ToggleRow
            label='Vibration Alerts'
            value={settings.vibrationAlerts}
            onValueChange={(value) =>
              updateSettings({ vibrationAlerts: value })
            }
          />
          <ToggleRow
            label='Push Notifications'
            value={settings.pushNotifications}
            onValueChange={(value) =>
              updateSettings({ pushNotifications: value })
            }
          />
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>Quiet Hours</ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                {settings.quietHoursStart} - {settings.quietHoursEnd}
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          POSTURE DETECTION
        </ThemedText>
        <ThemedCard>
          <View style={styles.thresholdsHeader}>
            <ThemedText variant='body'>Posture thresholds (°)</ThemedText>
            {thresholdsLoading ? (
              <ActivityIndicator size='small' color={theme.primary} />
            ) : (
              <ThemedText variant='caption' color={theme.mutedText}>
                {thresholds?.updated_at
                  ? `Updated ${new Date(thresholds.updated_at).toLocaleString()}`
                  : '—'}
              </ThemedText>
            )}
          </View>

          <ThemedInput
            label='Neck threshold (°)'
            placeholder='30'
            keyboardType='decimal-pad'
            value={thresholdDraft.neck_threshold}
            onChangeText={(v) =>
              setThresholdDraft((p) => ({ ...p, neck_threshold: v }))
            }
          />
          <ThemedInput
            label='Upper back threshold (°)'
            placeholder='25'
            keyboardType='decimal-pad'
            value={thresholdDraft.upper_back_threshold}
            onChangeText={(v) =>
              setThresholdDraft((p) => ({ ...p, upper_back_threshold: v }))
            }
          />
          <ThemedInput
            label='Shoulder threshold (°)'
            placeholder='20'
            keyboardType='decimal-pad'
            value={thresholdDraft.shoulder_threshold}
            onChangeText={(v) =>
              setThresholdDraft((p) => ({ ...p, shoulder_threshold: v }))
            }
          />

          <ThemedButton
            title='Save thresholds'
            variant='primary'
            size='md'
            onPress={handleSaveThresholds}
            loading={thresholdsSaving}
            disabled={thresholdsLoading || thresholdsSaving || !thresholds || hasInvalidDraft}
            style={styles.saveThresholdsButton}
          />
        </ThemedCard>
      </View>

      <ThemedButton
        title='Test Feedback'
        variant='secondary'
        size='lg'
        onPress={handleTestFeedback}
        style={styles.testButton}
      />

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          DEVICE
        </ThemedText>
        <ThemedCard>
          <View style={styles.deviceRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Device Name
            </ThemedText>
            <View style={styles.deviceRowRight}>
              <ThemedText variant='body'>{mockConnectedDevice.name}</ThemedText>
            </View>
          </View>
          <View style={styles.deviceRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Device ID
            </ThemedText>
            <ThemedText variant='caption' color={theme.mutedText}>
              A4:C1:38:9B:2F:11
            </ThemedText>
          </View>
          <View style={styles.deviceRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Firmware Version
            </ThemedText>
            <ThemedText variant='body'>
              {mockConnectedDevice.firmwareVersion}
            </ThemedText>
          </View>
          <View style={styles.deviceRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Battery Status
            </ThemedText>
            <ThemedText variant='body' color={theme.success}>
              {mockConnectedDevice.battery}%
            </ThemedText>
          </View>
          <View style={styles.deviceRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Sensor Health
            </ThemedText>
            <ThemedText variant='body' color={theme.success}>
              All systems Go
            </ThemedText>
          </View>
          <ThemedButton
            title='Disconnect'
            variant='outline'
            size='md'
            onPress={handleDisconnect}
            style={styles.disconnectButton}
          />
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          ABOUT
        </ThemedText>
        <ThemedCard>
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>What is JALES?</ThemedText>
            <ChevronRight color={theme.mutedText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>Hardware Info</ThemedText>
            <ChevronRight color={theme.mutedText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>Terms & Conditions</ThemedText>
            <ChevronRight color={theme.mutedText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>Privacy Policy</ThemedText>
            <ChevronRight color={theme.mutedText} size={20} />
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <ThemedText variant='body'>App Version</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {APP_VERSION}
            </ThemedText>
          </View>
        </ThemedCard>
      </View>

      <ThemedButton
        title='Logout'
        variant='outline'
        size='lg'
        onPress={() => {
          Alert.alert('Logout', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: () => signOut(),
            },
          ]);
        }}
      />

      <View style={styles.spacer} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  thresholdsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testButton: {
    marginBottom: 24,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  deviceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disconnectButton: {
    marginTop: 16,
  },
  saveThresholdsButton: {
    marginTop: 12,
  },
  spacer: {
    height: 32,
  },
});

export default SettingsScreen;
