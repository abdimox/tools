import type { BusinessType, SceneType } from './types';
import { getScene } from './types';

const businessRules: Record<BusinessType, string> = {
  diy: '本次业务只允许写手作DIY：老师上门、材料工具、桌面布置、现场教学、制作指导、成品包装。不得写入Photobooth、拍照设备、即拍即印。',
  photobooth: '本次业务只允许写Photobooth互动拍摄：设备进场、拍照模板、即拍即印、现场协助、打卡动线。不得写入老师教学、手作过程、材料包或手作成品。',
};

export const humanizerRules = `
1. 删除“此外、至关重要、深入探讨、彰显、赋能、充满活力、关键作用、打造沉浸式体验”等AI和营销高频词。
2. 不写“这不仅仅是……更是……”等否定式排比，不强行三段式，不连续堆叠同长度句子。
3. 不写空泛金句、宏大意义、模糊专家观点和没有输入依据的效果。
4. 用具体、克制的简单句说明客户顾虑、现场安排和活动价值，长短句自然变化。
5. 不编造客户反馈、现场反应、成交、客流、停留时长、人数、城市、品牌、价格或数据。
6. 不靠虚构细节制造所谓真实感。信息不足就稳妥表达，不补写。
7. 语气像做过活动的人在复盘经验，不像广告公司自夸。`;

const complianceRules = '禁止出现私信、微信、VX、加V、二维码、扫码、报价、联系我、进群、主页联系方式等导流表达；不作销售、成交、客流或效果保证。';

function inputContext(businessType: BusinessType, scene: SceneType, caseBrief: string): string {
  const item = getScene(businessType, scene);
  if (!item) throw new Error('场景与业务类型不匹配。');
  return `业务：${businessType === 'diy' ? '手作DIY' : 'Photobooth'}
场景：${item.label}
主要决策人：${item.decisionMaker}
客户真正想解决的问题：${item.intent}
客户会点开内容的原因：${item.clickReason}
用户提供的案例事实：${caseBrief}`;
}

export function noteDraftPrompt(businessType: BusinessType, scene: SceneType, caseBrief: string): string {
  return `你是乐活互动的小红书内容策略编辑。目标不是为了发笔记而发笔记，而是让真正负责活动的人看到标题时觉得“这正是我现在要解决的问题”，点开后能判断乐活互动理解现场和执行。

${inputContext(businessType, scene, caseBrief)}

${businessRules[businessType]}
${complianceRules}

先在内部完成四个判断：谁会做决定、他为什么现在寻找服务、他最担心什么、标题凭什么值得点开。然后只输出合法JSON，不要Markdown：
{"audienceIntent":"一句具体的客户动机判断","clickReason":"一句具体的点击理由","titles":["标题1","标题2","标题3"],"recommendedTitle":0,"body":"正文，不含话题","tags":["#话题"]}

硬性要求：
- 严格3个标题，分别从客户目标、现场顾虑、活动结果/体验三个不同角度写，不能只是换词。
- 标题让对应决策人看见自己的场景和问题；不硬塞城市、品牌或数据，除非案例事实明确提供。
- 正文只有1篇，先写客户为什么需要，再写方案如何贴合现场，最后给出克制判断；不要以“我们很专业”开头。
- 只使用输入事实和固定业务能力，不补写现场反应、效果和数据。
- 话题8到12个，兼顾业务、场景、客户角色和活动类型。`;
}

export function noteReviewPrompt(businessType: BusinessType, scene: SceneType, caseBrief: string, draft: unknown): string {
  return `你是乐活互动的小红书终审编辑。请把初稿当作不可信草稿逐项核对，然后重写成能直接发布的最终稿。质量比保留原句更重要。

唯一可用事实：
${inputContext(businessType, scene, caseBrief)}

业务隔离：${businessRules[businessType]}
合规：${complianceRules}
去AI写作规则：${humanizerRules}

待审草稿：
${JSON.stringify(draft)}

终审时必须确认：
1. 三个标题确实对应这个场景的决策人，并且各有明确点击理由。
2. 标题与正文讲同一件事，没有夸张承诺和无依据细节。
3. 正文从客户目标和顾虑出发，不是服务商自夸或功能清单。
4. DIY与Photobooth没有混写。
5. 语言自然、具体、克制，没有AI腔、模板腔和导流词。

只输出合法JSON，不要Markdown：
{"audienceIntent":"一句具体判断","titles":["标题1","标题2","标题3"],"recommendedTitle":0,"body":"最终正文，不含话题","tags":["#话题"],"reviewChecks":["受众与动机","标题点击理由","事实依据","业务隔离","自然表达","合规"]}

硬性格式：标题严格3个；正文严格1篇；话题8到12个且正文中不重复；不知道的信息不补写。`;
}

export function accountPrompt(imageCount: number, manualNotes: string): string {
  return `你是资深小红书账号诊断顾问。认真读取${imageCount}张按顺序编号的账号截图，只依据可见信息分析；事实、推断、建议分开，看不清就写入unknowns。
用户补充：${manualNotes || '无'}
重点检查账号定位、城市与业务、DIY与Photobooth区分、封面点击理由、标题搜索价值、真实案例、客户决策视角、广告感和合规风险。
只输出合法JSON：{"summary":"总结","evidence":[{"screenshot":1,"observation":"可见事实","confidence":"high"}],"diagnosis":[{"issue":"问题","evidence":"截图依据","priority":"high","confidence":"high"}],"profileSuggestions":["建议"],"titleSuggestions":["建议"],"coverSuggestions":["建议"],"contentColumns":["栏目"],"riskWarnings":["风险"],"unknowns":["无法判断项"],"actionPlan14Days":[{"days":"第1-2天","action":"行动"}]}`;
}

export function competitorPrompt(input: { businessType: BusinessType; scene: SceneType; title: string; copy: string; stats: Record<string, string>; imageCount: number }): string {
  return `你是小红书内容策略分析师。结合${input.imageCount}张同行截图与手动内容，分析目标客户为什么会点开、读完、收藏或咨询。事实与推断分开，不能把互动数据直接等同于成交。
改写场景：${inputContext(input.businessType, input.scene, '仅借鉴同行结构，不虚构乐活互动案例')}
同行标题：${input.title || '未提供'}
同行正文：${input.copy || '未提供'}
互动数据：${JSON.stringify(input.stats)}
${businessRules[input.businessType]}
${humanizerRules}
只输出合法JSON：{"summary":"总结","evidence":[{"screenshot":1,"observation":"可见事实","confidence":"high"}],"titleStructure":"结构","coverStructure":"结构","contentStructure":["步骤"],"viralReasons":[{"reason":"原因","basis":"依据","kind":"fact"}],"audienceQuality":"精准或泛流量判断","imitationSuggestions":["可借鉴"],"avoidCopying":["不能照抄"],"adaptedTitles":["标题1","标题2","标题3"],"adaptedCopyAngle":"明确写作角度","risks":["风险"],"unknowns":["信息不足项"]}`;
}
