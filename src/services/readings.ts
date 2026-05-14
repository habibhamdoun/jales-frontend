import { apiFetch } from '@/src/services/api';
import type {
  ActionLevel,
  BnoFrame,
  MpuFrame,
  RulaEvaluation,
} from '@/src/services/posture';

/**
 * Session rows returned by the API after the server has scored each frame.
 * `PostReadingsBatchPayload.readings` must stay raw BNO/MPU frames; calibration and
 * RULA + threshold logic run server-side (see `posture.ts` module comment).
 */
export type ReadingDto = {
  id?: string;
  session_id?: string;
  device_id?: string;
  user_id?: string;
  recorded_at: string;

  // Raw BNO euler angles
  bno_heading?: number;
  bno_roll?: number;
  bno_pitch?: number;

  // Computed angles (server-calibrated; neck_* legacy placeholders)
  neck_angle?: number;
  upper_back_angle?: number;
  left_shoulder_angle?: number;
  right_shoulder_angle?: number;

  // RULA scores (1–4 per body part)
  neck_score?: number;
  trunk_score?: number;
  left_shoulder_score?: number;
  right_shoulder_score?: number;
  /** Legacy aggregate; some older rows only expose this instead of L/R shoulder scores. */
  shoulder_score?: number;

  // Final RULA action level (1–4)
  action_level?: ActionLevel;

  // Overall score (0–100): avg of all four RULA scores normalized
  overall_score?: number;

  // Trunk modifiers
  trunk_twist?: boolean;
  trunk_tilt?: boolean;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * GET /api/readings/:sessionId
 * Backend returns: { success, readings: ReadingDto[] }
 */
export const listReadingsForSession = async (
  token: string,
  sessionId: string,
): Promise<ReadingDto[]> => {
  const { data } = await apiFetch<{ success: boolean; readings: ReadingDto[] }>(
    `/readings/${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: authHeaders(token),
    },
  );
  return Array.isArray(data?.readings) ? data.readings : [];
};

/**
 * Raw sensor frame — matches Arduino serial output exactly.
 */
export type RawReadingFrame = {
  bno: BnoFrame;
  mpu1: MpuFrame;
  mpu2: MpuFrame;
  recorded_at: string;
};

export type PostReadingsBatchPayload = {
  session_id: string;
  device_id: string;
  readings: RawReadingFrame[];
};

/**
 * Backend returns: { success, inserted, alerts_created, lastScored }
 */
export type PostReadingsBatchResponse = {
  success: boolean;
  inserted: number;
  alerts_created: number;
  lastScored?: RulaEvaluation;
};

/**
 * POST /api/readings
 */
export const postReadingsBatch = async (
  token: string,
  payload: PostReadingsBatchPayload,
): Promise<PostReadingsBatchResponse> => {
  const { data } = await apiFetch<PostReadingsBatchResponse>('/readings', {
    method: 'POST',
    body: payload,
    headers: authHeaders(token),
  });
  return data;
};