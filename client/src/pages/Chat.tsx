import { ImagePlus, Menu, MessageSquareText, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { chatWithHistory, fileToDataUrl } from '../aiClient';
import { compressChatImage } from '../imageCompression';
import { createConversation, deleteConversation, getMessages, listConversations, renameConversation, saveMessages } from '../localChatStore';
import { ErrorState, LoadingState } from '../components/Status';
import type { ChatConversation, ChatMessage } from '../types';

export function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(''); const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true); const [sending, setSending] = useState(false);
  const [error, setError] = useState(''); const [drawerOpen, setDrawerOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);
  useEffect(() => { void loadInitial(); }, []);
  useEffect(() => {
    const node = messageListRef.current;
    if (!node) return;
    const frame = requestAnimationFrame(() => node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' }));
    return () => cancelAnimationFrame(frame);
  }, [messages, sending]);

  async function refreshList() { setConversations(await listConversations()); }
  async function loadInitial() {
    setLoading(true);
    try {
      const items = await listConversations(); setConversations(items);
      if (items[0]) { setActiveId(items[0].id); setMessages(await getMessages(items[0].id)); }
    } catch { setError('无法读取浏览器中的聊天记录。'); }
    finally { setLoading(false); }
  }
  async function selectConversation(id: string) { setActiveId(id); setMessages(await getMessages(id)); setDrawerOpen(false); setError(''); }
  async function newConversation() { const item = await createConversation(); await refreshList(); setActiveId(item.id); setMessages([]); setDrawerOpen(false); }
  async function rename(item: ChatConversation) {
    const title = window.prompt('修改对话名称', item.title)?.trim();
    if (!title || title === item.title) return;
    await renameConversation(item.id, title); await refreshList();
  }
  async function remove(item: ChatConversation) {
    if (!window.confirm(`删除“${item.title}”？`)) return;
    await deleteConversation(item.id);
    const remaining = await listConversations(); setConversations(remaining);
    if (activeId === item.id) {
      if (remaining[0]) await selectConversation(remaining[0].id); else { setActiveId(''); setMessages([]); }
    }
  }
  function addFiles(list: FileList | null) { if (list) setFiles((items) => [...items, ...Array.from(list)].slice(0, 4)); }

  async function send(event: FormEvent) {
    event.preventDefault();
    if ((!input.trim() && !files.length) || sending) return;
    const text = input.trim(); const currentFiles = files;
    setSending(true); setError(''); setInput(''); setFiles([]);
    try {
      let conversationId = activeId;
      if (!conversationId) { const created = await createConversation(); conversationId = created.id; setActiveId(created.id); }
      const compressed = await Promise.all(currentFiles.map(compressChatImage));
      const attachments = await Promise.all(compressed.map(async (file) => ({ id: crypto.randomUUID(), filename: file.name, mimeType: file.type, byteSize: file.size, url: await fileToDataUrl(file) })));
      const now = new Date().toISOString();
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, status: 'complete', errorMessage: null, createdAt: now, attachments };
      const withUser = [...messages, userMessage]; setMessages(withUser);
      const title = conversations.find((item) => item.id === conversationId)?.title === '新对话' || !conversations.some((item) => item.id === conversationId)
        ? (text || '图片对话').replace(/\s+/g, ' ').slice(0, 24) : undefined;
      await saveMessages(conversationId, withUser, title);
      const reply = await chatWithHistory(withUser);
      const assistant: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply, status: 'complete', errorMessage: null, createdAt: new Date().toISOString(), attachments: [] };
      const complete = [...withUser, assistant]; setMessages(complete); await saveMessages(conversationId, complete, title); await refreshList();
    } catch (caught) {
      setInput(text); setFiles(currentFiles); setError(caught instanceof Error ? caught.message : '发送失败，请重试。');
    } finally { setSending(false); }
  }

  return <div className="chat-page">
    <aside className={`chat-sidebar ${drawerOpen ? 'open' : ''}`}>
      <header><strong>本机历史对话</strong><button type="button" onClick={() => setDrawerOpen(false)} className="chat-mobile-close"><X size={18} /></button></header>
      <button className="button button-primary chat-new" type="button" onClick={newConversation}><Plus size={17} />新建对话</button>
      <div className="chat-list">{conversations.map((item) => <div className={item.id === activeId ? 'active' : ''} key={item.id}>
        <button type="button" className="chat-select" onClick={() => selectConversation(item.id)}><MessageSquareText size={16} /><span>{item.title}</span></button>
        <button type="button" aria-label="重命名" onClick={() => rename(item)}><Pencil size={14} /></button><button type="button" aria-label="删除" onClick={() => remove(item)}><Trash2 size={14} /></button>
      </div>)}</div>
    </aside>
    {drawerOpen && <button className="chat-overlay" aria-label="关闭对话列表" onClick={() => setDrawerOpen(false)} />}
    <section className="chat-main">
      <header className="chat-main-header"><button type="button" onClick={() => setDrawerOpen(true)}><Menu size={18} /></button><strong>{conversations.find((item) => item.id === activeId)?.title || '新对话'}</strong></header>
      <div className="chat-messages" ref={messageListRef}>
        {loading ? <LoadingState text="正在读取本机记录..." /> : !messages.length ? <div className="chat-empty"><MessageSquareText size={34} /><h2>开始一个对话</h2><p>聊天记录只保存在当前浏览器，可在设置中导出备份。</p></div> : messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-avatar">{message.role === 'user' ? '你' : 'AI'}</div><div className="chat-bubble">{message.content && <p>{message.content}</p>}{message.attachments.length > 0 && <div className="chat-attachments">{message.attachments.map((item) => <img src={item.url} alt={item.filename} key={item.id} />)}</div>}</div>
        </article>)}{sending && <div className="chat-thinking">AI 正在回复...</div>}
      </div>
      <form className="chat-composer" onSubmit={send}>
        {error && <ErrorState message={error} />}
        {previews.length > 0 && <div className="chat-upload-previews">{previews.map(({ file, url }, index) => <div key={`${file.name}-${index}`}><img src={url} alt={file.name} /><button type="button" onClick={() => setFiles((items) => items.filter((_, i) => i !== index))}><X size={13} /></button></div>)}</div>}
        <div><label className="chat-upload"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} /><ImagePlus size={20} /></label><textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入消息，或上传图片..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="chat-send" type="submit" disabled={sending || (!input.trim() && !files.length)}><Send size={19} /></button></div>
        <small>记录保存在当前浏览器；清理浏览器数据前请先导出备份</small>
      </form>
    </section>
  </div>;
}
