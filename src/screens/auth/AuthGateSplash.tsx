import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';

const AuthGateSplash: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/splash-icon.png')}
          resizeMode='contain'
          style={{ width: 280, height: 280 }}
        />
      </View>
      <ThemedText variant='caption' color={theme.mutedText} style={styles.text}>
        Checking your session…
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
    marginBottom: 14,
  },
  text: {
    marginTop: 6,
  },
});

export default AuthGateSplash;

