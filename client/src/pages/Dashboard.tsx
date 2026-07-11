import { ArrowRight, Camera, FileText, Gauge, MessageSquareText, Palette, ShieldCheck, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const tasks = [
  { to: '/note', icon: FileText, eyebrow: 'WORKFLOW', title: '选题与文案', description: '选择场景直接生成10个选题，选中后马上生成小红书正文。', meta: '两步出稿', primary: true },
  { to: '/score', icon: Gauge, eyebrow: 'SCORE', title: '封面标题评分', description: '发帖前上传封面并输入标题，判断第一眼有没有点击理由。', meta: '点击率优先' },
  { to: '/chat', icon: MessageSquareText, eyebrow: 'CHAT', title: 'GPT 对话', description: '连续提问并上传图片，聊天历史保存在当前浏览器。', meta: '支持本地备份' },
];

export function DashboardPage() {
  return <div className="dashboard-page">
    <section className="welcome-strip"><div><span className="eyebrow">静态个人版</span><h2>先出选题，再用封面标题决定发不发</h2><p>日常流程：生成选题和文案；发布前用评分器检查封面和标题有没有点击理由。</p></div><div className="welcome-visual"><WandSparkles size={30} /><span>封面标题优先<br /><small>正文负责承接和信任</small></span></div></section>
    <section className="task-grid">{tasks.map(({ to, icon: Icon, eyebrow, title, description, meta, primary }) => <Link className={`task-card ${primary ? 'task-primary' : ''}`} to={to} key={to}><div className="task-top"><span className="task-icon"><Icon size={23} /></span><span className="task-eyebrow">{eyebrow}</span></div><div><h3>{title}</h3><p>{description}</p></div><footer><span>{meta}</span><ArrowRight size={19} /></footer></Link>)}</section>
    <section className="business-overview"><div className="overview-heading"><div><span className="eyebrow">业务入口</span><h2>保留两条业务，但内容逻辑严格分开</h2></div><span className="safe-pill"><ShieldCheck size={16} />事实边界检查</span></div><div className="business-columns">
      <div><span className="business-round diy"><Palette size={21} /></span><h3>手作DIY</h3><p>企业、商场、楼盘、社区和4S店的上门手作活动。</p></div>
      <div><span className="business-round booth"><Camera size={21} /></span><h3>Photobooth</h3><p>婚礼、企业活动、宝宝宴和聚会，使用已整理的运营知识库。</p></div>
    </div></section>
  </div>;
}
