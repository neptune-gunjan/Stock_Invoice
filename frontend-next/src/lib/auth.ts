/**
 * Authentication against the FastAPI backend (JWT bearer tokens).
 *
 * The backend has no password-reset flow, so sendPasswordReset is a no-op
 * kept only so the Forgot Password screen can render.
 */

import { apiJson, clearToken, getToken, setToken } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  business_id: string | null;
  is_active: boolean;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

const USER_KEY = 'auth_user';

export const hasSession = () => Boolean(getToken());

export const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

const persist = (res: TokenResponse) => {
  setToken(res.access_token);
  localStorage.setItem('token_type', res.token_type);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
};

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const res = await apiJson<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  persist(res);
  return res.user;
}

/**
 * Registers the account, then signs in so the caller lands with a session.
 * `shopName` maps to the backend's required `business_name`.
 */
export async function signUp(
  name: string,
  shopName: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  await apiJson('/auth/register', {
    method: 'POST',
    auth: false,
    body: { name, email, password, business_name: shopName },
  });
  return signIn(email, password);
}

export async function refreshUser(): Promise<AuthUser> {
  const user = await apiJson<AuthUser>('/auth/me');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function sendPasswordReset(_email: string): Promise<void> {
  throw new Error('Password reset is not available yet. Please contact your administrator.');
}

export function clearSession() {
  clearToken();
  localStorage.removeItem(USER_KEY);
}
