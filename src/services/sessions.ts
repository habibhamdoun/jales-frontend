import { apiFetch } from '@/src/services/api';

export type SessionStartResponse = {
  session_id: string;
  start_time: string;
};

/**
 * Matches posture_sessions DB schema exactly.
 */
export type SessionEndPayload = {
  /** Legacy; omit for new sessions — backend may still accept if sent. */
  avg_neck_angle?: number;
  avg_upper_back_angle: number;
  avg_left_shoulder_angle: number;
  avg_right_shoulder_angle: number;
  avg_action_level: number;
  avg_overall_score: number;
  total_alerts: number;
  posture_score: number;
};

/**
 * Matches posture_sessions DB schema exactly.
 */
export type SessionDto = {
  id: string;
  user_id?: string;
  device_id?: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  avg_neck_angle?: number | null;
  avg_upper_back_angle?: number | null;
  avg_left_shoulder_angle?: number | null;
  avg_right_shoulder_angle?: number | null;
  avg_action_level?: number | null;
  avg_overall_score?: number | null;
  total_alerts?: number | null;
  posture_score?: number | null;
  created_at?: string;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// UNWRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

const unwrapSession = (raw: unknown): SessionDto => {
  const obj       = (raw ?? {}) as Record<string, unknown>;
  const candidate =
    (obj.session as Record<string, unknown> | undefined) ??
    (obj.data    as Record<string, unknown> | undefined) ??
    obj;
  return candidate as SessionDto;
};

const unwrapSessionList = (raw: unknown): SessionDto[] => {
  if (Array.isArray(raw)) return raw as SessionDto[];
  const obj       = (raw ?? {}) as Record<string, unknown>;
  const candidate = (obj.sessions as unknown) ?? (obj.data as unknown) ?? [];
  return Array.isArray(candidate) ? (candidate as SessionDto[]) : [];
};

const unwrapSessionStart = (raw: unknown): SessionStartResponse => {
  const obj       = (raw ?? {}) as Record<string, unknown>;
  const candidate =
    (obj.session as Record<string, unknown> | undefined) ??
    (obj.data    as Record<string, unknown> | undefined) ??
    obj;
  const id =
    (candidate.session_id as string | undefined) ??
    (candidate.id         as string | undefined) ??
    '';
  const startTime =
    (candidate.start_time as string | undefined) ??
    (candidate.startTime  as string | undefined) ??
    new Date().toISOString();
  return { session_id: id, start_time: startTime };
};

// ─────────────────────────────────────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────────────────────────────────────

export const startSession = async (
  token: string,
  deviceId: string,
): Promise<SessionStartResponse> => {
  const { data } = await apiFetch<unknown>('/sessions/start', {
    method: 'POST',
    body:   { device_id: deviceId },
    headers: authHeaders(token),
  });
  return unwrapSessionStart(data);
};

export const endSession = async (
  token: string,
  sessionId: string,
  payload: SessionEndPayload,
): Promise<SessionDto> => {
  const { data } = await apiFetch<unknown>(
    `/sessions/${encodeURIComponent(sessionId)}/end`,
    {
      method: 'PATCH',
      body:   payload,
      headers: authHeaders(token),
    },
  );
  return unwrapSession(data);
};

export const listSessions = async (
  token: string,
  limit?: number,
): Promise<SessionDto[]> => {
  const path =
    typeof limit === 'number' && Number.isFinite(limit)
      ? `/sessions?limit=${encodeURIComponent(String(limit))}`
      : '/sessions';
  const { data } = await apiFetch<unknown>(path, {
    method: 'GET',
    headers: authHeaders(token),
  });
  return unwrapSessionList(data);
};

export const getSession = async (
  token: string,
  sessionId: string,
): Promise<SessionDto> => {
  const { data } = await apiFetch<unknown>(
    `/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: authHeaders(token),
    },
  );
  return unwrapSession(data);
};