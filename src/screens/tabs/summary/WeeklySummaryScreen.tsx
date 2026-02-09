import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ChartCard } from '@/src/components/ChartCard';
import { mockWeeklySummary } from '@/src/data/mock';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react-native';

const WeeklySummaryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { weekStart, weekEnd, averageScore, dailyScores, improvement, bestDay, totalGoodHours } =
    mockWeeklySummary;

  const chartData = dailyScores.map((ds) => ({
    label: ds.day,
    value: ds.score,
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
            {weekStart} - {weekEnd}
          </ThemedText>
          <ChevronRight color={theme.mutedText} size={24} />
        </View>

        <ThemedCard style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <ThemedText variant="caption" color={theme.mutedText}>
              Your Weekly Posture Score
            </ThemedText>
          </View>
          <ThemedText variant="title" style={styles.scoreValue}>
            {averageScore}%
          </ThemedText>
          <ThemedText variant="body" color={theme.mutedText}>
            Weekly Average
          </ThemedText>
        </ThemedCard>

        <ChartCard title="Daily Scores" data={chartData} type="bar" />

        <View style={styles.metricsRow}>
          <ThemedCard style={styles.metricCard}>
            <View
              style={[
                styles.metricIcon,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <TrendingUp color={theme.primary} size={24} />
            </View>
            <ThemedText variant="caption" color={theme.mutedText}>
              Weekly Improvement
            </ThemedText>
            <ThemedText variant="subtitle" color={theme.success}>
              +{improvement}%
            </ThemedText>
            <ThemedText variant="caption" color={theme.mutedText}>
              vs. Last Week
            </ThemedText>
          </ThemedCard>

          <ThemedCard style={styles.metricCard}>
            <ThemedText variant="caption" color={theme.mutedText}>
              Weekly Improvement
            </ThemedText>
            <ThemedText variant="subtitle" color={theme.danger}>
              -3%
            </ThemedText>
            <ThemedText variant="caption" color={theme.mutedText}>
              vs. Last Week
            </ThemedText>
          </ThemedCard>
        </View>

        <ThemedCard style={styles.insightCard}>
          <View
            style={[
              styles.insightIcon,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <TrendingUp color={theme.primary} size={20} />
          </View>
          <View style={styles.insightContent}>
            <ThemedText variant="label">Key Insight</ThemedText>
            <ThemedText variant="body" color={theme.mutedText} style={styles.insightText}>
              Great work! You improved your average posture by 15% this month.
            </ThemedText>
          </View>
        </ThemedCard>

        <ThemedButton
          title="View Detailed Report"
          variant="primary"
          size="lg"
          onPress={() => {}}
          style={styles.button}
        />

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
  scoreCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreHeader: {
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightCard: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    marginTop: 4,
  },
  button: {
    marginBottom: 16,
  },
  spacer: {
    height: 32,
  },
});

export default WeeklySummaryScreen;
