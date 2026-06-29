import { CheckCircle2, Eye, EyeOff, KeyRound, Plus, Save, Server, TestTube2, UserCog } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { adminRequest } from '../api';
import { ErrorState, LoadingState, SuccessState } from '../components/Status';
import type { AiConfigStatus, EmployeeUser } from '../types';

interface ConfigForm { baseUrl: string; textApiKey: string; imageApiKey: string; textModel: string; imageModel: string; timeoutMs: number; enabled: boolean }
const defaults: ConfigForm = { baseUrl: 'https://llmhub.ltd/v1', textApiKey: '', imageApiKey: '', textModel: 'gpt-5.5', imageModel: 'gpt-image-2', timeoutMs: 120000, enabled: true };

export function SettingsPage() {
  const [users, setUsers] = useState<EmployeeUser[]>([]);
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [form, setForm] = useState(defaults);
  const [name, setName] = useState(''); const [password, setPassword] = useState('');
  const [showTextKey, setShowTextKey] = useState(false); const [showImageKey, setShowImageKey] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState<'text' | 'image' | null>(null);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const [userData, config] = await Promise.all([
        adminRequest<{ users: EmployeeUser[] }>('/api/admin/users'), adminRequest<AiConfigStatus>('/api/admin/ai-config'),
      ]);
      setUsers(userData.users); setStatus(config);
      setForm({ baseUrl: config.baseUrl, textApiKey: '', imageApiKey: '', textModel: config.textModel, imageModel: config.imageModel, timeoutMs: config.timeoutMs, enabled: config.enabled || (!config.textConfigured && !config.imageConfigured) });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '设置加载失败。'); }
    finally { setLoading(false); }
  }

  async function addEmployee(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await adminRequest('/api/admin/users', { method: 'POST', body: { displayName: name, password } });
      setName(''); setPassword(''); setMessage('员工账号已创建。'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : '员工创建失败。'); }
  }

  async function updateEmployee(user: EmployeeUser, changes: { active?: boolean; password?: string }) {
    setError(''); setMessage('');
    try { await adminRequest(`/api/admin/users/${user.id}`, { method: 'PATCH', body: changes }); setMessage('员工账号已更新。'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '员工更新失败。'); }
  }

  async function resetPassword(user: EmployeeUser) {
    const next = window.prompt(`为 ${user.displayName} 设置新密码（至少8个字符）`)?.trim();
    if (next) await updateEmployee(user, { password: next });
  }

  async function saveConfig(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const next = await adminRequest<AiConfigStatus>('/api/admin/ai-config', { method: 'PUT', body: form });
      setStatus(next); setForm((value) => ({ ...value, textApiKey: '', imageApiKey: '' })); setMessage('接口配置已加密保存。');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '保存失败。'); }
    finally { setSaving(false); }
  }

  async function test(kind: 'text' | 'image') {
    setTesting(kind); setError(''); setMessage('');
    try {
      await adminRequest('/api/admin/ai-config/test', { method: 'POST', body: { ...form, kind } });
      setMessage(`${kind === 'text' ? '文字/视觉' : '图片'}接口测试成功。`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '接口测试失败。'); }
    finally { setTesting(null); }
  }

  if (loading) return <LoadingState text="正在加载管理员设置..." />;

  return <div className="settings-page team-settings">
    {error && <ErrorState message={error} />}{message && <SuccessState message={message} />}
    <section className="settings-form employee-settings">
      <header><div><span className="eyebrow">TEAM</span><h2>员工管理</h2><p>每位员工使用不同密码，对话记录互相隔离。</p></div><UserCog size={23} /></header>
      <form className="employee-add" onSubmit={addEmployee}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="员工姓名" maxLength={40} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="独立密码，至少8位" /><button className="button button-primary" type="submit" disabled={!name.trim() || password.length < 8}><Plus size={16} />添加员工</button></form>
      <div className="employee-list">{users.map((user) => <div key={user.id}><div><strong>{user.displayName}</strong><span>{user.role === 'admin' ? '管理员' : user.active ? '正常' : '已停用'}{user.lastLoginAt ? ` · 最近登录 ${new Date(user.lastLoginAt).toLocaleString()}` : ''}</span></div>{user.role === 'employee' && <div><button className="button button-secondary button-small" type="button" onClick={() => resetPassword(user)}><KeyRound size={14} />重置密码</button><button className="button button-secondary button-small" type="button" onClick={() => updateEmployee(user, { active: !user.active })}>{user.active ? '停用' : '启用'}</button></div>}</div>)}</div>
    </section>

    <section className="settings-status"><div><span className={status?.configured && status.enabled ? 'status-dot online' : 'status-dot'}></span><div><h2>{status?.configured ? '文字与图片接口均已配置' : '接口配置尚未完整'}</h2><p>文字：{status?.textConfigured ? status.textApiKeyMasked : '未配置'} · 图片：{status?.imageConfigured ? status.imageApiKeyMasked : '未配置'}</p></div></div><span className="provider-name"><Server size={16} />llmhub</span></section>
    <form className="settings-form" onSubmit={saveConfig}>
      <header><div><span className="eyebrow">OPENAI COMPATIBLE</span><h2>中转站配置</h2><p>文字和图片共享地址，分别使用两个 API Key。</p></div><label className="toggle-row"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span>启用真实AI</span></label></header>
      <div className="settings-fields">
        <label><span>API Base URL</span><input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} /></label>
        <label><span>文字/视觉 API Key</span><div className="password-field"><input type={showTextKey ? 'text' : 'password'} value={form.textApiKey} onChange={(event) => setForm({ ...form, textApiKey: event.target.value })} placeholder={status?.textConfigured ? `留空保持 ${status.textApiKeyMasked}` : '粘贴文字 API Key'} /><button type="button" onClick={() => setShowTextKey((value) => !value)}>{showTextKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>用于笔记、GPT对话、账号和同行分析</small></label>
        <label><span>图片 API Key</span><div className="password-field"><input type={showImageKey ? 'text' : 'password'} value={form.imageApiKey} onChange={(event) => setForm({ ...form, imageApiKey: event.target.value })} placeholder={status?.imageConfigured ? `留空保持 ${status.imageApiKeyMasked}` : '粘贴图片 API Key'} /><button type="button" onClick={() => setShowImageKey((value) => !value)}>{showImageKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>仅用于封面图生成</small></label>
        <label><span>文字模型</span><input value={form.textModel} onChange={(event) => setForm({ ...form, textModel: event.target.value })} /></label>
        <label><span>图片模型</span><input value={form.imageModel} onChange={(event) => setForm({ ...form, imageModel: event.target.value })} /></label>
        <label><span>请求超时（毫秒）</span><input type="number" min={10000} max={300000} value={form.timeoutMs} onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })} /></label>
      </div>
      <footer><button className="button button-secondary" type="button" onClick={() => test('text')} disabled={Boolean(testing)}>{testing === 'text' ? '正在测试...' : <><TestTube2 size={16} />测试文字接口</>}</button><button className="button button-secondary" type="button" onClick={() => test('image')} disabled={Boolean(testing)}>{testing === 'image' ? '正在测试...' : <><TestTube2 size={16} />测试图片接口</>}</button><button className="button button-primary" type="submit" disabled={saving || status?.source === 'environment'}>{saving ? '正在保存...' : <><Save size={16} />加密保存</>}</button></footer>
    </form>
    <section className="settings-security"><CheckCircle2 size={20} /><div><h3>安全说明</h3><p>密码只保存不可逆哈希；API Key 使用 Cloudflare Secret 派生密钥加密后写入 D1，浏览器不会读取完整密钥。</p></div></section>
  </div>;
}
