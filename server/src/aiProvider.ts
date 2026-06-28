import type { AccountAnalysis, BusinessType, CompetitorAnalysis, ImageInfo, NoteResult } from './types.js';

export interface GenerateNoteInput {
  businessType: BusinessType;
  caseBrief: string;
  images: ImageInfo[];
}

export interface AnalyzeAccountInput {
  manualNotes: string;
  images: ImageInfo[];
}

export interface AnalyzeCompetitorInput {
  businessType: BusinessType;
  title: string;
  copy: string;
  stats: { likes?: string; favorites?: string; comments?: string };
  images: ImageInfo[];
}

export interface AiProvider {
  generateNote(input: GenerateNoteInput): Promise<NoteResult>;
  analyzeAccount(input: AnalyzeAccountInput): Promise<AccountAnalysis>;
  analyzeCompetitor(input: AnalyzeCompetitorInput): Promise<CompetitorAnalysis>;
}
