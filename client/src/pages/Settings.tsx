import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Save, Server, TestTube2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { adminLogin, adminRequest, getAdminToken, setAdminToken } from '../api';
import { ErrorState, LoadingState, SuccessState } from '../components/Status';
import type { AiConfigStatus } from '../types';

interface ConfigForm {
  baseUrl: string; apiKey: string; textModel: string; imageModel: string; timeoutMs: number; enabled: boolean;
}

const defaults: ConfigForm = { baseUrl: 'https://llmhub.ltd/v1', apiKey: '', textModel: 'gpt-5.5', imageModel: 'gpt-image-2', timeoutMs: 120000, enabled: true };

export function SettingsPage() {
  const [unlocked, setUnlocked] = useState(Boolean(getAdminToken()));
  const [adminPassword, setAdminPassword] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [form, setForm] = useState<ConfigForm>(defaults);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState<{ authenticated: boolean; textModelAvailable: boolean; imageModelAvailable: boolean; listedModels: number; textReply: string } | null>(null);

  useEffect(() => { if (unlocked) void loadStatus(); }, [unlocked]);

  async function unlock(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try { const result = await adminLogin(adminPassword); setAdminToken(result.token); setUnlocked(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '管理员登录失败。'); }
    finally { setLoading(false); }
  }

  async function loadStatus() {
    setLoading(true); setError('');
    try {
      const next = await adminRequest<AiConfigStatus>('/api/admin/ai-config');
      setStatus(next); setForm({ baseUrl: next.baseUrl, apiKey: '', textModel: next.textModel, imageModel: next.imageModel, timeoutMs: next.timeoutMs, enabled: next.enabled || !next.configured });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '无法读取接口配置。'); if ((caught as Error).message.includes('登录')) setUnlocked(false); }
    finally { setLoading(false); }
  }

  async function test() {
    setTesting(true); setError(''); setMessage(''); setTestResult(null);
    try {
      const result = await adminRequest<typeof testResult>('/api/admin/ai-config/test', { method: 'POST', body: form });
      setTestResult(result); setMessage('中转站鉴权和文字模型调用成功。');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '连接测试失败。'); }
    finally { setTesting(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const next = await adminRequest<AiConfigStatus>('/api/admin/ai-config', { method: 'PUT', body: form });
      setStatus(next); setForm((value) => ({ ...value, apiKey: '' })); setMessage('接口配置已加密保存。');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '保存失败。'); }
    finally { setSaving(false); }
  }

  if (!unlocked) return <div className="settings-lock"><form onSubmit={unlock}><span><LockKeyhole size={26} /></span><h2>管理员验证</h2><p>接口密钥和模型配置仅管理员可修改。</p><label className="field-label" htmlFor="admin-password">管理员密码</label><input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="请输入 ADMIN_PASSWORD" autoFocus />{error && <ErrorState message={error} />}{loading ? <LoadingState text="正在验证..." /> : <button className="button button-primary button-large" type="submit" disabled={!adminPassword}><KeyRound size={18} />解锁接口配置</button>}</form></div>;

  return <div className="settings-page">
    <section className="settings-status"><div><span className={status?.configured && status.enabled ? 'status-dot online' : 'status-dot'}></span><div><h2>{status?.configured && status.enabled ? '真实AI接口已配置' : '真实AI接口尚未配置'}</h2><p>{status?.source === 'environment' ? '当前使用服务器环境变量，设置页无法覆盖。' : status?.configured ? `密钥 ${status.apiKeyMasked} · 加密文件` : '填写中转站信息并测试连接。'}</p></div></div><span className="provider-name"><Server size={16} />llmhub</span></section>
    <form className="settings-form" onSubmit={save}>
      <header><div><span className="eyebrow">OPENAI COMPATIBLE</span><h2>中转站配置</h2><p>文字、视觉和图片接口共享同一个中转站密钥。</p></div><label className="toggle-row"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span>启用真实AI</span></label></header>
      <div className="settings-fields">
        <label><span>API Base URL</span><input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://llmhub.ltd/v1" /></label>
        <label><span>API Key</span><div className="password-field"><input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder={status?.configured ? `留空保持当前密钥 ${status.apiKeyMasked}` : '粘贴中转站 API Key'} autoComplete="off" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? '隐藏API Key' : '显示API Key'}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        <label><span>文字与视觉模型</span><input value={form.textModel} onChange={(event) => setForm({ ...form, textModel: event.target.value })} placeholder="gpt-5.5" /><small>用于文案、提示词、活动图、账号和同行分析</small></label>
        <label><span>图片模型</span><input value={form.imageModel} onChange={(event) => setForm({ ...form, imageModel: event.target.value })} placeholder="gpt-image-2" /><small>用于活动原图的封面编辑</small></label>
        <label><span>请求超时（毫秒）</span><input type="number" min={10000} max={300000} step={1000} value={form.timeoutMs} onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })} /><small>图片生成建议设置120000以上</small></label>
      </div>
      {error && <ErrorState message={error} />}{message && <SuccessState message={message} />}
      {testResult && <div className="test-result"><span><CheckCircle2 size={16} />鉴权通过</span><span className={testResult.textModelAvailable ? 'ok' : 'warn'}>文字模型：{testResult.textModelAvailable ? '可用' : '模型列表未找到'}</span><span className={testResult.imageModelAvailable ? 'ok' : 'warn'}>图片模型：{testResult.imageModelAvailable ? '可用' : '模型列表未找到'}</span><small>模型列表 {testResult.listedModels} 项 · 回复：{testResult.textReply}</small></div>}
      <footer><button className="button button-secondary" type="button" onClick={test} disabled={testing || saving}>{testing ? '正在测试...' : <><TestTube2 size={17} />测试连接</>}</button><button className="button button-primary" type="submit" disabled={saving || status?.source === 'environment'}>{saving ? '正在保存...' : <><Save size={17} />加密保存</>}</button></footer>
    </form>
    <section className="settings-security"><KeyRound size={20} /><div><h3>密钥安全</h3><p>API Key只提交到本机后端，并使用AES-256-GCM加密保存。浏览器不会读取或保存完整密钥。</p></div></section>
  </div>;
}
