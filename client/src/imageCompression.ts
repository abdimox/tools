const TARGET_BYTES = 1_150_000;
const MAX_DIMENSION = 1600;

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片压缩失败，请换一张图片。')), 'image/jpeg', quality));
}

export async function compressChatImage(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`无法读取图片“${file.name}”，请换成 JPG、PNG 或 WEBP。`);
  }

  try {
    const baseScale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * baseScale));
    let height = Math.max(1, Math.round(bitmap.height * baseScale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法压缩图片。');

    let output: Blob | null = null;
    for (let resize = 0; resize < 5; resize += 1) {
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        output = await canvasBlob(canvas, quality);
        if (output.size <= TARGET_BYTES) break;
      }
      if (output && output.size <= TARGET_BYTES) break;
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }

    if (!output || output.size > TARGET_BYTES) throw new Error(`图片“${file.name}”压缩后仍过大，请换一张尺寸更小的图片。`);
    const name = file.name.replace(/\.[^.]+$/, '') || '图片';
    return new File([output], `${name}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

