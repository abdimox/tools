import { knowledgeFor } from './knowledge';
import { getAiConfig } from './localSettings';
import { getScene, type BusinessType, type ChatMessage, type NoteResult, type SceneType, type TopicIdea } from './types';

type AiMessage = { role: 'system' | 'user' | 'assistant'; content: unknown };

function stripJsonFence(content: string): string {
  const value = content.trim();
  if (value.startsWith('```')) return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const objectStart = value.indexOf('{');
  const arrayStart = value.indexOf('[');
  const starts = [objectStart, arrayStart].filter((item) => item >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(value.lastIndexOf('}'), value.lastIndexOf(']'));
  return start >= 0 && end > start ? value.slice(start, end + 1) : value;
}

async function request(path: string, init: RequestInit, kind: 'text' | 'image' = 'text'): Promise<Response> {
  const config = getAiConfig();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}${path}`, { ...init, signal: controller.signal });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      if (response.status === 401 || response.status === 403) throw new Error(`鉴权失败，请检查${kind === 'text' ? '文字' : '图片'} API Key。`);
      throw new Error(`接口请求失败（${response.status}）：${detail || '没有错误详情'}`);
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('AI请求超时，请稍后重试。');
    if (error instanceof TypeError) throw new Error('浏览器无法连接接口，可能是网络或跨域限制。');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function responseText(data: unknown): string {
  const root = data as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  const content = root.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((item) => item.text || '').join('');
  throw new Error('接口没有返回可识别的文字内容。');
}

export async function callChat(messages: AiMessage[]): Promise<string> {
  const config = getAiConfig();
  if (!config.textApiKey.trim()) throw new Error('请先到“设置”填写文字 API Key。');
  const response = await request('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.textApiKey.trim()}` },
    body: JSON.stringify({ model: config.textModel, messages }),
  });
  return responseText(await response.json()).trim();
}

async function callJson<T>(prompt: string): Promise<T> {
  const messages: AiMessage[] = [
    { role: 'system', content: '严格遵守事实边界和输出格式。只输出合法JSON，不要Markdown。' },
    { role: 'user', content: prompt },
  ];
  const first = await callChat(messages);
  try { return JSON.parse(stripJsonFence(first)) as T; }
  catch {
    const repaired = await callChat([...messages, { role: 'assistant', content: first }, { role: 'user', content: '只修复为合法JSON，不新增内容，不要解释。' }]);
    try { return JSON.parse(stripJsonFence(repaired)) as T; }
    catch { throw new Error('AI没有返回正确的数据格式，请重试。'); }
  }
}

function context(businessType: BusinessType, scene: SceneType): string {
  const item = getScene(businessType, scene);
  if (!item) throw new Error('场景与业务不匹配。');
  const decisionMakers: Record<SceneType, string> = {
    enterprise: 'HR、行政或员工活动负责人', mall: '商场运营或市场负责人', property: '楼盘营销或活动负责人', community: '社区运营或物业负责人', auto4s: '4S店市场或门店负责人',
    wedding: '新人或婚礼策划', corporate: 'HR、行政、市场或年会负责人', baby: '宝宝家庭或宴会策划', party: '聚会组织者或活动策划',
  };
  return `业务：${businessType === 'diy' ? '手作DIY' : 'Photobooth'}\n场景：${item.label}\n决策人：${decisionMakers[scene]}\n场景目的：${item.description}`;
}

export async function generateTopics(businessType: BusinessType, scene: SceneType): Promise<TopicIdea[]> {
  const raw = await callJson<{ topics?: TopicIdea[] }>(`你是乐活互动的小红书运营负责人。根据场景生成12个真正值得发布的选题，目标是广州、佛山、东莞的精准客户，而不是泛流量。

${context(businessType, scene)}

业务知识：
${knowledgeFor(businessType)}

选题必须覆盖这些类型，不要只换词：
1. 争议讨论：让用户想评论，例如“有摄影师还要不要”
2. 避坑攻略：让用户觉得靠谱，例如“别只问价格”
3. 对比科普：解释陌生概念，例如“和即影即有的区别”
4. 真实案例：适合放现场图和成片图
5. 成本解释：解释1000多花在哪里
6. 场景种草：让用户代入婚礼、宝宝宴、企业活动
7. 服务信任：解释现场执行、工作人员、稳定性

封面方向要朴素真实：真实照片拼图 + 普通大字标题，不要海报感、不要潮流贴纸、不要夸张emoji。
不能虚构案例、人数、价格、客户反馈和成交效果。禁止导流话术。标题口语化，有明确点击理由，适合引发讨论或收藏。
只输出：{"topics":[{"id":"topic-1","title":"选题标题","contentType":"争议讨论/避坑攻略/对比科普/真实案例/成本解释/场景种草/服务信任","angle":"内容切口","audiencePain":"目标客户心里正在纠结什么","reason":"为什么目标客户会点开","coverText":"封面大字，6到14字，普通直接","coverTip":"建议用什么照片做封面拼图","discussionQuestion":"评论区引导问题"}]}`);
  const topics = Array.isArray(raw.topics) ? raw.topics : [];
  if (topics.length < 6) throw new Error('AI返回的选题太少，请重试。');
  return topics.slice(0, 12).map((item, index) => ({
    id: item.id || `topic-${index + 1}`, title: String(item.title || '').trim(), angle: String(item.angle || '').trim(),
    reason: String(item.reason || '').trim(), coverText: String(item.coverText || '').trim(),
    contentType: String(item.contentType || '运营选题').trim(),
    audiencePain: String(item.audiencePain || '').trim(),
    coverTip: String(item.coverTip || '').trim(),
    discussionQuestion: String(item.discussionQuestion || '').trim(),
  })).filter((item) => item.title);
}

