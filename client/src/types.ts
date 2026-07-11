export type BusinessType = 'diy' | 'photobooth';
export type SceneType = 'enterprise' | 'mall' | 'property' | 'community' | 'auto4s' | 'wedding' | 'corporate' | 'baby' | 'party';

export const scenesByBusiness: Record<BusinessType, Array<{ value: SceneType; label: string; description: string }>> = {
  diy: [
    { value: 'enterprise', label: '企业', description: '员工参与与团队氛围' },
    { value: 'mall', label: '商场', description: '吸引停留与亲子互动' },
    { value: 'property', label: '楼盘', description: '客户停留与项目体验' },
    { value: 'community', label: '社区', description: '邻里参与与公共文化' },
    { value: 'auto4s', label: '4S店', description: '到店等待与品牌好感' },
  ],
  photobooth: [
    { value: 'wedding', label: '婚礼', description: '宾客互动与现场纪念' },
    { value: 'corporate', label: '企业活动', description: '签到打卡与活动记忆' },
    { value: 'baby', label: '宝宝宴', description: '家庭纪念与宾客参与' },
    { value: 'party', label: '聚会', description: '活跃气氛与照片留存' },
  ],
};

export function getScene(businessType: BusinessType, scene: SceneType) {
  return scenesByBusiness[businessType].find((item) => item.value === scene);
}

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
  review: { passed: boolean; checks: string[] };
}

export interface TopicIdea {
  id: string;
  title: string;
  angle: string;
  reason: string;
  coverText: string;
  contentType: string;
  audiencePain: string;
  coverTip: string;
  discussionQuestion: string;
}

export interface HookScoreResult {
  provider: 'llmhub';
  score: number;
  verdict: '可以发' | '小改后发' | '建议重做';
  viralPotential: '高' | '中' | '低';
  summary: string;
  coverScore: number;
  titleScore: number;
  topicScore: number;
  copyScore: number;
  coverIssues: string[];
  titleIssues: string[];
  topicIssues: string[];
  copyIssues: string[];
  improvedCoverTexts: string[];
  improvedTitles: string[];
  bestTitleIndex: number;
  prePublishChecks: string[];
  riskWarnings: string[];
}

export interface CoverPromptResult {
  provider: 'llmhub';
  bestImageIndex: number;
  imageAnalysis: Array<{ imageIndex: number; observation: string; recommendation: string; score: number }>;
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
  diagnosis: Array<{ issue: string; evidence: string; priority: 'high' | 'medium' | 'low'; confidence: 'high' | 'medium' | 'low' }>;
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

export interface AiConfigStatus {
  configured: boolean;
  textConfigured: boolean;
  imageConfigured: boolean;
  enabled: boolean;
  source: 'environment' | 'encrypted-d1' | 'defaults';
  baseUrl: string;
  textApiKeyMasked: string;
  imageApiKeyMasked: string;
  textModel: string;
  imageModel: string;
  timeoutMs: number;
  updatedAt: string | null;
}

export interface AuthUser {
  id: string;
  displayName: string;
  role: 'admin' | 'employee';
}

export interface EmployeeUser extends AuthUser {
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatAttachment {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'complete' | 'error';
  errorMessage: string | null;
  createdAt: string;
  attachments: ChatAttachment[];
}
