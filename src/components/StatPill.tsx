import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './themed/ThemedText';

interface StatPillProps {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

export const StatPill: React.FC<StatPillProps> = ({ label, value, trend }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.primarySoft }]}>
      <View style={styles.row}>
        <ThemedText variant="body" color={theme.primary}>
          {value}
        </ThemedText>
        {trend && (
          <ThemedText
            variant="caption"
            color={trend === 'up' ? theme.success : theme.danger}
            style={styles.trend}
          >
            {trend === 'up' ? '↑' : '↓'}
          </ThemedText>
        )}
      </View>
      <ThemedText variant="caption" color={theme.mutedText}>
        {label}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trend: {
    marginLeft: 4,
    fontSize: 16,
  },
});
