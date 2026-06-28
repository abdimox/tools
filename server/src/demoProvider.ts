import { businessData } from './data.js';
import { checkCompliance } from './complianceService.js';
import { parseBrief } from './parseBrief.js';
import type { AiProvider, AnalyzeAccountInput, AnalyzeCompetitorInput, GenerateNoteInput } from './aiProvider.js';
import type { AccountAnalysis, BusinessType, CompetitorAnalysis, NoteResult, ParsedInfo } from './types.js';

function localTag(city: string): string | null {
  return city === '城市待补充' ? null : `#${city}活动`;
}

function makeTitles(type: BusinessType, info: ParsedInfo): Array<{ category: string; text: string }> {
  const { city, peopleCount, project, scenario } = info;
  const location = city === '城市待补充' ? '本地' : city;
  const size = peopleCount === '人数待补充' ? '多人' : peopleCount;
  const diy = [
    ['搜索型', `${location}企业团建活动，${project}很适合`],
    ['搜索型', `${location}${scenario}怎么选？这场${project}可以参考`],
    ['搜索型', `适合公司员工活动的${project}案例`],
    ['搜索型', `${location}轻量团建，手作DIY这样安排更顺`],
    ['案例型', `${size}公司团建，轻量手作更好落地`],
    ['案例型', `复盘一场${location}${project}员工活动`],
    ['案例型', `这场企业DIY活动，员工参与度比预想更高`],
    ['案例型', `${scenario}现场记录：大家真的愿意动手做`],
    ['痛点型', `公司团建不想尴尬，可以试试这种DIY`],
    ['痛点型', `员工活动总冷场？项目门槛可能选高了`],
    ['痛点型', `HR办活动最怕失控，这种流程更省心`],
    ['痛点型', `不想团建太累，轻手作反而更合适`],
    ['收藏型', `HR收藏：企业手作活动落地清单`],
    ['收藏型', `做员工活动前，先看这份DIY避坑建议`],
    ['收藏型', `企业团建选项目，这5个维度先确认`],
    ['收藏型', `适合办公室团建的手作项目参考`],
    ['本地获客型', `${location}企业活动案例｜${project}`],
    ['本地获客型', `${location}公司团建，现场这样安排不冷场`],
    ['本地获客型', `${location}员工活动真实记录，流程很轻松`],
    ['本地获客型', `${location}${scenario}，手作互动区这样做`],
    ['节日热点型', `节日员工活动，${project}氛围刚刚好`],
    ['节日热点型', `节日团建别太重，轻量DIY更容易参与`],
    ['节日热点型', `公司节日活动怎么做？这场案例可参考`],
    ['项目介绍型', `${project}为什么适合企业员工活动`],
    ['项目介绍型', `新手也能完成的${project}，现场效果如何`],
    ['项目介绍型', `手作DIY团建，从物料到成品的完整流程`],
    ['场景解决型', `办公室下午茶，加一场手作互动刚刚好`],
    ['场景解决型', `楼盘暖场想提升停留时间，可以这样安排`],
    ['场景解决型', `商场亲子活动，低门槛项目更容易聚人`],
    ['场景解决型', `企业活动想兼顾互动和出片，可以这样做`],
  ];
  const booth = [
    ['搜索型', `${location}企业活动Photobooth互动拍摄案例`],
    ['搜索型', `${location}${scenario}即拍即印怎么安排`],
    ['搜索型', `企业年会拍照打卡区，Photobooth很适合`],
    ['搜索型', `${location}复古拍照机活动现场参考`],
    ['案例型', `${size}${scenario}，现场互动拍摄真实记录`],
    ['案例型', `这场${location}活动，拍照区成了人气点位`],
    ['案例型', `复盘一场企业年会Photobooth互动区`],
    ['案例型', `宾客主动排队拍照，是怎样的现场体验`],
    ['痛点型', `活动现场只有合影，互动感真的不够`],
    ['痛点型', `年会拍照区没人停留？可能少了这一步`],
    ['痛点型', `背景板拍完就走，互动拍照更有记忆点`],
    ['痛点型', `活动想出片又怕冷场，可以这样做`],
    ['收藏型', `活动策划收藏：拍照互动区落地清单`],
    ['收藏型', `Photobooth进场前，这6件事要确认`],
    ['收藏型', `年会互动怎么选？即拍即印案例参考`],
    ['收藏型', `婚礼拍照区布置，先看这份避坑建议`],
    ['本地获客型', `${location}企业年会互动拍照现场`],
    ['本地获客型', `${location}品牌活动打卡区案例`],
    ['本地获客型', `${location}婚礼Photobooth即拍即印`],
    ['本地获客型', `${location}活动拍照互动，现场氛围很自然`],
    ['节日热点型', `年会互动这样安排，现场更有参与感`],
    ['节日热点型', `新年活动打卡区，复古拍照机很出片`],
    ['节日热点型', `节日派对增加一个即拍即印互动点`],
    ['项目介绍型', `Photobooth不只是拍照，更是现场互动`],
    ['项目介绍型', `即拍即印为什么更容易留下记忆点`],
    ['项目介绍型', `复古拍照机互动区完整流程分享`],
    ['场景解决型', `企业年会想提升氛围，可以加个拍照区`],
    ['场景解决型', `婚礼宾客互动少，Photobooth更自然`],
    ['场景解决型', `品牌活动想兼顾打卡和传播，可以这样做`],
    ['场景解决型', `签到区不只签到，也能成为活动亮点`],
  ];
  return (type === 'diy' ? diy : booth).map(([category, text]) => ({ category, text }));
}

