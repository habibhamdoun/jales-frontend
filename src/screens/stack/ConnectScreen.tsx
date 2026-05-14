import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Device } from 'react-native-ble-plx';
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { DeviceRow } from '@/src/components/DeviceRow';
import { useTheme } from '@/src/theme/useTheme';
import {
  AlertCircle,
  Bluetooth,
  CheckCircle2,
  ChevronLeft,
  Radio,
  Shirt,
  X,
} from 'lucide-react-native';
import { useBle } from '@/src/hooks/useBle';
import { useMonitoring } from '@/src/monitoring/MonitoringContext';

const ConnectScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const {
    device,
    devices,
    bno,
    mpu1,
    mpu2,
    isScanning,
    isConnecting,
    errorMsg,
    isConnected,
    startScan,
    connectDevice,
    disconnectDevice,
    clearError,
  } = useBle();

  const { isActive, stopMonitoring } = useMonitoring();

  const handleConnect = (dev: Device) => {
    connectDevice(dev);
  };

  const handleDisconnect = async () => {
    if (isActive) {
      await stopMonitoring().catch(() => {});
    }
    await disconnectDevice();
  };

  const handleBackToProfile = () => {
    navigation.navigate('ProfileMain');
  };

  return (
    <Screen scrollable={false}>
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          onPress={handleBackToProfile}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <ThemedText variant='subtitle' style={styles.headerTitle}>
            Connect shirt
          </ThemedText>
          <ThemedText variant='caption' color={theme.mutedText}>
            Bluetooth · PostureMonitor
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {errorMsg ? (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: `${theme.danger}10`,
              borderColor: `${theme.danger}33`,
            },
          ]}
        >
          <AlertCircle
            color={theme.danger}
            size={20}
            strokeWidth={2.4}
          />
          <ThemedText
            variant='caption'
            style={[styles.errorBannerText, { color: theme.danger }]}
          >
            {errorMsg}
          </ThemedText>
          <TouchableOpacity
            onPress={clearError}
            hitSlop={12}
            accessibilityLabel='Dismiss error'
          >
            <X color={theme.danger} size={20} />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isConnecting ? (
          <View style={styles.stateCenter}>
            <ThemedCard
              style={[
                styles.elevatedCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.connectingRing,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <ActivityIndicator color={theme.primary} size='large' />
              </View>
              <ThemedText
                variant='subtitle'
                style={styles.stateTitle}
                color={theme.text}
              >
                Connecting…
              </ThemedText>
              <ThemedText
                variant='caption'
                color={theme.mutedText}
                style={styles.stateSub}
              >
                Pairing with your shirt. Keep it close and powered on.
              </ThemedText>
            </ThemedCard>
          </View>
        ) : isConnected && device ? (
          <View style={styles.connectedWrap}>
            <ThemedCard
              style={[
                styles.elevatedCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.successPill,
                  { backgroundColor: `${theme.success}18` },
                ]}
              >
                <CheckCircle2
                  color={theme.success}
                  size={18}
                  strokeWidth={2.5}
                />
                <ThemedText
                  variant='caption'
                  style={[styles.successPillText, { color: theme.success }]}
                >
                  Connected
                </ThemedText>
              </View>

              <View
                style={[
                  styles.connectedIconWrap,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Bluetooth color={theme.primary} size={32} strokeWidth={2.2} />
              </View>

              <ThemedText
                variant='subtitle'
                style={styles.deviceTitle}
                color={theme.text}
              >
                {device.name || device.localName || 'JALES Shirt'}
              </ThemedText>
              <ThemedText
                variant='caption'
                color={theme.mutedText}
                style={styles.deviceId}
                numberOfLines={1}
              >
                {device.id}
              </ThemedText>

              <View
                style={[
                  styles.telemetryPanel,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <View style={styles.telemetryHeader}>
                  <Radio
                    color={theme.primary}
                    size={16}
                    strokeWidth={2.4}
                  />
                  <ThemedText
                    variant='caption'
                    style={[styles.telemetryLabel, { color: theme.primary }]}
                  >
                    Live sensor preview
                  </ThemedText>
                </View>

                {bno ? (
                  <View style={styles.bnoGrid}>
                    {(
                      [
                        ['Heading', `${bno.heading.toFixed(1)}°`],
                        ['Pitch', `${bno.pitch.toFixed(1)}°`],
                        ['Roll', `${bno.roll.toFixed(1)}°`],
                      ] as const
                    ).map(([k, v]) => (
                      <View key={k} style={styles.metricCell}>
                        <ThemedText variant='caption' color={theme.mutedText}>
                          {k}
                        </ThemedText>
                        <ThemedText
                          variant='label'
                          style={styles.metricValue}
                          color={theme.text}
                        >
                          {v}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.waitingRow}>
                    <ActivityIndicator size='small' color={theme.primary} />
                    <ThemedText variant='caption' color={theme.mutedText}>
                      Waiting for BNO stream…
                    </ThemedText>
                  </View>
                )}

                {mpu1 ? (
                  <View style={styles.mpuBlock}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      MPU1 accel
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.mpuLine} color={theme.text}>
                      X {mpu1.ax.toFixed(0)} · Y {mpu1.ay.toFixed(0)} · Z{' '}
                      {mpu1.az.toFixed(0)}
                    </ThemedText>
                  </View>
                ) : null}

                {mpu2 ? (
                  <View style={styles.mpuBlock}>
                    <ThemedText variant='caption' color={theme.mutedText}>
                      MPU2 accel
                    </ThemedText>
                    <ThemedText variant='caption' style={styles.mpuLine} color={theme.text}>
                      X {mpu2.ax.toFixed(0)} · Y {mpu2.ay.toFixed(0)} · Z{' '}
                      {mpu2.az.toFixed(0)}
                    </ThemedText>
                  </View>
                ) : null}
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
          <View style={styles.scanFlow}>
            <ThemedCard
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.scanHeroIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                {isScanning ? (
                  <ActivityIndicator color={theme.primary} size='large' />
                ) : (
                  <Bluetooth color={theme.primary} size={40} strokeWidth={2} />
                )}
              </View>
              <ThemedText
                variant='subtitle'
                style={styles.heroTitle}
                color={theme.text}
              >
                {isScanning ? 'Searching nearby…' : 'Pair your shirt'}
              </ThemedText>
              <ThemedText
                variant='caption'
                color={theme.mutedText}
                style={styles.heroSub}
              >
                {isScanning
                  ? 'Looking for devices named PostureMonitor. This takes a few seconds.'
                  : 'Turn the shirt on, keep it within range, then scan. Choose your device from the list when it appears.'}
              </ThemedText>
              {!isScanning ? (
                <ThemedButton
                  title={
                    devices.length > 0 ? 'Scan again' : 'Scan for shirt'
                  }
                  variant='primary'
                  size='lg'
                  onPress={startScan}
                  style={styles.heroButton}
                />
              ) : null}
            </ThemedCard>

            {devices.length > 0 ? (
              <View style={styles.listSection}>
                <ThemedText
                  variant='label'
                  color={theme.text}
                  style={styles.listHeading}
                >
                  Found {devices.length}{' '}
                  {devices.length === 1 ? 'device' : 'devices'}
                </ThemedText>
                <ThemedText variant='caption' color={theme.mutedText} style={styles.listHint}>
                  Tap Connect on your JALES shirt.
                </ThemedText>
                {devices.map((d) => (
                  <DeviceRow
                    key={d.id}
                    name={d.name || d.localName || 'PostureMonitor'}
                    subtitle={d.id}
                    icon={<Shirt color={theme.primary} size={24} />}
                    onPress={() => handleConnect(d)}
                    actionLabel='Connect'
                  />
                ))}
              </View>
            ) : null}

            {!isScanning && devices.length === 0 ? (
              <View
                style={[
                  styles.tipsPanel,
                  {
                    backgroundColor: theme.primarySoft,
                    borderColor: `${theme.primary}28`,
                  },
                ]}
              >
                <ThemedText
                  variant='label'
                  style={[styles.tipsTitle, { color: theme.primary }]}
                >
                  Not seeing it?
                </ThemedText>
                <View style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: theme.primary }]} />
                  <ThemedText variant='caption' color={theme.mutedText} style={styles.tipText}>
                    Bluetooth is on and the app has location / nearby devices
                    permission.
                  </ThemedText>
                </View>
                <View style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: theme.primary }]} />
                  <ThemedText variant='caption' color={theme.mutedText} style={styles.tipText}>
                    Shirt battery is charged and firmware is advertising as
                    PostureMonitor.
                  </ThemedText>
                </View>
                <View style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: theme.primary }]} />
                  <ThemedText variant='caption' color={theme.mutedText} style={styles.tipText}>
                    Move a little closer and try Scan again.
                  </ThemedText>
                </View>
              </View>
            ) : null}
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorBannerText: {
    flex: 1,
    lineHeight: 19,
    fontWeight: '600',
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  elevatedCard: {
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  stateCenter: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
  },
  connectingRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  stateTitle: {
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 8,
  },
  stateSub: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  connectedWrap: {
    paddingBottom: 8,
  },
  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  successPillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  connectedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  deviceTitle: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  deviceId: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    opacity: 0.85,
  },
  telemetryPanel: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  telemetryLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  bnoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    marginTop: 4,
    fontWeight: '800',
    fontSize: 15,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  mpuBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  mpuLine: {
    marginTop: 4,
    fontWeight: '600',
  },
  disconnectButton: {
    marginTop: 18,
  },
  scanFlow: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  scanHeroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroSub: {
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
    marginBottom: 22,
    maxWidth: 320,
  },
  heroButton: {
    alignSelf: 'stretch',
  },
  listSection: {
    marginTop: 4,
  },
  listHeading: {
    fontWeight: '800',
    marginBottom: 4,
  },
  listHint: {
    marginBottom: 12,
    lineHeight: 18,
  },
  tipsPanel: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  tipsTitle: {
    fontWeight: '800',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    lineHeight: 19,
    fontSize: 13,
  },
  spacer: {
    height: 40,
  },
});

export default ConnectScreen;
