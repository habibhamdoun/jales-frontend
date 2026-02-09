import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

type Size = 'sm' | 'md' | 'lg';

interface ThemedIconButtonProps extends TouchableOpacityProps {
  size?: Size;
  icon: React.ReactNode;
}

export const ThemedIconButton: React.FC<ThemedIconButtonProps> = ({
  size = 'md',
  icon,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const sizeStyles = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles[size],
        { backgroundColor: theme.primarySoft },
        style,
      ]}
      {...props}
    >
      {icon}
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
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 48,
    height: 48,
  },
});
