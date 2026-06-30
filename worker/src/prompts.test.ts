import { describe, expect, it } from 'vitest';
import { noteDraftPrompt, noteReviewPrompt } from './prompts';
import { scenesByBusiness } from './types';

describe('xiaohongshu content strategy', () => {
  it('defines five DIY and four Photobooth audience scenarios', () => {
    expect(scenesByBusiness.diy.map((item) => item.value)).toEqual(['enterprise', 'mall', 'property', 'community', 'auto4s']);
    expect(scenesByBusiness.photobooth.map((item) => item.value)).toEqual(['wedding', 'corporate', 'baby', 'party']);
  });

  it.each([
    ['diy', 'mall', '商场运营或市场负责人', '延长停留'],
    ['diy', 'property', '楼盘营销或活动负责人', '销售接待'],
    ['diy', 'auto4s', '4S店市场或门店负责人', '等待时间'],
    ['photobooth', 'wedding', '新人或婚礼策划', '设备是否融入布置'],
  ] as const)('writes from the decision maker for %s/%s', (business, scene, decisionMaker, clickReason) => {
    const prompt = noteDraftPrompt(business, scene, '真实活动信息');
    expect(prompt).toContain(decisionMaker);
    expect(prompt).toContain(clickReason);
    expect(prompt).toContain('严格3个标题');
  });

  it('requires humanizer, factual review and inline topics', () => {
    const prompt = noteReviewPrompt('diy', 'enterprise', '企业端午手作活动', { titles: ['草稿'] });
    expect(prompt).toContain('去AI写作规则');
    expect(prompt).toContain('不知道的信息不补写');
    expect(prompt).toContain('话题8到12个');
    expect(prompt).toContain('DIY与Photobooth没有混写');
    expect(prompt).toContain('标题点击理由');
    expect(prompt).toContain('客户视角深度');
    expect(prompt).toContain('事实可信度');
    expect(prompt).toContain('AI感与自然度');
    expect(prompt).toContain('关键词布局');
    expect(prompt).toContain('话题相关性');
    expect(prompt).toContain('任一项低于8分');
    expect(prompt).toContain('不要把评分输出给用户');
    expect(prompt).toContain('被夸爆');
  });

  it('separates factual case recaps from experience-based advice', () => {
    const prompt = noteDraftPrompt('diy', 'enterprise', '只提供活动类型，没有真实案例结果');
    expect(prompt).toContain('否则只能写现实顾虑和经验判断');
    expect(prompt).toContain('不能用“上周帮某公司做了”等假案例开场');
    expect(prompt).toContain('地区仅在用户输入时使用');
  });
});
