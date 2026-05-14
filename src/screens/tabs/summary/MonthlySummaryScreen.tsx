import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Activity,
  BarChart2,
  Target,
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
  ensureMonthlySummary,
  generateMonthlySummary,
  getDailySummaryRange,
  getMonthlySummary,
  type MonthlySummaryDto,
} from '@/src/services/summaries';
import {
  monthlyDtoAndDailiesToView,
  monthUtcRange,
  type MonthlySummaryView,
} from '@/src/services/summaryViewModels';

const MonthlySummaryScreen: React.FC = () => {
  const { theme }   = useTheme();
  const cardRim     = useSummaryCardRim();
  const { token }   = useAuth();
  const [view,       setView]       = useState<MonthlySummaryView | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const monthYear = useCallback(() => {
    const d = new Date();
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) { setView(null); setError(null); setLoading(false); return; }
    const { month, year } = monthYear();
    setError(null);
    try {
      const monthly      = await ensureMonthlySummary(token, month, year);
      const { start, end } = monthUtcRange(month, year);
      const dailies      = await getDailySummaryRange(token, start, end);
      setView(monthlyDtoAndDailiesToView(monthly, dailies));
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Session expired. Please sign in again.'
          : e instanceof Error ? e.message : 'Could not load monthly summary';
      setError(msg);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [token, monthYear]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  // ── Refresh ───────────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    if (!token) return;
    const { month, year } = monthYear();
    setRefreshing(true);
    setError(null);
    try {
      await generateMonthlySummary(token, month, year);
      let monthly: MonthlySummaryDto;
      try {
        monthly = await getMonthlySummary(token, month, year);
      } catch {
        monthly = await ensureMonthlySummary(token, month, year);
      }
      const { start, end } = monthUtcRange(month, year);
      const dailies = await getDailySummaryRange(token, start, end);
      setView(monthlyDtoAndDailiesToView(monthly, dailies));
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Session expired. Please sign in again.'
          : e instanceof Error ? e.message : 'Refresh failed';
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  }, [token, monthYear]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!token) return <SummarySignInPlaceholder message='Sign in to see your monthly summary.' />;
  if (loading && !view) return <SummaryLoadingPlaceholder />;

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
              title='Monthly summary'
              subtitle={view.title}
              hint={`${view.daysWithData} of ${view.daysInMonth} days with data · UTC ${view.year}-${String(view.month).padStart(2, '0')}`}
            />

            {/* ── Monthly average ──────────────────────────────────────────── */}
            <SummarySectionHeader Icon={BarChart2} kicker='Overview' title='Monthly average' />
            <ThemedCard style={[styles.heroCard, cardRim]}>
              <View style={styles.improvementHeader}>
                <ThemedText variant='label' color={theme.text}>vs last month</ThemedText>
                {view.improvementPct != null ? (
                  <ThemedText
                    variant='caption'
                    color={view.improvementPct >= 0 ? theme.success : theme.danger}
                    style={styles.deltaBadge}
                  >
                    {view.improvementPct >= 0 ? '+' : ''}{Math.round(view.improvementPct)}%
                  </ThemedText>
                ) : (
                  <ThemedText variant='caption' color={theme.mutedText}>No prior month</ThemedText>
                )}
              </View>
              <ThemedText variant='title' style={styles.improvementValue} color={theme.text}>
                {view.averageScore}%
              </ThemedText>
              <ThemedText variant='caption' color={theme.mutedText} style={styles.heroCardSub}>
                Mean of each week’s average daily posture score (UTC Mon–Sun weeks) when daily
                summaries exist; otherwise the server monthly value.
              </ThemedText>
            </ThemedCard>

            {/* ── Activity ─────────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={Activity} kicker='Volume' title='Activity' />
            <View style={styles.statsRow}>
              <StatPill label='Total alerts' value={String(view.totalAlerts)} />
              <StatPill label='Sessions' value={String(view.totalSessions)} />
              <StatPill label='Coverage' value={`${view.daysWithData}d`} />
              <StatPill
                label='Best day score'
                value={view.bestDayScore != null ? `${view.bestDayScore}%` : '—'}
              />
            </View>

            {/* ── Trend chart ──────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={BarChart2} kicker='Trend' title='Daily scores' />
            <ChartCard title='Days with data (UTC)' data={view.trend} type='line' />

            {/* ── Peaks & dips ─────────────────────────────────────────────── */}
            <SummarySectionHeader Icon={Target} kicker='Compare' title='Peaks & dips' />
            <ThemedCard style={[styles.card, cardRim]}>
              <View style={styles.compareRow}>
                <View style={[styles.compareBox, { borderColor: theme.success, backgroundColor: `${theme.success}10` }]}>
                  <ThemedText variant='caption' color={theme.mutedText}>Best day</ThemedText>
                  <ThemedText variant='subtitle' color={theme.text}>{view.bestDayLabel}</ThemedText>
                  <ThemedText variant='title' style={{ color: theme.success }}>
                    {view.bestDayScore != null ? `${view.bestDayScore}%` : '—'}
                  </ThemedText>
                </View>
                <View style={[styles.compareBox, { borderColor: theme.danger, backgroundColor: `${theme.danger}10` }]}>
                  <ThemedText variant='caption' color={theme.mutedText}>Toughest day</ThemedText>
                  <ThemedText variant='subtitle' color={theme.text}>{view.worstDayLabel}</ThemedText>
                  <ThemedText variant='title' style={{ color: theme.danger }}>
                    {view.worstDayScore != null ? `${view.worstDayScore}%` : '—'}
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          </>
        ) : !error ? (
          <SummaryEmptyHintCard>
            <ThemedText variant='label' color={theme.text} style={styles.emptyTitle}>
              No monthly summary yet
            </ThemedText>
            <ThemedText variant='body' color={theme.mutedText} style={styles.emptyBody}>
              Pull down to refresh. The server needs daily summaries for this UTC month
              before the monthly view fills in.
            </ThemedText>
          </SummaryEmptyHintCard>
        ) : null}
      </SummaryScroll>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1 },
  emptyTitle:  { marginBottom: 8 },
  emptyBody:   { lineHeight: 22 },
  heroCard:    { marginBottom: 16, padding: 18 },
  improvementHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8,
  },
  deltaBadge:       { fontWeight: '800' },
  improvementValue: { fontSize: 40, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  heroCardSub:      { lineHeight: 20 },
  statsRow:         { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 16 },
  card:             { marginBottom: 16, padding: 16 },
  compareRow:       { flexDirection: 'row', gap: 12 },
  compareBox: {
    flex: 1, minWidth: 0, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16, padding: 14, gap: 4,
  },
});

export default MonthlySummaryScreen;