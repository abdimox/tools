import { ArrowRight, Camera, FileText, Image, MessageSquareText, Palette, ShieldCheck, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const tasks = [
  { to: '/note', icon: FileText, eyebrow: 'WORKFLOW', title: '选题与文案', description: '选择业务和客户场景，先生成选题，再把选题写成自然文案。', meta: '三步流程', primary: true },
  { to: '/chat', icon: MessageSquareText, eyebrow: 'CHAT', title: 'GPT 对话', description: '连续提问并上传图片，聊天历史保存在当前浏览器。', meta: '支持本地备份' },
  { to: '/cover', icon: Image, eyebrow: 'COVER', title: '制作封面图', description: '粘贴提示词并上传真实参考图，调用当前图片接口生成。', meta: '保留原有流程' },
];

export function DashboardPage() {
  return <div className="dashboard-page">
    <section className="welcome-strip"><div><span className="eyebrow">静态个人版</span><h2>先选题，再写文案，最后做封面</h2><p>接口配置和聊天记录只保存在当前浏览器，不依赖服务器和数据库。</p></div><div className="welcome-visual"><WandSparkles size={30} /><span>Obsidian知识库<br /><small>已同步进运营流程</small></span></div></section>
    <section className="task-grid">{tasks.map(({ to, icon: Icon, eyebrow, title, description, meta, primary }) => <Link className={`task-card ${primary ? 'task-primary' : ''}`} to={to} key={to}><div className="task-top"><span className="task-icon"><Icon size={23} /></span><span className="task-eyebrow">{eyebrow}</span></div><div><h3>{title}</h3><p>{description}</p></div><footer><span>{meta}</span><ArrowRight size={19} /></footer></Link>)}</section>
    <section className="business-overview"><div className="overview-heading"><div><span className="eyebrow">业务入口</span><h2>保留两条业务，但内容逻辑严格分开</h2></div><span className="safe-pill"><ShieldCheck size={16} />事实边界检查</span></div><div className="business-columns">
      <div><span className="business-round diy"><Palette size={21} /></span><h3>手作DIY</h3><p>企业、商场、楼盘、社区和4S店的上门手作活动。</p></div>
      <div><span className="business-round booth"><Camera size={21} /></span><h3>Photobooth</h3><p>婚礼、企业活动、宝宝宴和聚会，使用已整理的运营知识库。</p></div>
    </div></section>
  </div>;
}
