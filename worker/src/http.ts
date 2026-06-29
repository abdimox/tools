export class AppError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
  }
}

export function requireString(value: unknown, message: string, minimum = 1, maximum = 10_000): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < minimum || text.length > maximum) throw new AppError(message, 'INVALID_INPUT', 400);
  return text;
}

export function nowIso(): string {
  return new Date().toISOString();
}
