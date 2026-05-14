import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle, Polyline } from 'react-native-svg';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedCard } from './themed/ThemedCard';
import { ThemedText } from './themed/ThemedText';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  data: ChartDataPoint[];
  type?: 'bar' | 'line';
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  type = 'bar',
}) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(200, windowWidth - 64);
  const chartHeight = 150;
  const padding = 20;

  const maxValue = useMemo(() => {
    if (!data.length) return 100;
    return Math.max(100, ...data.map((d) => d.value));
  }, [data]);

  const barWidth =
    data.length > 0 ? (chartWidth - padding * 2) / data.length : 0;

  const lineSpan = Math.max(1, data.length - 1);

  const renderBarChart = () => {
    if (!data.length) {
      return (
        <ThemedText variant="caption" color={theme.mutedText} style={styles.empty}>
          No data points for this chart yet.
        </ThemedText>
      );
    }
    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * (chartHeight - 40);
            const x = padding + index * barWidth + barWidth / 4;
            const y = chartHeight - 20 - barHeight;

            return (
              <React.Fragment key={index}>
                <Line
                  x1={x}
                  y1={y + barHeight}
                  x2={x}
                  y2={y}
                  stroke={theme.primary}
                  strokeWidth={barWidth / 2}
                  strokeLinecap="round"
                />
              </React.Fragment>
            );
          })}
        </Svg>
        <View style={styles.labels}>
          {data.map((point, index) => (
            <ThemedText
              key={index}
              variant="caption"
              color={theme.mutedText}
              style={[styles.label, { width: barWidth }]}
              numberOfLines={1}
            >
              {point.label}
            </ThemedText>
          ))}
        </View>
      </View>
    );
  };

  const renderLineChart = () => {
    if (!data.length) {
      return (
        <ThemedText variant="caption" color={theme.mutedText} style={styles.empty}>
          No data points for this chart yet.
        </ThemedText>
      );
    }
    const points = data
      .map((point, index) => {
        const x =
          padding + (index / lineSpan) * (chartWidth - padding * 2);
        const y =
          chartHeight - 20 - (point.value / maxValue) * (chartHeight - 40);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Polyline
            points={points}
            fill="none"
            stroke={theme.primary}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {data.map((point, index) => {
            const x =
              padding + (index / lineSpan) * (chartWidth - padding * 2);
            const y =
              chartHeight - 20 - (point.value / maxValue) * (chartHeight - 40);
            return (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r={4}
                fill={theme.primary}
              />
            );
          })}
        </Svg>
        <View style={styles.labels}>
          {data.map((point, index) => (
            <ThemedText
              key={index}
              variant="caption"
              color={theme.mutedText}
              style={[styles.label, { width: (chartWidth - padding * 2) / data.length }]}
              numberOfLines={1}
            >
              {point.label}
            </ThemedText>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ThemedCard style={[styles.card, { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18 }]}>
      <ThemedText variant="subtitle" style={styles.title} color={theme.text}>
        {title}
      </ThemedText>
      {type === 'bar' ? renderBarChart() : renderLineChart()}
    </ThemedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  title: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 24,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
  },
});
