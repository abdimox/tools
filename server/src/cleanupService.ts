import fs from 'node:fs/promises';
import path from 'node:path';
import { outputDir, uploadDir } from './paths.js';

async function ensureDirectory(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
}

export async function initializeTempDirectories(): Promise<void> {
  await Promise.all([ensureDirectory(uploadDir), ensureDirectory(outputDir)]);
}

export async function removeFile(filePath: string): Promise<void> {
  await fs.rm(filePath, { force: true }).catch(() => undefined);
}

export async function clearTempDirectories(): Promise<void> {
  await initializeTempDirectories();
  for (const directory of [uploadDir, outputDir]) {
    const names = await fs.readdir(directory);
    await Promise.all(names.filter((name) => name !== '.gitkeep').map((name) => removeFile(path.join(directory, name))));
  }
}

export async function cleanupExpiredFiles(maxAgeMinutes = 30): Promise<number> {
  await initializeTempDirectories();
  const cutoff = Date.now() - maxAgeMinutes * 60_000;
  let removed = 0;
  for (const directory of [uploadDir, outputDir]) {
    const names = await fs.readdir(directory);
    for (const name of names) {
      if (name === '.gitkeep') continue;
      const fullPath = path.join(directory, name);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat?.isFile() && stat.mtimeMs < cutoff) {
        await removeFile(fullPath);
        removed += 1;
      }
    }
  }
  return removed;
}

export function startCleanupTimer(maxAgeMinutes = 30): NodeJS.Timeout {
  const interval = Math.max(60_000, Math.min(maxAgeMinutes * 60_000, 5 * 60_000));
  const timer = setInterval(() => {
    void cleanupExpiredFiles(maxAgeMinutes);
  }, interval);
  timer.unref();
  return timer;
}

