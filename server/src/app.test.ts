import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { initializeTempDirectories } from './cleanupService.js';

const jsonResponse = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
const chatResponse = (value: unknown) => jsonResponse({ choices: [{ message: { content: JSON.stringify(value) } }] });
const tags = Array.from({ length: 8 }, (_, i) => `#话题${i}`);

describe('real AI API routes', () => {
  const app = createApp(); let token = ''; let adminToken = '';
  beforeAll(async () => {
    process.env.APP_PASSWORD = 'api-test-password'; process.env.ADMIN_PASSWORD = 'admin-test-password'; process.env.AUTH_SECRET = 'api-test-secret';
    process.env.AI_API_KEY = 'sk-test'; process.env.AI_API_BASE_URL = 'https://mock.invalid/v1'; process.env.AI_TEXT_MODEL = 'gpt-5.5'; process.env.AI_IMAGE_MODEL = 'gpt-image-2';
    process.env.ALLOWED_AI_HOSTS = 'mock.invalid';
    await initializeTempDirectories();
    token = (await request(app).post('/api/auth/login').send({ password: 'api-test-password' })).body.token;
    adminToken = (await request(app).post('/api/admin/login').send({ password: 'admin-test-password' })).body.token;
  });
  beforeEach(() => vi.restoreAllMocks());

  it('protects normal and admin routes with separate scopes', async () => {
    expect((await request(app).post('/api/generate-note').send({})).status).toBe(401);
    expect((await request(app).get('/api/admin/ai-config').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    expect((await request(app).get('/api/admin/ai-config').set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
  });

  it('generates a note without image upload', async () => {
    const draft = { audienceIntent: '客户停留', titles: ['A', 'B', 'C'], recommendedTitle: 0, body: '初稿', tags };
    const reviewed = { ...draft, body: '楼盘周末安排了一场亲子手作活动。来访家庭可以坐下来完成作品，也给置业顾问留出了自然交流的时间。', reviewChecks: ['场景一致'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(chatResponse(draft)).mockResolvedValueOnce(chatResponse(reviewed)));
    const response = await request(app).post('/api/generate-note').set('Authorization', `Bearer ${token}`).send({ businessType: 'diy', scene: 'property', caseBrief: '广州楼盘亲子手作活动' });
    expect(response.status).toBe(200); expect(response.body.titles).toHaveLength(3); expect(response.body.fullCopy).toContain('#话题0');
  });

  it('rejects a missing or mismatched scene', async () => {
    const response = await request(app).post('/api/generate-note').set('Authorization', `Bearer ${token}`).send({ businessType: 'diy', scene: 'wedding', caseBrief: '广州活动案例' });
    expect(response.status).toBe(400); expect(response.body.message).toContain('场景');
  });

  it('analyzes account screenshots with evidence', async () => {
    const image = await sharp({ create: { width: 200, height: 300, channels: 3, background: '#f26b3a' } }).jpeg().toBuffer();
    const analysis = { summary: '定位需要更清楚', evidence: [{ screenshot: 1, observation: '简介未显示服务城市', confidence: 'high' }], diagnosis: [{ issue: '城市信息缺失', evidence: '截图1简介区域', priority: 'high', confidence: 'high' }], profileSuggestions: ['补充服务城市'], titleSuggestions: ['加入本地词'], coverSuggestions: ['统一标题'], contentColumns: ['真实案例'], riskWarnings: ['避免导流'], unknowns: ['无法判断收藏率'], actionPlan14Days: [{ days: '第1-2天', action: '修改简介' }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(chatResponse(analysis)));
    const response = await request(app).post('/api/analyze-account').set('Authorization', `Bearer ${token}`).attach('screenshots', image, { filename: 'account.jpg', contentType: 'image/jpeg' });
    expect(response.status).toBe(200); expect(response.body.evidence[0].observation).toContain('服务城市');
  });

  it('analyzes competitor material for the selected scene', async () => {
    const analysis = { summary: '标题信息明确', evidence: [], titleStructure: '人群+数量+场景', coverStructure: '真实图+大字', contentStructure: ['痛点', '案例'], viralReasons: [{ reason: '便于收藏', basis: '标题包含清单', kind: 'inference' }], audienceQuality: 'HR精准流量', imitationSuggestions: ['借鉴信息结构'], avoidCopying: ['不照抄原句'], adaptedTitles: ['A', 'B', 'C'], adaptedCopyAngle: '从商场停留体验切入', risks: ['避免导流'], unknowns: ['无后台数据'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(chatResponse(analysis)));
    const response = await request(app).post('/api/analyze-competitor').set('Authorization', `Bearer ${token}`).field('businessType', 'diy').field('scene', 'mall').field('caseBrief', '广州商场亲子手作活动').field('title', '9个亲子活动灵感');
    expect(response.status).toBe(200); expect(response.body.adaptedTitles).toHaveLength(3);
  });

  it('generates a real-provider cover and serves the final 3:4 file', async () => {
    const source = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#d9b48f' } }).jpeg().toBuffer();
    const generated = await sharp({ create: { width: 768, height: 1024, channels: 3, background: '#e6c39f' } }).png().toBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [{ b64_json: generated.toString('base64') }] })));
    const response = await request(app).post('/api/generate-cover-image').set('Authorization', `Bearer ${token}`).field('businessType', 'diy').field('scene', 'mall').field('caseBrief', '广州商场亲子手作活动').field('coverText', '亲子真的愿意停下来').field('prompt', '保留亲子互动主体并提亮').field('negativePrompt', '不改变人物').attach('baseImage', source, { filename: 'activity.jpg', contentType: 'image/jpeg' });
    expect(response.status).toBe(200);
    const served = await request(app).get(response.body.imageUrl).set('Authorization', `Bearer ${token}`);
    expect(served.status).toBe(200); expect(served.headers['content-type']).toContain('image/png');
  });
});
