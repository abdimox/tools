import { CheckCircle2, ChevronRight, RefreshCw, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateCopy, generateTopics } from '../aiClient';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { SceneSelector } from '../components/SceneSelector';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import type { BusinessType, NoteResult, SceneType, TopicIdea } from '../types';

export function NoteGeneratorPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('photobooth');
  const [scene, setScene] = useState<SceneType | ''>('wedding');
  const [topics, setTopics] = useState<TopicIdea[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicIdea | null>(null);
  const [caseBrief, setCaseBrief] = useState('');
  const [result, setResult] = useState<NoteResult | null>(null);
  const [loading, setLoading] = useState<'topics' | 'copy' | null>(null);
  const [error, setError] = useState('');

  function changeBusiness(value: BusinessType) {
    setBusinessType(value); setScene(''); setTopics([]); setSelectedTopic(null); setResult(null);
  }

  async function createTopics() {
    if (!scene) { setError('请先选择客户场景。'); return; }
    setLoading('topics'); setError(''); setResult(null);
    try {
      setTopics(await generateTopics(businessType, scene));
      setSelectedTopic(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '选题生成失败。'); }
    finally { setLoading(null); }
  }

  async function createCopy() {
    if (!scene || !selectedTopic) { setError('请先选择一个选题。'); return; }
    setLoading('copy'); setError('');
    try {
      setResult(await generateCopy({ businessType, scene, topic: selectedTopic, caseBrief }));
      window.setTimeout(() => document.getElementById('note-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '文案生成失败。'); }
    finally { setLoading(null); }
  }

  return <div className="workflow-page">
    <section className="workflow-panel">
      <div className="input-intro"><span className="step-kicker">STEP 1 · 选题</span><h2>先选业务和客户场景</h2><p>AI会结合运营知识库，生成不同内容角度，不直接套案例模板。</p></div>
      <div className="form-step"><div className="step-number">01</div><div className="step-content"><label>业务类型</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} /></div></div>
      <div className="form-step"><div className="step-number">02</div><div className="step-content"><label>客户场景</label><SceneSelector businessType={businessType} value={scene} onChange={(value) => { setScene(value); setTopics([]); setSelectedTopic(null); setResult(null); }} /></div></div>
      {loading === 'topics' ? <LoadingState text="正在分析客户搜索心理并生成选题..." /> : <button className="button button-primary button-large generate-button" type="button" onClick={createTopics}><Sparkles size={18} />一键生成选题</button>}
      {error && <><ErrorState message={error} />{error.includes('API Key') && <Link className="inline-settings-link" to="/settings">前往接口设置</Link>}</>}
    </section>

    <section className="workflow-panel topic-stage">
      <div className="input-intro"><span className="step-kicker">STEP 2 · 选择</span><h2>选择一个值得继续写的选题</h2><p>每个选题都说明点击理由和建议封面大字。</p></div>
      {!topics.length ? <div className="workflow-empty"><WandSparkles size={28} /><p>生成选题后显示在这里</p></div> : <div className="topic-list">{topics.map((topic, index) => <button key={topic.id} type="button" className={selectedTopic?.id === topic.id ? 'selected' : ''} onClick={() => { setSelectedTopic(topic); setResult(null); }}>
        <span>{String(index + 1).padStart(2, '0')}</span><div><h3>{topic.title}</h3><p>{topic.angle}</p><small>点击理由：{topic.reason}</small><em>封面：{topic.coverText}</em></div>
      </button>)}</div>}
    </section>

    <section className="workflow-panel copy-stage">
      <div className="input-intro"><span className="step-kicker">STEP 3 · 文案</span><h2>根据选题生成文案</h2><p>只补充真实信息。没有案例也可以留空，AI不会虚构。</p></div>
      {selectedTopic ? <div className="selected-topic"><CheckCircle2 size={17} /><div><strong>{selectedTopic.title}</strong><small>{selectedTopic.angle}</small></div></div> : <div className="workflow-empty compact"><p>请先选择一个选题</p></div>}
      <label className="field-label" htmlFor="case-brief">补充真实案例信息（可选）</label>
      <textarea id="case-brief" rows={5} maxLength={500} value={caseBrief} onChange={(event) => setCaseBrief(event.target.value)} placeholder="例如：广州婚礼，户外草坪，现场提供定制相框和即拍即印。没有就留空。" />
      {loading === 'copy' ? <LoadingState text="正在写初稿并进行第二轮去AI感复核..." /> : <button className="button button-primary button-large generate-button" disabled={!selectedTopic} type="button" onClick={createCopy}>生成并优化文案<ChevronRight size={18} /></button>}
      <p className="privacy-inline"><ShieldCheck size={15} />最终发布前仍需核对活动事实</p>
    </section>

    <section className="workflow-result" id="note-results">
      {!result ? <div className="empty-results"><span><WandSparkles size={30} /></span><h2>最终文案显示区</h2><p>选择选题后，AI会先写初稿，再检查事实、场景匹配和AI味。</p></div> : <div className="result-stack">
        <div className="result-summary-bar"><div><span className="result-ready"><CheckCircle2 size={16} />已完成二次复核</span><h2>{selectedTopic?.title}</h2><p>{result.sceneLabel}场景</p></div><button type="button" className="button button-secondary" onClick={createCopy}><RefreshCw size={16} />重新生成</button></div>
        <Section title="3个标题" description="推荐标题已标记" action={<CopyButton label="复制全部标题" text={result.titles.join('\n')} />}>
          <div className="final-title-list">{result.titles.map((title, index) => <div className={index === result.recommendedTitle ? 'recommended' : ''} key={title}><span>{index + 1}</span><p>{title}{index === result.recommendedTitle && <small>推荐</small>}</p><CopyButton text={title} /></div>)}</div>
        </Section>
        <Section title="正文与话题" description="可整体复制" action={<CopyButton label="复制完整内容" text={result.fullCopy} />}><article className="final-copy"><p>{result.body}</p><div className="final-tags">{result.tags.join(' ')}</div></article></Section>
      </div>}
    </section>
  </div>;
}
