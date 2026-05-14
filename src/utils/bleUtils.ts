import { Buffer } from 'buffer';
import type { ThemeTokens } from '@/src/theme/themes';

/** Theme colors used for battery level UI. */
export type BatteryThemeSlice = Pick<
  ThemeTokens,
  'danger' | 'warning' | 'success' | 'mutedText'
>;

/**
 * Maps battery percentage (0–100) to a traffic-light color:
 * 0–10 red, 11–45 orange, 46–100 green.
 */
export const batteryPercentDisplayColor = (
  percent: number,
  theme: BatteryThemeSlice,
): string => {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  if (p <= 10) return theme.danger;
  if (p <= 45) return theme.warning;
  return theme.success;
};

/**
 * Converts a single byte value to base64 string for BLE writes.
 * @param byteValue - The byte value (0-255) to encode
 * @returns Base64 string representation of the byte
 * @example byteToBase64(1) // returns "AQ=="
 */
export const byteToBase64 = (byteValue: number): string => {
  if (byteValue < 0 || byteValue > 255) {
    throw new Error('Byte value must be between 0 and 255');
  }
  return Buffer.from([byteValue]).toString('base64');
};

/**
 * Converts a byte array or Uint8Array to base64 string for BLE writes.
 * @param bytes - The byte array to encode
 * @returns Base64 string representation of the bytes
 * @example bytesToBase64([1, 2, 3]) // returns "AQID"
 */
export const bytesToBase64 = (bytes: number[] | Uint8Array): string => {
  return Buffer.from(bytes).toString('base64');
};

/**
 * Parse battery level from a 1-byte BLE notification.
 *
 * The Arduino writes a single uint8 byte (0–100) to the battery characteristic
 * with BLENotify. This function decodes it from base64 and returns the clamped
 * percentage. Returns null if the payload is missing or malformed.
 *
 * @param base64Value - Base64-encoded BLE characteristic value
 * @returns Battery percentage 0–100, or null on error
 *
 * @example
 * parseBatteryLevel("ZA==")  // returns 100
 * parseBatteryLevel("NA==")  // returns 52
 */
export const parseBatteryLevel = (base64Value: string): number | null => {
  try {
    const buffer = Buffer.from(base64Value, 'base64');
    if (buffer.length < 1) {
      console.warn('[BLE Parser] Battery payload too short');
      return null;
    }
    const percent = buffer.readUInt8(0);
    return Math.max(0, Math.min(100, percent));  // clamp 0–100
  } catch (error) {
    console.error('[BLE Parser] Error parsing battery level:', error);
    return null;
  }
};