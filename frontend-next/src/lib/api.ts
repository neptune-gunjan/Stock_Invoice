/**
 * HTTP client for the FastAPI backend.
 *
 * In dev, VITE_API_BASE_URL is left empty and requests go to same-origin
 * paths (/auth, /stock, ...) which Vite's proxy forwards to the backend.
 * For a production build, set VITE_API_BASE_URL to the API origin.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const TOKEN_KEY = 'access_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('token_type');
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Plain object / array is JSON-encoded; a FormData is sent as-is. */
  body?: unknown;
  auth?: boolean;
}

async function raw(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;

  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth) {
    clearToken();
    if (!location.pathname.startsWith('/login') && location.pathname !== '/') {
      location.assign('/');
    }
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === 'string') detail = payload.detail;
      else if (Array.isArray(payload?.detail)) {
        detail = payload.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join('; ') || detail;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, detail);
  }

  return response;
}

export async function apiJson<T>(path: string, options?: Options): Promise<T> {
  const response = await raw(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiBlob(path: string, options?: Options): Promise<Blob> {
  const response = await raw(path, options);
  return response.blob();
}

export async function apiVoid(path: string, options?: Options): Promise<void> {
  await raw(path, options);
}
