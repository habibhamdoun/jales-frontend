import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './ThemedText';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const ThemedInput: React.FC<ThemedInputProps> = ({
  label,
  error,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText variant="label" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.mutedText}
        {...props}
      />
      {error && (
        <ThemedText
          variant="caption"
          style={[styles.error, { color: theme.danger }]}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  error: {
    marginTop: 4,
  },
});
