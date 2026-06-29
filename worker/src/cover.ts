import type { Context } from 'hono';
import { getActiveAiConfig } from './ai-config';
import type { AppBindings } from './env';
import { AppError, nowIso, requireString } from './http';
import { formFiles, validateImageContent } from './images';
import { LlmHubProvider } from './llmhub';

export async function generateCover(context: Context<AppBindings>): Promise<Response> {
  const body = await context.req.parseBody({ all: true });
  const prompt = requireString(body.prompt, '请粘贴图片生成提示词。', 2, 5000);
  const files = formFiles(body.baseImage);
  if (files.length !== 1) throw new AppError('请上传一张参考图片。', 'INVALID_INPUT', 400);
  const image = files[0];
  await validateImageContent(image);
  const user = context.get('user');
  const inputId = crypto.randomUUID();
  const inputKey = `cover-input/${user.id}/${inputId}`;
  await context.env.FILES.put(inputKey, await image.arrayBuffer(), { httpMetadata: { contentType: image.type }, customMetadata: { createdAt: nowIso() } });
  try {
    const provider = new LlmHubProvider(await getActiveAiConfig(context.env, 'image'));
    const generated = await provider.generateImage({ image, prompt });
    const id = crypto.randomUUID();
    const extension = generated.mimeType.includes('jpeg') ? 'jpg' : generated.mimeType.includes('webp') ? 'webp' : 'png';
    const key = `cover-output/${user.id}/${id}.${extension}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await context.env.FILES.put(key, generated.bytes, { httpMetadata: { contentType: generated.mimeType }, customMetadata: { ownerUserId: user.id, expiresAt } });
    return context.json({ provider: 'llmhub', status: 'generated', imageUrl: `/api/files/cover/${id}.${extension}`, filename: `小红书封面-${id.slice(0, 8)}.${extension}` });
  } finally {
    await context.env.FILES.delete(inputKey);
  }
}

export async function readCover(context: Context<AppBindings>): Promise<Response> {
  const filename = context.req.param('filename') || '';
  if (!/^[a-f0-9-]+\.(?:png|jpg|webp)$/i.test(filename)) throw new AppError('文件不存在。', 'NOT_FOUND', 404);
  const key = `cover-output/${context.get('user').id}/${filename}`;
  const object = await context.env.FILES.get(key);
  if (!object) throw new AppError('文件已过期或不存在，请重新生成。', 'NOT_FOUND', 404);
  const expiresAt = object.customMetadata?.expiresAt;
  if (expiresAt && expiresAt < nowIso()) {
    await context.env.FILES.delete(key);
    throw new AppError('文件已过期，请重新生成。', 'NOT_FOUND', 404);
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(object.body, { headers });
}
