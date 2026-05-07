import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/src/navigation/AuthStack';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedInput } from '@/src/components/themed/ThemedInput';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { useTheme } from '@/src/theme/useTheme';
import { loginUser } from '@/src/services/auth';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/services/api';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailOk = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    if (!emailOk(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({
        email: trimmedEmail,
        password,
      });
      signIn(data.token, data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          Alert.alert('Incorrect email or password.', 'Please try again.');
          return;
        }
        if (err.status === 404) {
          Alert.alert('No account found with this email.', 'Please sign up first.');
          return;
        }
      }
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <View
            style={[styles.logoShape, { backgroundColor: theme.primary }]}
          />
          <ThemedText variant='title' style={styles.title}>
            Welcome Back
          </ThemedText>
          <ThemedText variant='body' color={theme.mutedText}>
            Sign in to continue to JALES
          </ThemedText>
        </View>

        <View style={styles.form}>
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

          <ThemedButton
            title='Sign In'
            variant='primary'
            size='lg'
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.linkContainer}
          >
            <ThemedText variant='body' color={theme.mutedText}>
              Don't have an account?{' '}
            </ThemedText>
            <ThemedText variant='body' color={theme.primary}>
              Sign Up
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoShape: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

export default LoginScreen;
