import fs from 'node:fs/promises';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createToken, verifyPassword, verifyToken } from './authService.js';
import { checkCompliance } from './complianceService.js';
import { removeFile } from './cleanupService.js';
import { createDemoCover } from './coverService.js';
import { DemoProvider } from './demoProvider.js';
import { outputDir, uploadDir } from './paths.js';
import type { BusinessType, ImageInfo } from './types.js';

const provider = new DemoProvider();

function isBusinessType(value: unknown): value is BusinessType {
  return value === 'diy' || value === 'photobooth';
}

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
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return typeof request.query.token === 'string' ? request.query.token : '';
}

function requireAuth(request: Request, response: Response, next: NextFunction): void {
  if (!verifyToken(getToken(request))) {
    response.status(401).json({ message: '登录已失效，请重新输入访问密码。' });
    return;
  }
  next();
}

async function toImageInfo(files: Express.Multer.File[]): Promise<ImageInfo[]> {
  return Promise.all(files.map(async (file) => {
    const metadata = await sharp(file.path).metadata();
    return { originalName: file.originalname, width: metadata.width, height: metadata.height, size: file.size };
  }));
}

async function removeUploads(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map((file) => removeFile(file.path)));
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok', mode: 'demo' }));

  app.post('/api/auth/login', (request, response) => {
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!verifyPassword(password)) {
      response.status(401).json({ message: '访问密码错误，请重新输入。' });
      return;
    }
    response.json({ success: true, token: createToken(), expiresIn: 43_200 });
  });

  app.use('/api', requireAuth);

  app.post('/api/generate-note', upload.array('images', 12), async (request, response, next) => {
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    try {
      const { businessType, caseBrief } = request.body;
      if (!isBusinessType(businessType)) {
        response.status(400).json({ message: '请先选择手作DIY或Photobooth。' });
        return;
      }
      if (typeof caseBrief !== 'string' || caseBrief.trim().length < 5) {
        response.status(400).json({ message: '案例简述至少需要5个字。' });
        return;
      }
      const images = await toImageInfo(files);
      const result = await provider.generateNote({ businessType, caseBrief: caseBrief.trim(), images });
      response.json(result);
    } catch (error) {
      next(error);
    } finally {
      await removeUploads(files);
    }
  });

  app.post('/api/generate-cover-image', upload.single('baseImage'), async (request, response, next) => {
    const file = request.file;
    try {
      if (!file) {
        response.status(400).json({ message: '请先选择一张活动图片。' });
        return;
      }
      const businessType = isBusinessType(request.body.businessType) ? request.body.businessType : 'diy';
      const coverText = typeof request.body.coverText === 'string' ? request.body.coverText : '活动现场真实记录';
      const caseBrief = typeof request.body.caseBrief === 'string' ? request.body.caseBrief : '';
      const filename = await createDemoCover(file.path, coverText, businessType === 'diy' ? `手作DIY · ${caseBrief}` : `Photobooth · ${caseBrief}`);
      response.json({ status: 'generated', mode: 'demo', imageUrl: `/api/files/${filename}`, filename });
    } catch (error) {
      next(error);
    } finally {
      if (file) await removeFile(file.path);
    }
  });

  app.post('/api/compliance-check', (request, response) => {
    const fields = request.body && typeof request.body === 'object' ? request.body : {};
    response.json(checkCompliance(fields));
  });

  app.post('/api/analyze-account', upload.array('screenshots', 12), async (request, response, next) => {
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    try {
      if (files.length === 0) {
        response.status(400).json({ message: '请至少上传一张账号截图。' });
        return;
      }
      const result = await provider.analyzeAccount({
        manualNotes: typeof request.body.manualNotes === 'string' ? request.body.manualNotes : '',
        images: await toImageInfo(files),
      });
      response.json(result);
    } catch (error) {
      next(error);
    } finally {
      await removeUploads(files);
    }
  });

  app.post('/api/analyze-competitor', upload.array('screenshots', 12), async (request, response, next) => {
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    try {
      const { businessType, title = '', copy = '', likes = '', favorites = '', comments = '' } = request.body;
      if (!isBusinessType(businessType)) {
        response.status(400).json({ message: '请选择希望改写成的业务类型。' });
        return;
      }
      if (files.length === 0 && !String(title).trim() && !String(copy).trim()) {
        response.status(400).json({ message: '请上传同行截图，或填写同行标题/正文。' });
        return;
      }
      const result = await provider.analyzeCompetitor({
        businessType,
        title: String(title),
        copy: String(copy),
        stats: { likes: String(likes), favorites: String(favorites), comments: String(comments) },
        images: await toImageInfo(files),
      });
      response.json(result);
    } catch (error) {
      next(error);
    } finally {
      await removeUploads(files);
    }
  });

  app.get('/api/files/:filename', async (request, response) => {
    const filename = path.basename(request.params.filename);
    const filePath = path.join(outputDir, filename);
    try {
      await fs.access(filePath);
      response.sendFile(filePath);
    } catch {
      response.status(404).json({ message: '文件已过期或不存在，请重新生成。' });
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? '单张图片不能超过10MB。'
        : error.code === 'LIMIT_FILE_COUNT'
          ? '一次最多上传12张图片。'
          : '图片上传失败，请检查文件后重试。';
      response.status(400).json({ message });
      return;
    }
    const message = error instanceof Error ? error.message : '服务暂时不可用，请稍后重试。';
    response.status(500).json({ message: message.includes('支持') ? message : '处理失败，请稍后重试。' });
  });

  return app;
}
