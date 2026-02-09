import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ToggleRow } from '@/src/components/ToggleRow';
import { SliderRow } from '@/src/components/SliderRow';
import { useTheme } from '@/src/theme/useTheme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { scheduleLocalNotification } from '@/src/services/notifications';
import { triggerVibrationPattern } from '@/src/services/haptics';
import { mockConnectedDevice } from '@/src/data/mock';
import { APP_VERSION } from '@/src/utils/constants';

const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

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
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>Neck Sensitivity</ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                {settings.neckSensitivity}
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>
              Shoulder Correction Threshold
            </ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                {settings.shoulderCorrectionThreshold}
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <ThemedText variant='body'>
              Upper-back Correction Threshold
            </ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                {settings.upperBackCorrectionThreshold}
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
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
  spacer: {
    height: 32,
  },
});

export default SettingsScreen;
