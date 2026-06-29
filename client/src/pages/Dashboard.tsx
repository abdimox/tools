import { ArrowRight, BarChart3, Camera, FileText, Image, Palette, ShieldCheck, UserRoundSearch, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const tasks = [
  {
    to: '/note',
    icon: FileText,
    eyebrow: 'CONTENT',
    title: '生成小红书笔记',
    description: '明确选择客户场景，生成3个标题和1篇经过复核的正文。',
    meta: '无需上传图片',
    primary: true,
  },
  {
    to: '/cover',
    icon: Image,
    eyebrow: 'COVER',
    title: '制作小红书封面',
    description: '分析真实活动图，生成提示词，再调用图片模型制作3:4封面。',
    meta: '提示词与图片分两步生成',
  },
  {
    to: '/account',
    icon: UserRoundSearch,
    eyebrow: 'ACCOUNT',
    title: '分析我的账号',
    description: '上传主页和笔记截图，诊断定位、封面、标题与内容结构。',
    meta: '输出 14 天行动计划',
  },
  {
    to: '/competitor',
    icon: BarChart3,
    eyebrow: 'INSIGHT',
    title: '分析同行爆款',
    description: '拆解爆款逻辑，判断可借鉴部分，并改写为乐活互动版本。',
    meta: '按选择的业务和场景改写',
  },
];

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <section className="welcome-strip">
        <div><span className="eyebrow">今天从哪里开始？</span><h2>内容、封面和分析，各自认真完成</h2><p>选择任务即可开始。所有结果只保留在当前页面，刷新后自动清空。</p></div>
        <div className="welcome-visual"><WandSparkles size={30} /><span>真实 AI 工作流<br /><small>由接口配置统一管理</small></span></div>
      </section>
      <section className="task-grid">
        {tasks.map(({ to, icon: Icon, eyebrow, title, description, meta, primary }) => (
          <Link className={`task-card ${primary ? 'task-primary' : ''}`} to={to} key={to}>
            <div className="task-top"><span className="task-icon"><Icon size={23} /></span><span className="task-eyebrow">{eyebrow}</span></div>
            <div><h3>{title}</h3><p>{description}</p></div>
            <footer><span>{meta}</span><ArrowRight size={19} /></footer>
          </Link>
        ))}
      </section>
      <section className="business-overview">
        <div className="overview-heading"><div><span className="eyebrow">业务隔离</span><h2>两条业务，两套内容逻辑</h2></div><span className="safe-pill"><ShieldCheck size={16} />自动合规检查</span></div>
        <div className="business-columns">
          <div><span className="business-round diy"><Palette size={21} /></span><h3>手作DIY</h3><p>企业、商场、楼盘、社区和4S店，各自使用不同客户目的。</p><div className="mini-tags"><span>老师上门</span><span>成品可带走</span><span>场景必选</span></div></div>
          <div><span className="business-round booth"><Camera size={21} /></span><h3>Photobooth</h3><p>婚礼、企业活动、宝宝宴和聚会，分别理解现场互动需求。</p><div className="mini-tags"><span>即拍即印</span><span>互动打卡</span><span>场景必选</span></div></div>
        </div>
      </section>
    </div>
  );
}
