import { businessData } from './data.js';
import type { BusinessType, ParsedInfo } from './types.js';

const cities = ['广州', '深圳', '佛山', '东莞', '珠海', '中山', '惠州', '上海', '北京', '杭州'];

export function parseBrief(brief: string, businessType: BusinessType): ParsedInfo {
  const city = cities.find((item) => brief.includes(item)) ?? '城市待补充';
  const peopleMatch = brief.match(/(\d+)\s*人/);
  const project = businessData[businessType].projects.find((item) =>
    brief.toLowerCase().includes(item.toLowerCase()),
  ) ?? businessData[businessType].projects[0];

  let clientType = '企业客户';
  if (/婚礼|婚宴/.test(brief)) clientType = '婚礼客户';
  else if (/商场/.test(brief)) clientType = '商场客户';
  else if (/楼盘|地产/.test(brief)) clientType = '楼盘客户';
  else if (/品牌/.test(brief)) clientType = '品牌客户';
  else if (/亲子|宝宝宴/.test(brief)) clientType = '亲子家庭客户';

  let scenario = businessType === 'diy' ? '企业员工活动' : '企业活动互动区';
  const scenarios = ['企业年会', '员工活动', '企业团建', '婚礼', '派对', '楼盘暖场', '商场活动', '亲子活动', '品牌活动', '下午茶'];
  scenario = scenarios.find((item) => brief.includes(item)) ?? scenario;

  return {
    city,
    clientType,
    peopleCount: peopleMatch ? `${peopleMatch[1]}人` : '人数待补充',
    project,
    scenario,
    isHoliday: /春节|元宵|端午|中秋|国庆|圣诞|新年|节日/.test(brief),
    isPropertyOrMall: /楼盘|地产|商场/.test(brief),
    isWeddingOrParty: /婚礼|婚宴|派对|宝宝宴/.test(brief),
  };
}

