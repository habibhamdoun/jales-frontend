import { Device } from 'react-native-ble-plx';
import { BnoData, MpuData } from '@/src/utils/bleParsers';

export interface SensorData {
  heading: number | null;
  roll: number | null;
  pitch: number | null;
  ax: number | null;
  ay: number | null;
  az: number | null;
  gx: number | null;
  gy: number | null;
  gz: number | null;
}

export interface BLEContextType {
  // State
  device: Device | null;
  devices: Device[];
  isScanning: boolean;
  isConnecting: boolean;
  errorMsg: string | null;
  isConnected: boolean;

  // Binary sensor data
  bno: BnoData | null;
  mpu1: MpuData | null;
  mpu2: MpuData | null;
  mpu3: MpuData | null;

  // Actions
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectDevice: (device: Device) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  clearError: () => void;
}
