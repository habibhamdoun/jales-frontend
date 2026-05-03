import { Buffer } from 'buffer';

/**
 * Converts a single byte value to base64 string for BLE writes
 * @param byteValue - The byte value (0-255) to encode
 * @returns Base64 string representation of the byte
 * @example
 * byteToBase64(1) // returns "AQ=="
 */
export const byteToBase64 = (byteValue: number): string => {
  if (byteValue < 0 || byteValue > 255) {
    throw new Error('Byte value must be between 0 and 255');
  }
  return Buffer.from([byteValue]).toString('base64');
};

/**
 * Converts a byte array or Uint8Array to base64 string for BLE writes
 * @param bytes - The byte array to encode
 * @returns Base64 string representation of the bytes
 * @example
 * bytesToBase64([1, 2, 3]) // returns "AQID"
 */
export const bytesToBase64 = (bytes: number[] | Uint8Array): string => {
  return Buffer.from(bytes).toString('base64');
};
