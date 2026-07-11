export type CoverLayout = 'main-plus-three' | 'grid-four' | 'single-proof';

interface CoverOptions {
  files: File[];
  title: string;
  layout: CoverLayout;
  subtitle?: string;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1200;
const GAP = 14;

function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const ratio = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const right = x + width;
  const bottom = y + height;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function splitTitle(title: string): string[] {
  const clean = title.replace(/\s+/g, '').trim();
  if (!clean) return ['小红书封面'];
  if (clean.length <= 9) return [clean];
  const middle = Math.ceil(clean.length / 2);
  const breakPoints = ['，', '？', '！', '、', '吗', '了', '别'];
  let index = -1;
  for (let offset = 0; offset < 5; offset += 1) {
    const left = middle - offset;
    const right = middle + offset;
    if (breakPoints.includes(clean[left])) { index = left + 1; break; }
    if (breakPoints.includes(clean[right])) { index = right + 1; break; }
  }
  if (index < 4 || index > clean.length - 3) index = middle;
  return [clean.slice(0, index), clean.slice(index)].filter(Boolean).slice(0, 2);
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, subtitle?: string) {
  const lines = splitTitle(title).map((line) => line.slice(0, 12));
  const titleFontSize = lines.length === 1 ? 76 : 66;
  const lineHeight = titleFontSize + 10;
  ctx.font = `900 ${titleFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const boxWidth = Math.min(CANVAS_WIDTH - 72, Math.max(520, textWidth + 68));
  const boxHeight = lines.length * lineHeight + (subtitle ? 58 : 36);
  const x = 34;
  const y = 42;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  roundedRect(ctx, x, y, boxWidth, boxHeight, 18);
  ctx.fillStyle = 'rgba(22, 18, 15, .88)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = `900 ${titleFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.lineJoin = 'round';
  lines.forEach((line, index) => {
    const textY = y + 62 + index * lineHeight;
    ctx.strokeStyle = 'rgba(0, 0, 0, .55)';
    ctx.lineWidth = 10;
    ctx.strokeText(line, x + 34, textY);
    ctx.fillStyle = index === 0 ? '#fff44f' : '#ffffff';
    ctx.fillText(line, x + 34, textY);
  });
  if (subtitle) {
    ctx.font = '700 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#f3d7c8';
    ctx.fillText(subtitle.slice(0, 28), x + 36, y + boxHeight - 24);
  }
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, .92)';
  roundedRect(ctx, 34, CANVAS_HEIGHT - 92, CANVAS_WIDTH - 68, 50, 14);
  ctx.fill();
  ctx.fillStyle = '#3d332d';
  ctx.font = '700 24px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText('真实现场 · 即拍即印 · 广州/佛山/东莞', 64, CANVAS_HEIGHT - 58);
  ctx.restore();
}

function imageAt(images: ImageBitmap[], index: number) {
  return images[index % images.length];
}

function drawLayout(ctx: CanvasRenderingContext2D, images: ImageBitmap[], layout: CoverLayout) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (layout === 'single-proof' || images.length === 1) {
    drawCoverImage(ctx, images[0], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  if (layout === 'grid-four') {
    const cellWidth = (CANVAS_WIDTH - GAP) / 2;
    const cellHeight = (CANVAS_HEIGHT - GAP) / 2;
    [[0, 0], [cellWidth + GAP, 0], [0, cellHeight + GAP], [cellWidth + GAP, cellHeight + GAP]].forEach(([x, y], index) => {
      drawCoverImage(ctx, imageAt(images, index), x, y, cellWidth, cellHeight);
    });
    return;
  }

  const heroHeight = 780;
  drawCoverImage(ctx, imageAt(images, 0), 0, 0, CANVAS_WIDTH, heroHeight);
  const bottomY = heroHeight + GAP;
  const cellWidth = (CANVAS_WIDTH - GAP * 2) / 3;
  const cellHeight = CANVAS_HEIGHT - bottomY;
  [0, 1, 2].forEach((item) => {
    drawCoverImage(ctx, imageAt(images, item + 1), item * (cellWidth + GAP), bottomY, cellWidth, cellHeight);
  });
}

export async function createPlainCoverBlob(options: CoverOptions): Promise<Blob> {
  if (!options.files.length) throw new Error('请至少上传一张图片。');
  const images = await Promise.all(options.files.slice(0, 4).map(loadBitmap));
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持封面生成。');

  drawLayout(ctx, images, options.layout);
  drawTitle(ctx, options.title, options.subtitle);
  drawFooter(ctx);
  images.forEach((image) => image.close());

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('封面图片导出失败。'));
    }, 'image/png', 0.95);
  });
}

export function coverBlobToFile(blob: Blob): File {
  return new File([blob], `xhs-cover-${Date.now()}.png`, { type: 'image/png' });
}
