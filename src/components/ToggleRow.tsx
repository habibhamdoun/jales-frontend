import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './themed/ThemedText';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <ThemedText variant="body">{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  rowDisabled: {
    opacity: 0.55,
  },
});
