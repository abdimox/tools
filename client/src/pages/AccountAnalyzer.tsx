import { CalendarCheck, ClipboardCheck, Eye, SearchCheck, ShieldAlert, Sparkles, UserRoundSearch } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { postForm } from '../api';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { AccountAnalysis } from '../types';

function ListBlock({ items, warning = false }: { items: string[]; warning?: boolean }) {
  return <ul className={warning ? 'analysis-list warning-list' : 'analysis-list'}>{items.map((item) => <li key={item}>{warning ? <ShieldAlert size={16} /> : <ClipboardCheck size={16} />}<span>{item}</span></li>)}</ul>;
}

const label = { high: '高', medium: '中', low: '低' };

export function AccountAnalyzerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AccountAnalysis | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (files.length === 0) { setError('请至少上传一张账号截图。'); return; }
    setLoading(true); setError('');
    try {
      const form = new FormData(); files.forEach((file) => form.append('screenshots', file)); form.append('manualNotes', notes);
      setResult(await postForm('/api/analyze-account', form));
      window.setTimeout(() => document.getElementById('account-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '分析失败，请重试。'); }
    finally { setLoading(false); }
  }

  return <div className="analyzer-page">
    <form className="analyzer-form" onSubmit={submit}>
      <div className="analyzer-form-intro"><span><UserRoundSearch size={24} /></span><div><h2>上传真实账号截图</h2><p>gpt-5.5会逐张读取并标注证据。</p></div></div>
      <div className="screenshot-hints"><span>主页截图</span><span>笔记列表</span><span>单篇笔记</span><span>创作中心数据</span></div>
      <ImageUploader files={files} onChange={(next) => { setFiles(next); setResult(null); }} fieldName="选择账号截图" />
      <label className="field-label" htmlFor="account-notes">补充说明（选填）</label><textarea id="account-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：最近两周流量下降，希望重点看标题和封面问题" />
      {error && <><ErrorState message={error} />{error.includes('接口') && <Link className="inline-settings-link" to="/settings">前往接口配置</Link>}</>}
      {loading ? <LoadingState text="gpt-5.5正在读取截图并核对证据..." /> : <button className="button button-primary button-large" type="submit"><Sparkles size={18} />开始真实账号分析</button>}
      <p className="privacy-inline">截图在分析请求结束后立即删除，不保存历史。</p>
    </form>
    <div className="analyzer-results" id="account-result">{!result ? <div className="analysis-empty"><SearchCheck size={31} /><h2>有依据的账号诊断</h2><p>所有结论必须引用截图中的可见证据；看不清的内容会明确标为信息不足。</p></div> : <div className="result-stack">
      <div className="evidence-summary"><span><Eye size={24} /></span><div><span className="eyebrow">真实多模态分析</span><h2>{result.summary}</h2><p>共提取 {result.evidence.length} 条截图证据，发现 {result.diagnosis.length} 个需要处理的问题。</p></div><CopyButton label="复制分析摘要" text={result.summary} /></div>
      <Section title="截图证据" description="先陈述看到了什么，再给判断"><div className="evidence-grid">{result.evidence.map((item, index) => <div key={`${item.screenshot}-${index}`}><span>截图 {item.screenshot}</span><p>{item.observation}</p><small>置信度：{label[item.confidence]}</small></div>)}</div></Section>
      <Section title="账号问题诊断" description="每个结论都必须有具体依据"><div className="diagnosis-list">{result.diagnosis.map((item, index) => <div key={`${item.issue}-${index}`}><span className={`priority ${item.priority}`}>{item.priority === 'high' ? '优先处理' : item.priority === 'medium' ? '随后处理' : '持续观察'}</span><div><h3>{item.issue}</h3><p>{item.evidence}</p><small>判断置信度：{label[item.confidence]}</small></div></div>)}</div></Section>
      <div className="analysis-two-columns"><Section title="主页简介优化" action={<CopyButton text={result.profileSuggestions.join('\n')} />}><ListBlock items={result.profileSuggestions} /></Section><Section title="标题关键词建议"><ListBlock items={result.titleSuggestions} /></Section></div>
      <div className="analysis-two-columns"><Section title="封面优化建议"><ListBlock items={result.coverSuggestions} /></Section><Section title="建议内容栏目"><ListBlock items={result.contentColumns} /></Section></div>
      {result.unknowns.length > 0 && <Section title="当前无法判断" description="需要补充截图或数据后再判断"><ListBlock items={result.unknowns} warning /></Section>}
      <Section title="合规与隐私风险" className="compliance-risk"><ListBlock items={result.riskWarnings} warning /></Section>
      <Section title="14天行动计划" description="按优先级逐步执行" action={<CalendarCheck size={20} className="section-icon" />}><div className="timeline">{result.actionPlan14Days.map((item) => <div key={item.days}><span></span><div><strong>{item.days}</strong><p>{item.action}</p></div></div>)}</div></Section>
    </div>}</div>
  </div>;
}
