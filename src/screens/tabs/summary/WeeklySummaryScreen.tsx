import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  BarChart2,
  CalendarRange,
  ListTree,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ChartCard } from '@/src/components/ChartCard';
import { StatPill } from '@/src/components/StatPill';
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
import {
  ensureWeeklySummary,
  generateWeeklySummary,
  getDailySummaryRange,
  getWeeklySummary,
  type WeeklySummaryDto,
} from '@/src/services/summaries';
import {
  weeklyDtoToView,
  type WeeklySummaryView,
} from '@/src/services/summaryViewModels';

const WeeklySummaryScreen: React.FC = () => {
  const { theme }   = useTheme();
  const cardRim     = useSummaryCardRim();
  const { token }   = useAuth();
  const [view,       setView]       = useState<WeeklySummaryView | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const buildView = useCallback(
    async (weekly: WeeklySummaryDto, tok: string) => {
      // Read week_start/week_end directly from the typed DTO
      const ws = weekly.week_start ?? '';
      const we = weekly.week_end   ?? ws;
      const dailies =
        ws && we && /^\d{4}-\d{2}-\d{2}$/.test(ws) && /^\d{4}-\d{2}-\d{2}$/.test(we)
          ? await getDailySummaryRange(tok, ws, we)
          : [];
      return weeklyDtoToView(weekly, dailies);
    },
    [],
  );

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) { setView(null); setError(null); setLoading(false); return; }
    setError(null);
    try {
      const weekly = await ensureWeeklySummary(token);
      setView(await buildView(weekly, token));
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Session expired. Please sign in again.'
          : e instanceof Error ? e.message : 'Could not load weekly summary';
      setError(msg);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [token, buildView]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  // ── Refresh ───────────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      await generateWeeklySummary(token);
      let weekly: WeeklySummaryDto;
      try {
        weekly = await getWeeklySummary(token);
      } catch {
        weekly = await ensureWeeklySummary(token);
      }
      setView(await buildView(weekly, token));
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Session expired. Please sign in again.'
          : e instanceof Error ? e.message : 'Refresh failed';
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  }, [token, buildView]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!token) return <SummarySignInPlaceholder message='Sign in to see your weekly summary.' />;
  if (loading && !view) return <SummaryLoadingPlaceholder />;

  const chartData = view?.chartData ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <SummaryScroll refreshing={refreshing} onRefresh={onRefresh}>

        {error ? (
          <SummaryErrorCard message={error} onRetry={() => { setLoading(true); void load(); }} />
        ) : null}

        {view ? (
          <>
            <SummaryHeroShell
              title='Weekly summary'
              subtitle={view.rangeLabel}
              hint={
                view.weekStartYmd && view.weekEndYmd
                  ? `UTC ${view.weekStartYmd} → ${view.weekEndYmd} · Mon–Sun server week`
                  : undefined
              }
            />

            {/* ── Average ─────────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={BarChart2} kicker='Overview' title='Weekly average' />
            <ThemedCard style={[styles.scoreCard, cardRim]}>
              <ThemedText variant='title' style={styles.scoreValue} color={theme.text}>
                {view.averageScore}%
              </ThemedText>
              <ThemedText variant='body' color={theme.mutedText} style={styles.scoreSub}>
                Mean of daily posture scores for this UTC week when daily summaries exist; otherwise
                the server weekly average.
              </ThemedText>
            </ThemedCard>

            {/* ── Key stats ───────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={TrendingUp} kicker='Highlights' title='Key stats' />
            <View style={styles.statsRow}>
              <StatPill label='Days with data' value={`${view.activeDays}/7`} />
              <StatPill label='Score range' value={`${view.weekLow}–${view.weekHigh}%`} />
            </View>

            {/* ── Chart ───────────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={BarChart2} kicker='Trends' title='Charts' />
            <ChartCard title='Posture score by day' data={chartData} type='bar' />

            <View style={styles.statsRow}>
              <StatPill label='Total alerts' value={String(view.totalAlerts)} />
              <StatPill label='Sessions'     value={String(view.totalSessions)} />
              <StatPill
                label='vs last week'
                value={
                  view.improvementPct != null
                    ? `${view.improvementPct >= 0 ? '+' : ''}${Math.round(view.improvementPct)}%`
                    : '—'
                }
                trend={
                  view.improvementPct != null && view.improvementPct !== 0
                    ? view.improvementPct > 0 ? 'up' : 'down'
                    : undefined
                }
              />
            </View>

            {/* ── Best & worst day ────────────────────────────────────────── */}
            <SummarySectionHeader Icon={CalendarRange} kicker='Compare' title='Best & toughest day' />
            <ThemedCard style={[styles.card, cardRim]}>
              <View style={styles.compareRow}>
                <View style={[styles.compareBox, { borderColor: theme.success, backgroundColor: `${theme.success}10` }]}>
                  <ThemedText variant='caption' color={theme.mutedText}>Best</ThemedText>
                  <ThemedText variant='subtitle' color={theme.text}>{view.bestDayLabel}</ThemedText>
                  <ThemedText variant='title' style={{ color: theme.success }}>
                    {view.bestDayScore != null ? `${view.bestDayScore}%` : '—'}
                  </ThemedText>
                </View>
                <View style={[styles.compareBox, { borderColor: theme.warning, backgroundColor: `${theme.warning}12` }]}>
                  <ThemedText variant='caption' color={theme.mutedText}>Toughest</ThemedText>
                  <ThemedText variant='subtitle' color={theme.text}>{view.worstDayLabel}</ThemedText>
                  <ThemedText variant='title' style={{ color: theme.warning }}>
                    {view.worstDayScore != null ? `${view.worstDayScore}%` : '—'}
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>

            {/* ── Day by day table ─────────────────────────────────────────── */}
            <SummarySectionHeader Icon={ListTree} kicker='Detail' title='Day by day' />
            <ThemedCard style={[styles.card, cardRim]}>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.tableHint}>
                Score and good-posture % come from each daily_summary row; zeros are days without data.
              </ThemedText>
              {view.dayRows.map((row, idx) => (
                <View
                  key={row.ymd}
                  style={[
                    styles.tableRow,
                    {
                      borderBottomColor: theme.border,
                      backgroundColor: idx % 2 === 0 ? `${theme.primary}06` : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.tableLeft}>
                    <ThemedText variant='label' color={theme.text}>{row.weekday}</ThemedText>
                    <ThemedText variant='caption' color={theme.mutedText}>{row.calendar}</ThemedText>
                  </View>
                  <View style={styles.tableMid}>
                    <ThemedText variant='body' color={theme.text}>{row.score}%</ThemedText>
                    <ThemedText variant='caption' color={theme.mutedText}>good {row.goodPct}%</ThemedText>
                  </View>
                  <View style={styles.tableRight}>
                    <ThemedText variant='caption' color={theme.mutedText}>{row.alerts} alerts</ThemedText>
                    <ThemedText variant='caption' color={theme.mutedText}>{row.sessions} sess.</ThemedText>
                  </View>
                </View>
              ))}
            </ThemedCard>
          </>
        ) : !error ? (
          <SummaryEmptyHintCard>
            <ThemedText variant='label' color={theme.text} style={styles.emptyTitle}>
              No weekly summary yet
            </ThemedText>
            <ThemedText variant='body' color={theme.mutedText} style={styles.emptyBody}>
              Pull down to refresh after you have a few daily summaries. The server builds
              this week from those rows.
            </ThemedText>
          </SummaryEmptyHintCard>
        ) : null}
      </SummaryScroll>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1 },
  emptyTitle: { marginBottom: 8 },
  emptyBody:  { lineHeight: 22 },
  scoreCard:  { alignItems: 'flex-start', marginBottom: 16, padding: 18 },
  scoreValue: { fontSize: 44, fontWeight: '800', marginBottom: 8, letterSpacing: -1 },
  scoreSub:   { lineHeight: 22 },
  statsRow:   { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 16 },
  card:       { marginBottom: 16, padding: 16 },
  compareRow: { flexDirection: 'row', gap: 12 },
  compareBox: {
    flex: 1, minWidth: 0, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16, padding: 14, gap: 4,
  },
  tableHint:  { marginBottom: 10, lineHeight: 18 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8,
    borderRadius: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableLeft:  { width: '28%' },
  tableMid:   { flex: 1, paddingHorizontal: 8 },
  tableRight: { alignItems: 'flex-end' },
});

export default WeeklySummaryScreen;