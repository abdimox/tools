import { BarChart3, Bookmark, CopyX, Lightbulb, ScanSearch, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { postForm } from '../api';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { BusinessType, CompetitorAnalysis } from '../types';

function InsightList({ items, risk = false }: { items: string[]; risk?: boolean }) {
  return <ul className={risk ? 'analysis-list warning-list' : 'analysis-list'}>{items.map((item) => <li key={item}>{risk ? <ShieldAlert size={16} /> : <Lightbulb size={16} />}<span>{item}</span></li>)}</ul>;
}

export function CompetitorAnalyzerPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('diy');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [copy, setCopy] = useState('');
  const [stats, setStats] = useState({ likes: '', favorites: '', comments: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompetitorAnalysis | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0 && !title.trim() && !copy.trim()) {
      setError('请上传同行截图，或填写同行标题/正文。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('businessType', businessType);
      form.append('title', title);
      form.append('copy', copy);
      Object.entries(stats).forEach(([key, value]) => form.append(key, value));
      files.forEach((file) => form.append('screenshots', file));
      setResult(await postForm('/api/analyze-competitor', form));
      window.setTimeout(() => document.getElementById('competitor-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '分析失败，请重试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analyzer-page competitor-page">
      <form className="analyzer-form" onSubmit={submit}>
        <div className="analyzer-form-intro"><span><ScanSearch size={24} /></span><div><h2>输入同行爆款素材</h2><p>截图和文字至少提供一种。</p></div></div>
        <label className="field-label">希望改写成</label><BusinessTypeSelector value={businessType} onChange={setBusinessType} />
        <ImageUploader files={files} onChange={setFiles} fieldName="上传同行截图" hint="封面、正文、主页或数据截图均可" />
        <label className="field-label" htmlFor="competitor-title">同行标题（选填）</label><input id="competitor-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="粘贴同行标题" />
        <label className="field-label" htmlFor="competitor-copy">同行正文（选填）</label><textarea id="competitor-copy" rows={5} value={copy} onChange={(event) => setCopy(event.target.value)} placeholder="粘贴同行正文" />
        <div className="stats-grid">{([['likes', '点赞'], ['favorites', '收藏'], ['comments', '评论']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input inputMode="numeric" value={stats[key]} onChange={(event) => setStats({ ...stats, [key]: event.target.value.replace(/\D/g, '') })} placeholder="0" /></label>)}</div>
        {error && <ErrorState message={error} />}
        {loading ? <LoadingState text="正在拆解标题、封面与正文结构..." /> : <button className="button button-primary button-large" type="submit"><Sparkles size={18} />开始拆解爆款</button>}
      </form>

      <div className="analyzer-results" id="competitor-result">
        {!result ? <div className="analysis-empty"><BarChart3 size={31} /><h2>拆逻辑，不照抄</h2><p>看清爆款吸引谁、为什么被收藏，以及怎样转化为乐活互动自己的内容。</p></div> : <div className="result-stack">
          <div className="competitor-summary"><span><Target size={23} /></span><div><span className="eyebrow">流量判断</span><h2>这篇内容更偏精准决策流量</h2><p>{result.audienceQuality}</p></div></div>
          <Section title="爆款原因" description="影响点击、阅读与收藏的核心因素" action={<Bookmark size={20} className="section-icon" />}><InsightList items={result.viralReasons} /></Section>
          <div className="structure-grid">
            <div><span>标题结构</span><strong>{result.titleStructure}</strong></div>
            <div><span>封面结构</span><strong>{result.coverStructure}</strong></div>
          </div>
          <Section title="正文逻辑"><div className="content-flow">{result.contentStructure.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div></Section>
          <div className="analysis-two-columns">
            <Section title="可以借鉴" action={<Lightbulb size={19} className="section-icon" />}><InsightList items={result.imitationSuggestions} /></Section>
            <Section title="不要照抄" className="compliance-risk" action={<CopyX size={19} className="section-icon" />}><InsightList items={result.avoidCopying} risk /></Section>
          </div>
          <Section title="乐活互动改写标题" description="两条业务分别生成，避免内容混写">
            <div className="adapted-columns"><div><span className="type-pill diy">手作DIY</span>{result.adaptedTitles.diy.map((item) => <div className="copy-row" key={item}><p>{item}</p><CopyButton text={item} /></div>)}</div><div><span className="type-pill booth">Photobooth</span>{result.adaptedTitles.photobooth.map((item) => <div className="copy-row" key={item}><p>{item}</p><CopyButton text={item} /></div>)}</div></div>
          </Section>
          <Section title="正文改写角度"><div className="adapted-columns"><div><span className="type-pill diy">手作DIY</span><InsightList items={result.adaptedCopyAngles.diy} /></div><div><span className="type-pill booth">Photobooth</span><InsightList items={result.adaptedCopyAngles.photobooth} /></div></div></Section>
          <Section title="合规风险" className="compliance-risk"><InsightList items={result.risks} risk /></Section>
        </div>}
      </div>
    </div>
  );
}
