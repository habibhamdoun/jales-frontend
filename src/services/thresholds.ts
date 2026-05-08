import { apiFetch } from '@/src/services/api';

export type Thresholds = {
  id: string;
  user_id: string;
  neck_threshold: number;
  upper_back_threshold: number;
  shoulder_threshold: number;
  updated_at: string;
};

export type UpdateThresholdsPayload = Partial<
  Pick<
    Thresholds,
    'neck_threshold' | 'upper_back_threshold' | 'shoulder_threshold'
  >
>;

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickThresholdsPayload(input: any): any {
  if (!input) return input;
  if (Array.isArray(input)) return input[0];
  return (
    input.thresholds ??
    input.threshold ??
    input.data ??
    input.result ??
    input.payload ??
    input
  );
}

function normalizeThresholds(rawInput: any): Thresholds {
  const raw = pickThresholdsPayload(rawInput);

  // Accept new snake_case schema, plus legacy aliases for safety.
  const neck = toFiniteNumber(
    raw?.neck_threshold ?? raw?.neckThreshold ?? raw?.neck_max_angle,
  );
  const upper = toFiniteNumber(
    raw?.upper_back_threshold ??
      raw?.upperBackThreshold ??
      raw?.upper_back_max_angle,
  );
  const shoulder = toFiniteNumber(
    raw?.shoulder_threshold ??
      raw?.shoulderThreshold ??
      raw?.shoulder_imbalance_max,
  );

  if (neck == null || upper == null || shoulder == null) {
    const preview = (() => {
      try {
        return JSON.stringify(rawInput);
      } catch {
        return String(rawInput);
      }
    })();
    throw new Error(
      `Invalid thresholds response from server. Got: ${preview}`,
    );
  }

  return {
    id: String(raw?.id ?? raw?.thresholds_id ?? ''),
    user_id: String(raw?.user_id ?? raw?.userId ?? ''),
    neck_threshold: neck,
    upper_back_threshold: upper,
    shoulder_threshold: shoulder,
    updated_at: String(raw?.updated_at ?? raw?.updatedAt ?? ''),
  };
}

export async function getThresholds(token: string): Promise<Thresholds> {
  const { data } = await apiFetch<any>('/thresholds', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return normalizeThresholds(data);
}

export async function updateThresholds(
  token: string,
  payload: UpdateThresholdsPayload,
): Promise<Thresholds> {
  const { data } = await apiFetch<any>('/thresholds', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
  return normalizeThresholds(data);
}
