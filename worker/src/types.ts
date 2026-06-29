export type BusinessType = 'diy' | 'photobooth';
export type DiyScene = 'enterprise' | 'mall' | 'property' | 'community' | 'auto4s';
export type PhotoboothScene = 'wedding' | 'corporate' | 'baby' | 'party';
export type SceneType = DiyScene | PhotoboothScene;

export interface AiConfig {
  baseUrl: string;
  textApiKey: string;
  imageApiKey: string;
  textModel: string;
  imageModel: string;
  timeoutMs: number;
  enabled: boolean;
  updatedAt: string;
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
  review: { passed: true; checks: string[] };
}

export interface ProviderImage {
  name: string;
  mimeType: string;
  dataUrl: string;
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

export const scenesByBusiness: Record<BusinessType, Array<{ value: SceneType; label: string; intent: string; decisionMaker: string; clickReason: string }>> = {
  diy: [
    { value: 'enterprise', label: '企业', decisionMaker: 'HR、行政或员工活动负责人', intent: '让员工愿意参与、兼顾节日关怀和团队关系，同时降低内部组织压力', clickReason: '想看到活动是否好组织、员工是否容易参与、现场是否有人负责' },
    { value: 'mall', label: '商场', decisionMaker: '商场运营或市场负责人', intent: '增加顾客停留和亲子互动，让活动与商场氛围自然结合', clickReason: '想知道活动能否吸引家庭参与、延长停留，同时不影响现场秩序' },
    { value: 'property', label: '楼盘', decisionMaker: '楼盘营销或活动负责人', intent: '改善到访和等待体验，为家庭客户创造自然交流机会并留下项目好感', clickReason: '想看暖场内容是否适合家庭客群、是否方便销售接待和现场执行' },
    { value: 'community', label: '社区', decisionMaker: '社区运营、物业或公共文化负责人', intent: '以低门槛活动促进邻里和亲子参与，并兼顾秩序、年龄差异和落地难度', clickReason: '想确认活动是否容易参与、物料是否好管理、不同年龄是否都能融入' },
    { value: 'auto4s', label: '4S店', decisionMaker: '4S店市场或门店负责人', intent: '改善客户与家庭成员的到店等待，让展厅体验更轻松并增加品牌好感', clickReason: '想看活动能否填补等待时间、照顾随行儿童，又不干扰看车和接待' },
  ],
  photobooth: [
    { value: 'wedding', label: '婚礼', decisionMaker: '新人或婚礼策划', intent: '让宾客自然参与并带走现场纪念，同时配合婚礼节奏', clickReason: '想看设备是否融入布置、宾客是否容易使用、现场是否有人协助' },
    { value: 'corporate', label: '企业活动', decisionMaker: 'HR、行政、市场或年会负责人', intent: '把签到打卡、员工互动和品牌呈现做成一个顺畅环节', clickReason: '想确认模板、设备、动线和现场执行能否统一配合' },
    { value: 'baby', label: '宝宝宴', decisionMaker: '宝宝家庭或宴会策划', intent: '让亲友轻松参与并留下与宴会主题一致的照片纪念', clickReason: '想看不同年龄宾客是否会用、照片是否贴合主题、现场是否省心' },
    { value: 'party', label: '聚会', decisionMaker: '聚会组织者或活动策划', intent: '降低互动门槛、活跃现场，并形成可以带走的共同记忆', clickReason: '想知道玩法是否直接、出片是否快、能否自然带动参与' },
  ],
};

export function isBusinessType(value: unknown): value is BusinessType {
  return value === 'diy' || value === 'photobooth';
}

export function isValidScene(businessType: BusinessType, value: unknown): value is SceneType {
  return typeof value === 'string' && scenesByBusiness[businessType].some((item) => item.value === value);
}

export function getScene(businessType: BusinessType, scene: SceneType) {
  return scenesByBusiness[businessType].find((item) => item.value === scene);
}
