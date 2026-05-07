declare const process: {
  env?: Record<string, string | undefined>;
};

const AUTH_API_URL = process.env?.EXPO_PUBLIC_JALES_AUTH_API_URL;

export interface LoginPayload {
  email: string;
  password: string;
}

export const loginUser = async (payload: LoginPayload): Promise<void> => {
  if (!AUTH_API_URL) {
    console.log('Login payload ready for backend:', payload);
    return;
  }

  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }
};

export const registerUser = async (payload: unknown): Promise<void> => {
  if (!AUTH_API_URL) {
    console.log('Registration payload ready for backend:', payload);
    return;
  }

  const response = await fetch(`${AUTH_API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }
};
