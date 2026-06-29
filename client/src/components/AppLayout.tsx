import { BarChart3, FileText, Home, Image, LogOut, Menu, Settings, ShieldCheck, Sparkles, UserRoundSearch, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/note', label: '生成笔记', icon: FileText },
  { to: '/cover', label: '封面图制作', icon: Image },
  { to: '/account', label: '账号分析', icon: UserRoundSearch },
  { to: '/competitor', label: '同行分析', icon: BarChart3 },
  { to: '/settings', label: '接口配置', icon: Settings },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: '工作台首页', description: '选择一个任务，开始本次运营工作' },
  '/note': { title: '生成小红书笔记', description: '按客户场景生成3个标题和1篇经过复核的正文' },
  '/cover': { title: '封面图制作', description: '调用真实AI分析活动图、生成提示词与封面' },
  '/account': { title: '分析我的账号', description: '从账号截图中找到定位、内容和流量问题' },
  '/competitor': { title: '分析同行爆款', description: '拆解结构，转化成乐活互动可用的内容方向' },
  '/settings': { title: '接口配置', description: '管理员配置 llmhub 中转站和模型' },
};

export function AppLayout({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? pageMeta['/'];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={22} /></div>
          <div><strong>乐活互动</strong><span>小红书 AI 工作台</span></div>
          <button className="mobile-close" type="button" onClick={() => setOpen(false)} aria-label="关闭导航"><X size={20} /></button>
        </div>
        <nav>
          <span className="nav-label">工作区</span>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="privacy-note"><ShieldCheck size={18} /><span>真实 AI 模式<br /><small>不保存历史数据</small></span></div>
          <button className="logout-button" type="button" onClick={onLogout}><LogOut size={18} />退出登录</button>
        </div>
      </aside>
      {open && <button type="button" aria-label="关闭导航遮罩" className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setOpen(true)} aria-label="打开导航"><Menu size={21} /></button>
          <div><h1>{meta.title}</h1><p>{meta.description}</p></div>
          <span className="live-badge">LIVE AI</span>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
