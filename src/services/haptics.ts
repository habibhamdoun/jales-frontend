import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

export const triggerLightHaptic = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const triggerMediumHaptic = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const triggerHeavyHaptic = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export const triggerNotificationHaptic = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

export const triggerVibrationPattern = (intensity: number = 70): void => {
  if (Platform.OS === 'web') {
    return;
  }

  const duration = Math.round((intensity / 100) * 500);
  Vibration.vibrate([0, duration, 100, duration]);
};
