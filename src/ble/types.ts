import { Device } from 'react-native-ble-plx';
import { BnoData, MpuData } from '@/src/utils/bleParsers';
import type { RawSensorPacket } from '@/src/services/posture';
import type { CalibrationNeutralSnapshot } from '@/src/utils/calibrationNeutral';

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

export interface TrunkNeutralReference {
  pitch: number;
  roll: number;
}

export interface BLEContextType {
  // Connection state
  device: Device | null;
  devices: Device[];
  isScanning: boolean;
  isConnecting: boolean;
  errorMsg: string | null;
  isConnected: boolean;

  // Raw binary sensor data (live from BLE)
  bno: BnoData | null;
  mpu1: MpuData | null;
  mpu2: MpuData | null;

  /** After "calibrate all", UI shows these until monitoring starts or disconnect. */
  neutralDisplayFrozen: boolean;
  neutralDisplayLockSnapshot: CalibrationNeutralSnapshot | null;
  displayBno: BnoData | null;
  displayMpu1: MpuData | null;
  displayMpu2: MpuData | null;

  // Raw packet ready to forward to /posture/evaluate. Null until BNO + MPU1
  // + MPU2 frames have all arrived. The backend does all derivation; the
  // frontend never computes angles or scores itself.
  livePacket: RawSensorPacket | null;

  // Calibration reference for relative trunk-flexion measurement.
  trunkNeutralReference: TrunkNeutralReference | null;
  setTrunkNeutralReference: (neutral: TrunkNeutralReference) => void;

  /** 0–100, persisted; second byte sent with vibration command to firmware. */
  vibrationIntensity: number;
  setVibrationIntensity: (percent: number) => Promise<void>;

  /**
   * Battery level reported by the Arduino (0–100%).
   * Null until the first BLE battery notification arrives or on disconnect.
   */
  batteryLevel: number | null;

  // Actions
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectDevice: (device: Device) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  calibrateBno: () => Promise<void>;
  calibrateMpu1: () => Promise<void>;
  calibrateMpu2: () => Promise<void>;
  /** BNO → MPU1 → MPU2 firmware cal, then capture snapshot and freeze display until monitoring. */
  calibrateAllNeutral: () => Promise<CalibrationNeutralSnapshot>;
  /**
   * Load persisted calibration for this registered API device id (UUID).
   * Clears in-memory calibration when store is empty, mismatched v2 device, or after server cleared.
   */
  hydrateCalibrationFromStorage: (registeredDeviceId: string | null) => Promise<void>;
  /** Drop neutral snapshot / trunk ref in memory only (disk untouched). */
  clearCalibrationMemoryOnly: () => void;
  clearNeutralDisplayLock: () => void;
  triggerVibration: () => Promise<void>;
  clearError: () => void;
}