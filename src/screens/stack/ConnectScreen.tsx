import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
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

const ConnectScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Static device scanning and connection state for testing
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null as any);
  const [devices, setDevices] = useState([
    { id: '1', name: 'JALES Shirt #1', model: 'JALES Pro' },
    { id: '2', name: 'JALES Shirt #2', model: 'JALES Standard' },
  ]);

  // Static startScan function for testing
  const startScan = () => {
    setIsScanning(true);
    console.log('Mock scanning started');
    setTimeout(() => {
      setIsScanning(false);
    }, 3000);
  };

  // Static connectDevice function for testing
  const connectDevice = (device: any) => {
    setConnectedDevice({
      ...device,
      battery: 85,
      lastSync: 'now',
    });
    console.log('Mock device connected:', device);
  };

  // Static disconnectDevice function for testing
  const disconnectDevice = () => {
    setConnectedDevice(null);
    console.log('Mock device disconnected');
  };

  useEffect(() => {
    startScan();
  }, []);

  const handleConnect = (device: any) => {
    connectDevice(device);
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const handleDisconnect = () => {
    disconnectDevice();
  };

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
              {connectedDevice.name}
            </ThemedText>
            <View style={styles.deviceDetails}>
              <View style={styles.detailRow}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Model
                </ThemedText>
                <ThemedText variant='body'>{connectedDevice.model}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Battery
                </ThemedText>
                <ThemedText variant='body'>
                  {connectedDevice.battery}%
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText variant='caption' color={theme.mutedText}>
                  Last Sync
                </ThemedText>
                <ThemedText variant='body'>
                  {connectedDevice.lastSync}
                </ThemedText>
              </View>
            </View>
            <ThemedButton
              title='Disconnect'
              variant='outline'
              size='lg'
              onPress={handleDisconnect}
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
              {isScanning ? 'Scanning for devices...' : 'Ready to scan'}
            </ThemedText>
          </View>

          {devices.length > 0 && (
            <View style={styles.devicesSection}>
              {devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  name={device.name}
                  subtitle='Nearby device'
                  icon={<Shirt color={theme.primary} size={24} />}
                  onPress={() => handleConnect(device)}
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
                Make sure your JALES Shirt is turned on and nearby.
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
            Ensure your shirt is powered on
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  disconnectButton: {
    marginTop: 8,
  },
});

export default ConnectScreen;
