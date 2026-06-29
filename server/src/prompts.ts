import type { BusinessType, SceneType } from './types.js';
import { getScene } from './types.js';

const businessRules: Record<BusinessType, string> = {
  diy: '业务是手作DIY。可以涉及老师上门、现场教学、物料与工具准备、桌面布置、制作指导和成品包装。禁止写入Photobooth、拍照机、即拍即印等另一业务内容。',
  photobooth: '业务是Photobooth互动拍摄。可以涉及设备进场、拍照模板、即拍即印、现场协助和打卡动线。禁止写入老师教学、手作过程、成品制作等另一业务内容。',
};

export const humanizerRules = `
写作必须像真正参与过活动策划的人，而不是营销机器人：
1. 删除“此外、至关重要、深入探讨、彰显、赋能、充满活力、关键作用”等AI高频词。
2. 删除“这不仅仅是……而是……”等否定式排比，不强行三段式，不连续使用相同长度句子。
3. 不写空泛金句、模糊专家观点、夸大意义和无法验证的效果。
4. 用简单句直接说明事实。长短句交替，允许自然停顿，但不要刻意口语化。
5. 不编造客户反馈、现场反应、成交、客流、停留时长、人数、城市或品牌。
6. 不把“真实感”建立在虚构细节上。信息不足时使用稳妥表达。
7. 正文读起来应像经验复盘，具体、克制，有判断但不过度承诺。`;

const complianceRules = `禁止出现私信、微信、VX、加V、二维码、扫码、报价、联系我、进群、主页联系方式等导流表达。结尾使用内容参考或活动策划建议，不直接引导联系。`;

function context(businessType: BusinessType, scene: SceneType, caseBrief: string) {
  const sceneInfo = getScene(businessType, scene);
  if (!sceneInfo) throw new Error('场景与业务类型不匹配。');
  return { sceneInfo, text: `业务：${businessType === 'diy' ? '手作DIY' : 'Photobooth'}\n场景：${sceneInfo.label}\n客户目的：${sceneInfo.intent}\n案例简介：${caseBrief}` };
}

export function noteDraftPrompt(businessType: BusinessType, scene: SceneType, caseBrief: string): string {
  const { text } = context(businessType, scene, caseBrief);
  return `你是乐活互动的小红书内容策略编辑。先站在活动决策人的角度理解他们为什么会找活动服务，再写内容。目标是让精准客户愿意点击、读完并建立合作信任，不是堆砌广告词。\n\n${text}\n\n${businessRules[businessType]}\n${complianceRules}\n\n只输出合法JSON，不要Markdown：\n{"audienceIntent":"一句具体判断","titles":["标题1","标题2","标题3"],"recommendedTitle":0,"body":"正文，不含话题","tags":["#话题"]}\n\n要求：严格3个标题；每个标题自然包含场景、城市、项目或决策人痛点中的有效信息；正文只写一篇，围绕客户目的和案例信息展开；话题8到12个；不知道的信息不补写；不能承诺提升销售、成交或客流。`;
}

export function noteReviewPrompt(businessType: BusinessType, scene: SceneType, caseBrief: string, draft: unknown): string {
  const { text } = context(businessType, scene, caseBrief);
  return `你是乐活互动的终审编辑。检查并重写下面的初稿。任何未经输入支持的事实都要删除。最终文案要自然、专业，能让目标客户看到自己的活动需求。\n\n原始事实：\n${text}\n\n业务隔离：${businessRules[businessType]}\n合规：${complianceRules}\n\nHumanizer编辑规则：${humanizerRules}\n\n待审初稿：\n${JSON.stringify(draft)}\n\n只输出合法JSON，不要Markdown：\n{"audienceIntent":"一句具体判断","titles":["标题1","标题2","标题3"],"recommendedTitle":0,"body":"最终正文，不含话题","tags":["#话题"],"reviewChecks":["已核对的项目"]}\n\n硬性要求：标题严格3个；正文只有1篇；话题8到12个；正文不出现话题；不编造；不混写业务；不要AI腔；不出现导流词。`;
}

