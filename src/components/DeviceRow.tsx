import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedCard } from './themed/ThemedCard';
import { ThemedText } from './themed/ThemedText';
import { ThemedButton } from './themed/ThemedButton';

interface DeviceRowProps {
  name: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress?: () => void;
  actionLabel?: string;
}

export const DeviceRow: React.FC<DeviceRowProps> = ({
  name,
  subtitle,
  icon,
  onPress,
  actionLabel = 'Connect',
}) => {
  const { theme } = useTheme();

  return (
    <ThemedCard style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.primarySoft },
          ]}
        >
          {icon}
        </View>
        <View style={styles.info}>
          <ThemedText variant="label">{name}</ThemedText>
          {subtitle && (
            <ThemedText variant="caption" color={theme.mutedText}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      {onPress && (
        <ThemedButton
          title={actionLabel}
          variant="primary"
          size="md"
          onPress={onPress}
          style={styles.button}
        />
      )}
    </ThemedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  button: {
    width: '100%',
  },
});
