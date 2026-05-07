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

export const sendPostureMisalignmentAlert = async (
  body: string,
): Promise<void> => {
  await scheduleLocalNotification('Posture Alert', body);
};
