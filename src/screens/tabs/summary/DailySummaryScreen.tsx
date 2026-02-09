import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ProgressRing } from '@/src/components/ProgressRing';
import { StatPill } from '@/src/components/StatPill';
import { mockDailySummary } from '@/src/data/mock';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

const DailySummaryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { date, score, goodPostureHours, goodPostureMinutes, badPostureTime, vibrationsSent, postureTimeline, postureTip } =
    mockDailySummary;

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
          <ThemedText variant="subtitle">{date}</ThemedText>
          <ChevronRight color={theme.mutedText} size={24} />
        </View>

        <View style={styles.scoreSection}>
          <ProgressRing
            percentage={score}
            size={140}
            strokeWidth={10}
            label="POSTURE"
            status="GOOD"
          />
        </View>

        <View style={styles.statsRow}>
          <StatPill
            label="Good Posture Time"
            value={`${goodPostureHours}h ${goodPostureMinutes}m`}
          />
          <StatPill
            label="Bad Posture Time"
            value={`${badPostureTime}h`}
          />
          <StatPill
            label="Vibrations Sent"
            value={vibrationsSent.toString()}
          />
        </View>

        <ThemedCard style={styles.timelineCard}>
          <ThemedText variant="subtitle" style={styles.cardTitle}>
            Daily Timeline
          </ThemedText>
          <View style={styles.timeline}>
            {postureTimeline.map((entry, index) => (
              <View key={index} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineMarker,
                    {
                      backgroundColor:
                        entry.status === 'good'
                          ? theme.primary
                          : theme.danger,
                    },
                  ]}
                />
                <ThemedText variant="caption" color={theme.mutedText}>
                  {entry.time}
                </ThemedText>
              </View>
            ))}
          </View>
        </ThemedCard>

        <ThemedCard style={styles.tipCard}>
          <ThemedText variant="subtitle" style={styles.cardTitle}>
            Posture Tip of the Day
          </ThemedText>
          <ThemedText variant="body" style={styles.tipText}>
            {postureTip}
          </ThemedText>
          <ThemedButton
            title="See more tips"
            variant="secondary"
            size="sm"
            onPress={() => {}}
            style={styles.tipButton}
          />
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
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  timelineCard: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItem: {
    alignItems: 'center',
  },
  timelineMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  tipCard: {
    marginBottom: 16,
  },
  tipText: {
    marginBottom: 16,
    lineHeight: 22,
  },
  tipButton: {
    alignSelf: 'flex-start',
  },
  spacer: {
    height: 32,
  },
});

export default DailySummaryScreen;
