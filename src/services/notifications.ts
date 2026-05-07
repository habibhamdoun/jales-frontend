export const requestPermissions = async (): Promise<boolean> => {
  return true;
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
): Promise<void> => {
  console.log('Notification:', title, body);
};

export const sendPostureReminder = async (): Promise<void> => {
  await scheduleLocalNotification(
    'Posture Check',
    'Remember to adjust your posture!',
  );
};
