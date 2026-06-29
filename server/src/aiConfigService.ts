import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AiConfig, AiConfigStatus } from './types.js';

type KeyKind = 'text' | 'image';
type StoredConfig = Partial<AiConfig> & { apiKey?: string };

const defaultConfig: AiConfig = {
  baseUrl: 'https://llmhub.ltd/v1',
  textApiKey: '',
  imageApiKey: '',
  textModel: 'gpt-5.5',
  imageModel: 'gpt-image-2',
  timeoutMs: 120_000,
  enabled: false,
  updatedAt: '',
};

function configPath(): string {
  return process.env.AI_CONFIG_PATH || fileURLToPath(new URL('../config/ai-config.enc.json', import.meta.url));
}

function encryptionKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.APP_PASSWORD || 'local-development-encryption-key';
  return crypto.createHash('sha256').update(raw).digest();
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('接口地址必须使用 HTTPS。');
  }
  const allowedHosts = (process.env.ALLOWED_AI_HOSTS || 'llmhub.ltd').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  const isLocalTest = (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && process.env.NODE_ENV !== 'production';
  if (!allowedHosts.includes(url.hostname.toLowerCase()) && !isLocalTest) {
    throw new Error(`接口域名不在允许列表中：${url.hostname}`);
  }
  const pathname = url.pathname.replace(/\/$/, '');
  url.pathname = pathname.endsWith('/v1') ? pathname : `${pathname}/v1`.replace('//', '/');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function migrateConfig(config: StoredConfig): AiConfig {
  const legacyKey = String(config.apiKey || '').trim();
  return {
    baseUrl: String(config.baseUrl || defaultConfig.baseUrl),
    textApiKey: String(config.textApiKey || legacyKey).trim(),
    imageApiKey: String(config.imageApiKey || legacyKey).trim(),
    textModel: String(config.textModel || defaultConfig.textModel),
    imageModel: String(config.imageModel || defaultConfig.imageModel),
    timeoutMs: Number(config.timeoutMs || defaultConfig.timeoutMs),
    enabled: config.enabled === true,
    updatedAt: String(config.updatedAt || ''),
  };
}

function validate(config: Partial<AiConfig>): AiConfig {
  const textModel = String(config.textModel || '').trim();
  const imageModel = String(config.imageModel || '').trim();
  if (!textModel) throw new Error('请输入文字模型名称。');
  if (!imageModel) throw new Error('请输入图片模型名称。');
  const timeoutMs = Number(config.timeoutMs || 120_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 300_000) {
    throw new Error('请求超时必须在10秒到300秒之间。');
  }
  return {
    baseUrl: normalizeBaseUrl(String(config.baseUrl || defaultConfig.baseUrl)),
    textApiKey: String(config.textApiKey || '').trim(),
    imageApiKey: String(config.imageApiKey || '').trim(),
    textModel,
    imageModel,
    timeoutMs,
    enabled: config.enabled !== false,
    updatedAt: new Date().toISOString(),
  };
}

function encrypt(config: AiConfig): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({ version: 2, iv: iv.toString('base64'), tag: tag.toString('base64'), data: ciphertext.toString('base64') });
}

function decrypt(payload: string): AiConfig {
  const parsed = JSON.parse(payload) as { iv: string; tag: string; data: string };
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]);
  return migrateConfig(JSON.parse(plaintext.toString('utf8')) as StoredConfig);
}

function environmentConfig(): AiConfig | null {
  const legacyKey = process.env.AI_API_KEY || '';
  const textApiKey = process.env.AI_TEXT_API_KEY || legacyKey;
  const imageApiKey = process.env.AI_IMAGE_API_KEY || legacyKey;
  if (!textApiKey && !imageApiKey) return null;
  return validate({
    baseUrl: process.env.AI_API_BASE_URL || defaultConfig.baseUrl,
    textApiKey,
    imageApiKey,
    textModel: process.env.AI_TEXT_MODEL || defaultConfig.textModel,
    imageModel: process.env.AI_IMAGE_MODEL || defaultConfig.imageModel,
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || defaultConfig.timeoutMs),
    enabled: true,
  });
}

async function storedConfig(): Promise<AiConfig | null> {
  try {
    return decrypt(await fs.readFile(configPath(), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('接口配置无法解密，请检查 CONFIG_ENCRYPTION_KEY 是否改变。');
  }
}

export async function getAiConfig(): Promise<{ config: AiConfig; source: AiConfigStatus['source'] }> {
  const fromEnvironment = environmentConfig();
  if (fromEnvironment) return { config: fromEnvironment, source: 'environment' };
  const stored = await storedConfig();
  if (stored) return { config: stored, source: 'encrypted-file' };
  return { config: defaultConfig, source: 'defaults' };
}

export async function getActiveAiConfig(kind: KeyKind = 'text'): Promise<AiConfig> {
  const { config } = await getAiConfig();
  const key = kind === 'text' ? config.textApiKey : config.imageApiKey;
  if (!config.enabled || !key) {
    const label = kind === 'text' ? '文字/视觉 API Key' : '图片 API Key';
    const error = new Error(`尚未配置${label}，请先进入“接口配置”。`);
    (error as Error & { code?: string }).code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  return config;
}

export async function saveAiConfig(input: Partial<AiConfig>): Promise<AiConfigStatus> {
  const config = validate(input);
  const target = configPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, encrypt(config), { encoding: 'utf8', mode: 0o600 });
  return toStatus(config, 'encrypted-file');
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return `${key.slice(0, 2)}****`;
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}

export function toStatus(config: AiConfig, source: AiConfigStatus['source']): AiConfigStatus {
  const textConfigured = Boolean(config.textApiKey);
  const imageConfigured = Boolean(config.imageApiKey);
  return {
    configured: textConfigured && imageConfigured,
    textConfigured,
    imageConfigured,
    enabled: config.enabled,
    source,
    baseUrl: config.baseUrl,
    textApiKeyMasked: maskKey(config.textApiKey),
    imageApiKeyMasked: maskKey(config.imageApiKey),
    textModel: config.textModel,
    imageModel: config.imageModel,
    timeoutMs: config.timeoutMs,
    updatedAt: config.updatedAt || null,
  };
}

export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  const { config, source } = await getAiConfig();
  return toStatus(config, source);
}

export const aiConfigInternals = { normalizeBaseUrl, validate, encrypt, decrypt, maskKey, migrateConfig };
