import fs from 'node:fs/promises';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { aiConfigInternals, getActiveAiConfig, getAiConfig, getAiConfigStatus, saveAiConfig } from './aiConfigService.js';
import { createToken, verifyAdminPassword, verifyPassword, verifyToken, type AuthScope } from './authService.js';
import { checkCompliance } from './complianceService.js';
import { removeFile } from './cleanupService.js';
import { finalizeAiCover } from './coverService.js';
import { LlmHubProvider, type ProviderImage } from './llmHubProvider.js';
import { outputDir, uploadDir } from './paths.js';
import { getScene, isBusinessType, isValidScene } from './types.js';

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter: (_request, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) callback(null, true);
    else callback(new Error('仅支持 JPG、PNG、WEBP 图片'));
  },
});

function getToken(request: Request): string {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireScope(scope: AuthScope) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!verifyToken(getToken(request), scope)) {
      response.status(401).json({ message: scope === 'admin' ? '管理员登录已失效。' : '登录已失效，请重新输入访问密码。' });
      return;
    }
    next();
  };
}

async function removeUploads(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map((file) => removeFile(file.path)));
}

async function toProviderImages(files: Express.Multer.File[]): Promise<ProviderImage[]> {
  return Promise.all(files.map(async (file) => {
    const buffer = await sharp(file.path)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { name: file.originalname, mimeType: 'image/jpeg', dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}` };
  }));
}

async function provider() {
  return new LlmHubProvider(await getActiveAiConfig());
}

function validateContentInput(body: Record<string, unknown>) {
  if (!isBusinessType(body.businessType)) throw Object.assign(new Error('请选择手作DIY或Photobooth。'), { status: 400 });
  if (!isValidScene(body.businessType, body.scene)) throw Object.assign(new Error('请选择与业务对应的活动场景。'), { status: 400 });
  const caseBrief = typeof body.caseBrief === 'string' ? body.caseBrief.trim() : '';
  if (caseBrief.length < 5) throw Object.assign(new Error('案例简述至少需要5个字。'), { status: 400 });
  return { businessType: body.businessType, scene: body.scene, caseBrief };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_request, response, next) => {
    try {
      const status = await getAiConfigStatus();
      response.json({ status: 'ok', aiConfigured: status.configured && status.enabled });
    } catch (error) { next(error); }
  });

  app.post('/api/auth/login', (request, response) => {
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!verifyPassword(password)) {
      response.status(401).json({ message: '访问密码错误，请重新输入。' });
      return;
    }
    response.json({ success: true, token: createToken('workbench'), expiresIn: 43_200 });
  });

  app.post('/api/admin/login', (request, response) => {
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!verifyAdminPassword(password)) {
      response.status(401).json({ message: '管理员密码错误。' });
      return;
    }
    response.json({ success: true, token: createToken('admin', 2), expiresIn: 7_200 });
  });

  app.use('/api/admin', requireScope('admin'));

  app.get('/api/admin/ai-config', async (_request, response, next) => {
    try { response.json(await getAiConfigStatus()); } catch (error) { next(error); }
  });

  app.put('/api/admin/ai-config', async (request, response, next) => {
    try {
      const { config } = await getAiConfig();
      const apiKey = typeof request.body.apiKey === 'string' && request.body.apiKey.trim() ? request.body.apiKey.trim() : config.apiKey;
      response.json(await saveAiConfig({ ...request.body, apiKey }));
    } catch (error) { next(error); }
  });

  app.post('/api/admin/ai-config/test', async (request, response, next) => {
    try {
      const { config: current } = await getAiConfig();
      const config = aiConfigInternals.validate({ ...request.body, apiKey: request.body.apiKey?.trim() || current.apiKey });
      response.json(await new LlmHubProvider(config).testConnection());
    } catch (error) { next(error); }
  });

  app.use('/api', requireScope('workbench'));

  app.post('/api/generate-note', async (request, response, next) => {
    try {
      const input = validateContentInput(request.body as Record<string, unknown>);
      const result = await (await provider()).generateNote(input);
      const compliance = checkCompliance({ 标题: result.titles, 正文: result.fullCopy });
      if (!compliance.isSafe) {
        throw Object.assign(new Error(`AI复核后仍包含风险词：${compliance.riskyWords.join('、')}。请重试。`), { status: 422, code: 'COMPLIANCE_FAILED' });
      }
      response.json(result);
    } catch (error) { next(error); }
  });

  app.post('/api/generate-cover-prompt', upload.array('images', 12), async (request, response, next) => {
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    try {
      const input = validateContentInput(request.body as Record<string, unknown>);
      if (files.length === 0) throw Object.assign(new Error('请至少上传一张活动图片。'), { status: 400 });
      const result = await (await provider()).generateCoverPrompt({ ...input, images: await toProviderImages(files) });
      response.json(result);
    } catch (error) { next(error); }
    finally { await removeUploads(files); }
  });

  app.post('/api/generate-cover-image', upload.single('baseImage'), async (request, response, next) => {
    const file = request.file;
    try {
      const input = validateContentInput(request.body as Record<string, unknown>);
      if (!file) throw Object.assign(new Error('请选择一张用于制作封面的活动图片。'), { status: 400 });
      const coverText = typeof request.body.coverText === 'string' ? request.body.coverText.trim() : '';
      const prompt = typeof request.body.prompt === 'string' ? request.body.prompt.trim() : '';
      const negativePrompt = typeof request.body.negativePrompt === 'string' ? request.body.negativePrompt.trim() : '';
      if (!coverText || !prompt) throw Object.assign(new Error('请先生成并确认封面大字和提示词。'), { status: 400 });
      const generated = await (await provider()).generateCoverImage({
        image: await fs.readFile(file.path), mimeType: file.mimetype, filename: file.originalname,
        prompt: `${prompt}\n\n限制条件：${negativePrompt}\n画面中不要生成任何文字，标题将由后续排版添加。`,
      });
      const sceneInfo = getScene(input.businessType, input.scene)!;
      const filename = await finalizeAiCover(generated, coverText, `${sceneInfo.label} · ${input.caseBrief}`);
      response.json({ provider: 'llmhub', status: 'generated', imageUrl: `/api/files/${filename}`, filename });
    } catch (error) { next(error); }
    finally { if (file) await removeFile(file.path); }
  });

  app.post('/api/analyze-account', upload.array('screenshots', 12), async (request, response, next) => {
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    try {
      if (files.length === 0) throw Object.assign(new Error('请至少上传一张账号截图。'), { status: 400 });
      response.json(await (await provider()).analyzeAccount({
        manualNotes: typeof request.body.manualNotes === 'string' ? request.body.manualNotes : '',
        images: await toProviderImages(files),
      }));
    } catch (error) { next(error); }
    finally { await removeUploads(files); }
  });

  app.post('/api/analyze-competitor', upload.array('screenshots', 12), async (request, response, next) => {
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    try {
      const input = validateContentInput(request.body as Record<string, unknown>);
      const title = typeof request.body.title === 'string' ? request.body.title : '';
      const copy = typeof request.body.copy === 'string' ? request.body.copy : '';
      if (files.length === 0 && !title.trim() && !copy.trim()) throw Object.assign(new Error('请上传同行截图，或填写同行标题/正文。'), { status: 400 });
      response.json(await (await provider()).analyzeCompetitor({
        ...input, title, copy,
        stats: { likes: String(request.body.likes || ''), favorites: String(request.body.favorites || ''), comments: String(request.body.comments || '') },
        images: await toProviderImages(files),
      }));
    } catch (error) { next(error); }
    finally { await removeUploads(files); }
  });

  app.get('/api/files/:filename', async (request, response) => {
    const filename = path.basename(request.params.filename);
    const filePath = path.join(outputDir, filename);
    try { await fs.access(filePath); response.sendFile(filePath); }
    catch { response.status(404).json({ message: '文件已过期或不存在，请重新生成。' }); }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? '单张图片不能超过10MB。' : error.code === 'LIMIT_FILE_COUNT' ? '一次最多上传12张图片。' : '图片上传失败，请检查文件后重试。';
      response.status(400).json({ message }); return;
    }
    const typed = error as Error & { status?: number; code?: string };
    response.status(typed.status || 500).json({ message: typed.message || '处理失败，请稍后重试。', code: typed.code || 'INTERNAL_ERROR' });
  });

  return app;
}
