import { ChatMessage } from '@/src/data/types';
import { apiFetch, API_BASE_URL } from '@/src/services/api';

declare const process: {
  env?: Record<string, string | undefined>;
};

type OpenAIContentItem = {
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIContentItem[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
  };
};

// Back-compat: old chat-specific url still works if set.
const CHAT_API_URL = process.env?.EXPO_PUBLIC_JALES_CHAT_API_URL;
const OPENAI_API_KEY = process.env?.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_MODEL = process.env?.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';

const SYSTEM_PROMPT = [
  'You are the JALES posture assistant.',
  'Give concise, practical posture and ergonomics guidance.',
  'Do not diagnose medical conditions.',
  'For pain, numbness, injury, or serious symptoms, advise the user to consult a medical professional.',
].join(' ');

const getResponseText = (data: OpenAIResponse): string => {
  if (data.output_text) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  return text || 'I could not generate a response. Please try again.';
};

const buildConversationInput = (messages: ChatMessage[], userText: string) => {
  const recentMessages = messages.slice(-10).map((message) => ({
    role: message.sender === 'assistant' ? 'assistant' : 'user',
    content: message.text,
  }));

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...recentMessages,
    { role: 'user', content: userText },
  ];
};

export const sendChatMessage = async (
  messages: ChatMessage[],
  userText: string,
): Promise<string> => {
  // Preferred: use your backend (one global base URL).
  if (API_BASE_URL) {
    const { data } = await apiFetch<any>('/chat', {
      method: 'POST',
      body: { messages, message: userText },
    });
    return data?.reply || data?.text || getResponseText(data);
  }

  // Back-compat: allow an explicit chat url override.
  if (CHAT_API_URL) {
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, message: userText }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Chat request failed');
    }

    return data.reply || data.text || getResponseText(data);
  }

  if (!OPENAI_API_KEY) {
    throw new Error(
      'Missing chat API setup. Set EXPO_PUBLIC_API_BASE_URL (recommended) or EXPO_PUBLIC_JALES_CHAT_API_URL or EXPO_PUBLIC_OPENAI_API_KEY.',
    );
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: buildConversationInput(messages, userText),
      max_output_tokens: 450,
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI request failed');
  }

  return getResponseText(data);
};
