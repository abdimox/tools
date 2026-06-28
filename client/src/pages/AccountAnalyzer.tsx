import { CalendarCheck, ClipboardCheck, Gauge, SearchCheck, ShieldAlert, Sparkles, Target, UserRoundSearch } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { postForm } from '../api';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { AccountAnalysis } from '../types';

function ListBlock({ items, warning = false }: { items: string[]; warning?: boolean }) {
  return <ul className={warning ? 'analysis-list warning-list' : 'analysis-list'}>{items.map((item) => <li key={item}>{warning ? <ShieldAlert size={16} /> : <ClipboardCheck size={16} />}<span>{item}</span></li>)}</ul>;
}

export function AccountAnalyzerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AccountAnalysis | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError('请至少上传一张账号截图。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      files.forEach((file) => form.append('screenshots', file));
      form.append('manualNotes', notes);
      setResult(await postForm('/api/analyze-account', form));
      window.setTimeout(() => document.getElementById('account-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '分析失败，请重试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analyzer-page">
      <form className="analyzer-form" onSubmit={submit}>
        <div className="analyzer-form-intro"><span><UserRoundSearch size={24} /></span><div><h2>上传账号截图</h2><p>截图越完整，诊断维度越充分。</p></div></div>
        <div className="screenshot-hints"><span>主页截图</span><span>笔记列表</span><span>单篇笔记</span><span>创作中心数据</span></div>
        <ImageUploader files={files} onChange={setFiles} fieldName="选择账号截图" />
        <label className="field-label" htmlFor="account-notes">补充说明（选填）</label>
        <textarea id="account-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：最近两周流量下降，希望重点看标题和封面问题" />
        {error && <ErrorState message={error} />}
        {loading ? <LoadingState text="正在诊断账号定位与内容结构..." /> : <button className="button button-primary button-large" type="submit"><Sparkles size={18} />开始分析账号</button>}
        <p className="privacy-inline">截图只用于本次演示分析，处理后立即删除。</p>
      </form>

      <div className="analyzer-results" id="account-result">
        {!result ? <div className="analysis-empty"><SearchCheck size={31} /><h2>让账号问题变得可执行</h2><p>分析完成后，将得到定位诊断、主页建议、内容栏目和14天行动计划。</p></div> : <div className="result-stack">
          <div className="account-score"><div className="score-ring"><strong>{result.score}</strong><span>/100</span></div><div><span className="eyebrow">账号诊断结果</span><h2>优先重做定位表达与案例结构</h2><p>{result.summary}</p></div><CopyButton label="复制完整诊断" text={[result.summary, ...result.diagnosis, ...result.profileSuggestions, ...result.actionPlan14Days.map((item) => `${item.days}：${item.action}`)].join('\n')} /></div>
          <Section title="账号问题总结" description="影响用户理解与信任的主要问题" action={<Gauge size={20} className="section-icon" />}><ListBlock items={result.diagnosis} /></Section>
          <div className="analysis-two-columns">
            <Section title="主页简介优化" action={<CopyButton text={result.profileSuggestions.join('\n')} />}><ListBlock items={result.profileSuggestions} /></Section>
            <Section title="置顶笔记建议" action={<CopyButton text={result.pinnedPostSuggestions.join('\n')} />}><ListBlock items={result.pinnedPostSuggestions} /></Section>
          </div>
          <div className="analysis-two-columns">
            <Section title="标题关键词方向" action={<Target size={19} className="section-icon" />}><ListBlock items={result.titleSuggestions} /></Section>
            <Section title="封面统一建议"><ListBlock items={result.coverSuggestions} /></Section>
          </div>
          <Section title="建议内容栏目" description="用稳定栏目持续建立专业度"><div className="column-grid">{result.contentColumns.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div></Section>
          <Section title="合规风险提示" className="compliance-risk"><ListBlock items={result.riskWarnings} warning /></Section>
          <Section title="14天行动计划" description="按顺序执行，不需要一次改完" action={<CalendarCheck size={20} className="section-icon" />}><div className="timeline">{result.actionPlan14Days.map((item) => <div key={item.days}><span></span><div><strong>{item.days}</strong><p>{item.action}</p></div></div>)}</div></Section>
        </div>}
      </div>
    </div>
  );
}

