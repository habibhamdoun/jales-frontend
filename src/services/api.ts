declare const process: {
  env?: Record<string, string | undefined>;
};

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export class ApiError<T = unknown> extends Error {
  status: number;
  data: T;

  constructor(message: string, status: number, data: T) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const API_BASE_URL =
  process.env?.EXPO_PUBLIC_API_BASE_URL ||
  process.env?.EXPO_PUBLIC_JALES_API_URL ||
  '';

const joinUrl = (base: string, path: string) => {
  const safeBase = base.replace(/\/+$/, '');
  const safePath = path.replace(/^\/+/, '');
  return `${safeBase}/${safePath}`;
};

export const apiFetch = async <T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ response: Response; data: T }> => {
  if (!API_BASE_URL) {
    throw new Error(
      'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_JALES_API_URL).',
    );
  }

  const headers = new Headers(options.headers);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(joinUrl(API_BASE_URL, path), {
    ...options,
    headers,
    body,
  });

  const text = await response.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : (undefined as T);
  } catch {
    data = text as unknown as T;
  }

  if (!response.ok) {
    const message =
      (data as any)?.error || (data as any)?.message || response.statusText;
    throw new ApiError(
      typeof message === 'string' ? message : 'Request failed',
      response.status,
      data,
    );
  }

  return { response, data };
};
