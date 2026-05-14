import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type ExpoNotifications = typeof import('expo-notifications');

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const canUseNotifications = Platform.OS !== 'web' && !isExpoGo;
const Notifications: ExpoNotifications | null = canUseNotifications
  ? require('expo-notifications')
  : null;

const POSTURE_CHANNEL_ID = 'posture-alerts';

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const ensureNotificationChannel = async (): Promise<void> => {
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(POSTURE_CHANNEL_ID, {
    name: 'Posture alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00A878',
  });
};

export const requestPermissions = async (): Promise<boolean> => {
  if (!Notifications) {
    return false;
  }

  try {
    await ensureNotificationChannel();

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Notifications are unavailable:', error);
    return false;
  }
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
): Promise<void> => {
  if (!Notifications) {
    console.log('Notification:', title, body);
    return;
  }

  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: Platform.OS === 'android' ? { channelId: POSTURE_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn('Failed to schedule notification:', error);
  }
};

export const sendPostureReminder = async (): Promise<void> => {
  await scheduleLocalNotification(
    'Posture Check',
    'Remember to adjust your posture!',
  );
};

// Fired by MonitoringProvider when bad posture has been sustained for the
// persistence window. Names the worst-offending body part in the body copy
// so the user knows exactly what to fix.
export const sendWorstBodyPartAlert = async (
  message: string,
  actionLevel: 3 | 4,
): Promise<void> => {
  const title =
    actionLevel >= 4 ? 'Fix your posture now' : 'Posture alert';
  await scheduleLocalNotification(title, message);
};

// Backwards-compatible helpers used by the Dev Tools card to fire a generic
// L3/L4 alert without going through the body-part picker.
export const sendActionLevel3Alert = async (): Promise<void> => {
  await scheduleLocalNotification(
    'Posture alert',
    'Your posture needs adjustment — please sit up.',
  );
};

export const sendActionLevel4Alert = async (): Promise<void> => {
  await scheduleLocalNotification(
    'Fix your posture now',
    'Poor posture detected — correct your position now.',
  );
};
