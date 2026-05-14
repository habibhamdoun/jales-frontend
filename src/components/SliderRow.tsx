import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from './themed/ThemedText';

interface SliderRowProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
}) => {
  const { theme } = useTheme();
  const trackW = useRef(1);

  const clampFromX = useCallback(
    (locationX: number) => {
      const w = trackW.current;
      const ratio = Math.max(0, Math.min(1, locationX / w));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      const v = Math.max(min, Math.min(max, stepped));
      onValueChange(v);
    },
    [min, max, step, onValueChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          clampFromX(e.nativeEvent.locationX);
        },
        onPanResponderMove: (e) => {
          clampFromX(e.nativeEvent.locationX);
        },
      }),
    [clampFromX],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    trackW.current = Math.max(1, e.nativeEvent.layout.width);
  };

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText variant='body'>{label}</ThemedText>
        <ThemedText variant='body' color={theme.primary}>
          {Math.round(value)}
        </ThemedText>
      </View>
      <View
        style={styles.trackHit}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: `${pct}%`,
              backgroundColor: theme.surface,
              borderColor: theme.primary,
            },
          ]}
          pointerEvents='none'
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trackHit: {
    position: 'relative',
    height: 36,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginLeft: -10,
    top: '50%',
    marginTop: -10,
  },
});
