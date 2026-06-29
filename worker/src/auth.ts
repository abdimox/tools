import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context, MiddlewareHandler } from 'hono';
import { hashPassword, passwordLookup, randomToken, sha256, verifyPassword } from './crypto';
import type { AppBindings, AuthUser } from './env';
import { AppError, nowIso, requireString } from './http';

const COOKIE_NAME = 'loho_session';
const SESSION_HOURS = 12;

interface UserRow {
  id: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  role: 'admin' | 'employee';
  active: number;
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.length < 16) throw new AppError(`Cloudflare Secret ${name} 未配置或长度不足。`, 'SERVER_NOT_CONFIGURED', 500);
  return value;
}

async function createUser(db: D1Database, pepper: string, input: { displayName: string; password: string; role: 'admin' | 'employee' }): Promise<AuthUser> {
  const displayName = requireString(input.displayName, '员工名称不能为空。', 1, 40);
  const password = requireString(input.password, '密码至少需要8个字符。', 8, 128);
  const lookup = await passwordLookup(password, pepper);
  const existing = await db.prepare('SELECT id FROM users WHERE password_lookup = ?').bind(lookup).first();
  if (existing) throw new AppError('这个密码已被其他员工使用，请设置不同密码。', 'PASSWORD_ALREADY_USED', 409);
  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = nowIso();
  await db.prepare(`INSERT INTO users (id, display_name, password_lookup, password_hash, password_salt, role, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`)
    .bind(id, displayName, lookup, hash, salt, input.role, now, now).run();
  return { id, displayName, role: input.role };
}

async function bootstrapAdmin(context: Context<AppBindings>, password: string): Promise<UserRow | null> {
  const count = await context.env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>();
  if (Number(count?.total || 0) !== 0) return null;
  const bootstrapPassword = context.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (!bootstrapPassword || password !== bootstrapPassword) return null;
  const pepper = requireSecret(context.env.AUTH_PEPPER, 'AUTH_PEPPER');
  const created = await createUser(context.env.DB, pepper, { displayName: '管理员', password, role: 'admin' });
  return context.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(created.id).first<UserRow>();
}

