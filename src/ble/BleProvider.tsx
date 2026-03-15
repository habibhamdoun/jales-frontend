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
import { BLEContextType } from './types';
import {
  parseBnoPayload,
  parseMpuPayload,
  BnoData,
  MpuData,
} from '@/src/utils/bleParsers';

global.Buffer = global.Buffer || Buffer;

// New custom UUIDs
const BLE_SERVICE_UUID = '12345678-1234-1234-1234-1234567890A0';
const BLE_BNO_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A1';
const BLE_MPU1_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A2';
const BLE_MPU2_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A3';
const BLE_MPU3_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A4';

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
          console.log('[BLE] BNO notification received with no value');
          return;
        }

        try {
          console.log('[BLE] BNO Raw Base64:', characteristic.value);
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
          console.log('[BLE] MPU1 notification received with no value');
          return;
        }

        try {
          console.log('[BLE] MPU1 Raw Base64:', characteristic.value);
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
          console.log('[BLE] MPU2 notification received with no value');
          return;
        }

        try {
          console.log('[BLE] MPU2 Raw Base64:', characteristic.value);
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
          console.log('[BLE] MPU3 notification received with no value');
          return;
        }

        try {
          console.log('[BLE] MPU3 Raw Base64:', characteristic.value);
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
      }
    }
  }, [device]);

  // Clear error
  const clearError = useCallback(() => {
    setErrorMsg(null);
  }, []);

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
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
    clearError,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};