const naturalRules = `
- 只使用用户明确提供的事实，不编造城市、人数、价格、客户反馈、现场反应或成交效果。
- 语气像熟悉活动现场的人分享经验，句子长短自然，不像广告公司提案。
- 删除“赋能、打造沉浸式体验、氛围拉满、闭眼冲、被夸爆、这不仅是更是”等AI和营销套话。
- 开头直接进入具体问题，不自我介绍，不写空泛金句。
- 每段推进一个判断，不机械三段式，不把正文写成功能清单。
- 禁止私信、微信、VX、加V、二维码、扫码、联系我、进群等导流表达，不保证效果。`;

export async function generateCopy(input: { businessType: BusinessType; scene: SceneType; topic: TopicIdea; caseBrief: string }): Promise<NoteResult> {
  const base = `${context(input.businessType, input.scene)}
选题：${input.topic.title}
选题类型：${input.topic.contentType}
切口：${input.topic.angle}
客户纠结：${input.topic.audiencePain || '未补充'}
封面大字：${input.topic.coverText}
评论引导：${input.topic.discussionQuestion || '围绕选题自然提问'}
用户补充事实：${input.caseBrief.trim() || '没有补充事实，只能写经验判断'}
业务知识：${knowledgeFor(input.businessType)}`;
  const draft = await callJson<Record<string, unknown>>(`你是乐活互动的小红书文案编辑。围绕指定选题写初稿。\n${base}\n${naturalRules}\n只输出：{"audienceIntent":"客户动机","titles":["标题1","标题2","标题3"],"recommendedTitle":0,"body":"正文","tags":["#话题"]}`);
  const reviewed = await callJson<{ audienceIntent?: string; titles?: string[]; recommendedTitle?: number; body?: string; tags?: string[]; reviewChecks?: string[] }>(`你是小红书终审编辑。基于唯一事实和业务知识，检查初稿是否跑题、虚构、广告感过重或AI味明显，然后直接重写为最终稿。不要解释检查过程。\n${base}\n${naturalRules}\n待审初稿：${JSON.stringify(draft)}\n只输出：{"audienceIntent":"客户动机","titles":["标题1","标题2","标题3"],"recommendedTitle":0,"body":"正文","tags":["#话题"],"reviewChecks":["事实边界","自然表达","场景匹配","合规"]}`);
  const titles = (reviewed.titles || []).map(String).filter(Boolean).slice(0, 3);
  const body = String(reviewed.body || '').trim();
  const tags = (reviewed.tags || []).map((tag) => String(tag).startsWith('#') ? String(tag) : `#${tag}`).slice(0, 12);
  if (titles.length !== 3 || !body) throw new Error('AI返回的文案不完整，请重试。');
  const scene = getScene(input.businessType, input.scene)!;
  return {
    provider: 'llmhub', businessType: input.businessType, scene: input.scene, sceneLabel: scene.label,
    audienceIntent: reviewed.audienceIntent || scene.description, titles,
    recommendedTitle: Number.isInteger(reviewed.recommendedTitle) ? Math.min(2, Math.max(0, reviewed.recommendedTitle!)) : 0,
    body, tags, fullCopy: `${body}\n\n${tags.join(' ')}`,
    review: { passed: true, checks: reviewed.reviewChecks || ['事实边界', '自然表达', '场景匹配', '合规'] },
  };
}

export async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function chatWithHistory(messages: ChatMessage[]): Promise<string> {
  const recent = messages.slice(-30).map<AiMessage>((message) => {
    if (message.role === 'assistant' || !message.attachments.length) return { role: message.role, content: message.content };
    return {
      role: 'user',
      content: [
        { type: 'text', text: message.content || '请分析这些图片。' },
        ...message.attachments.filter((item) => item.url).map((item) => ({ type: 'image_url', image_url: { url: item.url, detail: 'high' } })),
      ],
    };
  });
  return callChat([{ role: 'system', content: '你是乐活互动内部运营助手。回答直接、可靠、自然，不编造业务事实。' }, ...recent]);
}

export async function generateCoverImage(image: File, prompt: string): Promise<{ blob: Blob; filename: string }> {
  const config = getAiConfig();
  const key = config.imageApiKey.trim() || config.textApiKey.trim();
  if (!key) throw new Error('请先到“设置”填写图片 API Key。');
  const form = new FormData();
  form.append('model', config.imageModel); form.append('prompt', prompt); form.append('image', image, image.name);
  form.append('size', '1024x1536'); form.append('quality', 'medium'); form.append('output_format', 'png');
  const response = await request('/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form }, 'image');
  const data = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = data.data?.[0];
  if (!first) throw new Error('图片接口没有返回结果。');
  let blob: Blob;
  if (first.b64_json) {
    const bytes = Uint8Array.from(atob(first.b64_json), (char) => char.charCodeAt(0));
    blob = new Blob([bytes], { type: 'image/png' });
  } else if (first.url) {
    blob = await (await fetch(first.url)).blob();
  } else throw new Error('图片接口返回格式无法识别。');
  return { blob, filename: `小红书封面-${Date.now()}.png` };
}

export async function testTextConnection(): Promise<string> {
  return callChat([{ role: 'user', content: '只回复：连接成功' }]);
}

export async function testImageConnection(): Promise<void> {
  const config = getAiConfig();
  const key = config.imageApiKey.trim() || config.textApiKey.trim();
  if (!key) throw new Error('请填写图片 API Key。');
  await request('/models', { headers: { Authorization: `Bearer ${key}` } }, 'image');
}
