import { Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { downloadBlob, postFormBlob } from '../api';
import { ImageUploader } from '../components/ImageUploader';
import { ErrorState, LoadingState } from '../components/Status';

export function CoverStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; filename: string; previewUrl: string } | null>(null);

  useEffect(() => () => { if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl); }, [result]);

  async function generate(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!prompt.trim()) { setError('请粘贴图片生成提示词。'); return; }
    if (!files[0]) { setError('请上传一张参考图片。'); return; }
    setLoading(true);
    try {
      const form = new FormData(); form.append('prompt', prompt.trim()); form.append('baseImage', files[0]);
      const generated = await postFormBlob('/api/generate-cover-image', form);
      const previewUrl = URL.createObjectURL(generated.blob);
      setResult({ ...generated, previewUrl });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '图片生成失败，请重试。'); }
    finally { setLoading(false); }
  }

  return <div className="simple-cover-page">
    <form className="simple-cover-form" onSubmit={generate}>
      <div className="input-intro"><span className="step-kicker">GPT-IMAGE-2</span><h2>生成封面图</h2><p>粘贴提示词，上传一张参考图，然后生成。</p></div>
      <label className="field-label" htmlFor="cover-prompt">提示词</label>
      <textarea id="cover-prompt" rows={10} maxLength={5000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="在这里粘贴完整的图片生成提示词..." />
      <label className="field-label">参考图片</label>
      <ImageUploader files={files} onChange={(next) => { setFiles(next.slice(0, 1)); setResult(null); }} maxFiles={1} fieldName="上传参考图片" hint="支持 JPG、PNG、WEBP，单张不超过10MB" />
      {error && <ErrorState message={error} />}
      {loading ? <LoadingState text="gpt-image-2 正在生成图片，请稍候..." /> : <button className="button button-primary button-large" type="submit"><Sparkles size={18} />生成图片</button>}
    </form>
    <section className="simple-cover-result">
      {result ? <><img src={result.previewUrl} alt="AI生成的封面图" /><button className="button button-dark" type="button" onClick={() => downloadBlob(result.blob, result.filename)}><Download size={17} />保存图片</button></> : <div><ImageIcon size={38} /><h2>生成结果</h2><p>图片生成后会显示在这里。</p></div>}
    </section>
  </div>;
}
