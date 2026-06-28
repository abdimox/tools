import { CheckCircle2, ChevronRight, Download, FileText, Image as ImageIcon, RefreshCw, ShieldCheck, Sparkles, Tags, WandSparkles } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createFilePreviewUrl, downloadFile, postForm } from '../api';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { Section } from '../components/Section';
import { ErrorState, LoadingState, SuccessState } from '../components/Status';
import type { BusinessType, NoteResult } from '../types';

const parsedLabels: Record<string, string> = {
  city: '城市', clientType: '客户类型', peopleCount: '活动人数', project: '活动项目', scenario: '活动场景',
};

const loadingMessages = ['正在解析案例信息...', '正在分析活动图片...', '正在生成30个标题...', '正在生成5版正文...', '正在检查合规风险...'];

export function NoteGeneratorPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('diy');
  const [caseBrief, setCaseBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<NoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState('');
  const [coverText, setCoverText] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [cover, setCover] = useState<{ imageUrl: string; filename: string; previewUrl: string } | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setLoadingIndex((value) => Math.min(value + 1, loadingMessages.length - 1)), 650);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => () => {
    if (cover?.previewUrl) URL.revokeObjectURL(cover.previewUrl);
  }, [cover]);

  const groupedTitles = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, string[]>();
    result.titles.forEach((item) => map.set(item.category, [...(map.get(item.category) ?? []), item.text]));
    return [...map.entries()];
  }, [result]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (caseBrief.trim().length < 5) {
      setError('请用一句话描述活动，至少输入5个字。');
      return;
    }
    if (files.length === 0) {
      setError('请至少上传一张真实活动图片。');
      return;
    }
    setLoading(true);
    setLoadingIndex(0);
    setError('');
    setCover(null);
    try {
      const form = new FormData();
      form.append('businessType', businessType);
      form.append('caseBrief', caseBrief);
      files.forEach((file) => form.append('images', file));
      const data = await postForm<NoteResult>('/api/generate-note', form);
      setResult(data);
      setCoverText(data.coverTexts[0]);
      window.setTimeout(() => document.getElementById('note-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '生成失败，请重试。');
    } finally {
      setLoading(false);
    }
  }

  async function generateCover() {
    if (!files[0] || !coverText) return;
    setCoverLoading(true);
    setCoverError('');
    try {
      const form = new FormData();
      form.append('baseImage', files[0]);
      form.append('businessType', businessType);
      form.append('caseBrief', caseBrief);
      form.append('coverText', coverText);
      const generated = await postForm<{ imageUrl: string; filename: string }>('/api/generate-cover-image', form);
      const previewUrl = await createFilePreviewUrl(generated.imageUrl);
      setCover({ ...generated, previewUrl });
    } catch (caught) {
      setCoverError(caught instanceof Error ? caught.message : '封面生成失败。');
    } finally {
      setCoverLoading(false);
    }
  }

  return (
    <div className="generator-layout">
      <form className="generator-input" onSubmit={generate}>
        <div className="input-intro"><span className="step-kicker">一次生成 · 用完即走</span><h2>准备本次活动素材</h2><p>输入越简洁越好，系统会自动补全服务内容和活动卖点。</p></div>
        <div className="form-step"><div className="step-number">01</div><div className="step-content"><label>选择业务类型</label><BusinessTypeSelector value={businessType} onChange={setBusinessType} /></div></div>
        <div className="form-step"><div className="step-number">02</div><div className="step-content"><label htmlFor="case-brief">案例简述</label><textarea id="case-brief" value={caseBrief} onChange={(event) => setCaseBrief(event.target.value)} maxLength={120} rows={4} placeholder={businessType === 'diy' ? '例如：广州某企业80人香薰蜡烛DIY团建' : '例如：广州企业年会300人Photobooth互动拍摄'} /><span className="field-count">{caseBrief.length}/120</span></div></div>
        <div className="form-step"><div className="step-number">03</div><div className="step-content"><label>上传活动图片</label><ImageUploader files={files} onChange={setFiles} /></div></div>
        {error && <ErrorState message={error} />}
        {loading ? <LoadingState text={loadingMessages[loadingIndex]} /> : (
          <button className="button button-primary button-large generate-button" type="submit"><Sparkles size={19} />生成完整内容<ChevronRight size={18} /></button>
        )}
        <p className="privacy-inline"><ShieldCheck size={15} />图片仅用于本次处理，服务器不保留历史记录</p>
      </form>

      <div className="generator-results" id="note-results">
        {!result ? (
          <div className="empty-results"><span><WandSparkles size={30} /></span><h2>生成结果会出现在这里</h2><p>完成左侧三步后，将一次得到标题、正文、封面文案、标签、图片建议与合规结果。</p><div className="empty-result-list"><span><CheckCircle2 size={16} />30个分类标题</span><span><CheckCircle2 size={16} />5版完整正文</span><span><CheckCircle2 size={16} />封面文案与提示词</span><span><CheckCircle2 size={16} />合规自动检查</span></div></div>
        ) : (
          <div className="result-stack">
            <div className="result-summary-bar"><div><span className="result-ready"><CheckCircle2 size={16} />内容已生成</span><h2>{caseBrief}</h2><p>演示引擎已完成全部内容，建议发布前结合现场实际再次确认。</p></div><button type="button" className="button button-secondary" onClick={() => setResult(null)}><RefreshCw size={16} />重新填写</button></div>

            <Section title="AI 案例解析" description="已从一句话中提取活动关键信息">
              <div className="parsed-grid">{Object.entries(result.parsedInfo).filter(([key, value]) => parsedLabels[key] && typeof value === 'string').map(([key, value]) => <div key={key}><span>{parsedLabels[key]}</span><strong>{String(value)}</strong></div>)}</div>
              <div className="two-column-list"><div><h3>自动补全服务</h3><div className="chip-list">{result.services.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>活动核心卖点</h3><div className="chip-list chips-orange">{result.highlights.map((item) => <span key={item}>{item}</span>)}</div></div></div>
            </Section>

            <Section title="图片分析建议" description={result.imageAnalysis.summary} action={<span className="count-badge">{result.imageAnalysis.suggestions.length} 张</span>}>
              <div className="image-suggestion-list">{result.imageAnalysis.suggestions.map((item, index) => <div className="image-suggestion" key={item.image}><span className="image-rank">{index + 1}</span><div><h3>{item.image}{index === 0 && <span className="best-badge">推荐封面</span>}</h3><p>{item.recommendation}</p><small>{item.crop} · {item.enhancement}</small></div><strong>{item.score}<small>分</small></strong></div>)}</div>
            </Section>

            <Section title="标题结果" description="按8类内容意图生成，可直接复制使用" action={<CopyButton label="复制全部" text={result.titles.map((item) => item.text).join('\n')} />}>
              <div className="title-groups">{groupedTitles.map(([category, titles]) => <div className="title-group" key={category}><h3>{category}<span>{titles.length}</span></h3><div>{titles.map((title, index) => <div className="copy-row" key={title}><span className="row-index">{String(index + 1).padStart(2, '0')}</span><p>{title}</p><CopyButton text={title} /></div>)}</div></div>)}</div>
            </Section>

            <Section title="正文结果" description="5种角度，适配不同发布目的" action={<FileText size={20} className="section-icon" />}>
              <div className="copy-versions">{result.copyVersions.map((version) => <article key={version.name}><header><h3>{version.name}</h3><CopyButton text={version.content} /></header><p>{version.content}</p></article>)}</div>
            </Section>

            <Section title="封面文案" description="控制在8–16字，突出场景或结果" action={<CopyButton label="复制全部" text={result.coverTexts.join('\n')} />}>
              <div className="cover-text-grid">{result.coverTexts.map((text, index) => <div className={`cover-text-item ${coverText === text ? 'selected' : ''}`} key={text}><span>{String(index + 1).padStart(2, '0')}</span><button type="button" onClick={() => setCoverText(text)}>{text}</button><CopyButton text={text} /></div>)}</div>
            </Section>

            <Section title="推荐标签" description="已结合城市、项目和业务类型" action={<Tags size={20} className="section-icon" />}>
              <div className="tag-results">{result.tags.map((tag) => <span key={tag}>{tag}<CopyButton text={tag} /></span>)}</div><CopyButton label="复制全部标签" text={result.tags.join(' ')} />
            </Section>

            <Section title="封面提示词" description="可复制到外部生图工具，也可直接生成演示封面" action={<CopyButton text={`${result.coverPrompt}\n\n反向要求：${result.negativePrompt}`} />}>
              <div className="prompt-block"><h3>正向提示词</h3><p>{result.coverPrompt}</p><h3>反向要求</h3><p>{result.negativePrompt}</p></div>
            </Section>

            <Section title="合规检查" description="检查标题、正文、封面文案、标签与提示词" className={result.complianceResult.isSafe ? 'compliance-safe' : 'compliance-risk'}>
              {result.complianceResult.isSafe ? <SuccessState message="未发现明显私域导流和联系方式风险" /> : <ErrorState message={`发现风险词：${result.complianceResult.riskyWords.join('、')}`} />}
              <p className="compliance-note">{result.complianceResult.safeVersion}</p>
            </Section>

            <Section title="生成演示封面" description="使用首张活动图生成3:4封面，不调用外部图片API" action={<ImageIcon size={20} className="section-icon" />}>
              <div className="cover-builder">
                <div className="cover-controls"><label htmlFor="cover-text">封面大字</label><input id="cover-text" value={coverText} maxLength={24} onChange={(event) => setCoverText(event.target.value)} /><p>将使用第1张上传图片，自动裁剪、提亮并排版。</p>{coverError && <ErrorState message={coverError} />}<button className="button button-primary" type="button" onClick={generateCover} disabled={coverLoading}>{coverLoading ? '正在生成封面...' : '生成演示封面'}</button></div>
                <div className="cover-preview">{cover ? <><img src={cover.previewUrl} alt="生成的小红书封面" /><button className="button button-dark" type="button" onClick={() => downloadFile(cover.imageUrl, cover.filename)}><Download size={17} />下载封面图</button></> : <div><ImageIcon size={30} /><span>3:4 封面预览</span></div>}</div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
