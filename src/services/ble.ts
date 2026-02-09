import { BLE_SERVICE_UUID, BLE_CHARACTERISTIC_UUID } from '@/src/utils/constants';

export const scanForDevices = async (): Promise<any[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'jales-01', name: 'JALES-01', rssi: -45 },
        { id: 'jales-02', name: 'JALES-02', rssi: -65 },
      ]);
    }, 2000);
  });
};

export const connectToDevice = async (deviceId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000);
  });
};

export const disconnectFromDevice = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
};

export const readCharacteristic = async (): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ value: 'mock-data' });
    }, 500);
  });
};
