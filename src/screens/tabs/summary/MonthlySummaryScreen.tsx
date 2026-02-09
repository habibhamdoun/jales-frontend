import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ChartCard } from '@/src/components/ChartCard';
import { mockMonthlySummary } from '@/src/data/mock';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react-native';

const MonthlySummaryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { month, year, averageScore, trend, bestDay, bestDayScore, improvement } =
    mockMonthlySummary;

  const chartData = trend.map((t) => ({
    label: t.day.toString(),
    value: t.score,
  }));

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateHeader}>
          <ChevronLeft color={theme.mutedText} size={24} />
          <ThemedText variant="subtitle">
            {month} {year}
          </ThemedText>
          <ChevronRight color={theme.mutedText} size={24} />
        </View>

        <ThemedCard style={styles.improvementCard}>
          <View style={styles.improvementHeader}>
            <ThemedText variant="label">Posture Improvement Trend</ThemedText>
            <View style={styles.improvementBadge}>
              <TrendingUp color={theme.success} size={16} />
              <ThemedText variant="caption" color={theme.success}>
                +{improvement}%
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="title" style={styles.improvementValue}>
            {averageScore}%
          </ThemedText>
          <ThemedText variant="caption" color={theme.mutedText}>
            vs. Last Month
          </ThemedText>
        </ThemedCard>

        <ChartCard
          title="Posture Improvement Trend"
          data={chartData}
          type="line"
        />

        <View style={styles.statsRow}>
          <ThemedCard style={styles.statCard}>
            <View style={styles.statHeader}>
              <Calendar color={theme.primary} size={20} />
              <ThemedText variant="caption" color={theme.mutedText}>
                Best Day
              </ThemedText>
            </View>
            <ThemedText variant="subtitle" style={styles.statValue}>
              {bestDay}
            </ThemedText>
          </ThemedCard>

          <ThemedCard style={styles.statCard}>
            <ThemedText variant="caption" color={theme.mutedText}>
              Average Score
            </ThemedText>
            <ThemedText variant="title" style={styles.statValue}>
              {averageScore}%
            </ThemedText>
          </ThemedCard>
        </View>

        <ThemedCard style={styles.timeCard}>
          <ThemedText variant="label" style={styles.timeLabel}>
            Time in Good Posture
          </ThemedText>
          <ThemedText variant="title" style={styles.timeValue}>
            6h 15m
          </ThemedText>
        </ThemedCard>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  improvementCard: {
    marginBottom: 16,
  },
  improvementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  improvementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  improvementValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statValue: {
    marginTop: 8,
  },
  timeCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeLabel: {
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  spacer: {
    height: 32,
  },
});

export default MonthlySummaryScreen;
