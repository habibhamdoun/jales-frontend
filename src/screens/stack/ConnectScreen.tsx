import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { DeviceRow } from '@/src/components/DeviceRow';
import { useTheme } from '@/src/theme/useTheme';
import {
  Bluetooth,
  BluetoothOff,
  ChevronLeft,
  Shirt,
} from 'lucide-react-native';

import { BleManager, Device, State } from 'react-native-ble-plx';

const SCAN_SECONDS = 6;

// Optional: if you know your Arduino advertised name, filter it here.
// Leave empty string to show ALL nearby devices.
const NAME_FILTER: string = ''; // e.g. 'NANO33BLE' or 'NANO33BLE_TEST'

const ConnectScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const managerRef = useRef<BleManager | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getDisplayName = (d: Device) => d.name || d.localName || 'N/A';

  const matchesFilter = (d: Device) => {
    if (!NAME_FILTER) return true;
    return getDisplayName(d).toUpperCase().includes(NAME_FILTER.toUpperCase());
  };

  const stopScan = () => {
    try {
      managerRef.current?.stopDeviceScan();
    } catch {}
    setIsScanning(false);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const startScan = async () => {
    setErrorMsg(null);
    setDevices([]);
    setIsScanning(true);

    const manager = managerRef.current;
    if (!manager) return;

    // Wait for BLE PoweredOn (important on iOS/Android)
    const sub = manager.onStateChange((state) => {
      if (state !== State.PoweredOn) return;

      // Start scan
      manager.startDeviceScan(
        null, // better: [SERVICE_UUID] if you advertise one
        { allowDuplicates: false },
        (err, device) => {
          if (err) {
            setErrorMsg(err.message || 'Scan error');
            stopScan();
            return;
          }
          if (!device) return;
          if (!matchesFilter(device)) return;

          setDevices((prev) => {
            if (prev.some((p) => p.id === device.id)) return prev;
            return [...prev, device];
          });
        },
      );

      // Auto stop
      scanTimeoutRef.current = setTimeout(
        () => stopScan(),
        SCAN_SECONDS * 1000,
      );

      sub.remove();
    }, true);
  };

  const connectDevice = async (device: Device) => {
    setErrorMsg(null);
    stopScan();

    try {
      // Connect + discover
      const connected = await device.connect();
      const ready = await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(ready);

      // (Optional) If you want: read RSSI after connect
      // await ready.readRSSI();

      // Go back after a moment (like your original)
      setTimeout(() => navigation.goBack(), 800);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to connect');
      setConnectedDevice(null);
    }
  };

  const disconnectDevice = async () => {
    setErrorMsg(null);
    try {
      if (connectedDevice) {
        await connectedDevice.cancelConnection();
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to disconnect');
    } finally {
      setConnectedDevice(null);
    }
  };

  useEffect(() => {
    managerRef.current = new BleManager();

    // Start scanning on load
    startScan();

    return () => {
      stopScan();
      managerRef.current?.destroy();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <ChevronLeft
          color={theme.text}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <ThemedText variant='subtitle'>Connect to JALES Shirt</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {errorMsg ? (
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={{ marginBottom: 12 }}
        >
          {errorMsg}
        </ThemedText>
      ) : null}

      {connectedDevice ? (
        <View>
          <ThemedCard style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <View
                style={[
                  styles.bluetoothIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Bluetooth color={theme.primary} size={24} />
              </View>
              <ThemedText variant='subtitle'>Connected</ThemedText>
            </View>

            <ThemedText
              variant='body'
              color={theme.mutedText}
              style={styles.deviceName}
            >
              {getDisplayName(connectedDevice)}
            </ThemedText>

            <View style={styles.deviceDetails}>
              <View style={styles.detailRow}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  ID
                </ThemedText>
                <ThemedText variant='body'>{connectedDevice.id}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Platform
                </ThemedText>
                <ThemedText variant='body'>{Platform.OS}</ThemedText>
              </View>
            </View>

            <ThemedButton
              title='Disconnect'
              variant='outline'
              size='lg'
              onPress={disconnectDevice}
              style={styles.disconnectButton}
            />
          </ThemedCard>
        </View>
      ) : (
        <View>
          <View style={styles.scanningSection}>
            <View
              style={[
                styles.scanningIcon,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              {isScanning ? (
                <ActivityIndicator color={theme.primary} size='large' />
              ) : (
                <Bluetooth color={theme.primary} size={32} />
              )}
            </View>
            <ThemedText variant='subtitle' style={styles.scanningText}>
              {isScanning ? 'Scanning for BLE devices...' : 'Ready to scan'}
            </ThemedText>
            {!isScanning && (
              <ThemedButton
                title='Scan'
                variant='secondary'
                size='md'
                onPress={startScan}
                style={{ marginTop: 16 }}
              />
            )}
          </View>

          {devices.length > 0 && (
            <View style={styles.devicesSection}>
              {devices.map((d) => (
                <DeviceRow
                  key={d.id}
                  name={getDisplayName(d)}
                  subtitle={d.id}
                  icon={<Shirt color={theme.primary} size={24} />}
                  onPress={() => connectDevice(d)}
                  actionLabel='Connect'
                />
              ))}
            </View>
          )}

          {!isScanning && devices.length === 0 && (
            <ThemedCard style={styles.noDevicesCard}>
              <View
                style={[
                  styles.noDevicesIcon,
                  { backgroundColor: theme.border },
                ]}
              >
                <BluetoothOff color={theme.mutedText} size={32} />
              </View>
              <ThemedText variant='subtitle' style={styles.noDevicesTitle}>
                No devices found
              </ThemedText>
              <ThemedText
                variant='body'
                color={theme.mutedText}
                style={styles.noDevicesText}
              >
                Make sure your device is powered on and advertising BLE.
              </ThemedText>
              <ThemedButton
                title='Retry Scan'
                variant='secondary'
                size='md'
                onPress={startScan}
                style={styles.retryButton}
              />
            </ThemedCard>
          )}

          <ThemedText
            variant='caption'
            color={theme.mutedText}
            style={styles.hint}
          >
            Ensure your device is powered on and nearby
          </ThemedText>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  scanningSection: { alignItems: 'center', marginVertical: 48 },
  scanningIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scanningText: { textAlign: 'center' },
  devicesSection: { marginTop: 24 },
  noDevicesCard: { alignItems: 'center', marginTop: 24 },
  noDevicesIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noDevicesTitle: { marginBottom: 8 },
  noDevicesText: { textAlign: 'center', marginBottom: 24 },
  retryButton: { alignSelf: 'center' },
  hint: { textAlign: 'center', marginTop: 32 },
  connectedCard: { marginTop: 24 },
  connectedHeader: { alignItems: 'center', marginBottom: 16 },
  bluetoothIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deviceName: { textAlign: 'center', marginBottom: 24 },
  deviceDetails: { marginBottom: 24 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  disconnectButton: { marginTop: 8 },
});

export default ConnectScreen;
