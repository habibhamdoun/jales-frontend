import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useBle } from '@/src/hooks/useBle';
import { APP_VERSION } from '@/src/utils/constants';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/services/api';
import {
  getBestAngles,
  getThresholds,
  updateThresholds,
  type BestAnglesResult,
  type Thresholds,
  type VibrationPattern,
} from '@/src/services/thresholds';
import type { ThemeTokens } from '@/src/theme/themes';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const backendVibrationToUiPercent = (level: number): number => {
  const clamped = Math.max(1, Math.min(10, Math.round(level)));
  return Math.round(((clamped - 1) / 9) * 100);
};

const uiPercentToBackendVibration = (percent: number): number => {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return Math.max(1, Math.min(10, Math.round(1 + (p / 100) * 9)));
};

const VIBRATION_PATTERNS: {
  value: VibrationPattern;
  label: string;
  description: string;
}[] = [
  {
    value:       'gentle',
    label:       'Gentle',
    description: 'Moderate: 1 pulse / 10s  ·  Severe: 1 pulse / 6s',
  },
  {
    value:       'normal',
    label:       'Normal',
    description: 'Moderate: 1 pulse / 8s  ·  Severe: 2 pulses / 5s',
  },
  {
    value:       'aggressive',
    label:       'Aggressive',
    description: 'Moderate: 1 pulse / 6s  ·  Severe: 3 pulses / 4s',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const SettingsScreen: React.FC = () => {
  const { theme }    = useTheme();
  const navigation   = useNavigation();
  const { token, signOut } = useAuth();
  const { setVibrationIntensity } = useBle();

  // ── Thresholds ────────────────────────────────────────────────────────────
  const [thresholds,        setThresholds]        = useState<Thresholds | null>(null);
  const [thresholdsLoading, setThresholdsLoading] = useState(false);

  // ── Vibration intensity ───────────────────────────────────────────────────
  const [vibrationDraftPercent, setVibrationDraftPercent] = useState(50);
  const [vibrationSaving,       setVibrationSaving]       = useState(false);

  // ── Vibration pattern ─────────────────────────────────────────────────────
  const [vibrationPattern,       setVibrationPattern]       = useState<VibrationPattern>('normal');
  const [vibrationPatternSaving, setVibrationPatternSaving] = useState(false);

  // ── Push notifications ────────────────────────────────────────────────────
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushSaving,  setPushSaving]  = useState(false);

  // ── Best angles ───────────────────────────────────────────────────────────
  const [bestAnglesResult,  setBestAnglesResult]  = useState<BestAnglesResult | null>(null);
  const [bestAnglesLoading, setBestAnglesLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD ON MOUNT
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!token) return;
      setThresholdsLoading(true);
      try {
        const data = await getThresholds(token);
        if (!alive) return;
        setThresholds(data);
        const vPct = backendVibrationToUiPercent(data.vibration_intensity);
        setVibrationDraftPercent(vPct);
        setVibrationPattern(data.vibration_pattern);
        setPushEnabled(data.push_notifications_enabled);
        void setVibrationIntensity(vPct);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          Alert.alert('Session expired', 'Please log in again.');
        } else {
          Alert.alert('Failed to load settings', err instanceof Error ? err.message : 'Please try again.');
        }
      } finally {
        if (alive) setThresholdsLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [token]);

  const loadBestAngles = useCallback(async () => {
    if (!token) return;
    setBestAnglesLoading(true);
    try {
      const result = await getBestAngles(token);
      setBestAnglesResult(result);
      if (result.hasData && result.autoSaved) {
        // Refresh thresholds so the updated_at reflects the auto-save
        const updated = await getThresholds(token);
        setThresholds(updated);
      }
      if (result.hasData && result.warning) {
        console.warn('[Settings] best-angles warning:', result.warning);
      }
    } catch (err) {
      console.warn('[Settings] getBestAngles failed:', err);
    } finally {
      setBestAnglesLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadBestAngles(); }, [loadBestAngles]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const vibrationDirty =
    thresholds != null &&
    uiPercentToBackendVibration(vibrationDraftPercent) !== thresholds.vibration_intensity;

  const handleSaveVibrationIntensity = async () => {
    if (!token || !thresholds) return;
    setVibrationSaving(true);
    try {
      const level   = uiPercentToBackendVibration(vibrationDraftPercent);
      const updated = await updateThresholds(token, { vibration_intensity: level });
      setThresholds(updated);
      const synced = backendVibrationToUiPercent(updated.vibration_intensity);
      setVibrationDraftPercent(synced);
      await setVibrationIntensity(synced);
      Alert.alert('Saved', 'Vibration intensity saved.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { Alert.alert('Session expired', 'Please log in again.'); return; }
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setVibrationSaving(false);
    }
  };

  const handleSaveVibrationPattern = async (pattern: VibrationPattern) => {
    if (!token || !thresholds) return;
    setVibrationPatternSaving(true);
    try {
      const updated = await updateThresholds(token, { vibration_pattern: pattern });
      setThresholds(updated);
      setVibrationPattern(updated.vibration_pattern);
      Alert.alert('Saved', `Vibration pattern set to ${updated.vibration_pattern}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { Alert.alert('Session expired', 'Please log in again.'); return; }
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setVibrationPatternSaving(false);
    }
  };

  const handleTogglePushNotifications = async (enabled: boolean) => {
    if (!token || !thresholds) return;
    setPushEnabled(enabled);
    setPushSaving(true);
    try {
      const updated = await updateThresholds(token, { push_notifications_enabled: enabled });
      setThresholds(updated);
      setPushEnabled(updated.push_notifications_enabled);
    } catch (err) {
      setPushEnabled(!enabled);
      if (err instanceof ApiError && err.status === 401) { Alert.alert('Session expired', 'Please log in again.'); return; }
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPushSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <ChevronLeft color={theme.text} size={24} onPress={() => navigation.goBack()} />
        <ThemedText variant='subtitle'>Settings</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* ── FEEDBACK & ALERTS ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText variant='caption' color={theme.mutedText} style={styles.sectionTitle}>
          FEEDBACK & ALERTS
        </ThemedText>
        <ThemedCard>

          {/* Vibration intensity */}
          <SliderRow
            label='Vibration Intensity'
            value={vibrationDraftPercent}
            onValueChange={setVibrationDraftPercent}
          />
          <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
            Move the slider, then save. Stored as levels 1–10 on the server and
            sent to the shirt as 0–100 when it vibrates.
          </ThemedText>
          <ThemedButton
            title={vibrationSaving ? 'Saving…' : 'Save vibration intensity'}
            variant='primary'
            size='md'
            onPress={() => void handleSaveVibrationIntensity()}
            loading={vibrationSaving}
            disabled={!token || !thresholds || thresholdsLoading || vibrationSaving || !vibrationDirty}
            style={styles.saveBtn}
          />

          {/* Vibration pattern */}
          <ThemedText variant='label' color={theme.text} style={styles.patternLabel}>
            Vibration Pattern
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
            Controls how many pulses fire and how often, based on posture severity.
          </ThemedText>
          {VIBRATION_PATTERNS.map((opt) => {
            const selected = vibrationPattern === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.patternOption,
                  {
                    borderColor:     selected ? theme.primary : theme.border,
                    backgroundColor: selected ? `${theme.primary}12` : 'transparent',
                  },
                ]}
                onPress={() => {
                  setVibrationPattern(opt.value);
                  void handleSaveVibrationPattern(opt.value);
                }}
                disabled={vibrationPatternSaving || thresholdsLoading}
              >
                <View style={styles.patternRow}>
                  <View
                    style={[
                      styles.patternDot,
                      { backgroundColor: selected ? theme.primary : theme.border },
                    ]}
                  />
                  <View style={styles.patternText}>
                    <ThemedText variant='label' color={theme.text}>
                      {opt.label}{selected && vibrationPatternSaving ? '  …' : ''}
                    </ThemedText>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      {opt.description}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Push notifications toggle — wired to backend */}
          <ToggleRow
            label='Push Notifications'
            value={pushEnabled}
            onValueChange={(val) => void handleTogglePushNotifications(val)}
            disabled={pushSaving || thresholdsLoading}
          />
          <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
            When off, the shirt still vibrates on bad posture — only the phone
            notification is suppressed.
          </ThemedText>

        </ThemedCard>
      </View>

      {/* ── POSTURE DETECTION ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText variant='caption' color={theme.mutedText} style={styles.sectionTitle}>
          POSTURE DETECTION
        </ThemedText>
        <ThemedCard>
          <ThemedText variant='label' color={theme.text} style={{ marginBottom: 6 }}>
            Your personal neutral angles
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
            Computed from your best posture readings (RULA action level 1 only).
            These are automatically saved as your personal thresholds — no manual input needed.
          </ThemedText>

          {thresholdsLoading && !bestAnglesResult ? (
            <ActivityIndicator
              size='small'
              color={theme.primary}
              style={{ marginVertical: 16 }}
            />
          ) : bestAnglesLoading ? (
            <ActivityIndicator
              size='small'
              color={theme.primary}
              style={{ marginVertical: 16 }}
            />
          ) : bestAnglesResult?.hasData ? (
            <>
              <View style={styles.angleGrid}>
                <BestAngleCell
                  label='Upper Back'
                  value={bestAnglesResult.bestAngles.upper_back_angle}
                  theme={theme}
                />
                <BestAngleCell
                  label='Left Shoulder'
                  value={bestAnglesResult.bestAngles.left_shoulder_angle}
                  theme={theme}
                />
                <BestAngleCell
                  label='Right Shoulder'
                  value={bestAnglesResult.bestAngles.right_shoulder_angle}
                  theme={theme}
                />
              </View>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
                Based on {bestAnglesResult.bestAngles.readings_used} perfect-posture readings.
                {bestAnglesResult.autoSaved
                  ? ' Auto-saved as your thresholds ✓'
                  : ' Could not auto-save — tap Refresh to retry.'}
              </ThemedText>
              {thresholds?.updated_at ? (
                <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
                  Last updated: {new Date(thresholds.updated_at).toLocaleString()}
                </ThemedText>
              ) : null}
            </>
          ) : (
            <ThemedText variant='caption' color={theme.mutedText} style={styles.hint}>
              {bestAnglesResult
                ? bestAnglesResult.message
                : 'No perfect-posture readings found yet.'}
              {'\n\n'}Wear the shirt during a session and maintain good posture.
              The app will detect your natural neutral position and save it automatically.
            </ThemedText>
          )}

          <ThemedButton
            title={bestAnglesLoading ? 'Refreshing…' : 'Refresh from my readings'}
            variant='outline'
            size='md'
            onPress={() => void loadBestAngles()}
            loading={bestAnglesLoading}
            disabled={!token || bestAnglesLoading}
            style={{ marginTop: 12 }}
          />
        </ThemedCard>
      </View>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText variant='caption' color={theme.mutedText} style={styles.sectionTitle}>
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
            <ThemedText variant='body' color={theme.mutedText}>{APP_VERSION}</ThemedText>
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
            { text: 'Logout', style: 'destructive', onPress: () => signOut() },
          ]);
        }}
      />

      <View style={styles.spacer} />
    </Screen>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const BestAngleCell: React.FC<{
  label: string;
  value: number | null;
  theme: ThemeTokens;
}> = ({ label, value, theme }) => (
  <View
    style={[
      styles.angleCell,
      { borderColor: theme.border, backgroundColor: theme.primarySoft },
    ]}
  >
    <ThemedText variant='caption' color={theme.mutedText}>{label}</ThemedText>
    <ThemedText
      variant='title'
      style={{ marginTop: 6, fontSize: 22 }}
      color={theme.text}
    >
      {value != null ? `${value.toFixed(1)}°` : '—'}
    </ThemedText>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  section:      { marginBottom: 24 },
  sectionTitle: { marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  saveBtn:          { marginBottom: 8, marginTop: 4 },
  hint:             { marginTop: 4, marginBottom: 10, lineHeight: 18 },
  patternLabel:     { marginTop: 14, marginBottom: 4 },
  patternOption: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  patternRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patternDot:  { width: 12, height: 12, borderRadius: 6 },
  patternText: { flex: 1 },
  angleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  angleCell: {
    width: '47%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  spacer: { height: 32 },
});

export default SettingsScreen;