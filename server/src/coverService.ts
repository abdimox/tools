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

export async function createDemoCover(inputPath: string, title: string, subtitle: string): Promise<string> {
  const filename = `cover-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
  const outputPath = path.join(outputDir, filename);
  const [line1, line2] = wrapTitle(title);
  const safeLine1 = escapeXml(line1);
  const safeLine2 = line2 ? escapeXml(line2) : '';
  const safeSubtitle = escapeXml(subtitle.slice(0, 32));
  const titleBlock = line2
    ? `<text x="64" y="895" class="title">${safeLine1}</text><text x="64" y="1000" class="title">${safeLine2}</text>`
    : `<text x="64" y="955" class="title">${safeLine1}</text>`;
  const overlay = Buffer.from(`
    <svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; font-size: 76px; font-weight: 800; fill: white; }
        .sub { font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; font-size: 30px; font-weight: 600; fill: white; }
      </style>
      <rect x="0" y="760" width="900" height="440" fill="#17120f" fill-opacity="0.62"/>
      <rect x="64" y="810" rx="24" ry="24" width="188" height="52" fill="#F26B3A"/>
      <text x="158" y="846" text-anchor="middle" class="sub">乐活互动案例</text>
      ${titleBlock}
      <text x="66" y="1128" class="sub">${safeSubtitle}</text>
    </svg>
  `);

  await sharp(inputPath)
    .rotate()
    .resize(900, 1200, { fit: 'cover', position: 'attention' })
    .modulate({ brightness: 1.06, saturation: 1.04 })
    .sharpen({ sigma: 0.5 })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ quality: 92 })
    .toFile(outputPath);
  return filename;
}

