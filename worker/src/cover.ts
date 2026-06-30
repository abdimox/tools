import type { Context } from 'hono';
import { getActiveAiConfig } from './ai-config';
import type { AppBindings } from './env';
import { AppError, requireString } from './http';
import { formFiles, validateImageContent } from './images';
import { LlmHubProvider } from './llmhub';

export async function generateCover(context: Context<AppBindings>): Promise<Response> {
  const body = await context.req.parseBody({ all: true });
  const prompt = requireString(body.prompt, '请粘贴图片生成提示词。', 2, 5000);
  const files = formFiles(body.baseImage);
  if (files.length !== 1) throw new AppError('请上传一张参考图片。', 'INVALID_INPUT', 400);
  const image = files[0];
  await validateImageContent(image);
  const provider = new LlmHubProvider(await getActiveAiConfig(context.env, 'image'));
  const generated = await provider.generateImage({ image, prompt });
  const id = crypto.randomUUID();
  const extension = generated.mimeType.includes('jpeg') ? 'jpg' : generated.mimeType.includes('webp') ? 'webp' : 'png';
  const filename = `小红书封面-${id.slice(0, 8)}.${extension}`;
  return new Response(generated.bytes, {
    headers: {
      'Content-Type': generated.mimeType,
      'Cache-Control': 'no-store',
      'Content-Disposition': `inline; filename="cover-${id.slice(0, 8)}.${extension}"`,
      'X-Filename': encodeURIComponent(filename),
    },
  });
}
