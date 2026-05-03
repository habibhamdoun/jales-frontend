import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './themed/ThemedText';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  status?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 10,
  label = 'POSTURE',
  status = 'GOOD',
}) => {
  const { theme } = useTheme();

  // Determine ring color based on status
  const getStatusColor = (stat: string): string => {
    switch (stat.toUpperCase()) {
      case 'GOOD':
        return theme.primary; // Main app color
      case 'WARNING':
        return '#FFC107'; // Yellow/Amber
      case 'DANGER':
      case 'BAD':
        return '#F44336'; // Red
      default:
        return theme.primary;
    }
  };

  const ringColor = getStatusColor(status);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffsetRef = useRef(new Animated.Value(circumference)).current;

  // Animate stroke offset when percentage changes
  useEffect(() => {
    const targetOffset = circumference - (percentage / 100) * circumference;
    
    Animated.timing(strokeDashoffsetRef, {
      toValue: targetOffset,
      duration: 1000, // 1 second smooth animation
      useNativeDriver: false, // SVG attributes can't use native driver
    }).start();
  }, [percentage, circumference, strokeDashoffsetRef]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffsetRef}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.content}>
        <ThemedText variant="title" style={styles.percentage}>
          {Math.round(percentage)}%
        </ThemedText>
        <ThemedText
          variant="caption"
          color={theme.mutedText}
          style={styles.label}
        >
          {label}
        </ThemedText>
        <ThemedText variant="label" color={ringColor} style={styles.status}>
          {status}
        </ThemedText>
      </View>
    </View>
  );
};

// Animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
  },
  percentage: {
    fontWeight: '700',
  },
  label: {
    marginTop: 2,
  },
  status: {
    marginTop: 4,
  },
});
