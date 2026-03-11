import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
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
import { BleManager, Device, State, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const SCAN_SECONDS = 6;
const NAME_FILTER = ''; // leave empty for debugging

global.Buffer = global.Buffer || Buffer;

// Match your Arduino code
const SERVICE_UUID = '180A';
const CHARACTERISTIC_UUID = '2A57';

const ConnectScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const managerRef = useRef<BleManager | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorSubRef = useRef<Subscription | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bleText, setBleText] = useState<string>('No data yet');

  const getDisplayName = (d: Device) => d.name || d.localName || 'N/A';

  const matchesFilter = (d: Device) => {
    if (!NAME_FILTER) return true;
    return getDisplayName(d).toUpperCase().includes(NAME_FILTER.toUpperCase());
  };

  const stopScan = () => {
    try {
      console.log('STOPPING SCAN');
      managerRef.current?.stopDeviceScan();
    } catch {}

    setIsScanning(false);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const requestAndroidBlePermissions = async () => {
    if (Platform.OS !== 'android') return true;

    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    return fine === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startScan = async () => {
    setErrorMsg(null);
    setDevices([]);
    setIsScanning(true);

    const hasPerms = await requestAndroidBlePermissions();
    if (!hasPerms) {
      setErrorMsg('Bluetooth permissions were denied');
      setIsScanning(false);
      return;
    }

    const manager = managerRef.current;
    if (!manager) {
      setErrorMsg('BLE manager not available');
      setIsScanning(false);
      return;
    }

    const sub = manager.onStateChange((state) => {
      console.log('BLE state:', state);

      if (state === State.PoweredOff) {
        setErrorMsg('Bluetooth is off. Turn it on and try again.');
        setIsScanning(false);
        return;
      }

      if (state !== State.PoweredOn) return;

      console.log('BLE scan starting');

      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (err, device) => {
          if (err) {
            console.log('SCAN ERROR:', err);
            setErrorMsg(err.message || 'Scan error');
            stopScan();
            return;
          }

          if (!device) return;

          console.log('FOUND DEVICE', {
            id: device.id,
            name: device.name,
            localName: device.localName,
          });

          if (!matchesFilter(device)) return;

          setDevices((prev) => {
            if (prev.some((p) => p.id === device.id)) return prev;
            return [...prev, device];
          });
        },
      );

      scanTimeoutRef.current = setTimeout(() => {
        stopScan();
      }, SCAN_SECONDS * 1000);

      sub.remove();
    }, true);
  };

  const subscribeToArduino = (device: Device) => {
    monitorSubRef.current?.remove();

    monitorSubRef.current = device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.log('MONITOR ERROR:', error);
          setErrorMsg(error.message || 'Monitor error');
          return;
        }

        if (!characteristic?.value) return;

        try {
          const decoded = Buffer.from(characteristic.value, 'base64').toString(
            'utf8',
          );

          console.log('BLE DATA:', decoded);
          setBleText(decoded);
        } catch (e) {
          console.log('DECODE ERROR:', e);
          setErrorMsg('Failed to decode BLE payload');
        }
      },
    );
  };

  const connectDevice = async (device: Device) => {
    setErrorMsg(null);

    // Stop scanning immediately when a device is selected
    stopScan();

    try {
      console.log('CONNECTING TO:', device.id, getDisplayName(device));

      const connected = await device.connect();
      console.log('CONNECTED:', connected.id);

      const ready = await connected.discoverAllServicesAndCharacteristics();
      console.log('DISCOVERED SERVICES/CHARACTERISTICS');

      setConnectedDevice(ready);
      subscribeToArduino(ready);
    } catch (e: any) {
      console.log('CONNECT ERROR:', e);
      setErrorMsg(e?.message || 'Failed to connect');
      setConnectedDevice(null);
    }
  };

  const disconnectDevice = async () => {
    setErrorMsg(null);

    try {
      monitorSubRef.current?.remove();
      monitorSubRef.current = null;

      if (connectedDevice) {
        await connectedDevice.cancelConnection();
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to disconnect');
    } finally {
      setConnectedDevice(null);
      setBleText('No data yet');
    }
  };

  useEffect(() => {
    managerRef.current = new BleManager();
    startScan();

    return () => {
      stopScan();
      monitorSubRef.current?.remove();
      monitorSubRef.current = null;
      managerRef.current?.destroy();
      managerRef.current = null;
    };
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
                <ThemedText variant='body' style={styles.detailValue}>
                  {connectedDevice.id}
                </ThemedText>
              </View>

              <View style={styles.detailRow}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Live BLE Data
                </ThemedText>
                <ThemedText variant='body' style={styles.detailValue}>
                  {bleText}
                </ThemedText>
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

            {!isScanning && !connectedDevice && (
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
                Make sure your Nano is powered on, nearby, and advertising over
                BLE.
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
            Ensure your Arduino is nearby and Bluetooth is enabled
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
  scanningSection: {
    alignItems: 'center',
    marginVertical: 48,
  },
  scanningIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scanningText: {
    textAlign: 'center',
  },
  devicesSection: {
    marginTop: 24,
  },
  noDevicesCard: {
    alignItems: 'center',
    marginTop: 24,
  },
  noDevicesIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noDevicesTitle: {
    marginBottom: 8,
  },
  noDevicesText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    alignSelf: 'center',
  },
  hint: {
    textAlign: 'center',
    marginTop: 32,
  },
  connectedCard: {
    marginTop: 24,
  },
  connectedHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bluetoothIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deviceName: {
    textAlign: 'center',
    marginBottom: 24,
  },
  deviceDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  disconnectButton: {
    marginTop: 8,
  },
});

export default ConnectScreen;
