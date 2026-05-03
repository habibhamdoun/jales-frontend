import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { useTheme } from '@/src/theme/useTheme';
import { AlertCircle } from 'lucide-react-native';
import { useBle } from '@/src/hooks/useBle';
import { ProfileStackParamList } from '@/src/navigation/AppTabs';
import { getTrunkAngles } from '@/src/utils/posture';

type CalibrationScreenNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'Calibration'
>;

interface SensorState {
  isCalibrating: boolean;
  message: string | null;
  isSuccess: boolean;
}

const CalibrationScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<CalibrationScreenNavigationProp>();

  const {
    bno,
    mpu1,
    mpu2,
    mpu3,
    isConnected,
    calibrateBno,
    calibrateMpu1,
    calibrateMpu2,
    calibrateMpu3,
    setTrunkNeutralReference,
  } = useBle();

  // Per-sensor state management
  const [bnoState, setBnoState] = useState<SensorState>({
    isCalibrating: false,
    message: null,
    isSuccess: false,
  });
  const [mpu1State, setMpu1State] = useState<SensorState>({
    isCalibrating: false,
    message: null,
    isSuccess: false,
  });
  const [mpu2State, setMpu2State] = useState<SensorState>({
    isCalibrating: false,
    message: null,
    isSuccess: false,
  });
  const [mpu3State, setMpu3State] = useState<SensorState>({
    isCalibrating: false,
    message: null,
    isSuccess: false,
  });

  // Refs to clear messages
  const bnoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mpu1TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mpu2TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mpu3TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMessageAfterDelay = (
    setState: React.Dispatch<React.SetStateAction<SensorState>>,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    delayMs: number,
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        message: null,
        isSuccess: false,
      }));
    }, delayMs);
  };

  const handleCalibrate = async (
    sensorName: string,
    calibrateFn: () => Promise<void>,
    setState: React.Dispatch<React.SetStateAction<SensorState>>,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    if (!isConnected) {
      console.log(
        `[CalibrationScreen] Cannot calibrate ${sensorName}: device not connected`,
      );
      setState({
        isCalibrating: false,
        message: 'Device not connected',
        isSuccess: false,
      });
      clearMessageAfterDelay(setState, timeoutRef, 5000);
      return;
    }

    console.log(`[CalibrationScreen] Calibrate ${sensorName} button pressed`);
    setState({
      isCalibrating: true,
      message: null,
      isSuccess: false,
    });

    try {
      console.log(`[CalibrationScreen] Calling calibrate${sensorName}()...`);
      await calibrateFn();

      // Show success message
      setState({
        isCalibrating: false,
        message: `${sensorName} calibrated`,
        isSuccess: true,
      });
      console.log(
        `[CalibrationScreen] ${sensorName} calibration sent successfully`,
      );

      // Clear message after 3 seconds
      clearMessageAfterDelay(setState, timeoutRef, 3000);
    } catch (error: any) {
      // Show error message
      const errorMsg = error.message || `Failed to calibrate ${sensorName}`;
      setState({
        isCalibrating: false,
        message: errorMsg,
        isSuccess: false,
      });
      console.error(
        `[CalibrationScreen] ${sensorName} calibration error:`,
        error,
      );

      // Clear message after 5 seconds
      clearMessageAfterDelay(setState, timeoutRef, 5000);
    }
  };

  // Special handler for MPU1 calibration with trunk neutral reference setting
  const handleMpu1CalibrateWithNeutral = async () => {
    if (!isConnected) {
      console.log('[CalibrationScreen] Cannot calibrate MPU1: device not connected');
      setMpu1State({
        isCalibrating: false,
        message: 'Device not connected',
        isSuccess: false,
      });
      clearMessageAfterDelay(setMpu1State, mpu1TimeoutRef, 5000);
      return;
    }

    console.log('[CalibrationScreen] Calibrating MPU1 and setting neutral reference...');
    setMpu1State({
      isCalibrating: true,
      message: null,
      isSuccess: false,
    });

    try {
      // Perform BLE calibration
      await calibrateMpu1();

      // After a brief delay, set the current trunk angle as the neutral reference
      // This ensures the BLE calibration is processed first
      setTimeout(() => {
        if (mpu1) {
          const { absolute: trunkAngles } = getTrunkAngles(mpu1);
          if (trunkAngles) {
            console.log(
              '[CalibrationScreen] Setting trunk neutral reference:',
              trunkAngles,
            );
            setTrunkNeutralReference({
              pitch: trunkAngles.pitch,
              roll: trunkAngles.roll,
            });

            setMpu1State({
              isCalibrating: false,
              message: 'MPU1 calibrated + neutral posture set',
              isSuccess: true,
            });
            console.log('[CalibrationScreen] MPU1 calibration and neutral reference set successfully');
          }
        }
      }, 100);

      // Clear message after 3 seconds
      clearMessageAfterDelay(setMpu1State, mpu1TimeoutRef, 3000);
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to calibrate MPU1';
      setMpu1State({
        isCalibrating: false,
        message: errorMsg,
        isSuccess: false,
      });
      console.error('[CalibrationScreen] MPU1 calibration error:', error);
      clearMessageAfterDelay(setMpu1State, mpu1TimeoutRef, 5000);
    }
  };

  React.useEffect(() => {
    return () => {
      // Cleanup timeouts on unmount
      if (bnoTimeoutRef.current) clearTimeout(bnoTimeoutRef.current);
      if (mpu1TimeoutRef.current) clearTimeout(mpu1TimeoutRef.current);
      if (mpu2TimeoutRef.current) clearTimeout(mpu2TimeoutRef.current);
      if (mpu3TimeoutRef.current) clearTimeout(mpu3TimeoutRef.current);
    };
  }, []);

  const renderSensorData = (
    sensorName: string,
    data: typeof bno | typeof mpu1,
  ) => {
    if (!data) {
      return (
        <ThemedText variant='caption' color={theme.mutedText}>
          No data available
        </ThemedText>
      );
    }

    if (sensorName === 'BNO') {
      const bnoData = data as typeof bno;
      return (
        <View style={styles.sensorDataContent}>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Heading:
            </ThemedText>
            <ThemedText variant='label'>
              {bnoData?.heading !== undefined
                ? `${bnoData.heading.toFixed(1)}°`
                : '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Roll:
            </ThemedText>
            <ThemedText variant='label'>
              {bnoData?.roll !== undefined
                ? `${bnoData.roll.toFixed(1)}°`
                : '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Pitch:
            </ThemedText>
            <ThemedText variant='label'>
              {bnoData?.pitch !== undefined
                ? `${bnoData.pitch.toFixed(1)}°`
                : '—'}
            </ThemedText>
          </View>
        </View>
      );
    } else {
      const mpuData = data as typeof mpu1;
      return (
        <View style={styles.sensorDataContent}>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Accel X:
            </ThemedText>
            <ThemedText variant='label'>
              {mpuData?.ax.toFixed(1) || '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Accel Y:
            </ThemedText>
            <ThemedText variant='label'>
              {mpuData?.ay.toFixed(1) || '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Accel Z:
            </ThemedText>
            <ThemedText variant='label'>
              {mpuData?.az.toFixed(1) || '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Gyro X:
            </ThemedText>
            <ThemedText variant='label'>
              {mpuData?.gx.toFixed(1) || '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Gyro Y:
            </ThemedText>
            <ThemedText variant='label'>
              {mpuData?.gy.toFixed(1) || '—'}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText variant='caption' color={theme.mutedText}>
              Gyro Z:
            </ThemedText>
            <ThemedText variant='label'>
              {mpuData?.gz.toFixed(1) || '—'}
            </ThemedText>
          </View>
        </View>
      );
    }
  };

  const renderSensorSection = (
    sensorName: string,
    sensorData: typeof bno | typeof mpu1,
    state: SensorState,
    calibrateFn: () => Promise<void>,
    setState: React.Dispatch<React.SetStateAction<SensorState>>,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    return (
      <ThemedCard key={sensorName} style={styles.sensorCard}>
        <ThemedText variant='label' style={styles.sensorTitle}>
          {sensorName}
        </ThemedText>

        {/* Sensor Data */}
        <View style={styles.sensorDataSection}>
          {renderSensorData(sensorName, sensorData)}
        </View>

        {/* Calibration Button */}
        <ThemedButton
          title={
            state.isCalibrating ? 'Calibrating...' : `Calibrate ${sensorName}`
          }
          variant='primary'
          size='lg'
          onPress={() =>
            handleCalibrate(sensorName, calibrateFn, setState, timeoutRef)
          }
          disabled={!isConnected || state.isCalibrating}
          style={styles.calibrateButton}
        />

        {/* Status Message */}
        {state.message && (
          <ThemedCard
            style={[
              styles.statusMessage,
              {
                backgroundColor: state.isSuccess
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(244, 67, 54, 0.1)',
                borderLeftColor: state.isSuccess ? '#4CAF50' : '#F44336',
              },
            ]}
          >
            <ThemedText
              variant='caption'
              color={state.isSuccess ? '#4CAF50' : '#F44336'}
              style={styles.statusMessageText}
            >
              {state.isSuccess ? '✓ ' : '✗ '}
              {state.message}
            </ThemedText>
          </ThemedCard>
        )}
      </ThemedCard>
    );
  };

  return (
    <Screen scrollable style={styles.container}>
      <View style={styles.header}>
        <ThemedText variant='title'>Sensor Calibration</ThemedText>
      </View>

      {/* Connection Status */}
      {!isConnected && (
        <ThemedCard
          style={[
            styles.notConnectedCard,
            { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
          ]}
        >
          <View style={styles.notConnectedContent}>
            <AlertCircle color={theme.mutedText} size={32} />
            <ThemedText
              variant='body'
              color={theme.mutedText}
              style={styles.notConnectedText}
            >
              Device not connected
            </ThemedText>
            <ThemedText
              variant='caption'
              color={theme.mutedText}
              style={styles.notConnectedSubtext}
            >
              Connect to the JALES Shirt first to calibrate sensors
            </ThemedText>
          </View>
        </ThemedCard>
      )}

      {/* Calibration Instructions */}
      <ThemedCard style={styles.instructionsCard}>
        <ThemedText variant='label' style={styles.instructionsTitle}>
          How to Calibrate
        </ThemedText>
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={styles.instructionsText}
        >
          Place the JALES Shirt in the desired neutral position, then tap the
          "Calibrate [Sensor]" button for each sensor you want to calibrate. The
          current position will become the reference point for that sensor.
        </ThemedText>
      </ThemedCard>

      {/* Sensor Calibration Cards */}
      <View style={styles.sensorsContainer}>
        {renderSensorSection(
          'BNO',
          bno,
          bnoState,
          calibrateBno,
          setBnoState,
          bnoTimeoutRef,
        )}
        {/* MPU1 with Trunk Neutral Reference Setting */}
        <ThemedCard style={styles.sensorCard}>
          <ThemedText variant='label' style={styles.sensorTitle}>
            MPU1
          </ThemedText>

          {/* Sensor Data */}
          <View style={styles.sensorDataSection}>
            {renderSensorData('MPU1', mpu1)}
          </View>

          {/* Calibration Button - with Trunk Neutral Setting */}
          <ThemedButton
            title={
              mpu1State.isCalibrating ? 'Calibrating...' : 'Calibrate MPU1'
            }
            variant='primary'
            size='lg'
            onPress={handleMpu1CalibrateWithNeutral}
            disabled={!isConnected || mpu1State.isCalibrating}
            style={styles.calibrateButton}
          />

          {/* Help Text */}
          <ThemedText
            variant='caption'
            color={theme.mutedText}
            style={styles.sensorHelpText}
          >
            This also sets your current trunk position as the neutral reference
            for posture analysis.
          </ThemedText>

          {/* Status Message */}
          {mpu1State.message && (
            <ThemedCard
              style={[
                styles.statusMessage,
                {
                  backgroundColor: mpu1State.isSuccess
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)',
                  borderLeftColor: mpu1State.isSuccess ? '#4CAF50' : '#F44336',
                },
              ]}
            >
              <ThemedText
                variant='caption'
                color={mpu1State.isSuccess ? '#4CAF50' : '#F44336'}
                style={styles.statusMessageText}
              >
                {mpu1State.isSuccess ? '✓ ' : '✗ '}
                {mpu1State.message}
              </ThemedText>
            </ThemedCard>
          )}
        </ThemedCard>
        {renderSensorSection(
          'MPU2',
          mpu2,
          mpu2State,
          calibrateMpu2,
          setMpu2State,
          mpu2TimeoutRef,
        )}
        {renderSensorSection(
          'MPU3',
          mpu3,
          mpu3State,
          calibrateMpu3,
          setMpu3State,
          mpu3TimeoutRef,
        )}
      </View>

      <View style={styles.spacer} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    marginBottom: 16,
  },
  notConnectedCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  notConnectedContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  notConnectedText: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  notConnectedSubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
  instructionsCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
  },
  instructionsTitle: {
    marginBottom: 8,
    color: '#2196F3',
  },
  instructionsText: {
    lineHeight: 18,
  },
  sensorsContainer: {
    gap: 16,
  },
  sensorCard: {
    marginBottom: 0,
  },
  sensorTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  sensorDataSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sensorDataContent: {
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calibrateButton: {
    marginBottom: 12,
  },
  statusMessage: {
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusMessageText: {
    fontWeight: '600',
  },
  sensorHelpText: {
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 16,
  },
  spacer: {
    height: 32,
  },
});

export default CalibrationScreen;