function makeCopyVersions(type: BusinessType, info: ParsedInfo): Array<{ name: string; content: string }> {
  const { city, peopleCount, project, scenario } = info;
  const place = city === '城市待补充' ? '本地' : city;
  const people = peopleCount === '人数待补充' ? '现场参与者' : `大约${peopleCount}`;
  if (type === 'diy') {
    return [
      {
        name: '真实案例版',
        content: `这次是${place}一场${scenario}，${people}，选择的是${project}。\n\n客户希望活动不要太累，也不要太尴尬，大家可以轻松参与，现场还能留下适合记录的画面。\n\n活动从物料准备、老师示范到大家动手制作，节奏比较自然。参与者可以边做边交流，完成后每个人都有自己的成品可以带走。\n\n这类轻量手作比较适合企业团建、员工下午茶和节日活动。对HR和行政来说，项目门槛低、流程清楚、现场有成品，通常更容易落地。`,
      },
      {
        name: 'HR干货版',
        content: `HR策划员工活动时，可以先看四件事：人数、场地、时长和参与门槛。\n\n这次${place}${peopleCount}的${project}，现场采用分桌物料包和统一教学，避免等待时间过长。老师先完成关键步骤示范，再让大家自由发挥。\n\n比起强竞技项目，轻量手作对不同年龄和性格的员工更友好。活动结束还有成品，参与感和记忆点都比较完整。\n\n如果希望团建轻松、不冷场，流程设计往往比项目堆砌更重要。`,
      },
      {
        name: '项目介绍版',
        content: `${project}是一类适合多人共同参与的轻手作项目。现场会准备工具、材料和桌面布置，并由老师分步骤示范。\n\n新手不需要提前学习，跟着流程即可完成。制作过程适合交流和拍照，成品也能作为活动纪念带走。\n\n它比较适合企业员工活动、办公室下午茶、楼盘暖场和商场亲子场景。人数较多时，提前分装材料并控制教学节奏，现场会更顺畅。`,
      },
      {
        name: '节日活动版',
        content: `节日活动不一定要安排得很重。把节日元素融入${project}，既有主题感，也保留了轻松参与的空间。\n\n这场${place}${scenario}从桌面配色、材料准备到成品包装都围绕节日氛围展开。大家可以按自己的喜好完成作品，过程自然，画面也比较丰富。\n\n适合希望兼顾仪式感、参与度和现场秩序的企业活动。`,
      },
      {
        name: '楼盘/商场活动版',
        content: `楼盘和商场活动更看重参与门槛、停留时间和现场秩序。${project}步骤直观，亲子和成人都容易上手。\n\n现场通过分区领料、集中教学和成品包装，让体验流程更清楚。手作过程能自然形成围观和互动，完成后的作品也提升了活动记忆点。\n\n这类项目适合作为周末暖场或节日主题活动参考。`,
      },
    ];
  }
  return [
    {
      name: '企业年会版',
      content: `这次是${place}一场${scenario}，${people}。现场设置了Photobooth互动拍摄区，宾客可以自由拍照并即拍即印。\n\n相比统一大合影，互动拍照更像一个自然停留点。大家在签到、候场和活动间隙都能参与，照片现场拿走，也为年会多留下一份实体纪念。\n\n对活动策划来说，设备位置、拍照模板和动线安排会直接影响参与度。`,
    },
    {
      name: '婚礼派对版',
      content: `婚礼和派对里，宾客不一定彼此熟悉。Photobooth可以成为一个低压力的互动点，大家自由组合拍照，等待几分钟就能拿到照片。\n\n这次现场把复古拍照机放在签到区附近，既方便发现，也不会影响主流程。定制照片模板与现场视觉保持一致，拍完的照片更像一份专属纪念。`,
    },
    {
      name: '品牌活动版',
      content: `品牌活动的拍照区不仅要好看，也要让参与动作足够简单。现场通过明确的拍摄位置、统一模板和即拍即印，让用户从拍照到拿图形成完整体验。\n\nPhotobooth保留了真实活动氛围，也能让品牌视觉自然出现在照片模板中。比单纯背景板更容易形成停留和互动。`,
    },
    {
      name: '活动打卡版',
      content: `一个好用的活动打卡区，关键不是装饰越多越好，而是位置清楚、操作简单、出片稳定。\n\n这次Photobooth互动区采用正面补光、简洁背景和即拍即印流程。参与者不需要学习复杂操作，拍完即可拿到照片，现场节奏轻松，传播素材也更自然。`,
    },
    {
      name: '真实案例版',
      content: `记录一场${place}${scenario}的Photobooth互动区。设备进场后先完成位置、光线和打印测试，再根据现场动线开放体验。\n\n活动开始后，宾客会自然聚集到拍照区。即拍即印让互动有了即时反馈，照片可以带走，现场也多了一个持续有内容发生的区域。\n\n如果活动希望增加氛围感和记忆点，这类轻互动比单纯合影更完整。`,
    },
  ];
}

