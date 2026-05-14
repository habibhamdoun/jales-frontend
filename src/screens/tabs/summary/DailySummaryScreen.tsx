import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  MessageCircle,
  Timer,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ProgressRing } from '@/src/components/ProgressRing';
import {
  SummaryEmptyHintCard,
  SummaryErrorCard,
  SummaryHeroShell,
  SummaryLoadingPlaceholder,
  SummaryScroll,
  SummarySectionHeader,
  SummarySignInPlaceholder,
  useSummaryCardRim,
} from '@/src/screens/tabs/summary/summaryUi';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/services/api';
import type { DailySummaryDto } from '@/src/services/summaries';
import {
  ensureDailySummary,
  generateDailySummary,
  getDailySummary,
} from '@/src/services/summaries';
import {
  aggregateSessionDayMetricsForUtcYmd,
  dailyDtoToView,
  rollupNowMsForUtcYmd,
  utcYmd,
  type DailySummaryView,
} from '@/src/services/summaryViewModels';
import { listSessions } from '@/src/services/sessions';
import type { ThemeTokens } from '@/src/theme/themes';
import type { AppTabsParamList } from '@/src/navigation/AppTabs';
import { buildDailyCoachPrompt } from '@/src/utils/dailySummaryDoctorPrompt';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a raw minute count to a display string like "4h 48m" or "32m". */
function minutesToHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function addDaysUtcYmd(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Load all sessions so averaging for a past UTC day is not truncated by a low limit. */
async function viewFromDailyDto(
  token: string,
  dto: DailySummaryDto,
  summaryYmd: string,
): Promise<DailySummaryView> {
  try {
    const sessions = await listSessions(token);
    const nowMs = rollupNowMsForUtcYmd(summaryYmd);
    const rollups = aggregateSessionDayMetricsForUtcYmd(sessions, summaryYmd, nowMs);
    return dailyDtoToView(dto, {
      sessionDayAggregates: rollups,
    });
  } catch {
    return dailyDtoToView(dto);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const DailySummaryScreen: React.FC = () => {
  const { theme } = useTheme();
  const cardRim   = useSummaryCardRim();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [selectedYmd, setSelectedYmd] = useState(() => utcYmd());
  const [view, setView]               = useState<DailySummaryView | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [emptyDayMessage, setEmptyDayMessage] = useState<string | null>(null);

  const todayYmd = utcYmd();
  const isSelectedToday = selectedYmd === todayYmd;

  const load = useCallback(async () => {
    if (!token) {
      setView(null);
      setEmptyDayMessage(null);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    setEmptyDayMessage(null);
    try {
      const today = utcYmd();
      let dto: DailySummaryDto | null = null;
      if (selectedYmd === today) {
        dto = await ensureDailySummary(token, selectedYmd);
      } else {
        try {
          dto = await getDailySummary(token, selectedYmd);
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) dto = null;
          else throw e;
        }
      }

      setView(dto ? await viewFromDailyDto(token, dto, selectedYmd) : null);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Session expired. Please sign in again.'
          : e instanceof Error ? e.message : 'Could not load summary';
      setError(msg);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [token, selectedYmd]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setView(null);
    void load();
  }, [token, load]);

  const onRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    setEmptyDayMessage(null);
    try {
      const gen = await generateDailySummary(token, selectedYmd);
      if (gen.kind === 'summary') {
        setView(await viewFromDailyDto(token, gen.summary, selectedYmd));
      } else {
        setView(null);
        setEmptyDayMessage(gen.message);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Session expired. Please sign in again.'
          : e instanceof Error ? e.message : 'Refresh failed';
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  }, [token, selectedYmd]);

  if (!token) return <SummarySignInPlaceholder message='Sign in to see your daily summary.' />;
  if (loading && !view) return <SummaryLoadingPlaceholder />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <SummaryScroll refreshing={refreshing} onRefresh={onRefresh}>

        {error ? (
          <SummaryErrorCard message={error} onRetry={() => { setLoading(true); void load(); }} />
        ) : null}

        <ThemedCard style={[styles.card, cardRim, styles.dateNavCard]}>
          <View style={styles.dateNavRow}>
            <TouchableOpacity
              onPress={() => setSelectedYmd((y) => addDaysUtcYmd(y, -1))}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole='button'
              accessibilityLabel='Previous UTC day'
            >
              <ChevronLeft color={theme.text} size={26} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={styles.dateNavCenter}>
              <ThemedText variant='label' color={theme.text} style={styles.dateNavTitle}>
                {isSelectedToday ? 'Today' : `${selectedYmd}`}
              </ThemedText>
              {!isSelectedToday ? (
                <TouchableOpacity
                  onPress={() => setSelectedYmd(todayYmd)}
                  hitSlop={10}
                  accessibilityRole='button'
                  accessibilityLabel='Jump to today UTC'
                >
                  <ThemedText variant='caption' color={theme.primary} style={styles.jumpToday}>
                    Jump to today
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setSelectedYmd((y) => addDaysUtcYmd(y, 1))}
              disabled={selectedYmd >= todayYmd}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole='button'
              accessibilityLabel='Next UTC day'
            >
              <ChevronRight
                color={selectedYmd >= todayYmd ? theme.mutedText : theme.text}
                size={26}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>
        </ThemedCard>

        {!view && !error ? (
          <SummaryEmptyHintCard>
            <ThemedText variant='label' color={theme.text} style={styles.emptyTitle}>
              {isSelectedToday ? 'No summary for today yet' : `No saved summary for UTC ${selectedYmd}`}
            </ThemedText>
            <ThemedText variant='body' color={theme.mutedText} style={styles.emptyBody}>
              {isSelectedToday
                ? 'Wear the shirt during a session, then pull down to refresh after the server aggregates your data (UTC day).'
                : 'This UTC day has no summary row yet. Pull down or tap Build / refresh to ask the server to generate it; a row appears only if there were readings that day.'}
            </ThemedText>
            {emptyDayMessage ? (
              <ThemedText variant='caption' color={theme.mutedText} style={styles.emptyMessage}>
                {emptyDayMessage}
              </ThemedText>
            ) : null}
            {!isSelectedToday ? (
              <ThemedButton
                title={`Build / refresh ${selectedYmd}`}
                variant='primary'
                size='md'
                onPress={onRefresh}
                style={styles.emptyBuildBtn}
              />
            ) : null}
          </SummaryEmptyHintCard>
        ) : null}

        {view ? (
          <>
            {/* ── Hero ───────────────────────────────────────────────────── */}
            <SummaryHeroShell
              title='Daily summary'
              subtitle={view.titleDate}
              hint={`UTC ${view.summaryDate} · Server rollups use UTC windows.`}
            />

            {/* ── Posture score ring ─────────────────────────────────────── */}
            <SummarySectionHeader Icon={BarChart2} kicker='Overview' title='Posture score' />
            <View style={styles.scoreSection}>
              <ProgressRing
                percentage={view.scorePct}
                size={150}
                strokeWidth={11}
                label='POSTURE'
                status={view.ringStatus}
              />
              <ThemedText
                variant='title'
                style={styles.scoreHeadline}
                color={
                  view.ringStatus === 'GOOD'
                    ? theme.primary
                    : view.ringStatus === 'WARNING'
                      ? theme.warning
                      : theme.danger
                }
              >
                {view.scoreHeadline}
              </ThemedText>
            </View>

            {/* ── Wear & alerts ───────────────────────────────────────────── */}
            <SummarySectionHeader Icon={Timer} kicker='Snapshot' title='Wear & alerts' />
            <View style={styles.dualCardsRow}>
              <DailySummaryStatCard
                theme={theme}
                variant='wear'
                value={minutesToHm(view.totalWearMinutes)}
                label='Total time wearing'
              />
              <DailySummaryStatCard
                theme={theme}
                variant='corrections'
                value={String(view.totalAlerts)}
                label='Corrections sent'
              />
            </View>

            {/* ── Good posture share bar ─────────────────────────────────── */}
            <SummarySectionHeader Icon={Info} kicker='Quality' title='Good posture share' />
            <ThemedCard style={[styles.card, cardRim]}>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.sectionSub}>
                Percentage of readings where your RULA action level was in an acceptable band (1–2).
                Total wearing time is shown above; it comes from your daily summary or session overlap
                for this UTC day when available.
              </ThemedText>
              <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, Math.max(0, view.goodPosturePct))}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.barCaption}>
                {Math.round(view.goodPosturePct)}% of monitored time in a good posture band
              </ThemedText>
            </ThemedCard>

            {/* ── RULA scores ────────────────────────────────────────────── */}
            {(view.avgActionLevel !== null || view.avgOverallScore !== null) ? (
              <>
                <SummarySectionHeader Icon={Zap} kicker='RULA' title='Action level & overall score' />
                <ThemedCard style={[styles.card, cardRim]}>
                  <View style={styles.angleGrid}>
                    <AngleCell
                      label='Avg action level'
                      value={view.avgActionLevel}
                      unit=''
                      decimals={1}
                      theme={theme}
                    />
                    <AngleCell
                      label='Overall score'
                      value={view.avgOverallScore}
                      unit='%'
                      decimals={0}
                      theme={theme}
                    />
                  </View>
                </ThemedCard>
              </>
            ) : null}

            {/* ── Average angles ─────────────────────────────────────────── */}
            <SummarySectionHeader Icon={BarChart2} kicker='Biomechanics' title='Average angles' />
            <ThemedCard style={[styles.card, cardRim]}>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.sectionSub}>
                Mean angles from readings in this summary.
              </ThemedText>
              <View style={styles.angleGrid}>
                <AngleCell label='Upper back'     value={view.avgUpperBack}     unit='°' decimals={1} theme={theme} />
                <AngleCell label='Left shoulder'  value={view.avgLeftShoulder}  unit='°' decimals={1} theme={theme} />
                <AngleCell label='Right shoulder' value={view.avgRightShoulder} unit='°' decimals={1} theme={theme} />
              </View>
            </ThemedCard>

            {/* ── Coach note ─────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={MessageCircle} kicker='Guidance' title='Coach note' />
            <ThemedCard style={[styles.card, cardRim]}>
              <ThemedText variant='body' style={styles.tipText}>{view.tip}</ThemedText>
              <ThemedText variant='body' color={theme.mutedText} style={styles.coachAiHint}>
                Want a deeper read on this day? Open Doctor AI — it will review your numbers,
                interpret patterns, and suggest tailored tips using the same summary data.
              </ThemedText>
              <ThemedButton
                title='Open Doctor AI chat'
                variant='primary'
                size='lg'
                onPress={() => {
                  const prompt = buildDailyCoachPrompt(view);
                  const parent = navigation.getParent() as
                    | BottomTabNavigationProp<AppTabsParamList>
                    | undefined;
                  parent?.navigate('Chat', { dailyCoachPrompt: prompt });
                }}
                style={styles.doctorChatBtn}
              />
            </ThemedCard>
          </>
        ) : null}
      </SummaryScroll>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

type DailySummaryStatVariant = 'wear' | 'corrections';

const DailySummaryStatCard: React.FC<{
  theme: ThemeTokens;
  variant: DailySummaryStatVariant;
  value: string;
  label: string;
}> = ({ theme, variant, value, label }) => {
  const circleBg =
    variant === 'wear'
      ? theme.border
      : theme.warning;
  const Icon = variant === 'wear' ? Clock : Zap;
  const iconColor = variant === 'wear' ? theme.text : '#FFFFFF';
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme.card,
          borderColor:     theme.border,
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   0.05,
          shadowRadius:    10,
          elevation:       2,
        },
      ]}
    >
      <View style={[styles.statIconCircle, { backgroundColor: circleBg }]}>
        <Icon color={iconColor} size={22} strokeWidth={2.25} />
      </View>
      <ThemedText
        variant='title'
        style={[styles.statCardValue, { color: theme.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </ThemedText>
      <ThemedText
        variant='caption'
        color={theme.mutedText}
        style={styles.statCardLabel}
        numberOfLines={2}
      >
        {label}
      </ThemedText>
    </View>
  );
};

const AngleCell: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  decimals: number;
  theme: ThemeTokens;
}> = ({ label, value, unit, decimals, theme }) => (
  <View
    style={[
      styles.angleCell,
      { borderColor: theme.border, backgroundColor: theme.primarySoft },
    ]}
  >
    <ThemedText variant='caption' color={theme.mutedText}>{label}</ThemedText>
    <ThemedText variant='title' style={styles.angleValue} color={theme.text}>
      {value != null ? `${value.toFixed(decimals)}${unit}` : '—'}
    </ThemedText>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },
  emptyTitle:     { marginBottom: 8 },
  emptyBody:      { lineHeight: 22 },
  scoreSection:   { alignItems: 'center', marginBottom: 20 },
  scoreHeadline:  { marginTop: 12, marginBottom: 4 },
  dualCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statCardValue: {
    fontSize: 20, fontWeight: '700', marginBottom: 6, textAlign: 'center',
  },
  statCardLabel: {
    textAlign: 'center', lineHeight: 16, paddingHorizontal: 2,
  },
  card:       { marginBottom: 16, padding: 16 },
  sectionSub: { marginBottom: 12, lineHeight: 18 },
  barTrack:   { height: 10, borderRadius: 6, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 6 },
  barCaption: { marginTop: 8 },
  angleGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  angleCell: {
    width: '47%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  angleValue: { marginTop: 6, fontSize: 22 },
  tipText:    { lineHeight: 22 },
  coachAiHint: { marginTop: 14, lineHeight: 22 },
  doctorChatBtn: { marginTop: 16, alignSelf: 'stretch' },
  dateNavCard: { marginBottom: 12, paddingVertical: 12, paddingHorizontal: 14 },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateNavCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  dateNavTitle: { fontWeight: '800', textAlign: 'center' },
  jumpToday: { marginTop: 4, fontWeight: '700' },
  emptyMessage: { marginTop: 12, lineHeight: 18 },
  emptyBuildBtn: { marginTop: 16, alignSelf: 'stretch' },
});

export default DailySummaryScreen;