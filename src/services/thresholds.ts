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

export async function getThresholds(token: string): Promise<Thresholds> {
  const { data } = await apiFetch<Thresholds>('/api/thresholds', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
}

export async function updateThresholds(
  token: string,
  payload: UpdateThresholdsPayload,
): Promise<Thresholds> {
  const { data } = await apiFetch<Thresholds>('/api/thresholds', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
  return data;
}

