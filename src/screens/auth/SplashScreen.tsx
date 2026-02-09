import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/src/navigation/AuthStack';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Splash'
>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  // Static auth state for testing - set to true to bypass login and go directly to app
  const isAuthed = false;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthed) {
        // When authenticated, RootNavigator will switch to AppTabs
        // For now, just navigate to Login (in a real app, you'd navigate to app via RootNavigator context)
        navigation.replace('Login');
      } else {
        navigation.replace('Login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthed, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/splash-icon.png')}
          resizeMode='contain'
          style={{ width: 300, height: 300 }}
        />
      </View>
      <ThemedText
        variant='caption'
        color={theme.mutedText}
        style={styles.version}
      >
        Version 1.02
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoShape: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  version: {
    position: 'absolute',
    bottom: 32,
  },
});

export default SplashScreen;
