import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { BleManager, Device, State, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { BLEContextType, TrunkNeutralReference } from './types';
import {
  parseBnoPayload,
  parseMpuPayload,
  BnoData,
  MpuData,
} from '@/src/utils/bleParsers';
import { parseBatteryLevel } from '@/src/utils/bleUtils';
import { byteToBase64, bytesToBase64 } from '@/src/utils/bleUtils';
import type { RawSensorPacket } from '@/src/services/posture';
import {
  getStoredVibrationIntensity,
  setStoredVibrationIntensity,
} from '@/src/services/vibrationPreferences';
import { loadCalibrationStore } from '@/src/services/calibrationSnapshotStorage';
import { getTrunkAngles } from '@/src/utils/posture';
import { type CalibrationNeutralSnapshot } from '@/src/utils/calibrationNeutral';

global.Buffer = global.Buffer || Buffer;

const BLE_SERVICE_UUID               = '12345678-1234-1234-1234-1234567890A0';
const BLE_BNO_CHARACTERISTIC         = '12345678-1234-1234-1234-1234567890A1';
const BLE_MPU1_CHARACTERISTIC        = '12345678-1234-1234-1234-1234567890A2';
const BLE_MPU2_CHARACTERISTIC        = '12345678-1234-1234-1234-1234567890A3';
const BLE_CALIBRATION_CHARACTERISTIC = '12345678-1234-1234-1234-1234567890A5';
const BLE_BATTERY_CHARACTERISTIC     = '12345678-1234-1234-1234-1234567890A6';

const CMD_CALIBRATE_BNO     = 1;
const CMD_CALIBRATE_MPU1    = 2;
const CMD_CALIBRATE_MPU2    = 3;
const CMD_TRIGGER_VIBRATION = 5;

const SCAN_SECONDS = 6;
const isExpoGo     = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isBenignBleDisconnectMessage = (message: string): boolean => {
  const m = message.toLowerCase();
  return (
    m.includes('destroyed') || m.includes('not connected') || m.includes('disconnected') ||
    m.includes('cancelled') || m.includes('canceled') || m.includes('connection closed')
  );
};

const isCancelledBleMonitorError = (error: unknown): boolean => {
  if (error == null) return false;
  const msg =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error);
  return isBenignBleDisconnectMessage(msg);
};

