import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppTabsParamList,
  ProfileStackParamList,
} from '@/src/navigation/AppTabs';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { useTheme } from '@/src/theme/useTheme';
import {
  Activity,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react-native';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/services/api';
import { getThresholds, type Thresholds, type VibrationPattern } from '@/src/services/thresholds';
import { listSessions, type SessionDto } from '@/src/services/sessions';
import {
  actionLevelToBadge,
  type ActionLevel,
} from '@/src/services/posture';
import { useMonitoring } from '@/src/monitoring/MonitoringContext';
import { useBle } from '@/src/hooks/useBle';
import { batteryPercentDisplayColor } from '@/src/utils/bleUtils';
import { listDevices, type DeviceDto } from '@/src/services/devices';
import type { Device } from 'react-native-ble-plx';

const RECENT_SESSIONS_SHOW = 5;
/** Fetch enough rows to sort client-side; API order may not be newest-first. */
const RECENT_SESSIONS_FETCH = 40;

const sessionRecencyMs = (s: SessionDto): number => {
  const raw = s.end_time ?? s.start_time ?? s.created_at ?? '';
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
};

/** Same identity rule as MonitoringProvider: registered `mac_address` equals BLE `device.id`. */
const bleMatchesRegisteredDevice = (
  bleDevice: Device | null,
  connected: boolean,
  dtoMac: string,
): boolean => {
  if (!connected || !bleDevice) return false;
  return dtoMac.trim().toUpperCase() === bleDevice.id.trim().toUpperCase();
};

type ProfileMainNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  BottomTabNavigationProp<AppTabsParamList>
>;

const vibrationPatternUi = (
  pattern: VibrationPattern | undefined,
): { title: string; detail: string } => {
  switch (pattern) {
    case 'gentle':
      return {
        title: 'Gentle',
        detail: 'Moderate: 1 pulse / 10s · Severe: 1 pulse / 6s',
      };
    case 'aggressive':
      return {
        title: 'Aggressive',
        detail: 'Moderate: 1 pulse / 6s · Severe: 3 pulses / 4s',
      };
    case 'normal':
    default:
      return {
        title: 'Normal',
        detail: 'Moderate: 1 pulse / 8s · Severe: 2 pulses / 5s',
      };
  }
};

const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ProfileMainNav>();
  const { user, token } = useAuth();
  const { hasUserServerCalibration } = useMonitoring();
  const {
    device,
    isConnected,
    batteryLevel,
    disconnectDevice: disconnectBleDevice,
  } = useBle();

  const navigateToSettings = React.useCallback(() => {
    const state = navigation.getState();
    const routeNames = (state as { routeNames?: string[] })?.routeNames;
    if (routeNames?.includes('Settings')) {
      navigation.navigate('Settings');
      return;
    }
    navigation.navigate('Profile', { screen: 'Settings' });
  }, [navigation]);

  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [thresholdsLoading, setThresholdsLoading] = useState(false);

  const [recentSessions, setRecentSessions] = useState<SessionDto[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [registeredDevices, setRegisteredDevices] = useState<DeviceDto[]>([]);
  const [registeredDevicesLoading, setRegisteredDevicesLoading] = useState(false);

  const displayName = user?.name?.trim() || '—';
  const displayEmail = user?.email?.trim() || '—';

  const refreshThresholds = React.useCallback(async () => {
    if (!token) return;
    setThresholdsLoading(true);
    try {
      const data = await getThresholds(token);
      setThresholds(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert('Session expired', 'Please log in again.');
        return;
      }
      Alert.alert(
        'Failed to load thresholds',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setThresholdsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!token) return;
        setThresholdsLoading(true);
        const data = await getThresholds(token);
        if (!alive) return;
        setThresholds(data);
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) {
          Alert.alert('Session expired', 'Please log in again.');
          return;
        }
        Alert.alert(
          'Failed to load thresholds',
          err instanceof Error ? err.message : 'Please try again.',
        );
      } finally {
        if (alive) setThresholdsLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [token]);

  const refreshSessions = React.useCallback(async () => {
    if (!token) return;
    setSessionsLoading(true);
    try {
      const data = await listSessions(token, RECENT_SESSIONS_FETCH);
      const sorted = [...data].sort(
        (a, b) => sessionRecencyMs(b) - sessionRecencyMs(a),
      );
      setRecentSessions(sorted.slice(0, RECENT_SESSIONS_SHOW));
    } catch (err) {
      console.warn('[Profile] listSessions failed:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [token]);

  const refreshRegisteredDevices = React.useCallback(async () => {
    if (!token) return;
    setRegisteredDevicesLoading(true);
    try {
      const data = await listDevices(token);
      setRegisteredDevices(data);
    } catch (err) {
      console.warn('[Profile] listDevices failed:', err);
    } finally {
      setRegisteredDevicesLoading(false);
    }
  }, [token]);

  const handleDisconnectBle = () => {
    if (!device) {
      Alert.alert('No Bluetooth device', 'Connect your JALES shirt from Connect first.');
      return;
    }
    Alert.alert(
      'Disconnect Bluetooth',
      'This closes the BLE link to your shirt. You can reconnect from Connect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void disconnectBleDevice()
              .then(() => Alert.alert('Disconnected', 'Bluetooth connection closed.'))
              .catch((err) =>
                Alert.alert('Disconnect failed', err instanceof Error ? err.message : 'Please try again.'),
              );
          },
        },
      ],
    );
  };

  const formatSessionWhen = (iso: string | undefined): string => {
    if (!iso) return 'Session';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Session';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      // When coming back from Settings / Connect, re-fetch quickly.
      refreshThresholds();
      refreshSessions();
      void refreshRegisteredDevices();
      return undefined;
    }, [refreshThresholds, refreshSessions, refreshRegisteredDevices]),
  );

  const accountItems = useMemo(
    () => [
      { label: 'Full name', value: displayName },
      { label: 'Email', value: displayEmail },
    ],
    [displayEmail, displayName],
  );

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
          {displayName}
        </ThemedText>
        <ThemedText variant='body' color={theme.mutedText}>
          {displayEmail}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          ACCOUNT
        </ThemedText>
        <ThemedCard>
          {accountItems.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.menuItem,
                index < accountItems.length - 1 && styles.menuItemBorder,
              ]}
            >
              <ThemedText variant='body'>{item.label}</ThemedText>
              <ThemedText variant='body' color={theme.mutedText}>
                {item.value}
              </ThemedText>
            </View>
          ))}
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          REGISTERED DEVICES
        </ThemedText>
        <ThemedCard>
          {registeredDevicesLoading ? (
            <View style={styles.deviceRow}>
              <ActivityIndicator size='small' color={theme.primary} />
            </View>
          ) : registeredDevices.length === 0 ? (
            <View style={styles.deviceRow}>
              <ThemedText variant='caption' color={theme.mutedText}>
                No registered devices yet. Connect a JALES Shirt to register it.
              </ThemedText>
            </View>
          ) : (
            registeredDevices.map((dev) => {
              const liveBle = bleMatchesRegisteredDevice(
                device,
                isConnected,
                dev.mac_address,
              );
              const pct =
                liveBle && batteryLevel != null
                  ? batteryLevel
                  : typeof dev.battery_level === 'number'
                    ? dev.battery_level
                    : null;
              const waitingBleBattery = liveBle && batteryLevel == null;
              return (
                <View key={dev.id} style={styles.registeredDeviceBlock}>
                  <View style={styles.deviceRow}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Device Name
                    </ThemedText>
                    <ThemedText variant='body'>{dev.device_name}</ThemedText>
                  </View>
                  <View style={styles.deviceRow}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      MAC / ID
                    </ThemedText>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      {dev.mac_address}
                    </ThemedText>
                  </View>
                  <View style={styles.deviceRow}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Battery{liveBle ? ' (shirt)' : ''}
                    </ThemedText>
                    <ThemedText
                      variant='body'
                      color={
                        typeof pct === 'number'
                          ? batteryPercentDisplayColor(pct, theme)
                          : theme.mutedText
                      }
                    >
                      {waitingBleBattery
                        ? '…'
                        : typeof pct === 'number'
                          ? `${pct}%`
                          : '—'}
                    </ThemedText>
                  </View>
                  {dev.last_synced_at ? (
                    <View style={styles.deviceRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Last Synced
                      </ThemedText>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        {new Date(dev.last_synced_at).toLocaleString()}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          <ThemedButton
            title='Disconnect Bluetooth shirt'
            variant='outline'
            size='md'
            onPress={handleDisconnectBle}
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
          THRESHOLD
        </ThemedText>
        <ThemedCard>
          <View style={styles.thresholdsHeader}>
            <ThemedText variant='body'>Angle tolerances (°)</ThemedText>
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

          <ThemedText
            variant='caption'
            color={theme.mutedText}
            style={{ paddingBottom: 10, lineHeight: 18 }}
          >
            {hasUserServerCalibration
              ? 'Server uses these after calibration-aware RULA banding; moving past your tolerance can bump the matching part score one step.'
              : 'After you save account calibration, the backend can use these as a second pass (when each value is greater than zero).'}
          </ThemedText>

          <View style={[styles.menuItem, styles.menuItemBorder]}>
            <ThemedText variant='body'>Upper back</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {thresholds ? `${thresholds.upper_back_threshold}°` : '—'}
            </ThemedText>
          </View>
          <View style={[styles.menuItem, styles.menuItemBorder]}>
            <ThemedText variant='body'>Left shoulder</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {thresholds ? `${thresholds.shoulder_threshold}°` : '—'}
            </ThemedText>
          </View>
          <View style={styles.menuItem}>
            <ThemedText variant='body'>Right shoulder</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {thresholds ? `${thresholds.shoulder_threshold}°` : '—'}
            </ThemedText>
          </View>
          <ThemedText variant='caption' color={theme.mutedText} style={{ lineHeight: 16, marginBottom: 4 }}>
            Left and right use the same shoulder tolerance from your account settings.
          </ThemedText>

          <TouchableOpacity
            onPress={navigateToSettings}
            style={styles.inlineActionRow}
            activeOpacity={0.85}
          >
            <ThemedText variant='label' color={theme.primary}>
              Edit in Settings
            </ThemedText>
            <ChevronRight color={theme.primary} size={18} />
          </TouchableOpacity>
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.sectionTitle}
        >
          VIBRATION PATTERN
        </ThemedText>
        <ThemedCard>
          <View style={styles.menuItem}>
            <ThemedText variant='body'>Current pattern</ThemedText>
            <ThemedText variant='body' color={theme.primary} style={{ fontWeight: '700' }}>
              {thresholdsLoading ? '…' : vibrationPatternUi(thresholds?.vibration_pattern).title}
            </ThemedText>
          </View>
          <ThemedText variant='caption' color={theme.mutedText} style={{ lineHeight: 18, paddingBottom: 4 }}>
            {thresholdsLoading
              ? 'Loading…'
              : vibrationPatternUi(thresholds?.vibration_pattern).detail}
          </ThemedText>
          <TouchableOpacity
            onPress={navigateToSettings}
            style={styles.inlineActionRow}
            activeOpacity={0.85}
          >
            <ThemedText variant='label' color={theme.primary}>
              Change in Settings
            </ThemedText>
            <ChevronRight color={theme.primary} size={18} />
          </TouchableOpacity>
        </ThemedCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <ThemedText
            variant='caption'
            color={theme.mutedText}
            style={[styles.sectionTitle, styles.sectionTitleInRow]}
          >
            RECENT SESSIONS
          </ThemedText>
          {!sessionsLoading && recentSessions.length > 0 ? (
            <ThemedText
              variant='caption'
              color={theme.mutedText}
              style={styles.sectionTitleInRow}
            >
              Newest first · {RECENT_SESSIONS_SHOW} max
            </ThemedText>
          ) : null}
        </View>
        <ThemedCard style={styles.sessionsCard}>
          {sessionsLoading ? (
            <View style={styles.sessionsLoading}>
              <ActivityIndicator size='small' color={theme.primary} />
              <ThemedText variant='caption' color={theme.mutedText}>
                Loading sessions…
              </ThemedText>
            </View>
          ) : recentSessions.length === 0 ? (
            <View style={styles.sessionsEmpty}>
              <View
                style={[
                  styles.sessionsEmptyIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Activity color={theme.primary} size={22} strokeWidth={2.2} />
              </View>
              <ThemedText variant='body' color={theme.text} style={styles.sessionsEmptyTitle}>
                No sessions yet
              </ThemedText>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.sessionsEmptyHint}>
                Start monitoring from Home while your shirt is connected to build your history here.
              </ThemedText>
            </View>
          ) : (
            recentSessions.map((session, index) => {
              const avg = session.avg_action_level;
              const roundedLevel: ActionLevel | null =
                typeof avg === 'number' && Number.isFinite(avg)
                  ? (Math.max(1, Math.min(4, Math.round(avg))) as ActionLevel)
                  : null;
              const pill = actionLevelToBadge(roundedLevel);
              const score =
                typeof session.posture_score === 'number'
                  ? Math.round(session.posture_score)
                  : null;
              return (
                <TouchableOpacity
                  key={session.id}
                  activeOpacity={0.88}
                  onPress={() =>
                    navigation.navigate('SessionDetail', {
                      sessionId: session.id,
                      startTime: session.start_time,
                    })
                  }
                  style={[
                    styles.sessionRow,
                    {
                      borderColor: theme.border,
                      backgroundColor: `${theme.primary}08`,
                      marginBottom: index < recentSessions.length - 1 ? 10 : 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.sessionIconWrap,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Activity color={theme.primary} size={20} strokeWidth={2.2} />
                  </View>
                  <View style={styles.sessionRowMain}>
                    <ThemedText
                      variant='label'
                      color={theme.text}
                      numberOfLines={1}
                      style={styles.sessionTitle}
                    >
                      {formatSessionWhen(session.start_time)}
                    </ThemedText>
                    <ThemedText variant='caption' color={theme.mutedText} numberOfLines={1}>
                      {typeof session.duration_seconds === 'number'
                        ? formatDuration(session.duration_seconds)
                        : 'In progress'}
                      {' · '}
                      {typeof session.total_alerts === 'number'
                        ? `${session.total_alerts} alert${session.total_alerts === 1 ? '' : 's'}`
                        : '—'}
                    </ThemedText>
                  </View>
                  <View style={styles.sessionRowRight}>
                    {roundedLevel != null ? (
                      <View
                        style={[
                          styles.sessionPill,
                          {
                            backgroundColor: `${pill.color}18`,
                            borderColor: pill.color,
                          },
                        ]}
                      >
                        <ThemedText
                          variant='caption'
                          style={[styles.sessionPillText, { color: pill.color }]}
                        >
                          L{roundedLevel}
                        </ThemedText>
                      </View>
                    ) : null}
                    <ThemedText
                      variant='label'
                      color={
                        score != null
                          ? score >= 70
                            ? theme.success
                            : score >= 50
                              ? theme.warning
                              : theme.danger
                          : theme.mutedText
                      }
                      style={styles.sessionScore}
                    >
                      {score != null ? `${score}%` : '—'}
                    </ThemedText>
                    <ChevronRight color={theme.mutedText} size={20} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
            style={[styles.menuItem, styles.menuItemBorder]}
            activeOpacity={0.85}
          >
            <View>
              <ThemedText variant='body'>JALES Shirt</ThemedText>
              <ThemedText variant='caption' color={theme.mutedText}>
                Connect your device to see battery & firmware.
              </ThemedText>
            </View>
            <ChevronRight color={theme.mutedText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Calibration')}
            style={styles.menuItem}
            activeOpacity={0.85}
          >
            <View>
              <ThemedText variant='body'>Calibration</ThemedText>
              <ThemedText variant='caption' color={theme.mutedText}>
                Save neutral baselines (required before monitoring).
              </ThemedText>
            </View>
            <ChevronRight color={theme.mutedText} size={20} />
          </TouchableOpacity>
        </ThemedCard>
      </View>

      <TouchableOpacity
        onPress={navigateToSettings}
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sectionTitleInRow: {
    marginBottom: 0,
  },
  sessionsCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sessionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  sessionsEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  sessionsEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sessionsEmptyTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  sessionsEmptyHint: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  sessionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionRowMain: {
    flex: 1,
    minWidth: 0,
  },
  sessionTitle: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionScore: {
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'right',
  },
  thresholdsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  registeredDeviceBlock: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 8,
  },
  disconnectButton: { marginTop: 16 },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  sessionPillText: {
    fontWeight: '700',
  },
  inlineActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  settingsButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  spacer: {
    height: 32,
  },
});

const formatDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export default ProfileScreen;
