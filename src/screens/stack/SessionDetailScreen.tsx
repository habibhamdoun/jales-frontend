import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { useTheme } from '@/src/theme/useTheme';
import { useAuth } from '@/src/auth/AuthContext';
import {
  listReadingsForSession,
  type ReadingDto,
} from '@/src/services/readings';
import {
  actionLevelToBadge,
  scoreToColor,
  type ActionLevel,
  type BodyPart,
} from '@/src/services/posture';

type SessionDetailRouteProp = RouteProp<ProfileStackParamList, 'SessionDetail'>;
type SessionDetailNavProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'SessionDetail'
>;

const isActionLevel = (value: unknown): value is ActionLevel =>
  value === 1 || value === 2 || value === 3 || value === 4;

// Body-part filter is "all" plus scored regions (trunk + shoulders).
type BodyPartFilter = 'all' | BodyPart;

const BODY_PART_FILTER_LABEL: Record<BodyPartFilter, string> = {
  all: 'All',
  trunk: 'Upper',
  leftShoulder: 'Left S.',
  rightShoulder: 'Right S.',
};

// Helper: per-row, pick the worst score among trunk + shoulders (legacy
// per-part fields may be sparse).
const worstScoreForReading = (reading: ReadingDto): number | null => {
  const candidates = [
    reading.trunk_score,
    reading.left_shoulder_score,
    reading.right_shoulder_score,
    reading.shoulder_score,
  ].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  if (candidates.length === 0) {
    return isActionLevel(reading.action_level) ? reading.action_level : null;
  }
  return Math.max(...candidates);
};

const scoreFor = (
  reading: ReadingDto,
  part: BodyPart,
): number | undefined => {
  switch (part) {
    case 'trunk':
      return reading.trunk_score;
    case 'leftShoulder':
      return reading.left_shoulder_score ?? reading.shoulder_score;
    case 'rightShoulder':
      return reading.right_shoulder_score ?? reading.shoulder_score;
  }
};

const SessionDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<SessionDetailNavProp>();
  const route = useRoute<SessionDetailRouteProp>();
  const { token } = useAuth();
  const { sessionId, startTime } = route.params;

  const [readings, setReadings] = useState<ReadingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onlyBad, setOnlyBad] = useState(false);
  const [bodyPartFilter, setBodyPartFilter] = useState<BodyPartFilter>('all');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!token || !sessionId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await listReadingsForSession(token, sessionId);
        if (!alive) return;
        setReadings(data);
      } catch (err) {
        if (!alive) return;
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to load readings.',
        );
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [token, sessionId]);

  const visibleReadings = useMemo(() => {
    return readings.filter((r) => {
      if (onlyBad) {
        const worst = worstScoreForReading(r);
        if (worst == null || worst < 3) return false;
      }
      if (bodyPartFilter !== 'all') {
        const partScore = scoreFor(r, bodyPartFilter);
        // When filtering by a body part, keep only rows where that part has
        // a recorded score; in onlyBad mode also require it to be 3+.
        if (partScore == null) return false;
        if (onlyBad && partScore < 3) return false;
      }
      return true;
    });
  }, [readings, onlyBad, bodyPartFilter]);

  const summary = useMemo(() => {
    if (readings.length === 0) {
      return { count: 0, badCount: 0, avgActionLevel: null as number | null };
    }
    let sum = 0;
    let badCount = 0;
    let countedForAvg = 0;
    for (const r of readings) {
      const worst = worstScoreForReading(r);
      if (typeof worst === 'number') {
        sum += worst;
        countedForAvg += 1;
        if (worst >= 3) badCount += 1;
      }
    }
    return {
      count: readings.length,
      badCount,
      avgActionLevel: countedForAvg > 0 ? sum / countedForAvg : null,
    };
  }, [readings]);

  const renderItem = ({ item }: { item: ReadingDto }) => {
    const worst = worstScoreForReading(item);
    // Row highlight color follows the worst score on the row.
    const rowColor = scoreToColor(worst ?? null);
    const level = isActionLevel(worst as number)
      ? (worst as ActionLevel)
      : null;
    const badge = actionLevelToBadge(level);

    const parts: { part: BodyPart; short: string }[] = [
      { part: 'trunk', short: 'T' },
      { part: 'leftShoulder', short: 'LS' },
      { part: 'rightShoulder', short: 'RS' },
    ];

    return (
      <View
        style={[
          styles.row,
          {
            borderBottomColor: theme.border,
            borderLeftColor: rowColor,
          },
        ]}
      >
        <View style={styles.rowTop}>
          <ThemedText variant='body'>
            {new Date(item.recorded_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </ThemedText>
          <View
            style={[
              styles.pill,
              { backgroundColor: `${badge.color}1F`, borderColor: badge.color },
            ]}
          >
            <ThemedText
              variant='caption'
              style={[styles.pillText, { color: badge.color }]}
            >
              {level != null ? `L${level}` : '—'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.scoresRow}>
          {parts.map(({ part, short }) => {
            const score = scoreFor(item, part);
            const color = scoreToColor(score ?? null);
            const hasScore = typeof score === 'number';
            return (
              <View
                key={part}
                style={[
                  styles.scorePill,
                  {
                    backgroundColor: hasScore ? `${color}1F` : 'transparent',
                    borderColor: color,
                  },
                ]}
              >
                <ThemedText
                  variant='caption'
                  style={[styles.scorePillText, { color }]}
                >
                  {short} {hasScore ? score : '—'}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <ThemedText variant='subtitle'>Session detail</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <ThemedCard style={styles.summaryCard}>
          <ThemedText variant='label'>
            {startTime ? new Date(startTime).toLocaleString() : 'Session'}
          </ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText variant='caption' color={theme.mutedText}>
                Readings
              </ThemedText>
              <ThemedText variant='subtitle'>{summary.count}</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText variant='caption' color={theme.mutedText}>
                Bad (L3+)
              </ThemedText>
              <ThemedText variant='subtitle'>{summary.badCount}</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText variant='caption' color={theme.mutedText}>
                Avg level
              </ThemedText>
              <ThemedText variant='subtitle'>
                {summary.avgActionLevel != null
                  ? summary.avgActionLevel.toFixed(2)
                  : '—'}
              </ThemedText>
            </View>
          </View>
        </ThemedCard>

        <View style={styles.filterRow}>
          <ThemedText variant='body'>Show only Action Level 3+</ThemedText>
          <Switch
            value={onlyBad}
            onValueChange={setOnlyBad}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <View style={styles.bodyFilterRow}>
          {(
            ['all', 'trunk', 'leftShoulder', 'rightShoulder'] as const
          ).map((opt) => {
            const active = bodyPartFilter === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => setBodyPartFilter(opt)}
                style={[
                  styles.bodyFilterChip,
                  {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active
                      ? `${theme.primary}1A`
                      : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  variant='caption'
                  style={[
                    styles.bodyFilterChipText,
                    { color: active ? theme.primary : theme.mutedText },
                  ]}
                >
                  {BODY_PART_FILTER_LABEL[opt]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : errorMsg ? (
          <ThemedCard style={styles.errorCard}>
            <ThemedText variant='caption' color={theme.danger}>
              {errorMsg}
            </ThemedText>
          </ThemedCard>
        ) : visibleReadings.length === 0 ? (
          <View style={styles.centered}>
            <ThemedText variant='caption' color={theme.mutedText}>
              {onlyBad
                ? 'No Action Level 3+ readings match this filter.'
                : bodyPartFilter !== 'all'
                  ? 'No readings recorded for that body part.'
                  : 'No readings recorded for this session.'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={visibleReadings}
            keyExtractor={(item, idx) =>
              item.id ?? `${item.recorded_at}-${idx}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    paddingVertical: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 4,
  },
  bodyFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  bodyFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  bodyFilterChipText: {
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    paddingVertical: 12,
    paddingLeft: 10,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  scorePillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  pillText: {
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F04A2A',
    paddingVertical: 12,
  },
});

export default SessionDetailScreen;
