import { describe, expect, it } from 'vitest';
import { LlmHubProvider } from './llmhub';
import type { AiConfig } from './types';

const config: AiConfig = {
  baseUrl: 'https://llmhub.ltd/v1', textApiKey: 'text-key', imageApiKey: 'image-key',
  textModel: 'gpt-5.5', imageModel: 'gpt-image-2', timeoutMs: 20_000, enabled: true, updatedAt: '',
};

function chatResponse(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('llmhub worker provider', () => {
  it('calls fetch with the Cloudflare global as this', async () => {
    let observedThis: unknown;
    const fetchMock = function (this: unknown) {
      observedThis = this;
      return Promise.resolve(chatResponse('连接成功'));
    } as typeof fetch;
    await new LlmHubProvider(config, fetchMock).testTextConnection();
    expect(observedThis).toBe(globalThis);
  });

  it('uses two text calls and returns exactly three titles with inline topics', async () => {
    const calls: RequestInit[] = [];
    const fetchMock: typeof fetch = async (_url, init) => {
      calls.push(init || {});
      if (calls.length === 1) return chatResponse({ audienceIntent: '商场希望顾客愿意停留', titles: ['a', 'b', 'c'], recommendedTitle: 0, body: 'draft', tags: Array(8).fill('#tag') });
      return chatResponse({ audienceIntent: '商场运营希望活动自然延长家庭停留', titles: ['商场亲子活动，先解决参与门槛', '顾客愿意停下来的手作区怎么安排', '一场手作活动如何配合商场动线'], recommendedTitle: 1, body: '正文内容', tags: ['#商场活动', '#亲子活动', '#手作DIY', '#活动策划', '#商场运营', '#线下活动', '#广州活动', '#创意活动'], reviewChecks: ['受众与动机', '自然表达'] });
    };
    const result = await new LlmHubProvider(config, fetchMock).generateNote({ businessType: 'diy', scene: 'mall', caseBrief: '广州商场周末亲子手作' });
    expect(result.titles).toHaveLength(3);
    expect(result.fullCopy).toContain('#商场活动');
    expect(calls).toHaveLength(2);
    expect(new Headers(calls[0].headers).get('Authorization')).toBe('Bearer text-key');
  });

  it('uses only the image key for cover generation', async () => {
    let authorization = '';
    const fetchMock: typeof fetch = async (_url, init) => {
      authorization = new Headers(init?.headers).get('Authorization') || '';
      return new Response(JSON.stringify({ data: [{ b64_json: 'aW1hZ2U=' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const image = new File([new Uint8Array([1, 2, 3])], 'reference.png', { type: 'image/png' });
    const result = await new LlmHubProvider(config, fetchMock).generateImage({ image, prompt: '保持人物，优化构图' });
    expect(authorization).toBe('Bearer image-key');
    expect(new TextDecoder().decode(result.bytes)).toBe('image');
  });

  it('reports which key failed authentication', async () => {
    const fetchMock: typeof fetch = async () => new Response('unauthorized', { status: 401 });
    await expect(new LlmHubProvider(config, fetchMock).testTextConnection()).rejects.toThrow('文字/视觉 API Key');
    await expect(new LlmHubProvider(config, fetchMock).testImageConnection()).rejects.toThrow('图片 API Key');
  });
});
