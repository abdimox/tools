import { describe, expect, it } from 'vitest';
import { aiConfigInternals } from './ai-config';
import type { Env } from './env';

const env = { ALLOWED_AI_HOSTS: 'llmhub.ltd' } as Env;

describe('cloudflare ai config', () => {
  it('normalizes the llmhub v1 URL', () => {
    expect(aiConfigInternals.normalizeBaseUrl('https://llmhub.ltd', 'llmhub.ltd')).toBe('https://llmhub.ltd/v1');
  });

  it('rejects unapproved AI hosts', () => {
    expect(() => aiConfigInternals.normalizeBaseUrl('https://example.com/v1', 'llmhub.ltd')).toThrow('不在允许列表');
  });

  it('validates split keys and masks them independently', () => {
    const config = aiConfigInternals.validate({ baseUrl: 'https://llmhub.ltd/v1', textApiKey: 'text-123456789', imageApiKey: 'image-123456789', textModel: 'gpt-5.5', imageModel: 'gpt-image-2', timeoutMs: 120000 }, env);
    const status = aiConfigInternals.toStatus(config, 'encrypted-d1');
    expect(status.textApiKeyMasked).not.toBe(status.imageApiKeyMasked);
    expect(status.configured).toBe(true);
  });
});
