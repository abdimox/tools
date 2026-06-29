import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Save, Server, TestTube2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { adminLogin, adminRequest, getAdminToken, setAdminToken } from '../api';
import { ErrorState, LoadingState, SuccessState } from '../components/Status';
import type { AiConfigStatus } from '../types';

interface ConfigForm {
  baseUrl: string;
  textApiKey: string;
  imageApiKey: string;
  textModel: string;
  imageModel: string;
  timeoutMs: number;
  enabled: boolean;
}

interface TextTestResult { authenticated: boolean; model: string; textReply: string }
interface ImageTestResult { authenticated: boolean; model: string; imageModelAvailable: boolean; listedModels: number }

const defaults: ConfigForm = {
  baseUrl: 'https://llmhub.ltd/v1', textApiKey: '', imageApiKey: '',
  textModel: 'gpt-5.5', imageModel: 'gpt-image-2', timeoutMs: 120000, enabled: true,
};

export function SettingsPage() {
  const [unlocked, setUnlocked] = useState(Boolean(getAdminToken()));
  const [adminPassword, setAdminPassword] = useState('');
  const [showTextKey, setShowTextKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [form, setForm] = useState<ConfigForm>(defaults);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<'text' | 'image' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [textTestResult, setTextTestResult] = useState<TextTestResult | null>(null);
  const [imageTestResult, setImageTestResult] = useState<ImageTestResult | null>(null);

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
      setStatus(next);
      setForm({
        baseUrl: next.baseUrl, textApiKey: '', imageApiKey: '', textModel: next.textModel,
        imageModel: next.imageModel, timeoutMs: next.timeoutMs, enabled: next.enabled || (!next.textConfigured && !next.imageConfigured),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '无法读取接口配置。');
      if ((caught as Error).message.includes('登录')) setUnlocked(false);
    } finally { setLoading(false); }
  }

  async function test(kind: 'text' | 'image') {
    setTesting(kind); setError(''); setMessage('');
    if (kind === 'text') setTextTestResult(null); else setImageTestResult(null);
    try {
      if (kind === 'text') {
        const result = await adminRequest<TextTestResult>('/api/admin/ai-config/test', { method: 'POST', body: { ...form, kind } });
        setTextTestResult(result); setMessage('文字/视觉接口鉴权和模型调用成功。');
      } else {
        const result = await adminRequest<ImageTestResult>('/api/admin/ai-config/test', { method: 'POST', body: { ...form, kind } });
        setImageTestResult(result); setMessage('图片接口鉴权成功。');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : `${kind === 'text' ? '文字' : '图片'}接口测试失败。`); }
    finally { setTesting(null); }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const next = await adminRequest<AiConfigStatus>('/api/admin/ai-config', { method: 'PUT', body: form });
      setStatus(next);
      setForm((value) => ({ ...value, textApiKey: '', imageApiKey: '' }));
      setMessage('两个接口密钥已分别加密保存。');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '保存失败。'); }
    finally { setSaving(false); }
  }

  if (!unlocked) return <div className="settings-lock"><form onSubmit={unlock}><span><LockKeyhole size={26} /></span><h2>管理员验证</h2><p>接口密钥和模型配置仅管理员可修改。</p><label className="field-label" htmlFor="admin-password">管理员密码</label><input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="请输入 ADMIN_PASSWORD" autoFocus />{error && <ErrorState message={error} />}{loading ? <LoadingState text="正在验证..." /> : <button className="button button-primary button-large" type="submit" disabled={!adminPassword}><KeyRound size={18} />解锁接口配置</button>}</form></div>;

  const configurationTitle = status?.configured ? '文字与图片接口均已配置' : status?.textConfigured || status?.imageConfigured ? '接口配置尚未完整' : '真实AI接口尚未配置';
  const configurationDetail = status?.source === 'environment'
    ? '当前使用服务器环境变量，设置页无法覆盖。'
    : `文字：${status?.textConfigured ? status.textApiKeyMasked : '未配置'} · 图片：${status?.imageConfigured ? status.imageApiKeyMasked : '未配置'}`;

  return <div className="settings-page">
    <section className="settings-status"><div><span className={status?.configured && status.enabled ? 'status-dot online' : 'status-dot'}></span><div><h2>{configurationTitle}</h2><p>{configurationDetail}</p></div></div><span className="provider-name"><Server size={16} />llmhub</span></section>
    <form className="settings-form" onSubmit={save}>
      <header><div><span className="eyebrow">OPENAI COMPATIBLE</span><h2>中转站配置</h2><p>文字和图片共享同一个中转地址，但使用两个不同的 API Key。</p></div><label className="toggle-row"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span>启用真实AI</span></label></header>
      <div className="settings-fields">
        <label><span>API Base URL</span><input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://llmhub.ltd/v1" /></label>
        <label><span>文字/视觉 API Key</span><div className="password-field"><input type={showTextKey ? 'text' : 'password'} value={form.textApiKey} onChange={(event) => setForm({ ...form, textApiKey: event.target.value })} placeholder={status?.textConfigured ? `留空保持当前密钥 ${status.textApiKeyMasked}` : '粘贴文字模型 API Key'} autoComplete="off" /><button type="button" onClick={() => setShowTextKey((value) => !value)} aria-label={showTextKey ? '隐藏文字API Key' : '显示文字API Key'}>{showTextKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>用于文案、提示词、活动图、账号和同行分析</small></label>
        <label><span>图片 API Key</span><div className="password-field"><input type={showImageKey ? 'text' : 'password'} value={form.imageApiKey} onChange={(event) => setForm({ ...form, imageApiKey: event.target.value })} placeholder={status?.imageConfigured ? `留空保持当前密钥 ${status.imageApiKeyMasked}` : '粘贴图片模型 API Key'} autoComplete="off" /><button type="button" onClick={() => setShowImageKey((value) => !value)} aria-label={showImageKey ? '隐藏图片API Key' : '显示图片API Key'}>{showImageKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>仅用于 gpt-image-2 封面生成</small></label>
        <label><span>文字与视觉模型</span><input value={form.textModel} onChange={(event) => setForm({ ...form, textModel: event.target.value })} placeholder="gpt-5.5" /></label>
        <label><span>图片模型</span><input value={form.imageModel} onChange={(event) => setForm({ ...form, imageModel: event.target.value })} placeholder="gpt-image-2" /></label>
        <label><span>请求超时（毫秒）</span><input type="number" min={10000} max={300000} step={1000} value={form.timeoutMs} onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })} /><small>图片生成建议设置120000以上</small></label>
      </div>
      {error && <ErrorState message={error} />}{message && <SuccessState message={message} />}
      {textTestResult && <div className="test-result"><span><CheckCircle2 size={16} />文字鉴权通过</span><span className="ok">模型：{textTestResult.model}</span><small>回复：{textTestResult.textReply}</small></div>}
      {imageTestResult && <div className="test-result"><span><CheckCircle2 size={16} />图片鉴权通过</span><span className={imageTestResult.imageModelAvailable ? 'ok' : 'warn'}>模型：{imageTestResult.imageModelAvailable ? '可用' : '模型列表未找到'}</span><small>{imageTestResult.model} · 模型列表 {imageTestResult.listedModels} 项</small></div>}
      <footer><button className="button button-secondary" type="button" onClick={() => test('text')} disabled={Boolean(testing) || saving}>{testing === 'text' ? '正在测试文字接口...' : <><TestTube2 size={17} />测试文字接口</>}</button><button className="button button-secondary" type="button" onClick={() => test('image')} disabled={Boolean(testing) || saving}>{testing === 'image' ? '正在测试图片接口...' : <><TestTube2 size={17} />测试图片接口</>}</button><button className="button button-primary" type="submit" disabled={saving || status?.source === 'environment'}>{saving ? '正在保存...' : <><Save size={17} />加密保存</>}</button></footer>
    </form>
    <section className="settings-security"><KeyRound size={20} /><div><h3>密钥安全</h3><p>两个 API Key 只提交到本机后端，并使用 AES-256-GCM 分别加密保存。浏览器不会读取或保存完整密钥。</p></div></section>
  </div>;
}
