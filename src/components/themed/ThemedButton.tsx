import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './ThemedText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ThemedButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  title: string;
  loading?: boolean;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  title,
  loading = false,
  style,
  disabled,
  ...props
}) => {
  const { theme } = useTheme();

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: theme.primarySoft,
      borderWidth: 0,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.primary,
    },
  };

  const sizeStyles = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  };

  const textColorMap = {
    primary: '#FFFFFF',
    secondary: theme.primary,
    ghost: theme.primary,
    outline: theme.primary,
  };

  const textSizeMap = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={textColorMap[variant]}
          size="small"
        />
      ) : (
        <ThemedText
          style={[
            styles.text,
            { color: textColorMap[variant], fontSize: textSizeMap[size] },
          ]}
        >
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
