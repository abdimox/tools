import { FileText, Home, Image, LogOut, Menu, MessageSquareText, Settings, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { AuthUser } from '../types';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/note', label: '选题与文案', icon: FileText },
  { to: '/chat', label: 'GPT 对话', icon: MessageSquareText },
  { to: '/cover', label: '封面图制作', icon: Image },
  { to: '/settings', label: '设置', icon: Settings },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: '工作台首页', description: '选择一个任务，开始本次运营工作' },
  '/note': { title: '选题与文案', description: '按客户场景生成选题，再写成经过复核的正文' },
  '/chat': { title: 'GPT 对话', description: '使用文字模型连续对话，支持上传图片' },
  '/cover': { title: '封面图制作', description: '粘贴提示词，上传参考图，直接生成图片' },
  '/settings': { title: '本地设置', description: '维护接口、聊天备份和本机解锁密码' },
};

export function AppLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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
          <div className="privacy-note"><ShieldCheck size={18} /><span>{user.displayName}<br /><small>数据保存在当前浏览器</small></span></div>
          <button className="logout-button" type="button" onClick={onLogout}><LogOut size={18} />退出登录</button>
        </div>
      </aside>
      {open && <button type="button" aria-label="关闭导航遮罩" className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setOpen(true)} aria-label="打开导航"><Menu size={21} /></button>
          <div><h1>{meta.title}</h1><p>{meta.description}</p></div>
          <span className="live-badge">STATIC AI</span>
        </header>
        <div className={`page-content ${location.pathname === '/chat' ? 'chat-content' : ''}`}><Outlet /></div>
      </main>
    </div>
  );
}
