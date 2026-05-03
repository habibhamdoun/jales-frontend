import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
} from 'react-native';
import { BleManager, Device, State, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { BLEContextType, TrunkNeutralReference } from './types';
import {
  parseBnoPayload,
  parseMpuPayload,
  BnoData,
  MpuData,
} from '@/src/utils/bleParsers';
import { byteToBase64 } from '@/src/utils/bleUtils';
import {
  calculatePostureAnalysis,
  PostureAnalysis,
} from '@/src/utils/reba';
import { getTrunkAngles } from '@/src/utils/posture';

global.Buffer = global.Buffer || Buffer;

// New custom UUIDs
const BLE_SERVICE_UUID = '12345678-1234-1234-1234-1234567890A0';
const BLE_BNO_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A1';
const BLE_MPU1_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A2';
const BLE_MPU2_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A3';
const BLE_MPU3_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A4';
const BLE_CALIBRATION_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A5';

const SCAN_SECONDS = 6;
const DEVICE_NAME = 'PostureMonitor';

export const BleContext = createContext<BLEContextType | undefined>(undefined);

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const managerRef = useRef<BleManager | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorSubsRef = useRef<Subscription[]>([]);
  const stateListenerRef = useRef<Subscription | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');
  const isMountedRef = useRef(true);

  const [device, setDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [bno, setBno] = useState<BnoData | null>(null);
  const [mpu1, setMpu1] = useState<MpuData | null>(null);
  const [mpu2, setMpu2] = useState<MpuData | null>(null);
  const [mpu3, setMpu3] = useState<MpuData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Posture analysis state
  const [trunkNeutralReference, setTrunkNeutralReference] =
    useState<TrunkNeutralReference | null>(null);
  const [postureAnalysis, setPostureAnalysis] =
    useState<PostureAnalysis | null>(null);

  // Smoothing factor for exponential moving average (0-1, higher = more smoothing)
  const SMOOTHING_FACTOR = 0.4;
  const smoothedAnglesRef = useRef<{ pitch: number; roll: number }>({ pitch: 0, roll: 0 });

  // Stop scanning
  const requestAndroidBlePermissions =
    useCallback(async (): Promise<boolean> => {
      if (Platform.OS !== 'android') return true;

      try {
        if (Platform.Version >= 31) {
          const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]);

          const scanGranted =
            results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
            PermissionsAndroid.RESULTS.GRANTED;
          const connectGranted =
            results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
            PermissionsAndroid.RESULTS.GRANTED;

          return scanGranted && connectGranted;
        } else {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }, []);

  // Stop scanning
  const stopScan = useCallback(() => {
    try {
      managerRef.current?.stopDeviceScan();
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
    setIsScanning(false);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  // Subscribe to all binary sensor characteristics
  const subscribeToCharacteristics = useCallback((connectedDevice: Device) => {
    // Remove existing subscriptions
    monitorSubsRef.current.forEach((sub) => sub.remove());
    monitorSubsRef.current = [];

    console.log('[BLE] Subscribing to characteristics...');

    // Subscribe to BNO characteristic
    const bnoCb = connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_BNO_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;

        if (error) {
          console.error('[BLE] BNO Monitor error:', error);
          return;
        }

        if (!characteristic?.value) {
          return;
        }

        try {
          const parsed = parseBnoPayload(characteristic.value);
          if (parsed) {
            setBno(parsed);
          }
        } catch (e) {
          console.error('[BLE] Error processing BNO notification:', e);
        }
      },
    );
    monitorSubsRef.current.push(bnoCb);

    // Subscribe to MPU1 characteristic
    const mpu1Cb = connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_MPU1_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;

        if (error) {
          console.error('[BLE] MPU1 Monitor error:', error);
          return;
        }

        if (!characteristic?.value) {
          return;
        }

        try {
          const parsed = parseMpuPayload(characteristic.value);
          if (parsed) {
            setMpu1(parsed);
          }
        } catch (e) {
          console.error('[BLE] Error processing MPU1 notification:', e);
        }
      },
    );
    monitorSubsRef.current.push(mpu1Cb);

    // Subscribe to MPU2 characteristic (optional)
    const mpu2Cb = connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_MPU2_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;

        if (error) {
          console.warn(
            '[BLE] MPU2 Monitor error (expected if not available):',
            error,
          );
          return;
        }

        if (!characteristic?.value) {
          return;
        }

        try {
          const parsed = parseMpuPayload(characteristic.value);
          if (parsed) {
            setMpu2(parsed);
          }
        } catch (e) {
          console.error('[BLE] Error processing MPU2 notification:', e);
        }
      },
    );
    monitorSubsRef.current.push(mpu2Cb);

    // Subscribe to MPU3 characteristic (optional)
    const mpu3Cb = connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_MPU3_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;

        if (error) {
          console.warn(
            '[BLE] MPU3 Monitor error (expected if not available):',
            error,
          );
          return;
        }

        if (!characteristic?.value) {
          return;
        }

        try {
          const parsed = parseMpuPayload(characteristic.value);
          if (parsed) {
            setMpu3(parsed);
          }
        } catch (e) {
          console.error('[BLE] Error processing MPU3 notification:', e);
        }
      },
    );
    monitorSubsRef.current.push(mpu3Cb);

    console.log('[BLE] Subscribed to all characteristics');
  }, []);

  // Start scanning
  const startScan = useCallback(async () => {
    if (!isMountedRef.current) return;

    setErrorMsg(null);
    setDevices([]);
    setIsScanning(true);

    const hasPerms = await requestAndroidBlePermissions();
    if (!hasPerms) {
      if (isMountedRef.current) {
        setErrorMsg('Bluetooth permissions were denied');
        setIsScanning(false);
      }
      return;
    }

    const manager = managerRef.current;
    if (!manager) {
      if (isMountedRef.current) {
        setErrorMsg('BLE manager not initialized');
        setIsScanning(false);
      }
      return;
    }

    // Listen for BLE state and start scan when ready
    stateListenerRef.current = manager.onStateChange((state) => {
      if (state === State.PoweredOff) {
        if (isMountedRef.current) {
          setErrorMsg('Bluetooth is off. Please enable it and try again.');
        }
        stopScan();
        return;
      }

      if (state !== State.PoweredOn) return;

      try {
        manager.startDeviceScan(
          null,
          { allowDuplicates: false },
          (err, scannedDevice) => {
            if (err) {
              console.error('Scan error:', err);
              if (isMountedRef.current) {
                setErrorMsg(err.message || 'Scan error occurred');
              }
              stopScan();
              return;
            }

            if (!scannedDevice || !isMountedRef.current) return;

            // Filter for PostureMonitor devices only
            const deviceName =
              scannedDevice.name || scannedDevice.localName || '';
            if (!deviceName.includes('PostureMonitor')) return;

            // Add device if not already in list
            setDevices((prev) => {
              const exists = prev.some((d) => d.id === scannedDevice.id);
              if (!exists) {
                return [...prev, scannedDevice];
              }
              return prev;
            });
          },
        );

        // Auto-stop scan after SCAN_SECONDS
        scanTimeoutRef.current = setTimeout(() => {
          stopScan();
        }, SCAN_SECONDS * 1000);

        // Clean up state listener
        stateListenerRef.current?.remove();
        stateListenerRef.current = null;
      } catch (error) {
        console.error('Error starting scan:', error);
        if (isMountedRef.current) {
          setErrorMsg('Failed to start scan');
          setIsScanning(false);
        }
      }
    }, true);
  }, [requestAndroidBlePermissions, stopScan]);

  // Connect to device
  const connectDevice = useCallback(
    async (targetDevice: Device) => {
      if (!isMountedRef.current) return;

      setErrorMsg(null);
      setIsConnecting(true);
      stopScan();

      try {
        console.log(
          `[BLE] Connecting to ${targetDevice.name || targetDevice.id}...`,
        );

        const connected = await targetDevice.connect();
        console.log('[BLE] Device connected, discovering services...');

        const withServices =
          await connected.discoverAllServicesAndCharacteristics();

        console.log(
          '[BLE] Services discovered, subscribing to characteristics...',
        );

        if (isMountedRef.current) {
          setDevice(withServices);
          setIsConnected(true);
          setIsConnecting(false);
          console.log('[BLE] === DEVICE CONNECTED AND STATE SET ===');
          subscribeToCharacteristics(withServices);
        }
      } catch (error: any) {
        console.error('[BLE] Connection error:', error);
        if (isMountedRef.current) {
          setErrorMsg(error.message || 'Failed to connect to device');
          setDevice(null);
          setIsConnected(false);
          setIsConnecting(false);
        }
      }
    },
    [stopScan, subscribeToCharacteristics],
  );

  // Disconnect from device
  const disconnectDevice = useCallback(async () => {
    if (!isMountedRef.current) return;

    setErrorMsg(null);

    try {
      // Remove all subscriptions
      monitorSubsRef.current.forEach((sub) => sub.remove());
      monitorSubsRef.current = [];

      // Cancel connection
      if (device) {
        await device.cancelConnection();
      }
    } catch (error: any) {
      // Ignore BleManager destroyed error - it's harmless
      if (error?.message?.includes('destroyed')) {
        console.log(
          '[BLE] Device disconnected (manager was already destroyed)',
        );
      } else {
        console.error('[BLE] Disconnect error:', error);
        if (isMountedRef.current) {
          setErrorMsg(error.message || 'Failed to disconnect');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setDevice(null);
        setIsConnected(false);
        setIsConnecting(false);
        setBno(null);
        setMpu1(null);
        setMpu2(null);
        setMpu3(null);
        // Reset smoothing filter
        smoothedAnglesRef.current = { pitch: 0, roll: 0 };
      }
    }
  }, [device]);

  // Clear error
  const clearError = useCallback(() => {
    setErrorMsg(null);
  }, []);

  // Calibration helper method
  const performCalibration = useCallback(
    async (sensorName: string, commandByte: number): Promise<void> => {
      if (!isMountedRef.current) return;

      // Check if device is connected
      if (!device) {
        console.error(
          `[BLE] Cannot calibrate ${sensorName}: no device connected`,
        );
        throw new Error('No device connected');
      }

      try {
        console.log(
          `[BLE] Calibrating ${sensorName} with command byte: ${commandByte}`,
        );
        console.log(
          '[BLE] Target characteristic UUID:',
          BLE_CALIBRATION_CHARACTERISTIC,
        );

        // Convert command byte to base64
        const calibrationPayload = byteToBase64(commandByte);
        console.log(
          `[BLE] ${sensorName} calibration payload (base64):`,
          calibrationPayload,
        );

        // Write calibration command to characteristic
        await device.writeCharacteristicWithResponseForService(
          BLE_SERVICE_UUID,
          BLE_CALIBRATION_CHARACTERISTIC,
          calibrationPayload,
        );

        if (isMountedRef.current) {
          console.log(
            `[BLE] ${sensorName} calibration command sent successfully`,
          );
          setErrorMsg(null);
        }
      } catch (error: any) {
        console.error(`[BLE] ${sensorName} calibration error:`, error);
        if (isMountedRef.current) {
          const errorMessage =
            error.message || `Failed to calibrate ${sensorName}`;
          setErrorMsg(errorMessage);
          throw error;
        }
      }
    },
    [device],
  );

  // Individual sensor calibration methods
  const calibrateBno = useCallback(async (): Promise<void> => {
    await performCalibration('BNO', 1);
  }, [performCalibration]);

  const calibrateMpu1 = useCallback(async (): Promise<void> => {
    await performCalibration('MPU1', 2);
  }, [performCalibration]);

  const calibrateMpu2 = useCallback(async (): Promise<void> => {
    await performCalibration('MPU2', 3);
  }, [performCalibration]);

  const calibrateMpu3 = useCallback(async (): Promise<void> => {
    await performCalibration('MPU3', 4);
  }, [performCalibration]);

  // Posture analysis methods
  const updatePostureAnalysis = useCallback(() => {
    if (!isMountedRef.current) return;

    // Need both BNO and MPU1 for complete analysis
    if (!bno || !mpu1) {
      setPostureAnalysis(null);
      return;
    }

    try {
      // Get trunk angles from MPU1
      const { relative: trunkAngles } = getTrunkAngles(mpu1, trunkNeutralReference || undefined);

      let effectiveTrunkPitch = trunkAngles?.pitch ?? 0;
      let effectiveTrunkRoll = trunkAngles?.roll ?? 0;

      // Apply exponential moving average smoothing to reduce noise
      smoothedAnglesRef.current.pitch = 
        SMOOTHING_FACTOR * effectiveTrunkPitch + 
        (1 - SMOOTHING_FACTOR) * smoothedAnglesRef.current.pitch;
      
      smoothedAnglesRef.current.roll = 
        SMOOTHING_FACTOR * effectiveTrunkRoll + 
        (1 - SMOOTHING_FACTOR) * smoothedAnglesRef.current.roll;

      effectiveTrunkPitch = smoothedAnglesRef.current.pitch;
      effectiveTrunkRoll = smoothedAnglesRef.current.roll;

      // Calculate posture analysis
      const analysis = calculatePostureAnalysis(
        bno.pitch,
        bno.roll,
        effectiveTrunkPitch,
        effectiveTrunkRoll,
      );

      if (isMountedRef.current) {
        setPostureAnalysis(analysis);
      }
    } catch (error) {
      console.error('[BLE] Error calculating posture analysis:', error);
    }
  }, [bno, mpu1, trunkNeutralReference]);

  // Set trunk neutral reference for relative posture calculation
  const handleSetTrunkNeutralReference = useCallback(
    (neutral: TrunkNeutralReference) => {
      if (!isMountedRef.current) return;

      console.log('[BLE] Setting trunk neutral reference:', neutral);
      setTrunkNeutralReference(neutral);
      // Reset smoothing filter when calibrating
      smoothedAnglesRef.current = { pitch: 0, roll: 0 };
    },
    [],
  );

  // Initialize BLE Manager
  useEffect(() => {
    managerRef.current = new BleManager();

    return () => {
      // Mark as unmounted to prevent state updates
      isMountedRef.current = false;

      // Cleanup on unmount
      stopScan();
      monitorSubsRef.current.forEach((sub) => sub.remove());
      stateListenerRef.current?.remove();
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  // Handle app state changes (pause/resume)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;

      if (state === 'background' && isScanning) {
        stopScan();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isScanning, stopScan]);

  // Update posture analysis whenever sensor data changes
  useEffect(() => {
    updatePostureAnalysis();
  }, [updatePostureAnalysis]);

  const value: BLEContextType = {
    device,
    devices,
    bno,
    mpu1,
    mpu2,
    mpu3,
    isScanning,
    isConnecting,
    errorMsg,
    isConnected,
    postureAnalysis,
    trunkNeutralReference,
    setTrunkNeutralReference: handleSetTrunkNeutralReference,
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
    calibrateBno,
    calibrateMpu1,
    calibrateMpu2,
    calibrateMpu3,
    clearError,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};
