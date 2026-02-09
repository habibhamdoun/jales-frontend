import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

type Variant = 'default' | 'elevated' | 'outline';

interface ThemedCardProps extends ViewProps {
  variant?: Variant;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  variant = 'default',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const variantStyles = {
    default: {
      backgroundColor: theme.card,
      borderWidth: 0,
    },
    elevated: {
      backgroundColor: theme.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    outline: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
  };

  return (
    <View
      style={[styles.card, variantStyles[variant], style]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
  },
});
