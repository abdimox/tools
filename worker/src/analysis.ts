import type { Context } from 'hono';
import { getActiveAiConfig } from './ai-config';
import type { AppBindings } from './env';
import { AppError, requireString } from './http';
import { formFiles, toProviderImage } from './images';
import { LlmHubProvider } from './llmhub';
import { isBusinessType, isValidScene } from './types';

export async function analyzeAccount(context: Context<AppBindings>): Promise<Response> {
  const body = await context.req.parseBody({ all: true });
  const files = formFiles(body.screenshots);
  if (!files.length) throw new AppError('请至少上传一张账号截图。', 'INVALID_INPUT', 400);
  if (files.length > 12) throw new AppError('一次最多上传12张图片。', 'TOO_MANY_IMAGES', 400);
  const provider = new LlmHubProvider(await getActiveAiConfig(context.env, 'text'));
  return context.json(await provider.analyzeAccount({
    manualNotes: typeof body.manualNotes === 'string' ? body.manualNotes : '',
    images: await Promise.all(files.map(toProviderImage)),
  }));
}

export async function analyzeCompetitor(context: Context<AppBindings>): Promise<Response> {
  const body = await context.req.parseBody({ all: true });
  if (!isBusinessType(body.businessType)) throw new AppError('请选择手作DIY或Photobooth。', 'INVALID_INPUT', 400);
  if (!isValidScene(body.businessType, body.scene)) throw new AppError('请选择与业务对应的活动场景。', 'INVALID_INPUT', 400);
  const files = formFiles(body.screenshots);
  if (files.length > 12) throw new AppError('一次最多上传12张图片。', 'TOO_MANY_IMAGES', 400);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const copy = typeof body.copy === 'string' ? body.copy.trim() : '';
  if (!files.length && !title && !copy) throw new AppError('请上传同行截图，或填写同行标题/正文。', 'INVALID_INPUT', 400);
  const provider = new LlmHubProvider(await getActiveAiConfig(context.env, 'text'));
  return context.json(await provider.analyzeCompetitor({
    businessType: body.businessType, scene: body.scene,
    title: title ? requireString(title, '同行标题过长。', 1, 300) : '',
    copy: copy ? requireString(copy, '同行正文过长。', 1, 10_000) : '',
    stats: { likes: String(body.likes || ''), favorites: String(body.favorites || ''), comments: String(body.comments || '') },
    images: await Promise.all(files.map(toProviderImage)),
  }));
}
