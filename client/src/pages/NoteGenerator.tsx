import { CheckCircle2, ChevronRight, RefreshCw, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postJson } from '../api';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { SceneSelector } from '../components/SceneSelector';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { BusinessType, NoteResult, SceneType } from '../types';

const loadingMessages = ['正在分析客户为什么需要这场活动...', '正在生成3个精选标题和正文...', '正在进行Humanizer与合规复核...'];

export function NoteGeneratorPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('diy');
  const [scene, setScene] = useState<SceneType | ''>('');
  const [caseBrief, setCaseBrief] = useState('');
  const [result, setResult] = useState<NoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setLoadingIndex((value) => Math.min(value + 1, loadingMessages.length - 1)), 1500);
    return () => window.clearInterval(timer);
  }, [loading]);

  function changeBusiness(value: BusinessType) {
    setBusinessType(value);
    setScene('');
    setResult(null);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!scene) { setError('请先选择活动场景。'); return; }
    if (caseBrief.trim().length < 5) { setError('请用一句话描述活动，至少输入5个字。'); return; }
    setLoading(true); setLoadingIndex(0); setError('');
    try {
      const data = await postJson<NoteResult>('/api/generate-note', { businessType, scene, caseBrief });
      setResult(data);
      window.setTimeout(() => document.getElementById('note-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '生成失败，请重试。'); }
    finally { setLoading(false); }
  }

  return (
    <div className="generator-layout simplified-generator">
      <form className="generator-input" onSubmit={generate}>
        <div className="input-intro"><span className="step-kicker">真实 AI · 两阶段复核</span><h2>告诉AI这是什么活动</h2><p>不需要上传图片。你明确选择客户场景，AI只根据输入写文案。</p></div>
        <div className="form-step"><div className="step-number">01</div><div className="step-content"><label>业务类型</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} /></div></div>
        <div className="form-step"><div className="step-number">02</div><div className="step-content"><label>客户场景（必选）</label><SceneSelector businessType={businessType} value={scene} onChange={setScene} /></div></div>
        <div className="form-step"><div className="step-number">03</div><div className="step-content"><label htmlFor="case-brief">案例简述</label><textarea id="case-brief" value={caseBrief} onChange={(event) => setCaseBrief(event.target.value)} maxLength={160} rows={5} placeholder={businessType === 'diy' ? '例如：广州某楼盘周末亲子香薰蜡烛DIY暖场' : '例如：深圳企业年会300人Photobooth即拍即印'} /><span className="field-count">{caseBrief.length}/160</span></div></div>
        {error && <><ErrorState message={error} />{error.includes('接口') && <Link className="inline-settings-link" to="/settings">前往接口配置</Link>}</>}
        {loading ? <LoadingState text={loadingMessages[loadingIndex]} /> : <button className="button button-primary button-large generate-button" type="submit"><Sparkles size={19} />生成并复核文案<ChevronRight size={18} /></button>}
        <p className="privacy-inline"><ShieldCheck size={15} />AI会先理解客户动机，复核通过后才展示</p>
      </form>

      <div className="generator-results" id="note-results">
        {!result ? <div className="empty-results"><span><WandSparkles size={30} /></span><h2>少而精的最终结果</h2><p>AI会先理解客户举办活动的目的，再生成3个标题和1篇正文，随后进行独立复核。</p><div className="empty-result-list"><span><CheckCircle2 size={16} />3个精选标题</span><span><CheckCircle2 size={16} />1篇完整正文</span><span><CheckCircle2 size={16} />话题直接放在正文末尾</span><span><CheckCircle2 size={16} />Humanizer与合规复核</span></div></div> : <div className="result-stack">
          <div className="result-summary-bar"><div><span className="result-ready"><CheckCircle2 size={16} />真实 AI 已复核</span><h2>{caseBrief}</h2><p>{result.sceneLabel}场景</p></div><button type="button" className="button button-secondary" onClick={() => setResult(null)}><RefreshCw size={16} />重新生成</button></div>
          <Section title="3个精选标题" description="推荐标题已优先标记" action={<CopyButton label="复制三个标题" text={result.titles.join('\n')} />}>
            <div className="final-title-list">{result.titles.map((title, index) => <div className={index === result.recommendedTitle ? 'recommended' : ''} key={title}><span>{index + 1}</span><p>{title}{index === result.recommendedTitle && <small>推荐</small>}</p><CopyButton text={title} /></div>)}</div>
          </Section>
          <Section title="最终正文与话题" description="可直接整体复制，发布前仍建议核对活动事实" action={<CopyButton label="复制完整内容" text={result.fullCopy} />}>
            <article className="final-copy"><p>{result.body}</p><div className="final-tags">{result.tags.join(' ')}</div></article>
          </Section>
        </div>}
      </div>
    </div>
  );
}
