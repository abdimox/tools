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
    setBusinessType(value);
    setScene(value === 'photobooth' ? 'wedding' : '');
    setTopics([]);
    setSelectedTopic(null);
    setResult(null);
  }

  function selectTopic(topic: TopicIdea) {
    setSelectedTopic(topic);
    setResult(null);
  }

  async function createTopics() {
    if (!scene) { setError('请先选择客户场景。'); return; }
    setLoading('topics');
    setError('');
    setResult(null);
    try {
      setTopics(await generateTopics(businessType, scene));
      setSelectedTopic(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '选题生成失败。'); }
    finally { setLoading(null); }
  }

  async function createCopy() {
    if (!scene || !selectedTopic) { setError('请先选择一个选题。'); return; }
    setLoading('copy');
    setError('');
    try {
      setResult(await generateCopy({ businessType, scene, topic: selectedTopic, caseBrief }));
      window.setTimeout(() => document.getElementById('note-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '文案生成失败。'); }
    finally { setLoading(null); }
  }

  return <div className="workflow-page compact-workflow">
    <section className="workflow-panel">
      <div className="input-intro"><span className="step-kicker">STEP 1 · 选题</span><h2>选择场景，直接出10个选题</h2><p>按之前拆解的高赞规律生成：争议、避坑、对比、价格、案例、信任感。</p></div>
      <div className="form-step"><div className="step-number">01</div><div className="step-content"><label>业务类型</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} /></div></div>
      <div className="form-step"><div className="step-number">02</div><div className="step-content"><label>客户场景</label><SceneSelector businessType={businessType} value={scene} onChange={(value) => { setScene(value); setTopics([]); setSelectedTopic(null); setResult(null); }} /></div></div>
      {loading === 'topics' ? <LoadingState text="正在直接生成10个选题..." /> : <button className="button button-primary button-large generate-button" type="button" onClick={createTopics}><Sparkles size={18} />生成10个选题</button>}
      {error && <><ErrorState message={error} />{error.includes('API Key') && <Link className="inline-settings-link" to="/settings">前往接口设置</Link>}</>}
    </section>

    <section className="workflow-panel topic-stage">
      <div className="input-intro"><span className="step-kicker">STEP 2 · 选择</span><h2>选中一个，下一步直接出文案</h2><p>选题只保留关键判断，不走封面和生图流程。</p></div>
      {!topics.length ? <div className="workflow-empty"><WandSparkles size={28} /><p>点击左侧按钮后显示10个选题</p></div> : <div className="topic-list">{topics.map((topic, index) => <button key={topic.id} type="button" className={selectedTopic?.id === topic.id ? 'selected' : ''} onClick={() => selectTopic(topic)}>
        <span>{String(index + 1).padStart(2, '0')}</span><div><i>{topic.contentType}</i><h3>{topic.title}</h3><p>{topic.angle}</p><small>为什么会点：{topic.reason}</small><small>评论钩子：{topic.discussionQuestion}</small></div>
      </button>)}</div>}
    </section>

    <section className="workflow-panel copy-stage">
      <div className="input-intro"><span className="step-kicker">STEP 3 · 文案</span><h2>根据选题生成文案</h2><p>可以补充真实案例信息。没有就留空，AI只写经验判断。</p></div>
      {selectedTopic ? <div className="selected-topic"><CheckCircle2 size={17} /><div><strong>{selectedTopic.title}</strong><small>{selectedTopic.angle}</small></div></div> : <div className="workflow-empty compact"><p>请先选择一个选题</p></div>}
      <label className="field-label" htmlFor="case-brief">补充真实案例信息（可选）</label>
      <textarea id="case-brief" rows={5} maxLength={500} value={caseBrief} onChange={(event) => setCaseBrief(event.target.value)} placeholder="例如：广州婚礼，户外草坪，现场提供定制相框和即拍即印。没有就留空。" />
      {loading === 'copy' ? <LoadingState text="正在按选题生成自然文案..." /> : <button className="button button-primary button-large generate-button" disabled={!selectedTopic} type="button" onClick={createCopy}>根据选题出文案<ChevronRight size={18} /></button>}
      <p className="privacy-inline"><ShieldCheck size={15} />最终发布前仍需核对活动事实</p>
    </section>

    <section className="workflow-result" id="note-results">
      {!result ? <div className="empty-results"><span><WandSparkles size={30} /></span><h2>最终文案显示区</h2><p>选中一个选题后，点击“根据选题出文案”。</p></div> : <div className="result-stack">
        <div className="result-summary-bar"><div><span className="result-ready"><CheckCircle2 size={16} />已完成事实边界检查</span><h2>{selectedTopic?.title}</h2><p>{result.sceneLabel}场景</p></div><button type="button" className="button button-secondary" onClick={createCopy}><RefreshCw size={16} />重新生成</button></div>
        <Section title="3个标题" description="推荐标题已标记" action={<CopyButton label="复制全部标题" text={result.titles.join('\n')} />}>
          <div className="final-title-list">{result.titles.map((title, index) => <div className={index === result.recommendedTitle ? 'recommended' : ''} key={title}><span>{index + 1}</span><p>{title}{index === result.recommendedTitle && <small>推荐</small>}</p><CopyButton text={title} /></div>)}</div>
        </Section>
        <Section title="正文与话题" description="可整体复制" action={<CopyButton label="复制完整内容" text={result.fullCopy} />}><article className="final-copy"><p>{result.body}</p><div className="final-tags">{result.tags.join(' ')}</div></article></Section>
      </div>}
    </section>
  </div>;
}
