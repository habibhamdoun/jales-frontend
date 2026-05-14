import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ChatBubble } from '@/src/components/ChatBubble';
import { Activity, Send } from 'lucide-react-native';
import { ChatMessage } from '@/src/data/types';
import { sendChatMessage } from '@/src/services/openaiChat';
import { useBle } from '@/src/hooks/useBle';
import { getTrunkAngles } from '@/src/utils/posture';
import { useMonitoring } from '@/src/monitoring/MonitoringContext';
import type { AppTabsParamList } from '@/src/navigation/AppTabs';

const ChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<RouteProp<AppTabsParamList, 'Chat'>>();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();
  const { bno, mpu1, isConnected, trunkNeutralReference } = useBle();
  const { latestEvaluation, hasUserServerCalibration } = useMonitoring();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: "Hello! I'm your AI health assistant. How can I help with your posture today?",
      timestamp: new Date(Date.now() - 3600000),
    },
  ]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const seedInFlightRef = useRef(false);

  const sendMessage = useCallback(async (text: string) => {
    if (text.length === 0 || isSendingRef.current) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    const previousMessages = messagesRef.current;
    addMessage(userMessage);
    setInputText('');
    isSendingRef.current = true;
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
      isSendingRef.current = false;
      setIsSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [addMessage]);

  useFocusEffect(
    useCallback(() => {
      const prompt = route.params?.dailyCoachPrompt?.trim();
      if (!prompt || seedInFlightRef.current) return;
      seedInFlightRef.current = true;
      (async () => {
        try {
          await sendMessage(prompt);
        } finally {
          navigation.setParams({ dailyCoachPrompt: undefined });
          seedInFlightRef.current = false;
        }
      })();
    }, [route.params?.dailyCoachPrompt, navigation, sendMessage]),
  );

  const handleSend = async () => {
    await sendMessage(inputText.trim());
  };

  const handleSendCurrentAngles = async () => {
    if (!isConnected || (!bno && !mpu1 && !latestEvaluation)) {
      await sendMessage(
        'My JALES Shirt is not connected yet, so no live posture angles are available. Give me general setup advice.',
      );
      return;
    }

    const upperBackAngles = getTrunkAngles(
      mpu1,
      trunkNeutralReference || undefined,
    );

    const angleSummary = [
      'Analyze my current JALES posture sensor reading and give concise corrective advice.',
      'Note: raw values below are from the shirt; the backend scores posture using account or device calibration on the server (RULA-style part scores, then optional threshold bump).',
      hasUserServerCalibration
        ? 'Account calibration is active on the server for this session.'
        : 'No account calibration row detected in the app state — the server may still use per-device calibration or raw scoring.',
      bno
        ? `BNO (raw trunk reference): heading ${bno.heading.toFixed(1)}°, roll ${bno.roll.toFixed(1)}°, pitch ${bno.pitch.toFixed(1)}°.`
        : 'BNO orientation: unavailable.',
      upperBackAngles.absolute
        ? `MPU1-derived upper-back angles (client only, not the server BNO trunk flexion): pitch ${upperBackAngles.absolute.pitch.toFixed(1)}°, roll ${upperBackAngles.absolute.roll.toFixed(1)}°.`
        : 'MPU1 absolute angles: unavailable.',
      upperBackAngles.relative
        ? `MPU1 vs client trunk neutral reference (client only): pitch ${upperBackAngles.relative.pitch.toFixed(1)}°, roll ${upperBackAngles.relative.roll.toFixed(1)}°.`
        : 'MPU1 relative-to-client-neutral: unavailable.',
      latestEvaluation
        ? [
            `Server-evaluated angles (calibrated-relative): upper back / trunk flexion ${latestEvaluation.angles.trunkFlexion.toFixed(1)}°, left shoulder ${latestEvaluation.angles.leftShoulderAngle.toFixed(1)}°, right shoulder ${latestEvaluation.angles.rightShoulderAngle.toFixed(1)}°.`,
            latestEvaluation.trunkTwistFlag !== undefined ||
            latestEvaluation.trunkTiltFlag !== undefined
              ? `Server trunk context flags: twist ${String(latestEvaluation.trunkTwistFlag)}, tilt ${String(latestEvaluation.trunkTiltFlag)}.`
              : null,
            `Backend RULA part scores: trunk ${latestEvaluation.trunkScore}/4, left shoulder ${latestEvaluation.leftShoulderScore}/4, right shoulder ${latestEvaluation.rightShoulderScore}/4. Action level ${latestEvaluation.actionLevel}/4.`,
            typeof latestEvaluation.overallPercent === 'number'
              ? `Overall score (0–100): ${latestEvaluation.overallPercent}.`
              : null,
          ]
            .filter(Boolean)
            .join('\n')
        : 'Backend evaluation: unavailable.',
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
          ListFooterComponent={
            isSending ? (
              <View style={styles.thinkingWrap}>
                <View
                  style={[
                    styles.thinkingBubble,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ActivityIndicator size='small' color={theme.primary} />
                  <ThemedText variant='caption' color={theme.mutedText} style={styles.thinkingLabel}>
                    Thinking…
                  </ThemedText>
                </View>
              </View>
            ) : null
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
  thinkingWrap: {
    alignSelf: 'flex-start',
    maxWidth: '72%',
    marginTop: 4,
    marginBottom: 4,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  thinkingLabel: {
    fontSize: 13,
  },
});

export default ChatScreen;
