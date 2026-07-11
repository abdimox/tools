import { ArrowRight, Camera, FileText, Image, MessageSquareText, Palette, ShieldCheck, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const tasks = [
  { to: '/note', icon: FileText, eyebrow: 'WORKFLOW', title: '选题封面文案', description: '选择场景生成选题，上传真实图片做拼图封面，再生成自然文案。', meta: '完整发布流程', primary: true },
  { to: '/chat', icon: MessageSquareText, eyebrow: 'CHAT', title: 'GPT 对话', description: '连续提问并上传图片，聊天历史保存在当前浏览器。', meta: '支持本地备份' },
  { to: '/cover', icon: Image, eyebrow: 'COVER', title: '单独做封面', description: '输入封面大字，上传1-4张真实图片，生成朴素小红书拼图封面。', meta: '可选API整理' },
];

export function DashboardPage() {
  return <div className="dashboard-page">
    <section className="welcome-strip"><div><span className="eyebrow">静态个人版</span><h2>先选题，再做封面，最后写文案</h2><p>核心流程收缩到每天能直接发一条内容：选题、拼图封面、正文、话题。</p></div><div className="welcome-visual"><WandSparkles size={30} /><span>真实图片优先<br /><small>封面不做花哨海报</small></span></div></section>
    <section className="task-grid">{tasks.map(({ to, icon: Icon, eyebrow, title, description, meta, primary }) => <Link className={`task-card ${primary ? 'task-primary' : ''}`} to={to} key={to}><div className="task-top"><span className="task-icon"><Icon size={23} /></span><span className="task-eyebrow">{eyebrow}</span></div><div><h3>{title}</h3><p>{description}</p></div><footer><span>{meta}</span><ArrowRight size={19} /></footer></Link>)}</section>
    <section className="business-overview"><div className="overview-heading"><div><span className="eyebrow">业务入口</span><h2>保留两条业务，但内容逻辑严格分开</h2></div><span className="safe-pill"><ShieldCheck size={16} />事实边界检查</span></div><div className="business-columns">
      <div><span className="business-round diy"><Palette size={21} /></span><h3>手作DIY</h3><p>企业、商场、楼盘、社区和4S店的上门手作活动。</p></div>
      <div><span className="business-round booth"><Camera size={21} /></span><h3>Photobooth</h3><p>婚礼、企业活动、宝宝宴和聚会，使用已整理的运营知识库。</p></div>
    </div></section>
  </div>;
}
