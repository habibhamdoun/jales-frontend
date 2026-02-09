import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ToggleRow } from '@/src/components/ToggleRow';
import { useTheme } from '@/src/theme/useTheme';
import { mockUser, mockConnectedDevice } from '@/src/data/mock';
import { ChevronRight, User as UserIcon } from 'lucide-react-native';

const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  // Static settings state for testing
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
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

  const menuItems = [
    {
      label: 'Personal Details',
      value: `${mockUser.fullName}, ${mockUser.age}`,
      onPress: () => {},
    },
    {
      label: 'Height & Weight',
      value: `${mockUser.heightCm}cm, ${mockUser.weightKg}kg`,
      onPress: () => {},
    },
  ];

  const historyItems = [
    { label: 'Stats & Streaks', onPress: () => {} },
    { label: 'Achievement Badges', onPress: () => {} },
  ];

  const personalizationItems = [
    { label: 'Notification Style', value: 'Subtle', onPress: () => {} },
    { label: 'Reminder Tone', value: 'Chime', onPress: () => {} },
    { label: 'Vibration Type', value: 'Pulse', onPress: () => {} },
  ];

  const securityItems = [{ label: 'Login & Password', onPress: () => {} }];

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <ThemedText variant='title'>Profile</ThemedText>
      </View>

      <View style={styles.profileSection}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: theme.primarySoft },
          ]}
        >
          <UserIcon color={theme.primary} size={48} />
        </View>
        <ThemedText variant='subtitle' style={styles.name}>
          {mockUser.fullName}
        </ThemedText>
        <ThemedText variant='body' color={theme.mutedText}>
          {mockUser.email}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          USER INFO
        </ThemedText>
        <ThemedCard>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
            >
              <ThemedText variant='body'>{item.label}</ThemedText>
              <View style={styles.menuItemRight}>
                <ThemedText variant='body' color={theme.mutedText}>
                  {item.value}
                </ThemedText>
                <ChevronRight color={theme.mutedText} size={20} />
              </View>
            </TouchableOpacity>
          ))}
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          POSTURE GOALS
        </ThemedText>
        <ThemedCard>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
            <ThemedText variant='body'>Daily & Weekly Goals</ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                6h / +10%
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
            <ThemedText variant='body'>Shoulder Symmetry</ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                &lt;5° tilt
              </ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </View>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <ToggleRow
              label='Screen-time Reminders'
              value={settings.notificationsEnabled}
              onValueChange={(value) =>
                updateSettings({ notificationsEnabled: value })
              }
            />
          </View>
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          HISTORY
        </ThemedText>
        <ThemedCard>
          {historyItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={[
                styles.menuItem,
                index < historyItems.length - 1 && styles.menuItemBorder,
              ]}
            >
              <ThemedText variant='body'>{item.label}</ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </TouchableOpacity>
          ))}
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          PERSONALIZATION
        </ThemedText>
        <ThemedCard>
          {personalizationItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={[
                styles.menuItem,
                index < personalizationItems.length - 1 &&
                  styles.menuItemBorder,
              ]}
            >
              <ThemedText variant='body'>{item.label}</ThemedText>
              <View style={styles.menuItemRight}>
                <ThemedText variant='body' color={theme.mutedText}>
                  {item.value}
                </ThemedText>
                <ChevronRight color={theme.mutedText} size={20} />
              </View>
            </TouchableOpacity>
          ))}
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          CONNECTED DEVICES
        </ThemedText>
        <ThemedCard>
          <TouchableOpacity
            onPress={() => navigation.navigate('Connect')}
            style={styles.menuItem}
          >
            <ThemedText variant='body'>JALES Shirt</ThemedText>
            <View style={styles.menuItemRight}>
              <ThemedText variant='body' color={theme.mutedText}>
                {mockConnectedDevice.model}, {mockConnectedDevice.battery}%
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
          SECURITY
        </ThemedText>
        <ThemedCard>
          {securityItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={[
                styles.menuItem,
                index < securityItems.length - 1 && styles.menuItemBorder,
              ]}
            >
              <ThemedText variant='body'>{item.label}</ThemedText>
              <ChevronRight color={theme.mutedText} size={20} />
            </TouchableOpacity>
          ))}
          <View style={styles.menuItem}>
            <ToggleRow
              label='Two-Factor Authentication'
              value={false}
              onValueChange={() => {}}
            />
          </View>
        </ThemedCard>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        style={styles.settingsButton}
      >
        <ThemedText variant='label' color={theme.primary}>
          View All Settings
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    marginBottom: 4,
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
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  spacer: {
    height: 32,
  },
});

export default ProfileScreen;
