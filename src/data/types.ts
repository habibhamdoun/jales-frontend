export interface User {
  id: string;
  fullName: string;
  email: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  postureGoalPreset: string;
}

export interface PostureAngles {
  neck: number;
  upperBack: number;
  shoulders: number;
}

export interface PostureThresholds {
  neckAngleLimit: number;
  upperBackAngleLimit: number;
  shoulderTiltLimit: number;
}

export interface PostureData {
  currentScore: number;
  status: 'GOOD' | 'FAIR' | 'POOR';
  angles: PostureAngles;
  vibrationCount: number;
  lastCorrectionMinutesAgo: number;
}

export interface DailySummary {
  date: string;
  score: number;
  goodPostureHours: number;
  goodPostureMinutes: number;
  badPostureTime: number;
  vibrationsSent: number;
  postureTimeline: TimelineEntry[];
  postureTip: string;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  averageScore: number;
  dailyScores: DailyScore[];
  improvement: number;
  bestDay: string;
  totalGoodHours: number;
}

export interface MonthlySummary {
  month: string;
  year: number;
  averageScore: number;
  trend: TrendPoint[];
  bestDay: string;
  bestDayScore: number;
  improvement: number;
}

export interface TimelineEntry {
  time: string;
  status: 'good' | 'bad';
}

export interface DailyScore {
  day: string;
  score: number;
}

export interface TrendPoint {
  day: number;
  score: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface ConnectedDevice {
  name: string;
  model: string;
  battery: number;
  firmwareVersion: string;
  lastSync: string;
}

export interface Settings {
  notificationsEnabled: boolean;
  feedbackIntensity: number;
  vibrationIntensity: number;
  sensitivity: number;
  reminderFrequency: string;
  neckSensitivity: string;
  shoulderCorrectionThreshold: string;
  upperBackCorrectionThreshold: string;
  vibrationAlerts: boolean;
  pushNotifications: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}
