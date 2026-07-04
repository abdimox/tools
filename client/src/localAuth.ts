import type { AuthUser } from './types';

const PASSWORD_KEY = 'loho-local-password-v1';
const SESSION_KEY = 'loho-local-unlocked';
const localUser: AuthUser = { id: 'local-user', displayName: '本机用户', role: 'admin' };

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`loho-xhs-local:${value}`);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((item) => item.toString(16).padStart(2, '0')).join('');
}

export function getCurrentUser(): AuthUser | null {
  return sessionStorage.getItem(SESSION_KEY) === 'yes' ? localUser : null;
}

export function hasLocalPassword(): boolean {
  return Boolean(localStorage.getItem(PASSWORD_KEY));
}

export async function login(password: string): Promise<{ user: AuthUser; created: boolean }> {
  if (password.length < 4) throw new Error('本地密码至少输入4个字符。');
  const incoming = await digest(password);
  const saved = localStorage.getItem(PASSWORD_KEY);
  if (saved && saved !== incoming) throw new Error('密码不正确。');
  if (!saved) localStorage.setItem(PASSWORD_KEY, incoming);
  sessionStorage.setItem(SESSION_KEY, 'yes');
  return { user: localUser, created: !saved };
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function changeLocalPassword(current: string, next: string): Promise<void> {
  const saved = localStorage.getItem(PASSWORD_KEY);
  if (saved && await digest(current) !== saved) throw new Error('原密码不正确。');
  if (next.length < 4) throw new Error('新密码至少输入4个字符。');
  localStorage.setItem(PASSWORD_KEY, await digest(next));
}
