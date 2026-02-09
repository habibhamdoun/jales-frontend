import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

interface ThemedViewProps extends ViewProps {
  backgroundColor?: string;
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  backgroundColor,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const bgColor = backgroundColor || theme.background;

  return <View style={[{ backgroundColor: bgColor }, style]} {...props} />;
};