export const BleContext = createContext<BLEContextType | undefined>(undefined);

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const managerRef       = useRef<BleManager | null>(null);
  const scanTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorSubsRef   = useRef<Subscription[]>([]);
  const stateListenerRef = useRef<Subscription | null>(null);
  const appStateRef      = useRef<AppStateStatus>('active');
  const isMountedRef     = useRef(true);

  const [device,       setDevice]       = useState<Device | null>(null);
  const deviceRef = useRef<Device | null>(null);
  useEffect(() => { deviceRef.current = device; }, [device]);

  const [devices,      setDevices]      = useState<Device[]>([]);
  const [bno,          setBno]          = useState<BnoData | null>(null);
  const [mpu1,         setMpu1]         = useState<MpuData | null>(null);
  const [mpu2,         setMpu2]         = useState<MpuData | null>(null);
  const [isScanning,   setIsScanning]   = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const [trunkNeutralReference,       setTrunkNeutralReference]       = useState<TrunkNeutralReference | null>(null);
  const [neutralDisplayFrozen,        setNeutralDisplayFrozen]        = useState(false);
  const [neutralDisplayLockSnapshot,  setNeutralDisplayLockSnapshot]  = useState<CalibrationNeutralSnapshot | null>(null);

  const bnoRef  = useRef<BnoData | null>(null);
  const mpu1Ref = useRef<MpuData | null>(null);
  const mpu2Ref = useRef<MpuData | null>(null);
  useEffect(() => { bnoRef.current  = bno;  }, [bno]);
  useEffect(() => { mpu1Ref.current = mpu1; }, [mpu1]);
  useEffect(() => { mpu2Ref.current = mpu2; }, [mpu2]);

  const [vibrationIntensity, setVibrationIntensityState] = useState(50);
  const vibrationIntensityRef = useRef(50);

  useEffect(() => {
    let cancelled = false;
    getStoredVibrationIntensity().then((v) => {
      if (cancelled || !isMountedRef.current) return;
      vibrationIntensityRef.current = v;
      setVibrationIntensityState(v);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CALIBRATION MEMORY
  // ─────────────────────────────────────────────────────────────────────────

  const clearCalibrationMemoryOnly = useCallback(() => {
    if (!isMountedRef.current) return;
    setNeutralDisplayLockSnapshot(null);
    setNeutralDisplayFrozen(false);
    setTrunkNeutralReference(null);
  }, []);

  const hydrateCalibrationFromStorage = useCallback(async (registeredDeviceId: string | null) => {
    if (!isMountedRef.current) return;
    try {
      const row = await loadCalibrationStore();
      if (!row) { clearCalibrationMemoryOnly(); return; }

      if (row.kind === 'envelope') {
        if (!registeredDeviceId || row.envelope.registeredDeviceId !== registeredDeviceId) {
          clearCalibrationMemoryOnly(); return;
        }
        const snap = row.envelope.snapshot;
        setNeutralDisplayLockSnapshot(snap);
        const { absolute } = getTrunkAngles(snap.mpu1);
        if (absolute && Number.isFinite(absolute.pitch) && Number.isFinite(absolute.roll)) {
          setTrunkNeutralReference({ pitch: absolute.pitch, roll: absolute.roll });
        }
        setNeutralDisplayFrozen(true);
        return;
      }

      // Legacy snapshot
      const snap = row.snapshot;
      setNeutralDisplayLockSnapshot(snap);
      const { absolute } = getTrunkAngles(snap.mpu1);
      if (absolute && Number.isFinite(absolute.pitch) && Number.isFinite(absolute.roll)) {
        setTrunkNeutralReference({ pitch: absolute.pitch, roll: absolute.roll });
      }
      setNeutralDisplayFrozen(true);
    } catch {
      clearCalibrationMemoryOnly();
    }
  }, [clearCalibrationMemoryOnly]);

  // ─────────────────────────────────────────────────────────────────────────
  // PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────

  const requestAndroidBlePermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        return (
          results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]    === PermissionsAndroid.RESULTS.GRANTED &&
          results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SCAN
  // ─────────────────────────────────────────────────────────────────────────

  const stopScan = useCallback(() => {
    try { managerRef.current?.stopDeviceScan(); } catch (error) { console.error('Error stopping scan:', error); }
    setIsScanning(false);
    if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS — BNO, MPU1, MPU2, Battery
  // ─────────────────────────────────────────────────────────────────────────

  const subscribeToCharacteristics = useCallback((connectedDevice: Device) => {
    monitorSubsRef.current.forEach((sub) => sub.remove());
    monitorSubsRef.current = [];
    console.log('[BLE] Subscribing to characteristics...');

    // BNO055
    monitorSubsRef.current.push(connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID, BLE_BNO_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;
        if (error) { if (!isCancelledBleMonitorError(error)) console.error('[BLE] BNO Monitor error:', error); return; }
        if (!characteristic?.value) return;
        try { const p = parseBnoPayload(characteristic.value); if (p) setBno(p); }
        catch (e) { console.error('[BLE] BNO parse error:', e); }
      },
    ));

    // MPU1 (left shoulder)
    monitorSubsRef.current.push(connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID, BLE_MPU1_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;
        if (error) { if (!isCancelledBleMonitorError(error)) console.error('[BLE] MPU1 Monitor error:', error); return; }
        if (!characteristic?.value) return;
        try { const p = parseMpuPayload(characteristic.value); if (p) setMpu1(p); }
        catch (e) { console.error('[BLE] MPU1 parse error:', e); }
      },
    ));

    // MPU2 (right shoulder)
    monitorSubsRef.current.push(connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID, BLE_MPU2_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;
        if (error) { if (!isCancelledBleMonitorError(error)) console.warn('[BLE] MPU2 Monitor error:', error); return; }
        if (!characteristic?.value) return;
        try { const p = parseMpuPayload(characteristic.value); if (p) setMpu2(p); }
        catch (e) { console.error('[BLE] MPU2 parse error:', e); }
      },
    ));

    // Battery — non-fatal if firmware doesn't expose it yet
    monitorSubsRef.current.push(connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID, BLE_BATTERY_CHARACTERISTIC,
      (error, characteristic) => {
        if (!isMountedRef.current) return;
        if (error) {
          if (!isCancelledBleMonitorError(error)) {
            console.warn('[BLE] Battery Monitor error (non-fatal):',
              typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message?: unknown }).message) : String(error));
          }
          return;
        }
        if (!characteristic?.value) return;
        try {
          const level = parseBatteryLevel(characteristic.value);
          if (level !== null) setBatteryLevel(level);
        } catch (e) { console.warn('[BLE] Battery parse error:', e); }
      },
    ));

    console.log('[BLE] Subscribed to all characteristics (BNO, MPU1, MPU2, Battery)');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECT / DISCONNECT
  // ─────────────────────────────────────────────────────────────────────────

  const startScan = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (isExpoGo) { setErrorMsg('Bluetooth not available in Expo Go. Use a dev build.'); setIsScanning(false); return; }
    setErrorMsg(null); setDevices([]); setIsScanning(true);

    const hasPerms = await requestAndroidBlePermissions();
    if (!hasPerms) {
      if (isMountedRef.current) { setErrorMsg('Bluetooth permissions were denied'); setIsScanning(false); }
      return;
    }
    const manager = managerRef.current;
    if (!manager) {
      if (isMountedRef.current) { setErrorMsg('BLE manager not initialized'); setIsScanning(false); }
      return;
    }
    stateListenerRef.current = manager.onStateChange((state) => {
      if (state === State.PoweredOff) { if (isMountedRef.current) setErrorMsg('Bluetooth is off.'); stopScan(); return; }
      if (state !== State.PoweredOn) return;
      try {
        manager.startDeviceScan(null, { allowDuplicates: false }, (err, scannedDevice) => {
          if (err) { console.error('Scan error:', err); if (isMountedRef.current) setErrorMsg(err.message); stopScan(); return; }
          if (!scannedDevice || !isMountedRef.current) return;
          const name = scannedDevice.name || scannedDevice.localName || '';
          if (!name.includes('PostureMonitor')) return;
          setDevices((prev) => prev.some((d) => d.id === scannedDevice.id) ? prev : [...prev, scannedDevice]);
        });
        scanTimeoutRef.current = setTimeout(() => stopScan(), SCAN_SECONDS * 1000);
        stateListenerRef.current?.remove();
        stateListenerRef.current = null;
      } catch (error) {
        console.error('Error starting scan:', error);
        if (isMountedRef.current) { setErrorMsg('Failed to start scan'); setIsScanning(false); }
      }
    }, true);
  }, [requestAndroidBlePermissions, stopScan]);

  const connectDevice = useCallback(async (targetDevice: Device) => {
    if (!isMountedRef.current) return;
    setErrorMsg(null); setIsConnecting(true); stopScan();
    try {
      console.log(`[BLE] Connecting to ${targetDevice.name || targetDevice.id}...`);
      const connected    = await targetDevice.connect();
      const withServices = await connected.discoverAllServicesAndCharacteristics();
      if (isMountedRef.current) {
        setDevice(withServices); setIsConnected(true); setIsConnecting(false);
        console.log('[BLE] === DEVICE CONNECTED ===');
        subscribeToCharacteristics(withServices);
      }
    } catch (error: any) {
      console.error('[BLE] Connection error:', error);
      if (isMountedRef.current) {
        setErrorMsg(error.message || 'Failed to connect');
        setDevice(null); setIsConnected(false); setIsConnecting(false);
      }
    }
  }, [stopScan, subscribeToCharacteristics]);

  const disconnectDevice = useCallback(async () => {
    if (!isMountedRef.current) return;
    setErrorMsg(null);
    const dev      = deviceRef.current;
    const deviceId = dev?.id ?? null;
    try {
      for (const sub of monitorSubsRef.current) { try { sub.remove(); } catch { /* ignore */ } }
      monitorSubsRef.current = [];
      if (dev) {
        try { await dev.cancelConnection(); }
        catch (error: unknown) {
          const msg = error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message) : '';
          if (!isBenignBleDisconnectMessage(msg) && managerRef.current && deviceId) {
            try { await managerRef.current.cancelDeviceConnection(deviceId); }
            catch (e2: unknown) {
              const msg2 = e2 && typeof e2 === 'object' && 'message' in e2
                ? String((e2 as { message?: unknown }).message) : '';
              if (!isBenignBleDisconnectMessage(msg2)) console.error('[BLE] Disconnect error:', e2);
            }
          }
        }
      }
    } catch (error: unknown) { console.error('[BLE] Disconnect error:', error); }
    finally {
      if (isMountedRef.current) {
        setNeutralDisplayLockSnapshot(null); setNeutralDisplayFrozen(false); setTrunkNeutralReference(null);
        setDevice(null); setIsConnected(false); setIsConnecting(false);
        setBno(null); setMpu1(null); setMpu2(null);
        setBatteryLevel(null);
      }
    }
  }, []);

  const clearError = useCallback(() => { setErrorMsg(null); }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // BLE WRITES
  // ─────────────────────────────────────────────────────────────────────────

  const writeCommandByte = useCallback(async (label: string, commandByte: number): Promise<void> => {
    if (!isMountedRef.current) return;
    if (!device) throw new Error('No device connected');
    try {
      await device.writeCharacteristicWithResponseForService(BLE_SERVICE_UUID, BLE_CALIBRATION_CHARACTERISTIC, byteToBase64(commandByte));
      if (isMountedRef.current) { console.log(`[BLE] ${label} sent (byte=${commandByte})`); setErrorMsg(null); }
    } catch (error: any) {
      console.error(`[BLE] ${label} write error:`, error);
      if (isMountedRef.current) setErrorMsg(error.message || `Failed to send ${label}`);
      throw error;
    }
  }, [device]);

  const calibrateBno  = useCallback(() => writeCommandByte('BNO calibration',  CMD_CALIBRATE_BNO),  [writeCommandByte]);
  const calibrateMpu1 = useCallback(() => writeCommandByte('MPU1 calibration', CMD_CALIBRATE_MPU1), [writeCommandByte]);
  const calibrateMpu2 = useCallback(() => writeCommandByte('MPU2 calibration', CMD_CALIBRATE_MPU2), [writeCommandByte]);

  const setVibrationIntensity = useCallback(async (percent: number) => {
    const v = Math.max(0, Math.min(100, Math.round(percent)));
    vibrationIntensityRef.current = v; setVibrationIntensityState(v);
    try { await setStoredVibrationIntensity(v); } catch (e) { console.warn('[BLE] Failed to persist vibration intensity:', e); }
  }, []);

  const triggerVibration = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (!device) throw new Error('No device connected');
    const pct     = Math.max(0, Math.min(100, Math.round(vibrationIntensityRef.current)));
    const payload = bytesToBase64([CMD_TRIGGER_VIBRATION, pct]);
    try {
      await device.writeCharacteristicWithResponseForService(BLE_SERVICE_UUID, BLE_CALIBRATION_CHARACTERISTIC, payload);
      if (isMountedRef.current) { console.log(`[BLE] Vibration sent (pct=${pct})`); setErrorMsg(null); }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send vibration';
      console.error('[BLE] Vibration write error:', error);
      if (isMountedRef.current) setErrorMsg(msg);
      throw error instanceof Error ? error : new Error(msg);
    }
  }, [device]);

  // ─────────────────────────────────────────────────────────────────────────
  // CALIBRATION
  // ─────────────────────────────────────────────────────────────────────────

  const handleSetTrunkNeutralReference = useCallback((neutral: TrunkNeutralReference) => {
    if (!isMountedRef.current) return;
    setTrunkNeutralReference(neutral);
  }, []);

  const clearNeutralDisplayLock = useCallback(() => {
    if (!isMountedRef.current) return;
    setNeutralDisplayFrozen(false);
  }, []);

  /**
   * Sends firmware zero commands BNO→MPU1→MPU2, then captures ACTUAL live
   * sensor readings after zeroing as the calibration reference.
   *
   * WHY real values instead of a hardcoded table:
   *   After firmware zeroing, BNO reports ~(0,0,0). If we sent ref_pitch=5
   *   (hardcoded "perfect" value) but live pitch is ~0, every reading at
   *   good posture gives delta = wrap(0 - 5) = -5° = extension = RULA score 4.
   *
   *   Using real post-zero values: ref_pitch≈0, live at good posture≈0,
   *   delta=0 → RULA score 1. Slouch 20° → delta=20° → RULA score 2. Correct.
   */
  const calibrateAllNeutral = useCallback(async (): Promise<CalibrationNeutralSnapshot> => {
    if (!isMountedRef.current) throw new Error('Not ready');
    if (!device) throw new Error('No device connected');

    // 1. Send firmware zero commands
    await calibrateBno();
    await new Promise<void>((r) => setTimeout(r, 450));
    await calibrateMpu1();
    await new Promise<void>((r) => setTimeout(r, 450));
    await calibrateMpu2();
    await new Promise<void>((r) => setTimeout(r, 550));

    // 2. Wait for fresh sensor readings post-zeroing (up to 4 seconds)
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      await new Promise<void>((r) => setTimeout(r, 100));
      const b  = bnoRef.current;
      const m1 = mpu1Ref.current;
      const m2 = mpu2Ref.current;
      if (!b || !m1 || !m2) continue;

      // Use ACTUAL live post-zero values — not a hardcoded ideal table.
      // After firmware zeroing: b.heading≈0, b.roll≈0, b.pitch≈0
      // These become the server reference so all future deltas are relative to this.
      const snap: CalibrationNeutralSnapshot = {
        bno:  { ...b },
        mpu1: { ...m1 },
        mpu2: { ...m2 },
        capturedAt: Date.now(),
      };

      const { absolute } = getTrunkAngles(snap.mpu1);
      if (absolute && Number.isFinite(absolute.pitch) && Number.isFinite(absolute.roll)) {
        handleSetTrunkNeutralReference({ pitch: absolute.pitch, roll: absolute.roll });
      }

      if (!isMountedRef.current) throw new Error('Not ready');
      setNeutralDisplayLockSnapshot(snap);
      setNeutralDisplayFrozen(true);
      return snap;
    }

    throw new Error('Sensors did not report data — stay still in neutral and try again.');
  }, [device, calibrateBno, calibrateMpu1, calibrateMpu2, handleSetTrunkNeutralReference]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────

  /** Always the live BLE samples — send this to `/posture/evaluate` and `/readings` as-is; the server applies calibration. */
  const livePacket = useMemo<RawSensorPacket | null>(() => {
    if (!bno || !mpu1 || !mpu2) return null;
    return {
      bno:  { heading: bno.heading, roll: bno.roll, pitch: bno.pitch },
      mpu1: { Ax: mpu1.ax, Ay: mpu1.ay, Az: mpu1.az, Gx: mpu1.gx, Gy: mpu1.gy, Gz: mpu1.gz },
      mpu2: { Ax: mpu2.ax, Ay: mpu2.ay, Az: mpu2.az, Gx: mpu2.gx, Gy: mpu2.gy, Gz: mpu2.gz },
    };
  }, [bno, mpu1, mpu2]);

  const displayBno = useMemo(() => {
    if (!isConnected) return null;
    if (neutralDisplayFrozen && neutralDisplayLockSnapshot) return neutralDisplayLockSnapshot.bno;
    return bno;
  }, [isConnected, neutralDisplayFrozen, neutralDisplayLockSnapshot, bno]);

  const displayMpu1 = useMemo(() => {
    if (!isConnected) return null;
    if (neutralDisplayFrozen && neutralDisplayLockSnapshot) return neutralDisplayLockSnapshot.mpu1;
    return mpu1;
  }, [isConnected, neutralDisplayFrozen, neutralDisplayLockSnapshot, mpu1]);

  const displayMpu2 = useMemo(() => {
    if (!isConnected) return null;
    if (neutralDisplayFrozen && neutralDisplayLockSnapshot) return neutralDisplayLockSnapshot.mpu2;
    return mpu2;
  }, [isConnected, neutralDisplayFrozen, neutralDisplayLockSnapshot, mpu2]);

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isExpoGo) { setErrorMsg('Bluetooth not available in Expo Go. Use a dev build.'); return; }
    managerRef.current = new BleManager();
    return () => {
      isMountedRef.current = false;
      stopScan();
      monitorSubsRef.current.forEach((sub) => sub.remove());
      stateListenerRef.current?.remove();
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      if (state === 'background' && isScanning) stopScan();
    });
    return () => { subscription.remove(); };
  }, [isScanning, stopScan]);

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────

  const value: BLEContextType = {
    device, devices, bno, mpu1, mpu2,
    neutralDisplayFrozen, neutralDisplayLockSnapshot,
    displayBno, displayMpu1, displayMpu2,
    isScanning, isConnecting, errorMsg, isConnected,
    livePacket,
    trunkNeutralReference,
    setTrunkNeutralReference: handleSetTrunkNeutralReference,
    vibrationIntensity, setVibrationIntensity,
    batteryLevel,
    startScan, stopScan, connectDevice, disconnectDevice,
    calibrateBno, calibrateMpu1, calibrateMpu2,
    calibrateAllNeutral,
    hydrateCalibrationFromStorage,
    clearCalibrationMemoryOnly,
    clearNeutralDisplayLock,
    triggerVibration,
    clearError,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};