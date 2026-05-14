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
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? theme.primary : theme.surface,
            borderWidth: isUser ? 0 : 1,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText
          variant={isUser ? 'body' : 'caption'}
          color={isUser ? '#FFFFFF' : theme.text}
          style={!isUser ? styles.assistantText : undefined}
        >
          {text}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    maxWidth: '72%',
    marginBottom: 8,
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userBubble: {},
  assistantBubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  // Slightly larger than raw caption for long AI replies (caption is 12px).
  assistantText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
