import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedCard } from './themed/ThemedCard';
import { ThemedText } from './themed/ThemedText';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'danger';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  status,
}) => {
  const { theme } = useTheme();

  const statusColors = {
    good: theme.success,
    warning: theme.warning,
    danger: theme.danger,
  };

  return (
    <ThemedCard style={styles.card}>
      <View style={styles.iconContainer}>{icon}</View>
      <ThemedText variant="caption" color={theme.mutedText} style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText variant="subtitle" style={styles.value}>
        {value}
      </ThemedText>
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: statusColors[status] },
        ]}
      />
    </ThemedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    minWidth: 100,
  },
  iconContainer: {
    marginBottom: 8,
  },
  label: {
    textAlign: 'center',
    marginBottom: 4,
  },
  value: {
    textAlign: 'center',
  },
  statusIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
});
