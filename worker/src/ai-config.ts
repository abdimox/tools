import type { Context } from 'hono';
import { decryptJson, encryptJson } from './crypto';
import type { AppBindings, Env } from './env';
import { AppError, nowIso } from './http';
import type { AiConfig, AiConfigStatus } from './types';

type KeyKind = 'text' | 'image';

const defaults: AiConfig = {
  baseUrl: 'https://llmhub.ltd/v1',
  textApiKey: '',
  imageApiKey: '',
  textModel: 'gpt-5.5',
  imageModel: 'gpt-image-2',
  timeoutMs: 120_000,
  enabled: false,
  updatedAt: '',
};

function normalizeBaseUrl(value: string, allowedHosts = 'llmhub.ltd'): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new AppError('接口地址必须使用 HTTPS。', 'INVALID_AI_CONFIG');
  const allowed = allowedHosts.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(url.hostname.toLowerCase()) && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new AppError(`接口域名不在允许列表中：${url.hostname}`, 'INVALID_AI_CONFIG');
  }
  const path = url.pathname.replace(/\/$/, '');
  url.pathname = path.endsWith('/v1') ? path : `${path}/v1`.replace('//', '/');
  url.search = ''; url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function validate(input: Partial<AiConfig>, env: Env): AiConfig {
  const textModel = String(input.textModel || '').trim();
  const imageModel = String(input.imageModel || '').trim();
  if (!textModel || !imageModel) throw new AppError('文字模型和图片模型不能为空。', 'INVALID_AI_CONFIG');
  const timeoutMs = Number(input.timeoutMs || defaults.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 300_000) throw new AppError('请求超时必须在10秒到300秒之间。', 'INVALID_AI_CONFIG');
  return {
    baseUrl: normalizeBaseUrl(String(input.baseUrl || defaults.baseUrl), env.ALLOWED_AI_HOSTS),
    textApiKey: String(input.textApiKey || '').trim(),
    imageApiKey: String(input.imageApiKey || '').trim(),
    textModel,
    imageModel,
    timeoutMs,
    enabled: input.enabled !== false,
    updatedAt: nowIso(),
  };
}

function environmentConfig(env: Env): AiConfig | null {
  if (!env.AI_TEXT_API_KEY && !env.AI_IMAGE_API_KEY) return null;
  return validate({
    baseUrl: env.AI_API_BASE_URL || defaults.baseUrl,
    textApiKey: env.AI_TEXT_API_KEY || '',
    imageApiKey: env.AI_IMAGE_API_KEY || '',
    textModel: env.AI_TEXT_MODEL || defaults.textModel,
    imageModel: env.AI_IMAGE_MODEL || defaults.imageModel,
    timeoutMs: Number(env.AI_REQUEST_TIMEOUT_MS || defaults.timeoutMs),
    enabled: true,
  }, env);
}

export async function getAiConfig(env: Env): Promise<{ config: AiConfig; source: AiConfigStatus['source'] }> {
  const fromEnvironment = environmentConfig(env);
  if (fromEnvironment) return { config: fromEnvironment, source: 'environment' };
  const row = await env.DB.prepare('SELECT encrypted_payload FROM ai_config WHERE id = 1').first<{ encrypted_payload: string }>();
  if (!row) return { config: defaults, source: 'defaults' };
  if (!env.CONFIG_ENCRYPTION_KEY || env.CONFIG_ENCRYPTION_KEY.length < 16) throw new AppError('CONFIG_ENCRYPTION_KEY 未配置或长度不足。', 'SERVER_NOT_CONFIGURED', 500);
  try {
    return { config: await decryptJson<AiConfig>(row.encrypted_payload, env.CONFIG_ENCRYPTION_KEY), source: 'encrypted-d1' };
  } catch {
    throw new AppError('接口配置无法解密，请检查 CONFIG_ENCRYPTION_KEY 是否改变。', 'AI_CONFIG_DECRYPT_FAILED', 500);
  }
}

export async function getActiveAiConfig(env: Env, kind: KeyKind): Promise<AiConfig> {
  const { config } = await getAiConfig(env);
  const key = kind === 'text' ? config.textApiKey : config.imageApiKey;
  if (!config.enabled || !key) throw new AppError(`尚未配置${kind === 'text' ? '文字/视觉' : '图片'} API Key，请先进入接口配置。`, 'AI_NOT_CONFIGURED', 400);
  return config;
}

function maskKey(key: string): string {
  if (!key) return '';
  return key.length <= 8 ? `${key.slice(0, 2)}****` : `${key.slice(0, 3)}****${key.slice(-4)}`;
}

function toStatus(config: AiConfig, source: AiConfigStatus['source']): AiConfigStatus {
  const textConfigured = Boolean(config.textApiKey);
  const imageConfigured = Boolean(config.imageApiKey);
  return {
    configured: textConfigured && imageConfigured,
    textConfigured, imageConfigured, enabled: config.enabled, source,
    baseUrl: config.baseUrl,
    textApiKeyMasked: maskKey(config.textApiKey),
    imageApiKeyMasked: maskKey(config.imageApiKey),
    textModel: config.textModel, imageModel: config.imageModel,
    timeoutMs: config.timeoutMs, updatedAt: config.updatedAt || null,
  };
}

export async function configStatus(context: Context<AppBindings>): Promise<Response> {
  const { config, source } = await getAiConfig(context.env);
  return context.json(toStatus(config, source));
}

export async function saveConfig(context: Context<AppBindings>): Promise<Response> {
  if (environmentConfig(context.env)) throw new AppError('当前使用 Cloudflare 环境变量，设置页不能覆盖。', 'AI_CONFIG_READ_ONLY', 409);
  const body: Partial<AiConfig> = await context.req.json().catch(() => ({}));
  const { config: current } = await getAiConfig(context.env);
  const config = validate({ ...body, textApiKey: String(body.textApiKey || '').trim() || current.textApiKey, imageApiKey: String(body.imageApiKey || '').trim() || current.imageApiKey }, context.env);
  if (!context.env.CONFIG_ENCRYPTION_KEY || context.env.CONFIG_ENCRYPTION_KEY.length < 16) throw new AppError('CONFIG_ENCRYPTION_KEY 未配置或长度不足。', 'SERVER_NOT_CONFIGURED', 500);
  const payload = await encryptJson(config, context.env.CONFIG_ENCRYPTION_KEY);
  await context.env.DB.prepare(`INSERT INTO ai_config (id, encrypted_payload, updated_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET encrypted_payload = excluded.encrypted_payload, updated_at = excluded.updated_at`)
    .bind(payload, config.updatedAt).run();
  return context.json(toStatus(config, 'encrypted-d1'));
}

export const aiConfigInternals = { normalizeBaseUrl, validate, maskKey, toStatus };
