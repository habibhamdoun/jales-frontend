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

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  // Static login function for testing
  const login = (email: string, password: string) => {
    console.log('Mock login:', { email, password });
    // TODO: In a real app, this would set authenticated state in context/Redux
    // For now, just navigate back to Splash which will handle auth state
    navigation.replace('Splash');
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setTimeout(() => {
      // Allow login with any credentials or even empty
      login(email || 'test@example.com', password || 'test123');
      setLoading(false);
    }, 1000);
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
