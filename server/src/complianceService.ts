import { riskyExpressions } from './data.js';
import type { ComplianceIssue, ComplianceResult } from './types.js';

const replacement = '适合收藏，给下次活动策划做参考';

export function makeSafe(text: string): string {
  let safe = text;
  for (const word of riskyExpressions) {
    safe = safe.replaceAll(word, replacement);
  }
  return safe;
}

export function checkCompliance(fields: Record<string, string | string[]>): ComplianceResult {
  const issues: ComplianceIssue[] = [];

  for (const [field, value] of Object.entries(fields)) {
    const content = Array.isArray(value) ? value.join('\n') : value;
    for (const word of riskyExpressions) {
      if (content.toLowerCase().includes(word.toLowerCase())) {
        issues.push({
          word,
          field,
          reason: '属于联系方式、报价或私域引导表达，不适合用于公开内容。',
        });
      }
    }
  }

  const riskyWords = [...new Set(issues.map((item) => item.word))];
  return {
    isSafe: issues.length === 0,
    riskyWords,
    issues,
    safeVersion: issues.length === 0 ? '当前内容未发现明显导流风险，可发布前再次人工复核。' : replacement,
  };
}

