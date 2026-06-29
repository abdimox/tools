import type { Context } from 'hono';
import { getActiveAiConfig } from './ai-config';
import { riskyWords } from './compliance';
import type { AppBindings } from './env';
import { AppError, requireString } from './http';
import { LlmHubProvider } from './llmhub';
import { isBusinessType, isValidScene } from './types';

export async function generateNote(context: Context<AppBindings>): Promise<Response> {
  const body: Record<string, unknown> = await context.req.json().catch(() => ({}));
  if (!isBusinessType(body.businessType)) throw new AppError('请选择手作DIY或Photobooth。', 'INVALID_INPUT', 400);
  if (!isValidScene(body.businessType, body.scene)) throw new AppError('请选择与业务对应的活动场景。', 'INVALID_INPUT', 400);
  const caseBrief = requireString(body.caseBrief, '案例简述至少需要5个字。', 5, 500);
  const provider = new LlmHubProvider(await getActiveAiConfig(context.env, 'text'));
  const result = await provider.generateNote({ businessType: body.businessType, scene: body.scene, caseBrief });
  const risks = riskyWords({ 标题: result.titles, 正文: result.fullCopy });
  if (risks.length) throw new AppError(`AI复核后仍包含风险词：${risks.join('、')}。请重试。`, 'COMPLIANCE_FAILED', 422);
  return context.json(result);
}
