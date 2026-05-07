import { apiFetch } from '@/src/services/api';

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  message: string;
  user_id: string;
};

export type ValidateResponse = {
  valid: boolean;
  user?: {
    userId?: string;
    email?: string;
  };
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  const { data } = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
  return data;
};

export const registerUser = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  const { data } = await apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
  return data;
};

export const validateToken = async (token: string): Promise<ValidateResponse> => {
  const { data } = await apiFetch<ValidateResponse>('/api/auth/validate', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};
