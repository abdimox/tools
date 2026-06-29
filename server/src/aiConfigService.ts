import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AiConfig, AiConfigStatus } from './types.js';

const defaultConfig: AiConfig = {
  baseUrl: 'https://llmhub.ltd/v1',
  apiKey: '',
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

function validate(config: Partial<AiConfig>): AiConfig {
  const apiKey = String(config.apiKey || '').trim();
  const textModel = String(config.textModel || '').trim();
  const imageModel = String(config.imageModel || '').trim();
  if (!apiKey) throw new Error('请输入中转站 API Key。');
  if (!textModel) throw new Error('请输入文字模型名称。');
  if (!imageModel) throw new Error('请输入图片模型名称。');
  const timeoutMs = Number(config.timeoutMs || 120_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 300_000) {
    throw new Error('请求超时必须在10秒到300秒之间。');
  }
  return {
    baseUrl: normalizeBaseUrl(String(config.baseUrl || defaultConfig.baseUrl)),
    apiKey,
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
  return JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), data: ciphertext.toString('base64') });
}

function decrypt(payload: string): AiConfig {
  const parsed = JSON.parse(payload) as { iv: string; tag: string; data: string };
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as AiConfig;
}

function environmentConfig(): AiConfig | null {
  if (!process.env.AI_API_KEY) return null;
  return validate({
    baseUrl: process.env.AI_API_BASE_URL || defaultConfig.baseUrl,
    apiKey: process.env.AI_API_KEY,
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

export async function getActiveAiConfig(): Promise<AiConfig> {
  const { config } = await getAiConfig();
  if (!config.enabled || !config.apiKey) {
    const error = new Error('尚未配置真实 AI 接口，请先进入“接口配置”。');
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
  return {
    configured: Boolean(config.apiKey),
    enabled: config.enabled,
    source,
    baseUrl: config.baseUrl,
    apiKeyMasked: maskKey(config.apiKey),
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

export const aiConfigInternals = { normalizeBaseUrl, validate, encrypt, decrypt, maskKey };
