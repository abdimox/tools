import { Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateCoverImage } from '../aiClient';
import { downloadBlob } from '../api';
import { ImageUploader } from '../components/ImageUploader';
import { ErrorState, LoadingState } from '../components/Status';
import { coverBlobToFile, createPlainCoverBlob, type CoverLayout } from '../coverCanvas';

const layouts: Array<{ value: CoverLayout; label: string; description: string }> = [
  { value: 'main-plus-three', label: '大图+三小图', description: '案例封面最常用，信息量够' },
  { value: 'grid-four', label: '四宫格拼图', description: '普通真实，适合攻略和对比' },
  { value: 'single-proof', label: '单张证据图', description: '适合一张特别强的现场图' },
];

export function CoverStudioPage() {
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<CoverLayout>('main-plus-three');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<'local' | 'api' | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; filename: string; previewUrl: string; source: 'local' | 'api' } | null>(null);

  useEffect(() => () => { if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl); }, [result]);

  function resetResult() {
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
  }

  async function buildLocalBlob(): Promise<Blob> {
    if (!title.trim()) throw new Error('请先输入封面大字。');
    if (!files.length) throw new Error('请至少上传一张图片。');
    return createPlainCoverBlob({ files, title: title.trim(), layout, subtitle: '真实现场 · 小红书封面' });
  }

  async function generateLocal() {
    setLoading('local'); setError('');
    try {
      const blob = await buildLocalBlob();
      resetResult();
      setResult({ blob, filename: `小红书封面-${Date.now()}.png`, previewUrl: URL.createObjectURL(blob), source: 'local' });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '封面生成失败。'); }
    finally { setLoading(null); }
  }

  async function generateByApi() {
    setLoading('api'); setError('');
    try {
      const blob = result?.blob || await buildLocalBlob();
      const generated = await generateCoverImage(coverBlobToFile(blob), `请基于这张小红书封面图做轻微整理。必须保留真实照片、拼图结构和中文大字标题“${title.trim()}”，不要新增二维码、联系方式、虚假Logo、虚假人物或夸张贴纸。只优化清晰度、亮度、对比度、边缘和整体整洁度。风格要像真实商家小红书封面：普通、直接、可信，不要海报感。`);
      resetResult();
      setResult({ ...generated, previewUrl: URL.createObjectURL(generated.blob), source: 'api' });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'API图片生成失败，请检查接口设置或稍后重试。'); }
    finally { setLoading(null); }
  }

  return <div className="simple-cover-page">
    <section className="simple-cover-form">
      <div className="input-intro"><span className="step-kicker">XHS COVER</span><h2>朴素拼图封面</h2><p>上传真实图片，输入普通大字标题。先本地拼图，再按需调用图片API整理。</p></div>
      <label className="field-label" htmlFor="cover-title">封面大字</label>
      <input id="cover-title" maxLength={18} value={title} onChange={(event) => { setTitle(event.target.value); resetResult(); }} placeholder="例如：别只问价格" />
      <label className="field-label">封面模板</label>
      <div className="layout-options">{layouts.map((item) => <button key={item.value} type="button" className={layout === item.value ? 'selected' : ''} onClick={() => { setLayout(item.value); resetResult(); }}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
      <label className="field-label">真实图片</label>
      <ImageUploader files={files} onChange={(next) => { setFiles(next); resetResult(); }} maxFiles={4} fieldName="上传1-4张图片" hint="建议用现场图、设备图、打印成片图" />
      {error && <ErrorState message={error} />}
      <div className="cover-actions">
        {loading === 'local' ? <LoadingState text="正在生成拼图封面..." /> : <button className="button button-primary button-large" type="button" onClick={generateLocal}><ImageIcon size={18} />生成拼图封面</button>}
        {loading === 'api' ? <LoadingState text="正在调用图片API整理..." /> : <button className="button button-secondary button-large" type="button" onClick={generateByApi}><Sparkles size={18} />调用API整理</button>}
      </div>
    </section>
    <section className="simple-cover-result">
      {result ? <><img src={result.previewUrl} alt="小红书封面图" /><p className="cover-source">{result.source === 'api' ? 'API整理版。发布前请检查中文大字有没有变形。' : '本地拼图版。文字最稳定，适合直接发布。'}</p><button className="button button-dark" type="button" onClick={() => downloadBlob(result.blob, result.filename)}><Download size={17} />保存图片</button></> : <div><ImageIcon size={38} /><h2>封面预览</h2><p>封面生成后会显示在这里。</p></div>}
    </section>
  </div>;
}
