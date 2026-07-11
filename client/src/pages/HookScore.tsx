import { AlertTriangle, CheckCircle2, Copy, Gauge, ImagePlus, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreCoverTitle } from '../aiClient';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { SceneSelector } from '../components/SceneSelector';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { BusinessType, HookScoreResult, SceneType } from '../types';

function scoreClass(score: number) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function joinCopy(result: HookScoreResult) {
  return [
    `点击率评分：${result.score}/100`,
    `发布建议：${result.verdict}`,
    `爆款潜力：${result.viralPotential}`,
    '',
    `判断：${result.summary}`,
    '',
    '推荐标题：',
    ...result.improvedTitles.map((item, index) => `${index + 1}. ${item}`),
    '',
    '推荐封面大字：',
    ...result.improvedCoverTexts.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

export function HookScorePage() {
  const [businessType, setBusinessType] = useState<BusinessType>('photobooth');
  const [scene, setScene] = useState<SceneType | ''>('wedding');
  const [title, setTitle] = useState('');
  const [coverText, setCoverText] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<HookScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function changeBusiness(value: BusinessType) {
    setBusinessType(value);
    setScene(value === 'photobooth' ? 'wedding' : '');
    setResult(null);
  }

  async function score() {
    if (!scene) { setError('请先选择客户场景。'); return; }
    setLoading(true);
    setError('');
    try {
      setResult(await scoreCoverTitle({ businessType, scene, title, coverText, body, coverImage: files[0] }));
      window.setTimeout(() => document.getElementById('score-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '评分失败，请重试。'); }
    finally { setLoading(false); }
  }

  return <div className="score-page">
    <section className="score-form">
      <div className="input-intro"><span className="step-kicker">CLICK SCORE</span><h2>封面标题点击率诊断</h2><p>发帖前先评估第一眼能不能让人停下来。重点看封面和标题，不承诺一定爆。</p></div>
      <div className="form-step"><div className="step-number">01</div><div className="step-content"><label>业务类型</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} /></div></div>
      <div className="form-step"><div className="step-number">02</div><div className="step-content"><label>客户场景</label><SceneSelector businessType={businessType} value={scene} onChange={(value) => { setScene(value); setResult(null); }} /></div></div>
      <label className="field-label" htmlFor="score-title">标题</label>
      <input id="score-title" value={title} onChange={(event) => { setTitle(event.target.value); setResult(null); }} maxLength={80} placeholder="例如：婚礼有摄影师了，还需要Photobooth吗？" />
      <label className="field-label" htmlFor="score-cover-text">封面大字（可选）</label>
      <input id="score-cover-text" value={coverText} onChange={(event) => { setCoverText(event.target.value); setResult(null); }} maxLength={24} placeholder="例如：有摄影师还要它吗？" />
      <label className="field-label">封面图/封面截图（可选但建议上传）</label>
      <ImageUploader files={files} onChange={(next) => { setFiles(next.slice(0, 1)); setResult(null); }} maxFiles={1} fieldName="上传封面图" hint="用于判断主体、真实感、大字是否一眼看懂" />
      <label className="field-label" htmlFor="score-body">正文或前3行（可选）</label>
      <textarea id="score-body" rows={5} maxLength={1200} value={body} onChange={(event) => { setBody(event.target.value); setResult(null); }} placeholder="可以只粘贴正文前3行，用来判断点进来以后能不能承接标题。" />
      {error && <><ErrorState message={error} />{error.includes('API Key') && <Link className="inline-settings-link" to="/settings">前往接口设置</Link>}</>}
      {loading ? <LoadingState text="正在评估封面和标题点击率..." /> : <button className="button button-primary button-large generate-button" type="button" onClick={score}><Gauge size={18} />开始评分</button>}
    </section>

    <section className="score-results" id="score-result">
      {!result ? <div className="empty-results"><span><ImagePlus size={30} /></span><h2>评分结果显示区</h2><p>输入标题并上传封面后，工具会重点判断“别人刷到会不会点”。</p></div> : <div className="result-stack">
        <div className={`score-summary ${scoreClass(result.score)}`}>
          <div className="score-number"><strong>{result.score}</strong><span>/100</span></div>
          <div><span className="result-ready"><CheckCircle2 size={16} />{result.verdict}</span><h2>{result.summary || '已完成点击率诊断'}</h2><p>爆款潜力：{result.viralPotential} · 不代表保证会火，只代表发布前质量判断。</p></div>
          <CopyButton label="复制建议" text={joinCopy(result)} />
        </div>

        <section className="score-breakdown">
          <div><span>封面</span><strong>{result.coverScore}/40</strong></div>
          <div><span>标题</span><strong>{result.titleScore}/35</strong></div>
          <div><span>选题</span><strong>{result.topicScore}/15</strong></div>
          <div><span>正文承接</span><strong>{result.copyScore}/10</strong></div>
        </section>

        <div className="score-grid">
          <Section title="主要问题" description="优先改封面和标题">
            <div className="issue-groups">
              <div><h3>封面</h3>{result.coverIssues.map((item) => <p key={item}><AlertTriangle size={14} />{item}</p>)}</div>
              <div><h3>标题</h3>{result.titleIssues.map((item) => <p key={item}><AlertTriangle size={14} />{item}</p>)}</div>
              <div><h3>选题/正文</h3>{[...result.topicIssues, ...result.copyIssues].map((item) => <p key={item}><AlertTriangle size={14} />{item}</p>)}</div>
            </div>
          </Section>

          <Section title="建议封面大字" description="普通、直接、不要花哨" action={<CopyButton label="复制" text={result.improvedCoverTexts.join('\n')} />}>
            <div className="suggestion-list">{result.improvedCoverTexts.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p><CopyButton text={item} /></div>)}</div>
          </Section>
        </div>

        <Section title="建议标题" description="优先使用推荐项" action={<CopyButton label="复制全部" text={result.improvedTitles.join('\n')} />}>
          <div className="final-title-list">{result.improvedTitles.map((item, index) => <div className={index === result.bestTitleIndex ? 'recommended' : ''} key={item}><span>{index + 1}</span><p>{item}{index === result.bestTitleIndex && <small>推荐</small>}</p><CopyButton text={item} /></div>)}</div>
        </Section>

        <Section title="发布前检查" description="低成本避免无效发布">
          <div className="check-list">{result.prePublishChecks.map((item) => <p key={item}><CheckCircle2 size={15} />{item}</p>)}</div>
          {result.riskWarnings.length > 0 && <div className="risk-line"><AlertTriangle size={16} /><span>{result.riskWarnings.join('；')}</span></div>}
        </Section>
      </div>}
    </section>
  </div>;
}
