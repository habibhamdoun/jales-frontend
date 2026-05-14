import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './themed/ThemedText';

interface StatPillProps {
  label: string;
  value: string;
  trend?: 'up' | 'down';
  style?: ViewStyle;
}

export const StatPill: React.FC<StatPillProps> = ({
  label,
  value,
  trend,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.primarySoft,
          borderColor: `${theme.primary}22`,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <ThemedText
          variant="body"
          color={theme.primary}
          style={styles.valueText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
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
      <ThemedText
        variant="caption"
        color={theme.mutedText}
        style={styles.labelText}
        numberOfLines={2}
      >
        {label}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  valueText: {
    fontWeight: '800',
    fontSize: 15,
  },
  labelText: {
    textAlign: 'center',
    lineHeight: 16,
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
