import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConfigInternals, getAiConfig, saveAiConfig } from './aiConfigService.js';
import { createToken, verifyAdminPassword, verifyPassword, verifyToken } from './authService.js';
import { checkCompliance } from './complianceService.js';
import { LlmHubProvider } from './llmHubProvider.js';
import { humanizerRules, noteDraftPrompt } from './prompts.js';
import type { AiConfig } from './types.js';

const config: AiConfig = { baseUrl: 'https://llmhub.ltd/v1', textApiKey: 'sk-text-secret', imageApiKey: 'sk-image-secret', textModel: 'gpt-5.5', imageModel: 'gpt-image-2', timeoutMs: 20000, enabled: true, updatedAt: new Date().toISOString() };
const jsonResponse = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
const chatResponse = (value: unknown) => jsonResponse({ choices: [{ message: { content: JSON.stringify(value) } }] });

describe('security and configuration', () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = 'test-password'; process.env.ADMIN_PASSWORD = 'admin-password'; process.env.AUTH_SECRET = 'test-secret';
    process.env.CONFIG_ENCRYPTION_KEY = 'encryption-test-secret'; delete process.env.AI_API_KEY; delete process.env.AI_TEXT_API_KEY; delete process.env.AI_IMAGE_API_KEY;
    process.env.ALLOWED_AI_HOSTS = 'llmhub.ltd';
    process.env.AI_CONFIG_PATH = path.join(os.tmpdir(), `loho-ai-config-${Date.now()}-${Math.random()}.json`);
  });
  afterEach(async () => { if (process.env.AI_CONFIG_PATH) await fs.rm(process.env.AI_CONFIG_PATH, { force: true }); });

  it('separates workbench and admin tokens', () => {
    expect(verifyPassword('test-password')).toBe(true); expect(verifyAdminPassword('admin-password')).toBe(true);
    const workbench = createToken('workbench'); const admin = createToken('admin');
    expect(verifyToken(workbench, 'workbench')).toBe(true); expect(verifyToken(workbench, 'admin')).toBe(false);
    expect(verifyToken(admin, 'admin')).toBe(true);
  });

  it('encrypts config and never stores the API key as plaintext', async () => {
    await saveAiConfig(config);
    const raw = await fs.readFile(process.env.AI_CONFIG_PATH!, 'utf8');
    expect(raw).not.toContain('sk-text-secret'); expect(raw).not.toContain('sk-image-secret'); expect(raw).not.toContain('llmhub');
    const loaded = await getAiConfig();
    expect(loaded.config.textApiKey).toBe('sk-text-secret'); expect(loaded.config.imageApiKey).toBe('sk-image-secret'); expect(loaded.source).toBe('encrypted-file');
  });

  it('migrates an encrypted legacy API key to both dedicated key fields', async () => {
    const legacy = { ...config, textApiKey: undefined, imageApiKey: undefined, apiKey: 'sk-legacy-secret' } as unknown as AiConfig;
    await fs.writeFile(process.env.AI_CONFIG_PATH!, aiConfigInternals.encrypt(legacy));
    const loaded = await getAiConfig();
    expect(loaded.config.textApiKey).toBe('sk-legacy-secret'); expect(loaded.config.imageApiKey).toBe('sk-legacy-secret');
  });

  it('normalizes the llmhub base URL and masks keys', () => {
    expect(aiConfigInternals.normalizeBaseUrl('https://llmhub.ltd')).toBe('https://llmhub.ltd/v1');
    expect(aiConfigInternals.maskKey('sk-123456789')).toBe('sk-****6789');
    expect(() => aiConfigInternals.normalizeBaseUrl('http://example.com')).toThrow('HTTPS');
  });

  it('finds prohibited lead-generation phrases', () => {
    const result = checkCompliance({ 正文: '想了解可以私信我，扫码获取资料。' });
    expect(result.isSafe).toBe(false); expect(result.riskyWords).toContain('私信我'); expect(result.riskyWords).toContain('扫码');
  });
});

describe('LlmHubProvider', () => {
  it('uses two real model passes and returns exactly 3 titles and one body', async () => {
    const draft = { audienceIntent: '延长客户停留并增加亲子互动', titles: ['标题1', '标题2', '标题3'], recommendedTitle: 0, body: '初稿', tags: Array.from({ length: 8 }, (_, i) => `#话题${i}`) };
    const reviewed = { ...draft, body: '这次楼盘周末安排了一场香薰蜡烛DIY。来访家庭可以坐下来完成一件作品，活动过程给现场留出了自然交流的时间。', reviewChecks: ['场景一致', '未编造数据', '已去除AI腔'] };
    const fetchMock = vi.fn().mockResolvedValueOnce(chatResponse(draft)).mockResolvedValueOnce(chatResponse(reviewed));
    const result = await new LlmHubProvider(config, fetchMock).generateNote({ businessType: 'diy', scene: 'property', caseBrief: '广州楼盘亲子香薰蜡烛DIY' });
    expect(result.titles).toHaveLength(3); expect(result.tags).toHaveLength(8); expect(result.sceneLabel).toBe('楼盘');
    expect(result.fullCopy).toContain('#话题0'); expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer sk-text-secret');
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(secondBody.messages[1].content).toContain('Humanizer');
  });

  it('builds explicit customer-purpose and humanizer prompts', () => {
    const prompt = noteDraftPrompt('diy', 'auto4s', '广州4S店亲子手作活动');
    expect(prompt).toContain('改善到店等待'); expect(prompt).toContain('4S店');
    expect(humanizerRules).toContain('否定式排比');
  });

  it('analyzes every cover image and returns editable prompt data', async () => {
    const response = { bestImageIndex: 1, imageAnalysis: [{ imageIndex: 0, observation: '桌面细节', recommendation: '内页', score: 75 }, { imageIndex: 1, observation: '亲子互动清楚', recommendation: '封面', score: 92 }], coverTexts: ['周末在商场做手作', '亲子真的愿意停下来', '商场活动这样更自然'], recommendedCoverText: 1, prompt: '保留亲子互动主体，提亮画面', negativePrompt: '不改变人物五官' };
    const fetchMock = vi.fn().mockResolvedValue(chatResponse(response));
    const images = [{ name: '1.jpg', mimeType: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,AA==' }, { name: '2.jpg', mimeType: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,AA==' }];
    const result = await new LlmHubProvider(config, fetchMock).generateCoverPrompt({ businessType: 'diy', scene: 'mall', caseBrief: '商场亲子DIY', images });
    expect(result.bestImageIndex).toBe(1); expect(result.coverTexts).toHaveLength(3); expect(result.imageAnalysis).toHaveLength(2);
  });

  it('tests text and image keys independently', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: '连接成功' } }] }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: 'gpt-image-2' }] }));
    const provider = new LlmHubProvider(config, fetchMock);
    await expect(provider.testTextConnection()).resolves.toMatchObject({ authenticated: true, model: 'gpt-5.5' });
    await expect(provider.testImageConnection()).resolves.toMatchObject({ authenticated: true, imageModelAvailable: true });
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer sk-text-secret');
    expect((fetchMock.mock.calls[1][1]?.headers as Record<string, string>).Authorization).toBe('Bearer sk-image-secret');
  });
});
