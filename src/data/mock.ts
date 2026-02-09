import {
  User,
  PostureData,
  DailySummary,
  WeeklySummary,
  MonthlySummary,
  ChatMessage,
  ConnectedDevice,
  Settings,
} from './types';

export const mockUser: User = {
  id: '1',
  fullName: 'Jordan Alex',
  email: 'jordan.alex@email.com',
  age: 28,
  gender: 'Male',
  heightCm: 175,
  weightKg: 72,
  postureGoalPreset: 'Office',
};

export const mockPostureData: PostureData = {
  currentScore: 85,
  status: 'GOOD',
  angles: {
    neck: 12,
    upperBack: 8,
    shoulders: 5,
  },
  vibrationCount: 12,
  lastCorrectionMinutesAgo: 2,
};

export const mockDailySummary: DailySummary = {
  date: 'Tuesday, October 24',
  score: 85,
  goodPostureHours: 7,
  goodPostureMinutes: 15,
  badPostureTime: 1.75,
  vibrationsSent: 12,
  postureTimeline: [
    { time: '6 AM', status: 'good' },
    { time: '9 AM', status: 'good' },
    { time: '12 PM', status: 'good' },
    { time: '3 PM', status: 'bad' },
    { time: '6 PM', status: 'good' },
  ],
  postureTip: 'Try the "Chin Tuck" exercise to relieve neck strain. It helps align your head over your spine.',
};

export const mockWeeklySummary: WeeklySummary = {
  weekStart: 'Oct 23',
  weekEnd: 'Oct 29',
  averageScore: 88,
  dailyScores: [
    { day: 'S', score: 75 },
    { day: 'M', score: 82 },
    { day: 'T', score: 90 },
    { day: 'W', score: 95 },
    { day: 'T', score: 88 },
    { day: 'F', score: 85 },
    { day: 'S', score: 80 },
  ],
  improvement: 15,
  bestDay: 'Wednesday',
  totalGoodHours: 48,
};

export const mockMonthlySummary: MonthlySummary = {
  month: 'October',
  year: 2023,
  averageScore: 82,
  trend: [
    { day: 1, score: 75 },
    { day: 5, score: 80 },
    { day: 10, score: 78 },
    { day: 15, score: 85 },
    { day: 20, score: 82 },
    { day: 23, score: 88 },
    { day: 25, score: 90 },
    { day: 31, score: 85 },
  ],
  bestDay: 'Oct 23',
  bestDayScore: 82,
  improvement: 18,
};

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    sender: 'assistant',
    text: "Hello! I'm your JALES AI assistant. How can I help you with your posture data today?",
    timestamp: new Date(Date.now() - 600000),
  },
];

export const mockConnectedDevice: ConnectedDevice = {
  name: 'My JALES Shirt',
  model: 'Model S',
  battery: 87,
  firmwareVersion: 'v1.2.4',
  lastSync: '2 min ago',
};

export const mockSettings: Settings = {
  notificationsEnabled: true,
  feedbackIntensity: 75,
  vibrationIntensity: 70,
  sensitivity: 60,
  reminderFrequency: 'Medium',
  neckSensitivity: 'Default',
  shoulderCorrectionThreshold: 'Medium',
  upperBackCorrectionThreshold: 'High',
  vibrationAlerts: true,
  pushNotifications: true,
  quietHoursStart: '10 PM',
  quietHoursEnd: '7 AM',
};

export const mockPostureTips = [
  'Try the "Chin Tuck" exercise to relieve neck strain. It helps align your head over your spine.',
  'Take a 5-minute break every hour to stand and stretch your back.',
  'Position your monitor at eye level to reduce neck strain.',
  'Keep your shoulders relaxed and avoid hunching forward.',
  'Strengthen your core muscles to support better posture throughout the day.',
];

export const mockAIResponses = [
  "Looking at your data from yesterday, I noticed a 15% increase in slouching during the afternoon. This could be contributing to the strain. I recommend taking short stretching breaks every hour.",
  "Your posture score has improved by 12% this week! Keep up the good work. Focus on maintaining proper alignment during your afternoon sessions.",
  "Based on your recent patterns, you might benefit from adjusting your workspace ergonomics. Would you like some specific recommendations?",
  "I can see you've been consistent with your posture goals. The vibration feedback seems to be helping. Let's maintain this momentum!",
];
