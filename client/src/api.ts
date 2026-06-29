import type { AuthUser } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('loho-auth-expired'));
    throw new Error(data.message || '请求失败，请稍后重试。');
  }
  return data as T;
}

export async function login(password: string): Promise<{ user: AuthUser }> {
  return parseResponse(await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
  }));
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  if (response.status === 401) return null;
  return (await parseResponse<{ user: AuthUser }>(response)).user;
}

export async function requestJson<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET', credentials: 'include',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return parseResponse<T>(response);
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, { method: 'POST', body });
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  return parseResponse(await fetch(`${API_BASE}${path}`, { method: 'POST', credentials: 'include', body: form }));
}

export async function adminRequest<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  return requestJson<T>(path, options);
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) throw new Error('图片已过期或不存在，请重新生成。');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

export async function createFilePreviewUrl(path: string): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) throw new Error('图片已过期或不存在，请重新生成。');
  return URL.createObjectURL(await response.blob());
}