export function coverPromptInstruction(businessType: BusinessType, scene: SceneType, caseBrief: string, imageCount: number): string {
  const { text } = context(businessType, scene, caseBrief);
  return `你是小红书首图策略与活动摄影编辑。请分析${imageCount}张按顺序编号的真实活动图片。封面的目标是让对应场景的活动决策人愿意点开，同时保持真实。\n\n${text}\n${businessRules[businessType]}\n${complianceRules}\n\n只输出合法JSON，不要Markdown：\n{"bestImageIndex":0,"imageAnalysis":[{"imageIndex":0,"observation":"只写可见事实","recommendation":"封面建议","score":90}],"coverTexts":["封面大字1","封面大字2","封面大字3"],"recommendedCoverText":0,"prompt":"用于gpt-image-2图片编辑的详细中文提示词，不要求模型写字","negativePrompt":"必须避免的改变和内容"}\n\n要求：数组覆盖每张图片；索引从0开始；封面大字严格3条、每条8到16个汉字；提示词要保留人物五官、动作、服装、设备、手作成品和现场核心结构；优化光线、构图和杂乱背景；画面中不要生成任何标题文字、二维码、联系方式、额外Logo或虚假人物。`;
}

export function accountPrompt(imageCount: number, manualNotes: string): string {
  return `你是资深小红书账号诊断顾问。请认真读取${imageCount}张按顺序编号的账号截图。只依据可见信息分析，事实、推断和建议必须分开。看不清就写入unknowns，禁止补写数据。\n\n用户补充：${manualNotes || '无'}\n\n重点检查：账号定位、简介是否说明城市与业务、手作DIY与Photobooth是否区分、封面统一性、标题搜索价值、真实案例、HR/商场/楼盘等客户视角、本地关键词、广告感和合规风险。\n\n只输出合法JSON，不要Markdown：\n{"summary":"总结","evidence":[{"screenshot":1,"observation":"可见事实","confidence":"high"}],"diagnosis":[{"issue":"问题","evidence":"截图依据","priority":"high","confidence":"high"}],"profileSuggestions":["建议"],"titleSuggestions":["建议"],"coverSuggestions":["建议"],"contentColumns":["栏目"],"riskWarnings":["风险"],"unknowns":["无法判断项"],"actionPlan14Days":[{"days":"第1-2天","action":"行动"}]}\n\n证据中的截图编号从1开始；confidence只能是high、medium、low；priority只能是high、medium、low；所有诊断必须有具体证据；行动计划必须可执行。`;
}

export function competitorPrompt(input: { businessType: BusinessType; scene: SceneType; title: string; copy: string; stats: Record<string, string>; imageCount: number }): string {
  const { text } = context(input.businessType, input.scene, '根据同行内容改写，不虚构乐活互动案例');
  return `你是小红书内容策略分析师。请结合${input.imageCount}张按顺序编号的同行截图和手动信息，分析这条内容为什么可能获得点击、收藏或讨论。事实与推断必须分开，数据不足时写入unknowns。\n\n改写目标：\n${text}\n同行标题：${input.title || '未提供'}\n同行正文：${input.copy || '未提供'}\n互动数据：${JSON.stringify(input.stats)}\n\n${businessRules[input.businessType]}\n${complianceRules}\n${humanizerRules}\n\n只输出合法JSON，不要Markdown：\n{"summary":"总结","evidence":[{"screenshot":1,"observation":"可见事实","confidence":"high"}],"titleStructure":"结构","coverStructure":"结构","contentStructure":["步骤"],"viralReasons":[{"reason":"原因","basis":"依据","kind":"fact"}],"audienceQuality":"精准或泛流量判断","imitationSuggestions":["可借鉴"],"avoidCopying":["不能照抄"],"adaptedTitles":["标题1","标题2","标题3"],"adaptedCopyAngle":"一篇正文的明确写作角度","risks":["风险"],"unknowns":["信息不足项"]}\n\nkind只能是fact或inference；adaptedTitles严格3个；不要声称内容一定爆；不要编造乐活互动未提供的案例。`;
}
