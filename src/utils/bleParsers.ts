import { Buffer } from 'buffer';

/**
 * Parse BNO055 binary payload
 * 6 bytes: 3 little-endian int16 values (heading, roll, pitch)
 * Values are stored as x100, so divide by 100 to get degrees
 */
export interface BnoData {
  heading: number;
  roll: number;
  pitch: number;
}

export const parseBnoPayload = (base64Value: string): BnoData | null => {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    
    if (bytes.length < 6) {
      console.warn(
        `[BLE Parser] BNO payload too short: ${bytes.length} bytes, expected 6`
      );
      return null;
    }

    // Read 3 little-endian int16 values
    const heading_x100 = bytes.readInt16LE(0);
    const roll_x100 = bytes.readInt16LE(2);
    const pitch_x100 = bytes.readInt16LE(4);

    const result: BnoData = {
      heading: heading_x100 / 100,
      roll: roll_x100 / 100,
      pitch: pitch_x100 / 100,
    };

    return result;
  } catch (error) {
    console.error('[BLE Parser] Error parsing BNO payload:', error);
    return null;
  }
};

/**
 * Parse MPU (9250 or similar) binary payload
 * 12 bytes: 6 little-endian int16 values (ax, ay, az, gx, gy, gz)
 */
export interface MpuData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export const parseMpuPayload = (base64Value: string): MpuData | null => {
  try {
    const bytes = Buffer.from(base64Value, 'base64');

    if (bytes.length < 12) {
      console.warn(
        `[BLE Parser] MPU payload too short: ${bytes.length} bytes, expected 12`
      );
      return null;
    }

    // Read 6 little-endian int16 values
    const ax = bytes.readInt16LE(0);
    const ay = bytes.readInt16LE(2);
    const az = bytes.readInt16LE(4);
    const gx = bytes.readInt16LE(6);
    const gy = bytes.readInt16LE(8);
    const gz = bytes.readInt16LE(10);

    const result: MpuData = {
      ax,
      ay,
      az,
      gx,
      gy,
      gz,
    };

    return result;
  } catch (error) {
    console.error('[BLE Parser] Error parsing MPU payload:', error);
    return null;
  }
};
