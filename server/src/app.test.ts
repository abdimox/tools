import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { initializeTempDirectories } from './cleanupService.js';

describe('API', () => {
  const app = createApp();
  let token = '';

  beforeAll(async () => {
    process.env.APP_PASSWORD = 'api-test-password';
    process.env.AUTH_SECRET = 'api-test-secret';
    await initializeTempDirectories();
    const response = await request(app).post('/api/auth/login').send({ password: 'api-test-password' });
    token = response.body.token;
  });

  it('rejects a wrong password', async () => {
    const response = await request(app).post('/api/auth/login').send({ password: 'wrong' });
    expect(response.status).toBe(401);
  });

  it('protects workbench routes', async () => {
    const response = await request(app).post('/api/generate-note').field('businessType', 'diy').field('caseBrief', '广州企业团建活动');
    expect(response.status).toBe(401);
  });

  it('generates a complete note result', async () => {
    const response = await request(app)
      .post('/api/generate-note')
      .set('Authorization', `Bearer ${token}`)
      .field('businessType', 'diy')
      .field('caseBrief', '广州某企业80人香薰蜡烛DIY团建');
    expect(response.status).toBe(200);
    expect(response.body.titles).toHaveLength(30);
    expect(response.body.copyVersions).toHaveLength(5);
  });

  it('analyzes account screenshots', async () => {
    const image = await sharp({ create: { width: 200, height: 300, channels: 3, background: '#f26b3a' } }).jpeg().toBuffer();
    const response = await request(app)
      .post('/api/analyze-account')
      .set('Authorization', `Bearer ${token}`)
      .attach('screenshots', image, { filename: 'account.jpg', contentType: 'image/jpeg' });
    expect(response.status).toBe(200);
    expect(response.body.actionPlan14Days).toHaveLength(5);
  });

  it('analyzes competitor input', async () => {
    const response = await request(app)
      .post('/api/analyze-competitor')
      .set('Authorization', `Bearer ${token}`)
      .field('businessType', 'photobooth')
      .field('title', 'HR收藏！9个年会互动灵感');
    expect(response.status).toBe(200);
    expect(response.body.adaptedTitles.photobooth.length).toBeGreaterThan(0);
  });

  it('creates and serves a demo cover', async () => {
    const image = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#d9b48f' } }).jpeg().toBuffer();
    const generated = await request(app)
      .post('/api/generate-cover-image')
      .set('Authorization', `Bearer ${token}`)
      .field('businessType', 'diy')
      .field('caseBrief', '广州企业团建')
      .field('coverText', '员工参与度真的高')
      .attach('baseImage', image, { filename: 'activity.jpg', contentType: 'image/jpeg' });
    expect(generated.status).toBe(200);
    expect(path.extname(generated.body.filename)).toBe('.png');
    const served = await request(app).get(generated.body.imageUrl).set('Authorization', `Bearer ${token}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
  });
});

