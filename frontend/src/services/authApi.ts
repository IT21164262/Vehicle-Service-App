import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!configured) throw new Error('Set EXPO_PUBLIC_API_URL in frontend/.env to your backend URL ending in /api.');
  let url: URL;
  try { url = new URL(configured); }
  catch { throw new Error('EXPO_PUBLIC_API_URL must be a valid HTTP or HTTPS URL ending in /api.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/api')) {
    throw new Error('EXPO_PUBLIC_API_URL must be an HTTP or HTTPS URL ending in /api, without credentials, query, or fragment.');
  }
  if (!__DEV__ && url.protocol !== 'https:') throw new Error('Use HTTPS for EXPO_PUBLIC_API_URL in production.');
  return `${configured}/auth`;
}

export type AuthUser = { id: string; name: string; email: string; isAdmin: boolean };
type AuthResponse = { message: string; token?: string; user: AuthUser };
const REQUEST_TIMEOUT_MS = 15000;
// Scope sessions to the backend so changing environments never forwards an old token.
const storageKey = () => `autonexa.session.${encodeURIComponent(getApiBaseUrl()).replace(/[^a-zA-Z0-9.-]/g, char => `_${char.charCodeAt(0).toString(16)}_`)}`;
let authToken: string | null = null;
let loaded = false;
let sessionQueue: Promise<unknown> = Promise.resolve();
let sessionRevision = 0;

function serial<T>(action: () => Promise<T>): Promise<T> {
  const pending = sessionQueue.then(action);
  sessionQueue = pending.catch(() => undefined);
  return pending;
}

export function getAuthToken(): Promise<string | null> {
  return serial(async () => {
    if (!loaded) {
      authToken = Platform.OS === 'web'
        ? window.localStorage.getItem(storageKey())
        : await SecureStore.getItemAsync(storageKey());
      loaded = true;
    }
    return authToken;
  });
}

async function saveToken(token: string | null) {
  return serial(async () => {
    const key = storageKey();
    if (Platform.OS === 'web') {
      if (token) window.localStorage.setItem(key, token);
      else window.localStorage.removeItem(key);
    } else if (token) {
      await SecureStore.setItemAsync(key, token);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
    authToken = token;
    loaded = true;
  });
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, body?: Record<string, unknown>, token?: string, method?: string, resource = false): Promise<T> {
  const base = resource ? getApiBaseUrl().replace(/\/auth$/, '') : getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (response.status === 204 && response.ok) return undefined as T;
    const data = await response.json().catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      return null;
    });
    if (!response.ok) throw new ApiError(typeof data?.message === 'string' ? data.message : 'The request failed. Please try again.', response.status);
    if (!data || typeof data !== 'object') throw new Error('The service returned an invalid response.');
    return data as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The service took too long to respond. Please try again.');
    if (error instanceof TypeError) throw new Error('Unable to reach the service. Check your connection and API configuration.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function validUser(user: AuthUser | undefined): user is AuthUser {
  return !!user && typeof user.id === 'string' && typeof user.name === 'string' && typeof user.email === 'string' && typeof user.isAdmin === 'boolean';
}

const sessionListeners = new Set<(user: AuthUser | null) => void>();
export function subscribeSession(listener: (user: AuthUser | null) => void) {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}
function notifySession(user: AuthUser | null) {
  sessionListeners.forEach(listener => listener(user));
}

export async function authenticatedRequest<T>(path: string, method = 'GET', body?: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    notifySession(null);
    throw new ApiError('Please log in again.', 401);
  }
  try { return await request<T>(path, body, token, method, true); }
  catch (error) {
    if (error instanceof ApiError && error.status === 401 && authToken === token) await logout();
    if (error instanceof ApiError && error.status === 403 && authToken === token) await getCurrentUser().catch(() => undefined);
    throw error;
  }
}

export function authenticatedUpload<T>(path: string, file: { uri: string; name: string; type: string; file?: Blob }, onProgress?: (value: number) => void): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const token = await getAuthToken();
    if (!token) return reject(new ApiError('Please log in again.', 401));
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    if (file.file) form.append('image', file.file, file.name);
    else form.append('image', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    xhr.open('POST', `${getApiBaseUrl().replace(/\/auth$/, '')}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new Error('Unable to reach the service. Check your connection and API configuration.'));
    xhr.ontimeout = () => reject(new Error('The upload took too long to complete. Please try again.'));
    xhr.timeout = REQUEST_TIMEOUT_MS;
    xhr.onload = () => {
      let data: unknown;
      try { data = JSON.parse(xhr.responseText); } catch { data = null; }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : 'The upload failed. Please try again.', xhr.status));
        return;
      }
      resolve(data as T);
    };
    xhr.send(form);
  });
}
export async function getCurrentUser() {
  const token = await getAuthToken();
  if (!token) throw new Error('You are not logged in.');
  try {
    const data = await request<{ user: AuthUser }>('/me', undefined, token);
    if (!validUser(data.user)) throw new Error('The service returned an invalid account.');
    if (authToken !== token) throw new Error('Session changed. Please try again.');
    notifySession(data.user);
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && authToken === token) await logout();
    throw error;
  }
}

export async function restoreSession(): Promise<AuthUser | null> {
  if (!await getAuthToken()) return null;
  try { return await getCurrentUser(); }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>('/register', { name, email, password });
}

export async function login(email: string, password: string) {
  const revision = ++sessionRevision;
  const response = await request<AuthResponse>('/login', { email, password });
  if (!response.token || typeof response.token !== 'string' || !validUser(response.user)) throw new Error('The service returned an invalid login response.');
  if (revision !== sessionRevision) throw new Error('Login was cancelled. Please try again.');
  await saveToken(response.token);
  return response;
}

export async function logout() {
  ++sessionRevision;
  authToken = null;
  try { await saveToken(null); }
  finally { notifySession(null); }
}

export function forgotPassword(email: string) {
  return request<{ message: string }>('/forgot-password', { email });
}

export async function resetPassword(token: string, password: string) {
  const result = await request<{ message: string }>('/reset-password', { token: token.trim(), password });
  await logout();
  return result;
}
