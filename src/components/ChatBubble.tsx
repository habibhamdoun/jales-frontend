import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './themed/ThemedText';

interface ChatBubbleProps {
  text: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  text,
  sender,
  timestamp,
}) => {
  const { theme } = useTheme();

  const isUser = sender === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? theme.primary : theme.surface,
            borderWidth: isUser ? 0 : 1,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText
          variant="body"
          color={isUser ? '#FFFFFF' : theme.text}
        >
          {text}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
