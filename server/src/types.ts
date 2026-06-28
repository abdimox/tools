export type BusinessType = 'diy' | 'photobooth';

export interface ParsedInfo {
  city: string;
  clientType: string;
  peopleCount: string;
  project: string;
  scenario: string;
  isHoliday: boolean;
  isPropertyOrMall: boolean;
  isWeddingOrParty: boolean;
}

export interface ImageInfo {
  originalName: string;
  width?: number;
  height?: number;
  size: number;
}

export interface ImageSuggestion {
  image: string;
  recommendation: string;
  crop: string;
  enhancement: string;
  suitableText: string;
  score: number;
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

export interface NoteResult {
  mode: 'demo';
  parsedInfo: ParsedInfo;
  services: string[];
  highlights: string[];
  imageAnalysis: {
    summary: string;
    bestCoverImage: string | null;
    imageOrderSuggestion: string[];
    suggestions: ImageSuggestion[];
  };
  titles: Array<{ category: string; text: string }>;
  copyVersions: Array<{ name: string; content: string }>;
  coverTexts: string[];
  tags: string[];
  coverPrompt: string;
  negativePrompt: string;
  complianceResult: ComplianceResult;
}

export interface AccountAnalysis {
  mode: 'demo';
  summary: string;
  score: number;
  diagnosis: string[];
  profileSuggestions: string[];
  pinnedPostSuggestions: string[];
  titleSuggestions: string[];
  coverSuggestions: string[];
  contentColumns: string[];
  riskWarnings: string[];
  actionPlan14Days: Array<{ days: string; action: string }>;
}

export interface CompetitorAnalysis {
  mode: 'demo';
  viralReasons: string[];
  titleStructure: string;
  coverStructure: string;
  contentStructure: string[];
  audienceQuality: string;
  imitationSuggestions: string[];
  avoidCopying: string[];
  adaptedTitles: { diy: string[]; photobooth: string[] };
  adaptedCopyAngles: { diy: string[]; photobooth: string[] };
  risks: string[];
}

