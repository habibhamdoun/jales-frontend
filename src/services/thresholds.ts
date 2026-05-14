import { apiFetch } from '@/src/services/api';

export type VibrationPattern = 'gentle' | 'normal' | 'aggressive';

export type Thresholds = {
  id: string;
  user_id: string;
  upper_back_threshold: number;
  shoulder_threshold: number;
  /** Vibration strength 1–10. Default 5. */
  vibration_intensity: number;
  /** Pulse pattern per severity. Default 'normal'. */
  vibration_pattern: VibrationPattern;
  /** Whether to send push notifications. Vibration always fires. Default true. */
  push_notifications_enabled: boolean;
  updated_at: string;
};

export type UpdateThresholdsPayload = Partial<
  Pick<
    Thresholds,
    | 'upper_back_threshold'
    | 'shoulder_threshold'
    | 'vibration_intensity'
    | 'vibration_pattern'
    | 'push_notifications_enabled'
  >
>;

export type BestAngles = {
  /** Legacy; omitted from best-angles when not computed server-side. */
  neck_angle?: number | null;
  upper_back_angle:     number | null;
  left_shoulder_angle:  number | null;
  right_shoulder_angle: number | null;
  readings_used:        number;
};

export type BestAnglesResult =
  | { hasData: true;  bestAngles: BestAngles; autoSaved: boolean; warning?: string }
  | { hasData: false; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickThresholdsPayload(input: any): any {
  if (!input) return input;
  if (Array.isArray(input)) return input[0];
  return (
    input.thresholds ?? input.threshold ?? input.data ?? input.result ?? input.payload ?? input
  );
}

const VALID_PATTERNS: VibrationPattern[] = ['gentle', 'normal', 'aggressive'];

function normalizeThresholds(rawInput: any): Thresholds {
  const raw = pickThresholdsPayload(rawInput);

  const upper = toFiniteNumber(
    raw?.upper_back_threshold ?? raw?.upperBackThreshold ?? raw?.upper_back_max_angle,
  );
  const shoulder = toFiniteNumber(
    raw?.shoulder_threshold ?? raw?.shoulderThreshold ?? raw?.shoulder_imbalance_max,
  );

  if (upper == null || shoulder == null) {
    const preview = (() => {
      try { return JSON.stringify(rawInput); } catch { return String(rawInput); }
    })();
    throw new Error(`Invalid thresholds response from server. Got: ${preview}`);
  }

  // vibration_intensity — clamp 1–10, default 5
  const rawIntensity      = toFiniteNumber(raw?.vibration_intensity ?? raw?.vibrationIntensity);
  const vibration_intensity =
    rawIntensity != null ? Math.max(1, Math.min(10, Math.round(rawIntensity))) : 5;

  // vibration_pattern — validate enum, default 'normal'
  const rawPattern          = String(raw?.vibration_pattern ?? raw?.vibrationPattern ?? 'normal').toLowerCase();
  const vibration_pattern: VibrationPattern = VALID_PATTERNS.includes(rawPattern as VibrationPattern)
    ? (rawPattern as VibrationPattern)
    : 'normal';

  // push_notifications_enabled — default true
  const rawPush                   = raw?.push_notifications_enabled ?? raw?.pushNotificationsEnabled;
  const push_notifications_enabled =
    rawPush === undefined || rawPush === null ? true : Boolean(rawPush);

  return {
    id:                           String(raw?.id ?? ''),
    user_id:                      String(raw?.user_id ?? raw?.userId ?? ''),
    upper_back_threshold:          upper,
    shoulder_threshold:            shoulder,
    vibration_intensity,
    vibration_pattern,
    push_notifications_enabled,
    updated_at:                   String(raw?.updated_at ?? raw?.updatedAt ?? ''),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────────────────────────────────────

export async function getThresholds(token: string): Promise<Thresholds> {
  const { data } = await apiFetch<any>('/thresholds', {
    method:  'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeThresholds(data);
}

export async function updateThresholds(
  token: string,
  payload: UpdateThresholdsPayload,
): Promise<Thresholds> {
  const safePayload: UpdateThresholdsPayload = { ...payload };

  if (safePayload.vibration_intensity !== undefined) {
    safePayload.vibration_intensity = Math.max(
      1, Math.min(10, Math.round(safePayload.vibration_intensity)),
    );
  }

  if (
    safePayload.vibration_pattern !== undefined &&
    !VALID_PATTERNS.includes(safePayload.vibration_pattern)
  ) {
    throw new Error(
      `Invalid vibration_pattern: "${safePayload.vibration_pattern}". Must be gentle, normal, or aggressive.`,
    );
  }

  const { data } = await apiFetch<any>('/thresholds', {
    method:  'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body:    safePayload,
  });
  return normalizeThresholds(data);
}

/**
 * GET /api/thresholds/best-angles
 *
 * Fetches the user's best recorded angles from posture_readings
 * (action_level = 1 only) and auto-saves them as personal thresholds.
 * Returns per-body-part averages and how many readings were used.
 */
export async function getBestAngles(token: string): Promise<BestAnglesResult> {
  const { data } = await apiFetch<any>('/thresholds/best-angles', {
    method:  'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const root = data?.data ?? data;

  if (!root?.hasData) {
    return {
      hasData: false,
      message: root?.message ?? 'No perfect-posture readings found yet.',
    };
  }

  return {
    hasData:    true,
    bestAngles: root.bestAngles as BestAngles,
    autoSaved:  Boolean(root.autoSaved),
    ...(root.warning ? { warning: String(root.warning) } : {}),
  };
}