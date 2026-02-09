import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  color,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const variantStyles = {
    title: styles.title,
    subtitle: styles.subtitle,
    body: styles.body,
    caption: styles.caption,
    label: styles.label,
  };

  const textColor = color || theme.text;

  return (
    <Text
      style={[variantStyles[variant], { color: textColor }, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
