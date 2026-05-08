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
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { useTheme } from '@/src/theme/useTheme';
import { ChevronRight, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/services/api';
import { getThresholds, Thresholds } from '@/src/services/thresholds';

const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, token } = useAuth();

  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [thresholdsLoading, setThresholdsLoading] = useState(false);

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

  useFocusEffect(
    React.useCallback(() => {
      // When coming back from Settings after saving,
      // re-fetch to reflect latest backend values quickly.
      refreshThresholds();
      return undefined;
    }, [refreshThresholds]),
  );

  const accountItems = useMemo(
    () => [
      { label: 'Full name', value: displayName },
      { label: 'Email', value: displayEmail },
    ],
    [displayEmail, displayName],
  );

  const historyItems = [
    { label: 'Stats & Streaks', onPress: () => {} },
    { label: 'Achievement Badges', onPress: () => {} },
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
          POSTURE THRESHOLDS
        </ThemedText>
        <ThemedCard>
          <View style={styles.thresholdsHeader}>
            <ThemedText variant='body'>Your thresholds (°)</ThemedText>
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

          <View style={[styles.menuItem, styles.menuItemBorder]}>
            <ThemedText variant='body'>Neck threshold</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {thresholds ? `${thresholds.neck_threshold}°` : '—'}
            </ThemedText>
          </View>
          <View style={[styles.menuItem, styles.menuItemBorder]}>
            <ThemedText variant='body'>Upper back threshold</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {thresholds ? `${thresholds.upper_back_threshold}°` : '—'}
            </ThemedText>
          </View>
          <View style={styles.menuItem}>
            <ThemedText variant='body'>Shoulder threshold</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              {thresholds ? `${thresholds.shoulder_threshold}°` : '—'}
            </ThemedText>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.inlineActionRow}
            activeOpacity={0.85}
          >
            <ThemedText variant='label' color={theme.primary}>
              Edit thresholds
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
          CONNECTED DEVICES
        </ThemedText>
        <ThemedCard>
          <TouchableOpacity
            onPress={() => navigation.navigate('Connect')}
            style={styles.menuItem}
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
            <ThemedText variant='body'>Two-Factor Authentication</ThemedText>
            <ThemedText variant='body' color={theme.mutedText}>
              Not available yet
            </ThemedText>
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
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

export default ProfileScreen;
