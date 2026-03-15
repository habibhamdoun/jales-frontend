import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
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
  X,
} from 'lucide-react-native';
import { useBle } from '@/src/hooks/useBle';

const ConnectScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    device,
    devices,
    bno,
    mpu1,
    isScanning,
    isConnecting,
    errorMsg,
    isConnected,
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
    clearError,
  } = useBle();

  const handleConnect = (dev: any) => {
    connectDevice(dev);
  };

  const handleDisconnect = async () => {
    await disconnectDevice();
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <ThemedText variant='subtitle'>Connect to JALES Shirt</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {errorMsg && (
        <ThemedCard
          style={[styles.errorCard, { borderLeftColor: theme.primary }]}
        >
          <View style={styles.errorContent}>
            <View style={{ flex: 1 }}>
              <ThemedText variant='caption' color={theme.primary}>
                {errorMsg}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={clearError}>
              <X color={theme.primary} size={18} />
            </TouchableOpacity>
          </View>
        </ThemedCard>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {isConnecting ? (
          <View style={styles.connectingContainer}>
            <ThemedCard style={styles.connectingCard}>
              <View style={styles.connectingHeader}>
                <View
                  style={[
                    styles.connectingIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <ActivityIndicator color={theme.primary} size='large' />
                </View>
                <ThemedText variant='subtitle' style={styles.connectingText}>
                  Connecting...
                </ThemedText>
                <ThemedText
                  variant='caption'
                  color={theme.mutedText}
                  style={styles.connectingSubtext}
                >
                  Please wait while we establish connection
                </ThemedText>
              </View>
            </ThemedCard>
          </View>
        ) : isConnected && device ? (
          <View style={styles.connectedContainer}>
            <ThemedCard style={styles.connectedCard}>
              <View style={styles.connectedHeader}>
                <View
                  style={[
                    styles.bluetoothIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <Bluetooth color={theme.primary} size={28} />
                </View>
                <ThemedText variant='subtitle'>Connected</ThemedText>
              </View>

              <ThemedText
                variant='body'
                color={theme.mutedText}
                style={styles.deviceName}
              >
                {device.name || device.localName || 'Unknown Device'}
              </ThemedText>

              <View style={styles.deviceDetails}>
                <View style={styles.detailRow}>
                  <ThemedText variant='caption' color={theme.mutedText}>
                    Device ID
                  </ThemedText>
                  <ThemedText
                    variant='caption'
                    style={styles.detailValue}
                    numberOfLines={1}
                  >
                    {device.id}
                  </ThemedText>
                </View>

                {bno ? (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Heading
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {bno.heading.toFixed(2)}°
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Pitch
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {bno.pitch.toFixed(2)}°
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Roll
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {bno.roll.toFixed(2)}°
                      </ThemedText>
                    </View>
                  </>
                ) : (
                  <View style={styles.detailRow}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Status
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.detailValue}>
                      Waiting for data...
                    </ThemedText>
                  </View>
                )}

                {mpu1 && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Accel X
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {mpu1.ax.toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Accel Y
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {mpu1.ay.toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Accel Z
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {mpu1.az.toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Gyro X
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {mpu1.gx.toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Gyro Y
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {mpu1.gy.toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText variant='caption' color={theme.mutedText}>
                        Gyro Z
                      </ThemedText>
                      <ThemedText variant='caption' style={styles.detailValue}>
                        {mpu1.gz.toFixed(1)}
                      </ThemedText>
                    </View>
                  </>
                )}
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
          <View style={styles.scanContainer}>
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
                  <Bluetooth color={theme.primary} size={36} />
                )}
              </View>

              <ThemedText variant='subtitle' style={styles.scanningText}>
                {isScanning ? 'Scanning for devices...' : 'Ready to scan'}
              </ThemedText>

              {!isScanning && !isConnected && devices.length === 0 && (
                <ThemedButton
                  title='Start Scan'
                  variant='primary'
                  size='md'
                  onPress={startScan}
                  style={{ marginTop: 24 }}
                />
              )}
            </View>

            {devices.length > 0 && !isScanning && (
              <View style={styles.devicesSection}>
                <ThemedText
                  variant='label'
                  color={theme.mutedText}
                  style={styles.devicesTitle}
                >
                  Found Devices ({devices.length})
                </ThemedText>

                {devices.map((d) => (
                  <DeviceRow
                    key={d.id}
                    name={d.name || d.localName || 'Unknown Device'}
                    subtitle={d.id}
                    icon={<Shirt color={theme.primary} size={24} />}
                    onPress={() => handleConnect(d)}
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
                  <BluetoothOff color={theme.mutedText} size={36} />
                </View>

                <ThemedText variant='subtitle' style={styles.noDevicesTitle}>
                  No devices found
                </ThemedText>

                <ThemedText
                  variant='body'
                  color={theme.mutedText}
                  style={styles.noDevicesText}
                >
                  Make sure your Arduino is powered on, nearby, and advertising
                  over BLE.
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
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255, 0, 0, 0.03)',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  connectedContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  connectingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  connectingCard: {
    paddingVertical: 32,
  },
  connectingHeader: {
    alignItems: 'center',
  },
  connectingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  connectingText: {
    marginBottom: 8,
  },
  connectingSubtext: {
    textAlign: 'center',
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
    marginBottom: 8,
  },
  devicesSection: {
    marginTop: 32,
  },
  devicesTitle: {
    marginBottom: 12,
  },
  noDevicesCard: {
    alignItems: 'center',
    marginTop: 48,
    paddingVertical: 32,
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
    marginHorizontal: 16,
  },
  retryButton: {
    alignSelf: 'center',
  },
  connectedCard: {
    paddingVertical: 24,
  },
  connectedHeader: {
    alignItems: 'center',
    marginBottom: 20,
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    paddingHorizontal: 0,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 8,
  },
  disconnectButton: {
    marginTop: 16,
  },
  spacer: {
    height: 32,
  },
});

export default ConnectScreen;
