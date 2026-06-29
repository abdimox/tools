import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import app from './app';
import type { Env } from './env';

let miniflare: Miniflare;
let env: Env;
let adminCookie = '';
let employeeCookie = '';
let adminChatId = '';

async function api(path: string, init: RequestInit = {}, cookie = '') {
  const headers = new Headers(init.headers);
  if (cookie) headers.set('Cookie', cookie);
  return app.request(`http://local.test/api${path}`, { ...init, headers }, env);
}

beforeAll(async () => {
  miniflare = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: ['DB'],
    r2Buckets: ['FILES'],
  });
  const db = await miniflare.getD1Database('DB');
  for (const file of ['0001_initial.sql', '0002_login_attempts.sql']) {
    const migration = await readFile(new URL(`../../migrations/${file}`, import.meta.url), 'utf8');
    for (const statement of migration.split(';').map((item) => item.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  env = {
    DB: db,
    FILES: await miniflare.getR2Bucket('FILES'),
    AUTH_PEPPER: 'integration-auth-pepper-123456789',
    CONFIG_ENCRYPTION_KEY: 'integration-config-secret-123456789',
    BOOTSTRAP_ADMIN_PASSWORD: 'admin-test-password',
    ALLOWED_AI_HOSTS: 'llmhub.ltd',
  };
});

afterAll(async () => miniflare.dispose());

describe('Cloudflare team API integration', () => {
  it('bootstraps the administrator and creates an employee', async () => {
    const login = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'admin-test-password' }) });
    expect(login.status).toBe(200);
    adminCookie = login.headers.get('set-cookie')?.split(';')[0] || '';
    expect(adminCookie).toContain('loho_session=');

    const created = await api('/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: '员工甲', password: 'employee-test-password' }) }, adminCookie);
    expect(created.status).toBe(201);

    const employeeLogin = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'employee-test-password' }) });
    expect(employeeLogin.status).toBe(200);
    employeeCookie = employeeLogin.headers.get('set-cookie')?.split(';')[0] || '';
  });

  it('keeps each employee conversation list private', async () => {
    const created = await api('/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, adminCookie);
    const data = await created.json() as { conversation: { id: string } };
    adminChatId = data.conversation.id;

    const employeeList = await api('/chats', {}, employeeCookie);
    expect((await employeeList.json() as { conversations: unknown[] }).conversations).toEqual([]);

    const crossUserRead = await api(`/chats/${adminChatId}`, {}, employeeCookie);
    expect(crossUserRead.status).toBe(404);
  });

  it('blocks employee access to administrator endpoints', async () => {
    expect((await api('/admin/users', {}, employeeCookie)).status).toBe(403);
  });

  it('rejects duplicate employee passwords', async () => {
    const duplicate = await api('/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: '员工乙', password: 'employee-test-password' }) }, adminCookie);
    expect(duplicate.status).toBe(409);
  });

  it('rate limits repeated wrong passwords', async () => {
    for (let index = 0; index < 5; index += 1) {
      const failed = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.50' }, body: JSON.stringify({ password: `wrong-password-${index}` }) });
      expect(failed.status).toBe(401);
    }
    const blocked = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.50' }, body: JSON.stringify({ password: 'another-wrong-password' }) });
    expect(blocked.status).toBe(429);
  });
});