async function issueSession(context: Context<AppBindings>, user: UserRow): Promise<void> {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  await context.env.DB.batch([
    context.env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), user.id, tokenHash, expires.toISOString(), now.toISOString()),
    context.env.DB.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
      .bind(now.toISOString(), now.toISOString(), user.id),
  ]);
  setCookie(context, COOKIE_NAME, token, {
    httpOnly: true,
    secure: new URL(context.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

async function loginAttemptKey(context: Context<AppBindings>): Promise<string> {
  const source = context.req.header('CF-Connecting-IP') || context.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'local';
  return sha256(`login:${source}`);
}

async function assertLoginAllowed(context: Context<AppBindings>, attemptKey: string): Promise<void> {
  const attempt = await context.env.DB.prepare('SELECT failures, blocked_until FROM login_attempts WHERE attempt_key = ?').bind(attemptKey).first<{ failures: number; blocked_until: string | null }>();
  if (attempt?.blocked_until && attempt.blocked_until > nowIso()) throw new AppError('密码错误次数过多，请15分钟后再试。', 'LOGIN_RATE_LIMITED', 429);
}

async function recordLoginFailure(context: Context<AppBindings>, attemptKey: string): Promise<void> {
  const current = await context.env.DB.prepare('SELECT failures FROM login_attempts WHERE attempt_key = ?').bind(attemptKey).first<{ failures: number }>();
  const failures = Number(current?.failures || 0) + 1;
  const blockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  await context.env.DB.prepare(`INSERT INTO login_attempts (attempt_key, failures, blocked_until, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(attempt_key) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until, updated_at = excluded.updated_at`)
    .bind(attemptKey, failures, blockedUntil, nowIso()).run();
}

export async function login(context: Context<AppBindings>): Promise<Response> {
  const body: { password?: unknown } = await context.req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) throw new AppError('请输入密码。', 'INVALID_INPUT', 400);
  const attemptKey = await loginAttemptKey(context);
  await assertLoginAllowed(context, attemptKey);
  const pepper = requireSecret(context.env.AUTH_PEPPER, 'AUTH_PEPPER');
  const lookup = await passwordLookup(password, pepper);
  let user = await context.env.DB.prepare('SELECT * FROM users WHERE password_lookup = ?').bind(lookup).first<UserRow>();
  if (!user) user = await bootstrapAdmin(context, password);
  if (!user || !user.active || !(await verifyPassword(password, user.password_hash, user.password_salt))) {
    await recordLoginFailure(context, attemptKey);
    throw new AppError('密码错误或账号已停用。', 'LOGIN_FAILED', 401);
  }
  await context.env.DB.prepare('DELETE FROM login_attempts WHERE attempt_key = ?').bind(attemptKey).run();
  await issueSession(context, user);
  return context.json({ user: { id: user.id, displayName: user.display_name, role: user.role } });
}

export async function logout(context: Context<AppBindings>): Promise<Response> {
  const token = getCookie(context, COOKIE_NAME);
  if (token) await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  deleteCookie(context, COOKIE_NAME, { path: '/' });
  return context.json({ success: true });
}

export const requireAuth: MiddlewareHandler<AppBindings> = async (context, next) => {
  const token = getCookie(context, COOKIE_NAME);
  if (!token) throw new AppError('登录已失效，请重新输入密码。', 'UNAUTHORIZED', 401);
  const row = await context.env.DB.prepare(`SELECT users.id, users.display_name, users.role
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.active = 1`)
    .bind(await sha256(token), nowIso()).first<{ id: string; display_name: string; role: 'admin' | 'employee' }>();
  if (!row) {
    deleteCookie(context, COOKIE_NAME, { path: '/' });
    throw new AppError('登录已失效，请重新输入密码。', 'UNAUTHORIZED', 401);
  }
  context.set('user', { id: row.id, displayName: row.display_name, role: row.role });
  context.set('sessionToken', token);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppBindings> = async (context, next) => {
  if (context.get('user').role !== 'admin') throw new AppError('只有管理员可以执行此操作。', 'FORBIDDEN', 403);
  await next();
};

export function currentUser(context: Context<AppBindings>): Response {
  return context.json({ user: context.get('user') });
}

export async function listUsers(context: Context<AppBindings>): Promise<Response> {
  const result = await context.env.DB.prepare(`SELECT id, display_name, role, active, last_login_at, created_at, updated_at
    FROM users ORDER BY role = 'admin' DESC, created_at ASC`).all();
  return context.json({ users: result.results.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    active: Boolean(row.active),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) });
}

export async function addUser(context: Context<AppBindings>): Promise<Response> {
  const body: { displayName?: unknown; password?: unknown } = await context.req.json().catch(() => ({}));
  const pepper = requireSecret(context.env.AUTH_PEPPER, 'AUTH_PEPPER');
  const user = await createUser(context.env.DB, pepper, {
    displayName: typeof body.displayName === 'string' ? body.displayName : '',
    password: typeof body.password === 'string' ? body.password : '',
    role: 'employee',
  });
  return context.json({ user }, 201);
}

export async function updateUser(context: Context<AppBindings>): Promise<Response> {
  const id = context.req.param('id');
  const existing = await context.env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first<{ id: string; role: string }>();
  if (!existing) throw new AppError('员工不存在。', 'NOT_FOUND', 404);
  const body: { displayName?: unknown; password?: unknown; active?: unknown } = await context.req.json().catch(() => ({}));
  const displayName = body.displayName === undefined ? undefined : requireString(body.displayName, '员工名称不能为空。', 1, 40);
  const password = body.password === undefined || body.password === '' ? undefined : requireString(body.password, '密码至少需要8个字符。', 8, 128);
  const active = typeof body.active === 'boolean' ? body.active : undefined;
  if (existing.role === 'admin' && active === false) throw new AppError('不能停用当前管理员账号。', 'INVALID_INPUT', 400);
  const updates: string[] = [];
  const values: unknown[] = [];
  if (displayName !== undefined) { updates.push('display_name = ?'); values.push(displayName); }
  if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }
  if (password !== undefined) {
    const pepper = requireSecret(context.env.AUTH_PEPPER, 'AUTH_PEPPER');
    const lookup = await passwordLookup(password, pepper);
    const duplicate = await context.env.DB.prepare('SELECT id FROM users WHERE password_lookup = ? AND id <> ?').bind(lookup, id).first();
    if (duplicate) throw new AppError('这个密码已被其他员工使用，请设置不同密码。', 'PASSWORD_ALREADY_USED', 409);
    const { hash, salt } = await hashPassword(password);
    updates.push('password_lookup = ?', 'password_hash = ?', 'password_salt = ?');
    values.push(lookup, hash, salt);
  }
  if (updates.length === 0) throw new AppError('没有需要保存的修改。', 'INVALID_INPUT', 400);
  updates.push('updated_at = ?'); values.push(nowIso(), id);
  await context.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  if (password !== undefined || active === false) await context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  return context.json({ success: true });
}

export const authInternals = { createUser };
