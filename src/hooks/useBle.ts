import { useContext } from 'react';
import { BleContext } from '@/src/ble/BleProvider';
import { BLEContextType } from '@/src/ble/types';

/**
 * Hook to access BLE context throughout the app
 * Must be used within a BleProvider
 */
export const useBle = (): BLEContextType => {
  const context = useContext(BleContext);

  if (!context) {
    throw new Error(
      'useBle must be used within a BleProvider. Make sure your app is wrapped with <BleProvider>'
    );
  }

  return context;
};
