import { BarChart3, ClipboardCheck, CopyX, Eye, Lightbulb, ScanSearch, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { postForm } from '../api';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { SceneSelector } from '../components/SceneSelector';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { BusinessType, CompetitorAnalysis, SceneType } from '../types';

function InsightList({ items, risk = false }: { items: string[]; risk?: boolean }) {
  return <ul className={risk ? 'analysis-list warning-list' : 'analysis-list'}>{items.map((item) => <li key={item}>{risk ? <ShieldAlert size={16} /> : <Lightbulb size={16} />}<span>{item}</span></li>)}</ul>;
}

const confidenceLabel = { high: '高', medium: '中', low: '低' };

export function CompetitorAnalyzerPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('diy');
  const [scene, setScene] = useState<SceneType | ''>('');
  const [caseBrief, setCaseBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState(''); const [copy, setCopy] = useState('');
  const [stats, setStats] = useState({ likes: '', favorites: '', comments: '' });
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<CompetitorAnalysis | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!scene) { setError('请选择改写目标场景。'); return; }
    if (caseBrief.trim().length < 5) { setError('请填写至少5个字的乐活互动改写方向。'); return; }
    if (files.length === 0 && !title.trim() && !copy.trim()) { setError('请上传同行截图，或填写同行标题/正文。'); return; }
    setLoading(true); setError('');
    try {
      const form = new FormData(); form.append('businessType', businessType); form.append('scene', scene); form.append('caseBrief', caseBrief); form.append('title', title); form.append('copy', copy);
      Object.entries(stats).forEach(([key, value]) => form.append(key, value)); files.forEach((file) => form.append('screenshots', file));
      setResult(await postForm('/api/analyze-competitor', form));
      window.setTimeout(() => document.getElementById('competitor-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '分析失败，请重试。'); }
    finally { setLoading(false); }
  }

  function changeBusiness(value: BusinessType) { setBusinessType(value); setScene(''); setResult(null); }

  return <div className="analyzer-page competitor-page">
    <form className="analyzer-form" onSubmit={submit}>
      <div className="analyzer-form-intro"><span><ScanSearch size={24} /></span><div><h2>输入真实同行素材</h2><p>AI只根据截图和文字证据分析。</p></div></div>
      <label className="field-label">改写成哪条业务</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} />
      <label className="field-label">改写目标场景（必选）</label><SceneSelector businessType={businessType} value={scene} onChange={setScene} />
      <label className="field-label" htmlFor="adapt-brief">乐活互动改写方向</label><input id="adapt-brief" value={caseBrief} onChange={(event) => setCaseBrief(event.target.value)} placeholder="例如：广州商场周末亲子香薰蜡烛DIY" />
      <label className="field-label">同行截图</label><ImageUploader files={files} onChange={setFiles} fieldName="上传同行截图" hint="封面、正文、主页或数据截图均可" />
      <label className="field-label" htmlFor="competitor-title">同行标题（选填）</label><input id="competitor-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="粘贴同行标题" />
      <label className="field-label" htmlFor="competitor-copy">同行正文（选填）</label><textarea id="competitor-copy" rows={5} value={copy} onChange={(event) => setCopy(event.target.value)} placeholder="粘贴同行正文" />
      <div className="stats-grid">{([['likes', '点赞'], ['favorites', '收藏'], ['comments', '评论']] as const).map(([key, text]) => <label key={key}><span>{text}</span><input inputMode="numeric" value={stats[key]} onChange={(event) => setStats({ ...stats, [key]: event.target.value.replace(/\D/g, '') })} placeholder="0" /></label>)}</div>
      {error && <><ErrorState message={error} />{error.includes('接口') && <Link className="inline-settings-link" to="/settings">前往接口配置</Link>}</>}
      {loading ? <LoadingState text="gpt-5.5正在读取同行素材并区分事实与推断..." /> : <button className="button button-primary button-large" type="submit"><Sparkles size={18} />开始真实爆款分析</button>}
    </form>
    <div className="analyzer-results" id="competitor-result">{!result ? <div className="analysis-empty"><BarChart3 size={31} /><h2>拆逻辑，不编理由</h2><p>分析会引用实际截图和文字依据；证据不足的项目不会强行下结论。</p></div> : <div className="result-stack">
      <div className="evidence-summary"><span><Target size={24} /></span><div><span className="eyebrow">真实多模态分析</span><h2>{result.summary}</h2><p>{result.audienceQuality}</p></div></div>
      {result.evidence.length > 0 && <Section title="截图证据" action={<Eye size={20} className="section-icon" />}><div className="evidence-grid">{result.evidence.map((item, index) => <div key={`${item.screenshot}-${index}`}><span>截图 {item.screenshot}</span><p>{item.observation}</p><small>置信度：{confidenceLabel[item.confidence]}</small></div>)}</div></Section>}
      <Section title="为什么可能获得点击或收藏" description="明确区分可见事实和策略推断"><div className="reason-list">{result.viralReasons.map((item, index) => <div key={`${item.reason}-${index}`}><span className={item.kind}>{item.kind === 'fact' ? '事实' : '推断'}</span><div><h3>{item.reason}</h3><p>{item.basis}</p></div></div>)}</div></Section>
      <div className="structure-grid"><div><span>标题结构</span><strong>{result.titleStructure}</strong></div><div><span>封面结构</span><strong>{result.coverStructure}</strong></div></div>
      <Section title="正文结构"><div className="content-flow">{result.contentStructure.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div></Section>
      <div className="analysis-two-columns"><Section title="可以借鉴" action={<ClipboardCheck size={19} className="section-icon" />}><InsightList items={result.imitationSuggestions} /></Section><Section title="不能照抄" className="compliance-risk" action={<CopyX size={19} className="section-icon" />}><InsightList items={result.avoidCopying} risk /></Section></div>
      <Section title="乐活互动改写方向" description="严格按照选择的业务和场景"><div className="adapted-result"><span className={`type-pill ${businessType === 'diy' ? 'diy' : 'booth'}`}>{businessType === 'diy' ? '手作DIY' : 'Photobooth'}</span><div>{result.adaptedTitles.map((item) => <div className="copy-row" key={item}><p>{item}</p><CopyButton text={item} /></div>)}</div><h3>正文角度</h3><p>{result.adaptedCopyAngle}</p><CopyButton text={result.adaptedCopyAngle} /></div></Section>
      {result.unknowns.length > 0 && <Section title="信息不足" description="这些项目目前不能可靠判断"><InsightList items={result.unknowns} risk /></Section>}
      <Section title="合规与版权风险" className="compliance-risk" action={<ShieldAlert size={19} className="section-icon" />}><InsightList items={result.risks} risk /></Section>
    </div>}</div>
  </div>;
}
