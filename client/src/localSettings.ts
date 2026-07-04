export interface LocalAiConfig {
  baseUrl: string;
  textApiKey: string;
  imageApiKey: string;
  textModel: string;
  imageModel: string;
  timeoutMs: number;
}

const CONFIG_KEY = 'loho-static-ai-config-v1';

export const defaultAiConfig: LocalAiConfig = {
  baseUrl: 'https://llmhub.ltd/v1',
  textApiKey: '',
  imageApiKey: '',
  textModel: 'gpt-5.5',
  imageModel: 'gpt-image-2',
  timeoutMs: 120000,
};

export function getAiConfig(): LocalAiConfig {
  try {
    return { ...defaultAiConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') };
  } catch {
    return { ...defaultAiConfig };
  }
}

export function saveAiConfig(config: LocalAiConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('loho-config-changed'));
}

export function hasTextApiKey(): boolean {
  return Boolean(getAiConfig().textApiKey.trim());
}
