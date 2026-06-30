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
  });
  const db = await miniflare.getD1Database('DB');
  for (const file of ['0001_initial.sql', '0002_login_attempts.sql', '0003_d1_image_blobs.sql']) {
    const migration = await readFile(new URL(`../../migrations/${file}`, import.meta.url), 'utf8');
    for (const statement of migration.split(';').map((item) => item.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  env = {
    DB: db,
    ASSETS: { fetch: async () => new Response('asset') } as Fetcher,
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

  it('stores chat images in D1 and protects them by owner', async () => {
    const messageId = crypto.randomUUID();
    const attachmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const admin = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin'").first<{ id: string }>();
    expect(admin).not.toBeNull();
    await env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(messageId, adminChatId, 'user', '图片', 'complete', now).run();
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await env.DB.prepare(`INSERT INTO message_attachments
      (id, message_id, owner_user_id, conversation_id, object_key, filename, mime_type, byte_size, created_at, blob_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(attachmentId, messageId, admin!.id, adminChatId, `d1:${attachmentId}`, 'test.png', 'image/png', bytes.byteLength, now, bytes.buffer).run();

    const ownerRead = await api(`/files/chat/${attachmentId}`, {}, adminCookie);
    expect(ownerRead.status).toBe(200);
    expect(new Uint8Array(await ownerRead.arrayBuffer())).toEqual(bytes);
    expect((await api(`/files/chat/${attachmentId}`, {}, employeeCookie)).status).toBe(404);
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
