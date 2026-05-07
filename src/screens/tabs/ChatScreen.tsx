import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ChatBubble } from '@/src/components/ChatBubble';
import { Activity, Send } from 'lucide-react-native';
import { ChatMessage } from '@/src/data/types';
import { sendChatMessage } from '@/src/services/openaiChat';
import { useBle } from '@/src/hooks/useBle';
import { getTrunkAngles } from '@/src/utils/posture';

const ChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const { bno, mpu1, postureAnalysis, isConnected, trunkNeutralReference } =
    useBle();

  // Static messages state for testing
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: "Hello! I'm your AI health assistant. How can I help with your posture today?",
      timestamp: new Date(Date.now() - 3600000),
    },
  ]);

  // Static addMessage function for testing
  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    if (text.length === 0 || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    const previousMessages = messages;
    addMessage(userMessage);
    setInputText('');
    setIsSending(true);

    try {
      const reply = await sendChatMessage(previousMessages, text);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: reply,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while contacting the assistant.';

      addMessage({
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: message,
        timestamp: new Date(),
      });
    } finally {
      setIsSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSend = async () => {
    await sendMessage(inputText.trim());
  };

  const handleSendCurrentAngles = async () => {
    if (!isConnected || (!bno && !mpu1 && !postureAnalysis)) {
      await sendMessage(
        'My JALES Shirt is not connected yet, so no live posture angles are available. Give me general setup advice.',
      );
      return;
    }

    const trunkAngles = getTrunkAngles(
      mpu1,
      trunkNeutralReference || undefined,
    );

    const angleSummary = [
      'Analyze my current JALES posture sensor reading and give concise corrective advice.',
      bno
        ? `Neck/BNO orientation: heading ${bno.heading.toFixed(1)} degrees, roll ${bno.roll.toFixed(1)} degrees, pitch ${bno.pitch.toFixed(1)} degrees.`
        : 'Neck/BNO orientation: unavailable.',
      trunkAngles.absolute
        ? `Trunk absolute angles: pitch ${trunkAngles.absolute.pitch.toFixed(1)} degrees, roll ${trunkAngles.absolute.roll.toFixed(1)} degrees.`
        : 'Trunk absolute angles: unavailable.',
      trunkAngles.relative
        ? `Trunk relative-to-neutral angles: pitch ${trunkAngles.relative.pitch.toFixed(1)} degrees, roll ${trunkAngles.relative.roll.toFixed(1)} degrees.`
        : 'Trunk relative-to-neutral angles: unavailable.',
      postureAnalysis
        ? `REBA-style scores: neck ${postureAnalysis.neck.totalScore} (${postureAnalysis.neck.label}), trunk ${postureAnalysis.trunk.totalScore} (${postureAnalysis.trunk.label}).`
        : 'REBA-style scores: unavailable.',
      'Tell me what looks good, what needs correction, and one action I should take now.',
    ].join('\n');

    await sendMessage(angleSummary);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <ThemedText variant='subtitle'>AI Doctor Chat</ThemedText>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 24}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              text={item.text}
              sender={item.sender}
              timestamp={item.timestamp}
            />
          )}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps='handled'
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={[styles.quickActions, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleSendCurrentAngles}
            disabled={isSending}
            style={[
              styles.angleButton,
              {
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Activity color={theme.primary} size={17} />
            <ThemedText variant='caption' color={theme.primary}>
              Analyze Current Angles
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.surface, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder='Ask about your posture...'
            placeholderTextColor={theme.mutedText}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isSending}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isSending}
            style={[
              styles.sendButton,
              {
                backgroundColor: isSending ? theme.mutedText : theme.primary,
              },
            ]}
          >
            <Send color='#FFFFFF' size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  keyboardArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  angleButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
