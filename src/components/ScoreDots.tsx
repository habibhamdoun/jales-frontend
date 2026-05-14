import React from 'react';
import { View, StyleSheet } from 'react-native';
import { scoreToColor } from '@/src/services/posture';

type ScoreDotsProps = {
  score: number | null | undefined;
  max?: number;
  size?: number;
  spacing?: number;
};

const EMPTY_COLOR = 'rgba(0,0,0,0.12)';

export const ScoreDots: React.FC<ScoreDotsProps> = ({
  score,
  max = 4,
  size = 12,
  spacing = 6,
}) => {
  const filled = Math.max(0, Math.min(max, Math.round(score ?? 0)));
  const fillColor = scoreToColor(score);

  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginRight: i === max - 1 ? 0 : spacing,
                backgroundColor: isFilled ? fillColor : EMPTY_COLOR,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {},
});

export default ScoreDots;
