import { arrayBufferToBase64 } from './crypto';
import { AppError } from './http';
import type { ProviderImage } from './types';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function formFiles(value: FormDataEntryValue | FormDataEntryValue[] | undefined): File[] {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return items.filter((item): item is File => item instanceof File && item.size > 0);
}

export function validateImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new AppError('仅支持 JPG、PNG、WEBP 图片。', 'INVALID_IMAGE', 400);
  if (file.size > MAX_IMAGE_BYTES) throw new AppError('单张图片不能超过10MB。', 'IMAGE_TOO_LARGE', 400);
}

export async function validateImageContent(file: File): Promise<void> {
  validateImage(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if ((file.type === 'image/jpeg' && !jpeg) || (file.type === 'image/png' && !png) || (file.type === 'image/webp' && !webp)) {
    throw new AppError('图片内容与文件格式不一致，请重新选择图片。', 'INVALID_IMAGE', 400);
  }
}

export async function toProviderImage(file: File): Promise<ProviderImage> {
  await validateImageContent(file);
  return { name: file.name, mimeType: file.type, dataUrl: `data:${file.type};base64,${arrayBufferToBase64(await file.arrayBuffer())}` };
}
