import crypto from 'node:crypto';

interface TokenPayload {
  exp: number;
  scope: 'workbench';
}

function secret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || 'local-demo-secret';
}

function sign(data: string): string {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

export function verifyPassword(password: string): boolean {
  const expected = Buffer.from(process.env.APP_PASSWORD || 'loho2026');
  const supplied = Buffer.from(password);
  if (expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(expected, supplied);
}

export function createToken(hours = 12): string {
  const payload: TokenPayload = {
    exp: Date.now() + hours * 60 * 60 * 1000,
    scope: 'workbench',
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function verifyToken(token: string): boolean {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return false;
    const expected = Buffer.from(sign(data));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return false;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as TokenPayload;
    return payload.scope === 'workbench' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