function makeCoverTexts(type: BusinessType, info: ParsedInfo): string[] {
  const city = info.city === '城市待补充' ? '企业' : info.city;
  return type === 'diy'
    ? ['员工参与度真的高', '公司团建不冷场', 'HR省心活动方案', `${city}企业团建案例`, '成品好看还能带走', '轻量团建更好落地', '适合办公室团建', '企业活动这样安排', '新手也能轻松完成', '团建氛围自然不尴尬', '这场手作活动很出片', '员工下午茶新思路', '企业DIY完整流程', '节日活动这样做', '活动现场参与感拉满', '低门槛团建项目', 'HR可以收藏的案例', '楼盘暖场项目参考', '商场亲子活动案例', '手作团建真实记录']
    : ['年会互动这样安排', '现场打卡氛围拉满', '即拍即印太有记忆点', '宾客真的会主动拍', `${city}活动拍照区案例`, '婚礼拍照互动感拉满', '比普通合影更有趣', '活动现场更出片', '复古拍照机真实案例', '年会现场人气点位', '品牌活动打卡参考', '签到区也能很好玩', '照片当场就能带走', '企业活动互动新思路', '现场氛围自然升温', '婚礼宾客互动区', '拍照打卡区这样做', 'Photobooth完整流程', '活动策划可以收藏', '这场互动拍摄很出片'];
}

