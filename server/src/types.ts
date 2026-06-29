export type BusinessType = 'diy' | 'photobooth';
export type DiyScene = 'enterprise' | 'mall' | 'property' | 'community' | 'auto4s';
export type PhotoboothScene = 'wedding' | 'corporate' | 'baby' | 'party';
export type SceneType = DiyScene | PhotoboothScene;

export interface NoteResult {
  provider: 'llmhub';
  businessType: BusinessType;
  scene: SceneType;
  sceneLabel: string;
  audienceIntent: string;
  titles: string[];
  recommendedTitle: number;
  body: string;
  tags: string[];
  fullCopy: string;
  review: {
    passed: boolean;
    checks: string[];
  };
}

export interface CoverPromptResult {
  provider: 'llmhub';
  bestImageIndex: number;
  imageAnalysis: Array<{
    imageIndex: number;
    observation: string;
    recommendation: string;
    score: number;
  }>;
  coverTexts: string[];
  recommendedCoverText: number;
  prompt: string;
  negativePrompt: string;
}

export interface EvidenceItem {
  screenshot: number;
  observation: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AccountAnalysis {
  provider: 'llmhub';
  summary: string;
  evidence: EvidenceItem[];
  diagnosis: Array<{
    issue: string;
    evidence: string;
    priority: 'high' | 'medium' | 'low';
    confidence: 'high' | 'medium' | 'low';
  }>;
  profileSuggestions: string[];
  titleSuggestions: string[];
  coverSuggestions: string[];
  contentColumns: string[];
  riskWarnings: string[];
  unknowns: string[];
  actionPlan14Days: Array<{ days: string; action: string }>;
}

export interface CompetitorAnalysis {
  provider: 'llmhub';
  summary: string;
  evidence: EvidenceItem[];
  titleStructure: string;
  coverStructure: string;
  contentStructure: string[];
  viralReasons: Array<{ reason: string; basis: string; kind: 'fact' | 'inference' }>;
  audienceQuality: string;
  imitationSuggestions: string[];
  avoidCopying: string[];
  adaptedTitles: string[];
  adaptedCopyAngle: string;
  risks: string[];
  unknowns: string[];
}

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  imageModel: string;
  timeoutMs: number;
  enabled: boolean;
  updatedAt: string;
}

export interface AiConfigStatus {
  configured: boolean;
  enabled: boolean;
  source: 'environment' | 'encrypted-file' | 'defaults';
  baseUrl: string;
  apiKeyMasked: string;
  textModel: string;
  imageModel: string;
  timeoutMs: number;
  updatedAt: string | null;
}

export interface ComplianceIssue {
  word: string;
  reason: string;
  field: string;
}

export interface ComplianceResult {
  isSafe: boolean;
  riskyWords: string[];
  issues: ComplianceIssue[];
  safeVersion: string;
}

export const scenesByBusiness: Record<BusinessType, Array<{ value: SceneType; label: string; intent: string }>> = {
  diy: [
    { value: 'enterprise', label: '企业', intent: '员工参与、团队氛围、流程可控、降低组织压力' },
    { value: 'mall', label: '商场', intent: '吸引顾客停留、亲子互动、节日氛围、提升场所好感' },
    { value: 'property', label: '楼盘', intent: '延长客户停留、创造自然交流机会、提升项目体验' },
    { value: 'community', label: '社区', intent: '邻里参与、低门槛互动、节日与公共文化体验' },
    { value: 'auto4s', label: '4S店', intent: '改善到店等待、增加家庭互动、提升品牌与展厅好感' },
  ],
  photobooth: [
    { value: 'wedding', label: '婚礼', intent: '宾客自然互动、现场纪念、减少等待和陌生感' },
    { value: 'corporate', label: '企业活动', intent: '签到打卡、现场互动、品牌或年会记忆点' },
    { value: 'baby', label: '宝宝宴', intent: '家庭纪念、宾客参与、主题照片留存' },
    { value: 'party', label: '聚会', intent: '活跃气氛、降低互动门槛、形成可带走的照片记忆' },
  ],
};

export function getScene(businessType: BusinessType, scene: SceneType) {
  return scenesByBusiness[businessType].find((item) => item.value === scene);
}

export function isBusinessType(value: unknown): value is BusinessType {
  return value === 'diy' || value === 'photobooth';
}

export function isValidScene(businessType: BusinessType, value: unknown): value is SceneType {
  return typeof value === 'string' && scenesByBusiness[businessType].some((item) => item.value === value);
}
