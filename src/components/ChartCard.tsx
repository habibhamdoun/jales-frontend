import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
  const chartWidth = Dimensions.get('window').width - 64;
  const chartHeight = 150;
  const padding = 20;

  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const barWidth = (chartWidth - padding * 2) / data.length;

  const renderBarChart = () => {
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
            >
              {point.label}
            </ThemedText>
          ))}
        </View>
      </View>
    );
  };

  const renderLineChart = () => {
    const points = data
      .map((point, index) => {
        const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
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
          />
          {data.map((point, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
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
      </View>
    );
  };

  return (
    <ThemedCard style={styles.card}>
      <ThemedText variant="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {type === 'bar' ? renderBarChart() : renderLineChart()}
    </ThemedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  label: {
    textAlign: 'center',
  },
});
