import { CheckCircle2, ChevronRight, Download, Image as ImageIcon, RefreshCw, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateCopy, generateCoverImage, generateTopics } from '../aiClient';
import { downloadBlob } from '../api';
import { BusinessTypeSelector } from '../components/BusinessTypeSelector';
import { CopyButton } from '../components/CopyButton';
import { ImageUploader } from '../components/ImageUploader';
import { SceneSelector } from '../components/SceneSelector';
import { Section } from '../components/Section';
import { ErrorState, LoadingState } from '../components/Status';
import { coverBlobToFile, createPlainCoverBlob, type CoverLayout } from '../coverCanvas';
import type { BusinessType, NoteResult, SceneType, TopicIdea } from '../types';

const coverLayouts: Array<{ value: CoverLayout; label: string; description: string }> = [
  { value: 'main-plus-three', label: '大图+三小图', description: '最适合案例：设备、现场、成片一起看' },
  { value: 'grid-four', label: '四宫格拼图', description: '最稳妥：真实、信息多、不像广告图' },
  { value: 'single-proof', label: '单张证据图', description: '适合一张特别强的现场图或成片图' },
];

export function NoteGeneratorPage() {
  const [businessType, setBusinessType] = useState<BusinessType>('photobooth');
  const [scene, setScene] = useState<SceneType | ''>('wedding');
  const [topics, setTopics] = useState<TopicIdea[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicIdea | null>(null);
  const [caseBrief, setCaseBrief] = useState('');
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [coverText, setCoverText] = useState('');
  const [coverLayout, setCoverLayout] = useState<CoverLayout>('main-plus-three');
  const [coverResult, setCoverResult] = useState<{ blob: Blob; filename: string; previewUrl: string; source: 'local' | 'api' } | null>(null);
  const [result, setResult] = useState<NoteResult | null>(null);
  const [loading, setLoading] = useState<'topics' | 'copy' | 'cover' | 'api-cover' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => { if (coverResult?.previewUrl) URL.revokeObjectURL(coverResult.previewUrl); }, [coverResult]);

  function resetCover() {
    if (coverResult?.previewUrl) URL.revokeObjectURL(coverResult.previewUrl);
    setCoverResult(null);
  }

  function changeBusiness(value: BusinessType) {
    setBusinessType(value);
    setScene(value === 'photobooth' ? 'wedding' : '');
    setTopics([]);
    setSelectedTopic(null);
    setCoverText('');
    setResult(null);
    resetCover();
  }

  function selectTopic(topic: TopicIdea) {
    setSelectedTopic(topic);
    setCoverText(topic.coverText || topic.title);
    setResult(null);
    resetCover();
  }

  async function createTopics() {
    if (!scene) { setError('请先选择客户场景。'); return; }
    setLoading('topics'); setError(''); setResult(null); resetCover();
    try {
      setTopics(await generateTopics(businessType, scene));
      setSelectedTopic(null);
      setCoverText('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '选题生成失败。'); }
    finally { setLoading(null); }
  }

  async function buildCoverBlob(): Promise<Blob> {
    if (!selectedTopic) throw new Error('请先选择一个选题。');
    if (!coverText.trim()) throw new Error('请先确认封面大字。');
    if (!coverFiles.length) throw new Error('请先上传1-4张真实现场图或成片图。');
    return createPlainCoverBlob({
      files: coverFiles,
      title: coverText.trim(),
      layout: coverLayout,
      subtitle: selectedTopic.contentType ? `${selectedTopic.contentType} · ${scene ? selectedTopic.coverTip || '真实案例' : ''}` : undefined,
    });
  }

  async function createLocalCover() {
    setLoading('cover'); setError('');
    try {
      const blob = await buildCoverBlob();
      resetCover();
      setCoverResult({ blob, filename: `小红书封面-${Date.now()}.png`, previewUrl: URL.createObjectURL(blob), source: 'local' });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '封面生成失败。'); }
    finally { setLoading(null); }
  }

  async function polishCoverWithApi() {
    setLoading('api-cover'); setError('');
    try {
      const baseBlob = coverResult?.blob || await buildCoverBlob();
      const title = coverText.trim();
      const generated = await generateCoverImage(coverBlobToFile(baseBlob), `请基于这张小红书封面图做轻微整理。必须保留真实照片、拼图结构和中文大字标题“${title}”，不要新增二维码、联系方式、虚假Logo、虚假人物或夸张贴纸。只优化清晰度、亮度、对比度、边缘和整体整洁度。风格要像真实商家小红书封面：普通、直接、可信，不要海报感，不要科技感。`);
      resetCover();
      setCoverResult({ ...generated, previewUrl: URL.createObjectURL(generated.blob), source: 'api' });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'API封面生成失败。'); }
    finally { setLoading(null); }
  }

  async function createCopy() {
    if (!scene || !selectedTopic) { setError('请先选择一个选题。'); return; }
    setLoading('copy'); setError('');
    try {
      setResult(await generateCopy({ businessType, scene, topic: { ...selectedTopic, coverText: coverText.trim() || selectedTopic.coverText }, caseBrief }));
      window.setTimeout(() => document.getElementById('note-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '文案生成失败。'); }
    finally { setLoading(null); }
  }

  return <div className="workflow-page">
    <section className="workflow-panel">
      <div className="input-intro"><span className="step-kicker">STEP 1 · 选题</span><h2>先选业务和客户场景</h2><p>AI会结合运营知识库，优先生成能引发讨论、能解释Photobooth价值的选题。</p></div>
      <div className="form-step"><div className="step-number">01</div><div className="step-content"><label>业务类型</label><BusinessTypeSelector value={businessType} onChange={changeBusiness} /></div></div>
      <div className="form-step"><div className="step-number">02</div><div className="step-content"><label>客户场景</label><SceneSelector businessType={businessType} value={scene} onChange={(value) => { setScene(value); setTopics([]); setSelectedTopic(null); setResult(null); setCoverText(''); resetCover(); }} /></div></div>
      {loading === 'topics' ? <LoadingState text="正在分析客户搜索心理并生成选题..." /> : <button className="button button-primary button-large generate-button" type="button" onClick={createTopics}><Sparkles size={18} />一键生成选题</button>}
      {error && <><ErrorState message={error} />{error.includes('API Key') && <Link className="inline-settings-link" to="/settings">前往接口设置</Link>}</>}
    </section>

    <section className="workflow-panel topic-stage">
      <div className="input-intro"><span className="step-kicker">STEP 2 · 选择</span><h2>选择一个值得继续做的选题</h2><p>每个选题都带客户心理、封面建议和评论引导，不只是一句标题。</p></div>
      {!topics.length ? <div className="workflow-empty"><WandSparkles size={28} /><p>生成选题后显示在这里</p></div> : <div className="topic-list">{topics.map((topic, index) => <button key={topic.id} type="button" className={selectedTopic?.id === topic.id ? 'selected' : ''} onClick={() => selectTopic(topic)}>
        <span>{String(index + 1).padStart(2, '0')}</span><div><i>{topic.contentType}</i><h3>{topic.title}</h3><p>{topic.angle}</p><small>客户纠结：{topic.audiencePain || topic.reason}</small><em>封面：{topic.coverText}</em><small>配图：{topic.coverTip}</small><small>评论：{topic.discussionQuestion}</small></div>
      </button>)}</div>}
    </section>

    <section className="workflow-panel cover-stage">
      <div className="input-intro"><span className="step-kicker">STEP 3 · 封面</span><h2>上传图片，做朴素拼图封面</h2><p>先用真实照片拼图保证文字准确；需要时再调用图片API轻微整理。</p></div>
      {selectedTopic ? <div className="selected-topic"><CheckCircle2 size={17} /><div><strong>{selectedTopic.title}</strong><small>{selectedTopic.coverTip || selectedTopic.angle}</small></div></div> : <div className="workflow-empty compact"><p>请先选择一个选题</p></div>}
      <label className="field-label" htmlFor="cover-text">封面大字</label>
      <input id="cover-text" value={coverText} onChange={(event) => { setCoverText(event.target.value); resetCover(); }} maxLength={18} placeholder="例如：有摄影师还要它吗？" />
      <label className="field-label">封面模板</label>
      <div className="layout-options">{coverLayouts.map((item) => <button key={item.value} type="button" className={coverLayout === item.value ? 'selected' : ''} onClick={() => { setCoverLayout(item.value); resetCover(); }}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
      <label className="field-label">上传图片</label>
      <ImageUploader files={coverFiles} maxFiles={4} onChange={(next) => { setCoverFiles(next); resetCover(); }} fieldName="上传1-4张真实图片" hint="建议：设备现场、宾客互动、打印成片、布置环境" />
      <div className="cover-actions">
        {loading === 'cover' ? <LoadingState text="正在生成拼图封面..." /> : <button className="button button-primary" disabled={!selectedTopic} type="button" onClick={createLocalCover}><ImageIcon size={17} />生成拼图封面</button>}
        {loading === 'api-cover' ? <LoadingState text="正在调用图片API微调封面..." /> : <button className="button button-secondary" disabled={!selectedTopic || !coverFiles.length} type="button" onClick={polishCoverWithApi}><Sparkles size={17} />调用API整理</button>}
      </div>
      {coverResult && <div className="cover-output">
        <img src={coverResult.previewUrl} alt="生成的小红书封面" />
        <div><span>{coverResult.source === 'api' ? 'API整理版' : '本地拼图版'}</span><button className="button button-dark button-small" type="button" onClick={() => downloadBlob(coverResult.blob, coverResult.filename)}><Download size={15} />保存封面</button></div>
      </div>}
    </section>

    <section className="workflow-panel copy-stage">
      <div className="input-intro"><span className="step-kicker">STEP 4 · 文案</span><h2>根据选题生成文案</h2><p>补充真实案例信息。没有就留空，AI只写经验判断，不虚构。</p></div>
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
