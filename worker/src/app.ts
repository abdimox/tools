import { Hono } from 'hono';
import { aiConfigInternals, configStatus, getAiConfig, saveConfig } from './ai-config';
import { analyzeAccount, analyzeCompetitor } from './analysis';
import { addUser, currentUser, listUsers, login, logout, requireAdmin, requireAuth, updateUser } from './auth';
import { createChat, deleteChat, getChat, listChats, readChatAttachment, renameChat, sendMessage } from './chat';
import { generateNote } from './content';
import { generateCover, readCover } from './cover';
import type { AppBindings } from './env';
import { AppError } from './http';
import { LlmHubProvider } from './llmhub';

const app = new Hono<AppBindings>().basePath('/api');

app.get('/health', (context) => context.json({ status: 'ok', runtime: 'cloudflare-pages' }));
app.post('/auth/login', login);
app.post('/auth/logout', logout);

app.use('*', requireAuth);
app.get('/auth/me', currentUser);

app.use('/admin/*', requireAdmin);
app.get('/admin/users', listUsers);
app.post('/admin/users', addUser);
app.patch('/admin/users/:id', updateUser);
app.get('/admin/ai-config', configStatus);
app.put('/admin/ai-config', saveConfig);
app.post('/admin/ai-config/test', async (context) => {
  const body: Record<string, unknown> = await context.req.json().catch(() => ({}));
  const { config: current } = await getAiConfig(context.env);
  const config = aiConfigInternals.validate({
    ...current,
    ...body,
    textApiKey: String(body.textApiKey || '').trim() || current.textApiKey,
    imageApiKey: String(body.imageApiKey || '').trim() || current.imageApiKey,
  }, context.env);
  const provider = new LlmHubProvider(config);
  if (body.kind === 'text') return context.json(await provider.testTextConnection());
  if (body.kind === 'image') return context.json(await provider.testImageConnection());
  throw new AppError('请选择文字接口或图片接口。', 'INVALID_TEST_KIND', 400);
});

app.post('/generate-note', generateNote);
app.post('/analyze-account', analyzeAccount);
app.post('/analyze-competitor', analyzeCompetitor);

app.get('/chats', listChats);
app.post('/chats', createChat);
app.get('/chats/:id', getChat);
app.patch('/chats/:id', renameChat);
app.delete('/chats/:id', deleteChat);
app.post('/chats/:id/messages', sendMessage);

app.post('/generate-cover-image', generateCover);
app.get('/files/cover/:filename', readCover);
app.get('/files/chat/:id', readChatAttachment);

app.notFound((context) => context.json({ message: '接口不存在。', code: 'NOT_FOUND' }, 404));

app.onError((error, context) => {
  const typed = error as Error & { status?: number; code?: string };
  const status = typed.status && typed.status >= 400 && typed.status <= 599 ? typed.status : 500;
  if (status >= 500) console.error(error);
  return context.json({ message: typed.message || '处理失败，请稍后重试。', code: typed.code || 'INTERNAL_ERROR' }, status as 400);
});

export default app;
