import { apiFetch } from '@/src/services/api';

export type AuthUserDto = {
  id: string;
  name: string;
  email: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  created_at: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  token: string;
  user: AuthUserDto;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  // Optional initial thresholds; backend defaults apply for omitted fields
  upper_back_threshold?: number;
  shoulder_threshold?: number;
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  user: AuthUserDto;
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  const { data } = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
  return data;
};

export const registerUser = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  const { data } = await apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
  return data;
};
