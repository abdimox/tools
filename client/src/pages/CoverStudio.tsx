import { CheckCircle2, Download, Image as ImageIcon, RefreshCw, ScanSearch, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createFilePreviewUrl, downloadFile, postForm } from '../api';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { SceneSelector } from '../components/SceneSelector';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { BusinessType, CoverPromptResult, SceneType } from '../types';

export function CoverStudioPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('diy');
  const [scene, setScene] = useState<SceneType | ''>('');
  const [caseBrief, setCaseBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [promptResult, setPromptResult] = useState<CoverPromptResult | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [coverText, setCoverText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [cover, setCover] = useState<{ imageUrl: string; filename: string; previewUrl: string } | null>(null);

  useEffect(() => () => { if (cover?.previewUrl) URL.revokeObjectURL(cover.previewUrl); }, [cover]);

  function changeBusiness(value: BusinessType) {
    setBusinessType(value); setScene(''); setPromptResult(null); setCover(null);
  }

  function validate(): boolean {
    if (!scene) { setError('请先选择活动场景。'); return false; }
    if (caseBrief.trim().length < 5) { setError('案例简述至少需要5个字。'); return false; }
    if (files.length === 0) { setError('请至少上传一张活动图片。'); return false; }
    return true;
  }

  async function generatePrompt(event: FormEvent) {
    event.preventDefault(); if (!validate()) return;
    setPromptLoading(true); setError(''); setCover(null);
    try {
      const form = new FormData();
      form.append('businessType', businessType); form.append('scene', scene); form.append('caseBrief', caseBrief);
      files.forEach((file) => form.append('images', file));
      const result = await postForm<CoverPromptResult>('/api/generate-cover-prompt', form);
      setPromptResult(result); setSelectedImage(result.bestImageIndex); setCoverText(result.coverTexts[result.recommendedCoverText]);
      setPrompt(result.prompt); setNegativePrompt(result.negativePrompt);
      window.setTimeout(() => document.getElementById('cover-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '提示词生成失败。'); }
    finally { setPromptLoading(false); }
  }

  async function generateImage() {
    if (!promptResult || !files[selectedImage] || !scene) return;
    setImageLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('businessType', businessType); form.append('scene', scene); form.append('caseBrief', caseBrief);
      form.append('baseImage', files[selectedImage]); form.append('coverText', coverText); form.append('prompt', prompt); form.append('negativePrompt', negativePrompt);
      const generated = await postForm<{ imageUrl: string; filename: string }>('/api/generate-cover-image', form);
      const previewUrl = await createFilePreviewUrl(generated.imageUrl);
      setCover({ ...generated, previewUrl });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '封面图生成失败。'); }
    finally { setImageLoading(false); }
  }

  return (
    <div className="cover-studio-page">
      <form className="cover-studio-input" onSubmit={generatePrompt}>
        <div className="input-intro"><span className="step-kicker">独立封面工作台</span><h2>先分析原图，再生成封面</h2><p>提示词和封面图是两次独立的真实AI调用。</p></div>
        <div className="compact-form-grid"><div><label>业务类型</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} /></div><div><label>客户场景（必选）</label><SceneSelector businessType={businessType} value={scene} onChange={setScene} /></div></div>
        <label className="field-label" htmlFor="cover-case">案例简述</label><textarea id="cover-case" rows={3} value={caseBrief} maxLength={160} onChange={(event) => setCaseBrief(event.target.value)} placeholder="例如：广州某楼盘周末亲子香薰蜡烛DIY暖场" />
        <label className="field-label">活动原图</label><ImageUploader files={files} onChange={(next) => { setFiles(next); setPromptResult(null); setCover(null); }} />
        {error && <><ErrorState message={error} />{error.includes('接口') && <Link className="inline-settings-link" to="/settings">前往接口配置</Link>}</>}
        {promptLoading ? <LoadingState text="gpt-5.5 正在分析图片并生成封面提示词..." /> : <button className="button button-primary button-large" type="submit"><ScanSearch size={18} />生成封面提示词</button>}
        <p className="privacy-inline"><ShieldCheck size={15} />原图只用于本次AI调用，处理后从服务器删除</p>
      </form>

      <div id="cover-results">
        {!promptResult ? <div className="cover-empty"><WandSparkles size={32} /><h2>封面分析结果会显示在这里</h2><p>AI会比较每张图，选择首图，生成封面大字和可编辑提示词。</p></div> : <div className="result-stack">
          <Section title="原图分析" description={`AI推荐第 ${promptResult.bestImageIndex + 1} 张作为首图`} action={<span className="count-badge">{files.length} 张</span>}>
            <div className="cover-image-analysis">{promptResult.imageAnalysis.map((item) => <button type="button" key={item.imageIndex} className={selectedImage === item.imageIndex ? 'selected' : ''} onClick={() => { setSelectedImage(item.imageIndex); setCover(null); }}><span className="image-rank">{item.imageIndex + 1}</span><div><strong>{files[item.imageIndex]?.name || `图片${item.imageIndex + 1}`}{item.imageIndex === promptResult.bestImageIndex && <small>AI推荐</small>}</strong><p>{item.observation}</p><em>{item.recommendation}</em></div><b>{item.score}分</b></button>)}</div>
          </Section>
          <Section title="封面大字" description="选择一条后仍可手动修改" action={<CopyButton text={coverText} />}>
            <div className="cover-text-options">{promptResult.coverTexts.map((text, index) => <button className={coverText === text ? 'selected' : ''} type="button" key={text} onClick={() => setCoverText(text)}><span>{index + 1}</span>{text}{index === promptResult.recommendedCoverText && <small>推荐</small>}</button>)}</div>
            <input className="cover-text-editor" value={coverText} maxLength={24} onChange={(event) => setCoverText(event.target.value)} aria-label="封面大字" />
          </Section>
          <Section title="封面提示词" description="由gpt-5.5生成，可在调用图片模型前编辑" action={<CopyButton text={`${prompt}\n\n限制：${negativePrompt}`} />}>
            <label className="field-label" htmlFor="cover-prompt">正向提示词</label><textarea id="cover-prompt" rows={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            <label className="field-label" htmlFor="negative-prompt">限制条件</label><textarea id="negative-prompt" rows={4} value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} />
          </Section>
          <Section title="生成封面图" description="gpt-image-2优化画面，服务端准确叠加中文标题" action={<ImageIcon size={20} className="section-icon" />}>
            <div className="cover-generation-grid"><div><div className="selected-source"><CheckCircle2 size={17} /><span>使用第 {selectedImage + 1} 张原图：{files[selectedImage]?.name}</span></div><p>图片生成可能需要约两分钟，请勿重复提交。</p>{imageLoading ? <LoadingState text="gpt-image-2 正在编辑封面图..." /> : <button className="button button-primary" type="button" onClick={generateImage} disabled={!coverText || !prompt}><Sparkles size={17} />生成封面图</button>}</div><div className="cover-preview">{cover ? <><img src={cover.previewUrl} alt="AI生成的小红书封面" /><button className="button button-dark" type="button" onClick={() => downloadFile(cover.imageUrl, cover.filename)}><Download size={17} />下载封面图</button></> : <div><ImageIcon size={30} /><span>3:4封面预览</span></div>}</div></div>
            {cover && <button className="button button-secondary regenerate-cover" type="button" onClick={generateImage}><RefreshCw size={16} />使用当前提示词重新生成</button>}
          </Section>
        </div>}
      </div>
    </div>
  );
}
