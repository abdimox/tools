import { beforeEach, describe, expect, it } from 'vitest';
import { createToken, verifyPassword, verifyToken } from './authService.js';
import { checkCompliance } from './complianceService.js';
import { DemoProvider } from './demoProvider.js';

describe('core demo services', () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = 'test-password';
    process.env.AUTH_SECRET = 'test-secret-for-signing';
  });

  it('verifies password and signed token', () => {
    expect(verifyPassword('test-password')).toBe(true);
    expect(verifyPassword('wrong')).toBe(false);
    expect(verifyToken(createToken())).toBe(true);
    expect(verifyToken('invalid')).toBe(false);
  });

  it('finds risky expressions and returns a safe suggestion', () => {
    const result = checkCompliance({ 正文: '想了解可以私信我，扫码获取报价。' });
    expect(result.isSafe).toBe(false);
    expect(result.riskyWords).toContain('私信我');
    expect(result.riskyWords).toContain('扫码');
    expect(result.safeVersion).toContain('收藏');
  });

  it('generates complete DIY content without Photobooth leakage', async () => {
    const provider = new DemoProvider();
    const result = await provider.generateNote({
      businessType: 'diy',
      caseBrief: '广州某企业80人香薰蜡烛DIY团建',
      images: [{ originalName: 'diy.jpg', width: 900, height: 1200, size: 1024 }],
    });
    expect(result.titles).toHaveLength(30);
    expect(result.copyVersions).toHaveLength(5);
    expect(result.coverTexts).toHaveLength(20);
    expect(result.tags.length).toBeGreaterThanOrEqual(8);
    expect(result.parsedInfo.city).toBe('广州');
    expect(result.parsedInfo.peopleCount).toBe('80人');
    expect(result.titles.map((item) => item.text).join('')).not.toContain('Photobooth');
    expect(result.complianceResult.isSafe).toBe(true);
  });

  it('generates Photobooth content without DIY service leakage', async () => {
    const provider = new DemoProvider();
    const result = await provider.generateNote({
      businessType: 'photobooth',
      caseBrief: '深圳婚礼Photobooth即拍即印',
      images: [],
    });
    expect(result.titles).toHaveLength(30);
    expect(result.copyVersions).toHaveLength(5);
    expect(result.services.join('')).not.toContain('老师上门');
    expect(result.titles.map((item) => item.text).join('')).not.toContain('手作');
  });
});

