import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { login, setToken } from '../api';
import { ErrorState } from '../components/Status';

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const result = await login(password);
      setToken(result.token);
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登录失败，请重试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="intro-brand"><span><Sparkles size={26} /></span>乐活互动</div>
        <div className="intro-copy">
          <span className="eyebrow">内部运营工具 · 真实 AI</span>
          <h1>把一次活动，变成一套<br />可直接使用的小红书内容</h1>
          <p>按客户场景生成和复核文案，独立制作封面，并基于真实截图分析账号和同行内容。</p>
        </div>
        <div className="intro-points">
          <span><ShieldCheck size={17} />不保存历史记录</span>
          <span><ShieldCheck size={17} />手作与Photobooth严格分开</span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-icon"><LockKeyhole size={24} /></div>
          <div><h2>进入运营工作台</h2><p>请输入内部访问密码</p></div>
          <label className="field-label" htmlFor="password">访问密码</label>
          <div className="password-field">
            <input id="password" autoFocus type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入访问密码" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {error && <ErrorState message={error} />}
          <button className="button button-primary button-large" type="submit" disabled={loading || !password}>
            {loading ? '正在验证...' : '进入工作台'}<ArrowRight size={18} />
          </button>
          <p className="login-help">本地默认密码：<code>loho2026</code>，部署时请在后端环境变量中修改。</p>
        </form>
      </section>
    </main>
  );
}
