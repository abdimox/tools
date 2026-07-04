import { CheckCircle2, Download, Eye, EyeOff, KeyRound, Save, TestTube2, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { testImageConnection, testTextConnection } from '../aiClient';
import { downloadBlob } from '../api';
import { changeLocalPassword } from '../localAuth';
import { exportChatHistory, importChatHistory } from '../localChatStore';
import { getAiConfig, saveAiConfig, type LocalAiConfig } from '../localSettings';
import { ErrorState, SuccessState } from '../components/Status';

export function SettingsPage() {
  const [form, setForm] = useState<LocalAiConfig>(getAiConfig());
  const [showTextKey, setShowTextKey] = useState(false); const [showImageKey, setShowImageKey] = useState(false);
  const [saving, setSaving] = useState(false); const [testing, setTesting] = useState<'text' | 'image' | null>(null);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { saveAiConfig({ ...form, baseUrl: form.baseUrl.trim().replace(/\/$/, '') }); setMessage('接口配置已保存在当前浏览器。'); }
    catch { setError('保存失败，请检查浏览器是否允许本地存储。'); }
    finally { setSaving(false); }
  }
  async function test(kind: 'text' | 'image') {
    saveAiConfig(form); setTesting(kind); setError(''); setMessage('');
    try { if (kind === 'text') await testTextConnection(); else await testImageConnection(); setMessage(`${kind === 'text' ? '文字' : '图片'}接口连接成功。`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '接口测试失败。'); }
    finally { setTesting(null); }
  }
  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try { await changeLocalPassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); setMessage('本地解锁密码已更新。'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '密码修改失败。'); }
  }
  async function exportHistory() { downloadBlob(await exportChatHistory(), `乐活互动-聊天记录-${new Date().toISOString().slice(0, 10)}.json`); }
  async function importHistory(file: File | undefined) {
    if (!file) return;
    try { await importChatHistory(file); setMessage('聊天记录已导入，重新进入GPT对话即可查看。'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '导入失败。'); }
    finally { if (importRef.current) importRef.current.value = ''; }
  }

  return <div className="settings-page">
    {error && <ErrorState message={error} />}{message && <SuccessState message={message} />}
    <form className="settings-form" onSubmit={save}>
      <header><div><span className="eyebrow">LOCAL SETTINGS</span><h2>AI接口配置</h2><p>配置只保存在当前浏览器，不会写入GitHub仓库。</p></div></header>
      <div className="settings-fields">
        <label><span>API Base URL</span><input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} /></label>
        <label><span>文字 API Key</span><div className="password-field"><input type={showTextKey ? 'text' : 'password'} value={form.textApiKey} onChange={(event) => setForm({ ...form, textApiKey: event.target.value })} placeholder="粘贴文字API Key" /><button type="button" onClick={() => setShowTextKey((value) => !value)}>{showTextKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>用于选题、文案和GPT对话</small></label>
        <label><span>图片 API Key</span><div className="password-field"><input type={showImageKey ? 'text' : 'password'} value={form.imageApiKey} onChange={(event) => setForm({ ...form, imageApiKey: event.target.value })} placeholder="可留空，留空时使用文字Key" /><button type="button" onClick={() => setShowImageKey((value) => !value)}>{showImageKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>用于封面图生成</small></label>
        <label><span>文字模型</span><input value={form.textModel} onChange={(event) => setForm({ ...form, textModel: event.target.value })} /></label>
        <label><span>图片模型</span><input value={form.imageModel} onChange={(event) => setForm({ ...form, imageModel: event.target.value })} /></label>
        <label><span>超时（毫秒）</span><input type="number" min={10000} max={300000} value={form.timeoutMs} onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })} /></label>
      </div>
      <footer><button className="button button-secondary" type="button" onClick={() => test('text')} disabled={Boolean(testing)}><TestTube2 size={16} />{testing === 'text' ? '测试中...' : '测试文字接口'}</button><button className="button button-secondary" type="button" onClick={() => test('image')} disabled={Boolean(testing)}><TestTube2 size={16} />{testing === 'image' ? '测试中...' : '测试图片接口'}</button><button className="button button-primary" type="submit" disabled={saving}><Save size={16} />保存</button></footer>
    </form>

    <section className="settings-form"><header><div><span className="eyebrow">LOCAL BACKUP</span><h2>聊天记录备份</h2><p>历史记录保存在当前浏览器。更换电脑或清理缓存前请导出。</p></div></header><div className="local-actions"><button className="button button-secondary" type="button" onClick={exportHistory}><Download size={16} />导出聊天记录</button><button className="button button-secondary" type="button" onClick={() => importRef.current?.click()}><Upload size={16} />导入聊天记录</button><input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => importHistory(event.target.files?.[0])} /></div></section>

    <form className="settings-form" onSubmit={updatePassword}><header><div><span className="eyebrow">LOCAL LOCK</span><h2>本地解锁密码</h2><p>只能防止别人随手打开，不是服务器级安全登录。</p></div><KeyRound size={22} /></header><div className="settings-fields"><label><span>原密码</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label><span>新密码</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label></div><footer><button className="button button-primary" type="submit" disabled={!currentPassword || newPassword.length < 4}>修改密码</button></footer></form>
    <section className="settings-security"><CheckCircle2 size={20} /><div><h3>本地存储说明</h3><p>API Key、密码摘要和聊天记录都只存在这台设备的浏览器里。不要在公共电脑使用，也不要把API Key写进代码。</p></div></section>
  </div>;
}
