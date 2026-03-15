export interface ParsedPostureData {
  heading: number | null;
  roll: number | null;
  pitch: number | null;
  neckAngle: number | null;
  posture: 'GOOD' | 'WARNING' | 'BAD' | null;
  accel: {
    x: number;
    y: number;
    z: number;
  };
  gyro: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Parse BLE string data from Arduino Nano 33 BLE
 * 
 * Expected compact format:
 * "H:349.6,R:-1.2,P:2.1,N:3.2,S:0"
 * 
 * Where:
 * - H = heading (degrees)
 * - R = roll (degrees)
 * - P = pitch (degrees)
 * - N = neckAngle (degrees)
 * - S = posture code (0=GOOD, 1=WARNING, 2=BAD)
 * 
 * @param raw - Raw BLE string (UTF-8 decoded from Base64)
 * @returns Parsed sensor data object
 */
export const parsePostureData = (raw: string): ParsedPostureData => {
  const result: ParsedPostureData = {
    heading: null,
    roll: null,
    pitch: null,
    neckAngle: null,
    posture: null,
    accel: { x: 0, y: 0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
  };

  if (!raw || typeof raw !== 'string') {
    console.warn('[Parser] Invalid input to parsePostureData');
    return result;
  }

  try {
    const trimmed = raw.trim();
    console.log('[Parser] Parsing BLE data:', trimmed);

    // Parse new compact format: H:349.6,R:-1.2,P:2.1,N:3.2,S:0
    
    // Extract Heading (H)
    const headingMatch = trimmed.match(/H:([-\d.]+)/i);
    if (headingMatch) {
      result.heading = parseFloat(headingMatch[1]);
    }

    // Extract Roll (R)
    const rollMatch = trimmed.match(/R:([-\d.]+)/i);
    if (rollMatch) {
      result.roll = parseFloat(rollMatch[1]);
    }

    // Extract Pitch (P)
    const pitchMatch = trimmed.match(/P:([-\d.]+)/i);
    if (pitchMatch) {
      result.pitch = parseFloat(pitchMatch[1]);
    }

    // Extract Neck Angle (N)
    const neckMatch = trimmed.match(/N:([-\d.]+)/i);
    if (neckMatch) {
      result.neckAngle = parseFloat(neckMatch[1]);
    }

    // Extract Posture Code (S) and convert to status
    const postureMatch = trimmed.match(/S:(\d+)/i);
    if (postureMatch) {
      const postureCode = parseInt(postureMatch[1], 10);
      switch (postureCode) {
        case 0:
          result.posture = 'GOOD';
          break;
        case 1:
          result.posture = 'WARNING';
          break;
        case 2:
          result.posture = 'BAD';
          break;
        default:
          result.posture = null;
      }
    }

    console.log('[Parser] Parsed result:', result);
    return result;
  } catch (error) {
    console.error('[Parser] Error parsing posture data:', error);
    return result;
  }
};
