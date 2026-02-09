import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/src/navigation/AuthStack';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedInput } from '@/src/components/themed/ThemedInput';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { useTheme } from '@/src/theme/useTheme';
import { SliderRow } from '@/src/components/SliderRow';
import { GENDER_OPTIONS, POSTURE_GOAL_PRESETS } from '@/src/utils/constants';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  // Static register function for testing
  const register = (userData: any) => {
    console.log('Mock register:', userData);
    // Navigate to login screen on test register
    navigation.navigate('Login');
  };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState(GENDER_OPTIONS[0]);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [postureGoalPreset, setPostureGoalPreset] = useState(
    POSTURE_GOAL_PRESETS[0],
  );
  const [neckAngleLimit, setNeckAngleLimit] = useState(30);
  const [upperBackAngleLimit, setUpperBackAngleLimit] = useState(25);
  const [shoulderTiltLimit, setShoulderTiltLimit] = useState(20);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setTimeout(() => {
      register({
        fullName,
        email,
        age: parseInt(age),
        gender,
        heightCm: parseInt(heightCm),
        weightKg: parseInt(weightKg),
        postureGoalPreset,
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <Screen scrollable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <ThemedText variant='title' style={styles.title}>
            Create Account
          </ThemedText>
          <ThemedText variant='body' color={theme.mutedText}>
            Join JALES for better posture
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedInput
            label='Full Name'
            placeholder='Enter your full name'
            value={fullName}
            onChangeText={setFullName}
          />

          <ThemedInput
            label='Email'
            placeholder='Enter your email'
            value={email}
            onChangeText={setEmail}
            keyboardType='email-address'
            autoCapitalize='none'
          />

          <ThemedInput
            label='Password'
            placeholder='Enter your password'
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <ThemedInput
            label='Confirm Password'
            placeholder='Re-enter your password'
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <ThemedInput
            label='Age'
            placeholder='Enter your age'
            value={age}
            onChangeText={setAge}
            keyboardType='number-pad'
          />

          <ThemedInput
            label='Height (cm)'
            placeholder='Enter your height'
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType='number-pad'
          />

          <ThemedInput
            label='Weight (kg)'
            placeholder='Enter your weight'
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType='number-pad'
          />

          <View style={styles.section}>
            <ThemedText variant='label' style={styles.sectionTitle}>
              Initial Thresholds
            </ThemedText>
            <SliderRow
              label='Neck Angle Limit'
              value={neckAngleLimit}
              onValueChange={setNeckAngleLimit}
              min={10}
              max={50}
            />
            <SliderRow
              label='Upper Back Angle Limit'
              value={upperBackAngleLimit}
              onValueChange={setUpperBackAngleLimit}
              min={10}
              max={50}
            />
            <SliderRow
              label='Shoulder Tilt Limit'
              value={shoulderTiltLimit}
              onValueChange={setShoulderTiltLimit}
              min={10}
              max={50}
            />
          </View>

          <ThemedButton
            title='Create Account'
            variant='primary'
            size='lg'
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkContainer}
          >
            <ThemedText variant='body' color={theme.mutedText}>
              Already have an account?{' '}
            </ThemedText>
            <ThemedText variant='body' color={theme.primary}>
              Sign In
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    marginBottom: 8,
  },
  form: {
    width: '100%',
    paddingBottom: 32,
  },
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

export default RegisterScreen;
