import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson, hashPassword, passwordLookup, PBKDF2_ITERATIONS, sha256, verifyPassword } from './crypto';

describe('worker crypto', () => {
  it('stays within the Cloudflare Workers PBKDF2 limit', () => {
    expect(PBKDF2_ITERATIONS).toBeLessThanOrEqual(100_000);
  });

  it('hashes and verifies employee passwords without storing plaintext', async () => {
    const stored = await hashPassword('employee-password');
    expect(stored.hash).not.toContain('employee-password');
    expect(await verifyPassword('employee-password', stored.hash, stored.salt)).toBe(true);
    expect(await verifyPassword('wrong-password', stored.hash, stored.salt)).toBe(false);
  });

  it('creates deterministic password lookup per pepper', async () => {
    expect(await passwordLookup('same-password', 'pepper-123456789')).toBe(await passwordLookup('same-password', 'pepper-123456789'));
    expect(await passwordLookup('same-password', 'pepper-123456789')).not.toBe(await passwordLookup('same-password', 'other-pepper-123'));
  });

  it('encrypts and decrypts config with AES-GCM', async () => {
    const payload = await encryptJson({ textApiKey: 'secret-text', imageApiKey: 'secret-image' }, 'configuration-secret-123456789');
    expect(payload).not.toContain('secret-text');
    expect(await decryptJson(payload, 'configuration-secret-123456789')).toEqual({ textApiKey: 'secret-text', imageApiKey: 'secret-image' });
    await expect(decryptJson(payload, 'wrong-configuration-key')).rejects.toBeTruthy();
  });

  it('hashes session tokens', async () => {
    expect(await sha256('token')).toHaveLength(43);
  });
});
