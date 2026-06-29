import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { outputDir } from './paths.js';

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char] ?? char);
}

function wrapTitle(title: string): [string, string?] {
  const clean = title.trim().slice(0, 24) || '活动现场真实记录';
  if (clean.length <= 12) return [clean];
  return [clean.slice(0, 12), clean.slice(12, 24)];
}

export async function finalizeAiCover(image: Buffer, title: string, subtitle: string): Promise<string> {
  const filename = `cover-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
  const outputPath = path.join(outputDir, filename);
  const [line1, line2] = wrapTitle(title);
  const titleBlock = line2
    ? `<text x="64" y="895" class="title">${escapeXml(line1)}</text><text x="64" y="1000" class="title">${escapeXml(line2)}</text>`
    : `<text x="64" y="955" class="title">${escapeXml(line1)}</text>`;
  const overlay = Buffer.from(`
    <svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; font-size: 76px; font-weight: 800; fill: white; }
        .sub { font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; font-size: 28px; font-weight: 600; fill: white; }
      </style>
      <rect x="0" y="748" width="900" height="452" fill="#17120f" fill-opacity="0.58"/>
      <rect x="64" y="800" rx="24" ry="24" width="188" height="52" fill="#F26B3A"/>
      <text x="158" y="836" text-anchor="middle" class="sub">乐活互动案例</text>
      ${titleBlock}
      <text x="66" y="1128" class="sub">${escapeXml(subtitle.slice(0, 34))}</text>
    </svg>
  `);

  await sharp(image)
    .rotate()
    .resize(900, 1200, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ quality: 92 })
    .toFile(outputPath);
  return filename;
}