function imageAnalysis(input: GenerateNoteInput, coverTexts: string[]) {
  const suggestions = input.images.map((image, index) => {
    const portrait = (image.height ?? 1) >= (image.width ?? 1);
    const score = Math.max(72, 94 - index * 4 + (portrait ? 3 : 0));
    return {
      image: image.originalName,
      recommendation: index === 0 ? '主体最清晰，建议作为首选封面' : index < 3 ? '适合放在笔记前段展示现场细节' : '适合作为补充氛围图',
      crop: portrait ? '保留主体，轻微裁剪为3:4' : '建议居中裁剪为3:4，避免切到人物或设备',
      enhancement: index % 2 === 0 ? '整体提亮约8%，适度增加清晰度' : '压低杂乱背景，提升主体对比度',
      suitableText: coverTexts[index % coverTexts.length],
      score,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    summary: input.images.length ? `已分析 ${input.images.length} 张图片，建议优先选择主体清晰、互动动作完整的画面。` : '尚未上传图片，可先使用文案结果；上传真实活动图后可获得封面建议。',
    bestCoverImage: suggestions[0]?.image ?? null,
    imageOrderSuggestion: suggestions.map((item) => item.image),
    suggestions,
  };
}

export class DemoProvider implements AiProvider {
  async generateNote(input: GenerateNoteInput): Promise<NoteResult> {
    const info = parseBrief(input.caseBrief, input.businessType);
    const data = businessData[input.businessType];
    const titles = makeTitles(input.businessType, info);
    const copyVersions = makeCopyVersions(input.businessType, info);
    const coverTexts = makeCoverTexts(input.businessType, info);
    const tags = [localTag(info.city), `#${info.project.replaceAll(' ', '')}`, ...data.tags].filter(Boolean).slice(0, 12) as string[];
    const coverPrompt = input.businessType === 'diy'
      ? `以用户上传的真实活动照片为基础，保留人物、手作过程、桌面布置和现场结构，制作3:4竖版小红书封面。整体干净明亮、温暖高级，以橙白色作为轻量点缀，突出企业DIY团建的真实参与感。主标题使用“${coverTexts[0]}”，不遮挡人物和成品。`
      : `以用户上传的真实Photobooth活动照片为基础，保留拍照机、拍照区布置、人物动作和设备外观，制作3:4竖版小红书封面。整体高级、干净、明亮，突出即拍即印和现场互动氛围。主标题使用“${coverTexts[0]}”，不遮挡设备和人物。`;
    const negativePrompt = '不要改变人物五官、动作、服装或设备结构；不要生成二维码、联系方式、微信、报价、私信、额外Logo、错别字或虚假场景。';
    const complianceResult = checkCompliance({
      标题: titles.map((item) => item.text),
      正文: copyVersions.map((item) => item.content),
      封面文案: coverTexts,
      标签: tags,
      封面提示词: coverPrompt,
    });
    return {
      mode: 'demo',
      parsedInfo: info,
      services: data.services,
      highlights: data.highlights,
      imageAnalysis: imageAnalysis(input, coverTexts),
      titles,
      copyVersions,
      coverTexts,
      tags,
      coverPrompt,
      negativePrompt,
      complianceResult,
    };
  }

  async analyzeAccount(input: AnalyzeAccountInput): Promise<AccountAnalysis> {
    const hasImages = input.images.length > 0;
    return {
      mode: 'demo',
      summary: `根据 ${input.images.length} 张账号截图与补充信息完成演示诊断。当前最优先的问题是定位表达、案例结构和封面统一性。`,
      score: hasImages ? 68 : 60,
      diagnosis: ['手作DIY与Photobooth需要在栏目和封面识别上明确区分', '主页内容偏作品展示，缺少客户场景与策划视角', '标题中的城市、客户类型和项目关键词覆盖不足', '置顶内容尚未形成“我们是谁—做过什么—如何选择”的信任路径'],
      profileSuggestions: ['首行说明服务区域与企业活动属性', '第二行并列说明手作DIY与Photobooth两条业务', '避免联系方式和私信引导，改为案例与经验分享定位'],
      pinnedPostSuggestions: ['置顶1：乐活互动业务与服务场景总览', '置顶2：企业DIY团建真实案例合集', '置顶3：Photobooth年会/婚礼案例合集'],
      titleSuggestions: ['城市 + 客户类型 + 项目 + 场景', '人群痛点 + 解决方式 + 真实案例', 'HR收藏 + 数字清单 + 活动主题'],
      coverSuggestions: ['两条业务使用不同角标，但保持统一字体与留白', '主标题控制在8–16字，避免遮挡人物和设备', '首图优先使用有互动动作、主体清晰的真实现场图'],
      contentColumns: ['企业活动真实案例', 'HR/行政策划干货', '项目选择与避坑', '现场流程复盘', 'Photobooth互动灵感'],
      riskWarnings: ['主页与正文避免出现微信、VX、报价和扫码等导流表达', '不要用“全网第一”“保证效果”等夸张承诺', '人物正脸和客户品牌露出前应确认素材授权'],
      actionPlan14Days: [
        { days: '第1–2天', action: '重写主页简介，明确服务城市、客户和两条业务。' },
        { days: '第3–4天', action: '统一封面模板，分别建立DIY与Photobooth角标。' },
        { days: '第5–7天', action: '发布2篇真实案例和1篇HR项目选择干货。' },
        { days: '第8–10天', action: '补齐3篇置顶内容，调整标题中的本地搜索词。' },
        { days: '第11–14天', action: '复盘点击与收藏表现，保留高意图主题继续迭代。' },
      ],
    };
  }

  async analyzeCompetitor(input: AnalyzeCompetitorInput): Promise<CompetitorAnalysis> {
    const dataSignals = [input.stats.likes, input.stats.favorites, input.stats.comments].filter(Boolean).length;
    return {
      mode: 'demo',
      viralReasons: ['标题给出了明确人群、场景与可获得的信息，降低理解成本', '封面文字短，结果导向清楚，适合信息流快速浏览', `内容具有清单或复盘属性，容易被收藏${dataSignals ? '；互动数据也显示用户存在进一步参考意图' : ''}`, '正文从痛点进入，再给方法和案例，阅读路径完整'],
      titleStructure: '目标人群 + 收藏/痛点钩子 + 数字或项目 + 使用场景',
      coverStructure: '真实场景主图 + 8–16字结果型大标题 + 小型场景说明',
      contentStructure: ['开头点出活动策划的具体问题', '中段给出项目、流程或选择标准', '用真实现场细节建立可信度', '结尾总结适用场景并提供收藏价值'],
      audienceQuality: '以HR、行政、活动策划和婚礼/品牌活动负责人为主，属于较精准流量；纯情绪标题可能带来更多泛流量。',
      imitationSuggestions: ['借鉴“人群+场景+结果”的标题结构', '保留真实现场照片和可执行信息', '把泛化清单改成乐活互动真实案例与服务经验', '分别改写成手作DIY和Photobooth内容，避免业务混写'],
      avoidCopying: ['不要照搬对方原句、封面版式或品牌视觉', '不要复制无法验证的效果承诺和数据', '不要沿用私信、报价、联系方式等导流结尾'],
      adaptedTitles: {
        diy: ['HR收藏！适合企业团建的9个DIY项目', '公司团建不想冷场，轻量手作这样选', '广州企业员工活动，真实DIY案例复盘'],
        photobooth: ['年会互动怎么做？Photobooth案例可以参考', '活动别只拍合影，即拍即印更有记忆点', '广州品牌活动打卡区，现场这样安排'],
      },
      adaptedCopyAngles: {
        diy: ['从HR如何控制人数、场地和流程切入', '用成品可带走与低参与门槛解释项目价值', '复盘老师教学、物料分装和现场互动'],
        photobooth: ['从普通背景板互动不足切入', '解释即拍即印、打卡与现场停留的关系', '复盘设备位置、模板设计和宾客动线'],
      },
      risks: ['检查标题和正文是否出现私信、微信、VX、报价、二维码或扫码', '避免夸张承诺、虚假数据和未授权客户信息', '改写时保持内容原创，不能只替换少量词语'],
    };
  }
}
