import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

type BodyPartIconProps = {
  // Kept for API compatibility with previous SVG version. When provided and
  // `tinted` is true, the image is tinted with this color (works best on PNGs
  // with transparency).
  color?: string;
  size?: number;
  // Opt-in: tint the image to the given color. Defaults to false so the
  // illustrations render in their natural colors.
  tinted?: boolean;
  style?: StyleProp<ImageStyle>;
};

const upperBackSource = require('../../assets/images/upperBack.jpg');
const shoulderSource = require('../../assets/images/shoulder.png');

const buildStyle = (
  size: number,
  color: string | undefined,
  tinted: boolean,
  extra: StyleProp<ImageStyle>,
): StyleProp<ImageStyle> => [
  {
    width: size,
    height: size,
    ...(tinted && color ? { tintColor: color } : {}),
  },
  extra,
];

export const UpperBackIcon: React.FC<BodyPartIconProps> = ({
  color,
  size = 24,
  tinted = false,
  style,
}) => (
  <Image
    source={upperBackSource}
    resizeMode='contain'
    style={buildStyle(size, color, tinted, style)}
  />
);

export const ShouldersIcon: React.FC<BodyPartIconProps> = ({
  color,
  size = 24,
  tinted = false,
  style,
}) => (
  <Image
    source={shoulderSource}
    resizeMode='contain'
    style={buildStyle(size, color, tinted, style)}
  />
);

// Left and right shoulder share the same artwork; the right side is mirrored
// horizontally per spec so the body grid reads anatomically left/right.
export const LeftShoulderIcon: React.FC<BodyPartIconProps> = (props) => (
  <ShouldersIcon {...props} />
);

export const RightShoulderIcon: React.FC<BodyPartIconProps> = ({
  color,
  size = 24,
  tinted = false,
  style,
}) => (
  <Image
    source={shoulderSource}
    resizeMode='contain'
    style={[
      buildStyle(size, color, tinted, style),
      { transform: [{ scaleX: -1 }] },
    ]}
  />
);
