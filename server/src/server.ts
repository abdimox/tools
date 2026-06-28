import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createApp } from './app.js';
import { clearTempDirectories, startCleanupTimer } from './cleanupService.js';

dotenv.config();

const port = Number(process.env.PORT || 3001);
const app = createApp();
const clientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (_request, response) => response.sendFile(path.join(clientDist, 'index.html')));
}

await clearTempDirectories();
startCleanupTimer(Number(process.env.TEMP_FILE_EXPIRE_MINUTES || 30));

app.listen(port, () => {
  console.log(`乐活互动小红书 AI 运营工作台服务已启动：http://localhost:${port}`);
});
