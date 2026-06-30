import { ImagePlus, Menu, MessageSquareText, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { postForm, requestJson } from '../api';
import { ErrorState, LoadingState } from '../components/Status';
import { compressChatImage } from '../imageCompression';
import type { ChatConversation, ChatMessage } from '../types';

export function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);
  useEffect(() => { void loadConversations(); }, []);

  async function loadConversations() {
    setLoading(true); setError('');
    try {
      const data = await requestJson<{ conversations: ChatConversation[] }>('/api/chats');
      setConversations(data.conversations);
      if (data.conversations[0]) await selectConversation(data.conversations[0].id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '无法读取对话。'); }
    finally { setLoading(false); }
  }

  async function selectConversation(id: string) {
    setActiveId(id); setDrawerOpen(false); setError('');
    try {
      const data = await requestJson<{ conversation: ChatConversation; messages: ChatMessage[] }>(`/api/chats/${id}`);
      setMessages(data.messages);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '无法读取对话。'); }
  }

  async function newConversation() {
    const data = await requestJson<{ conversation: ChatConversation }>('/api/chats', { method: 'POST', body: {} });
    setConversations((items) => [data.conversation, ...items]);
    setActiveId(data.conversation.id); setMessages([]); setDrawerOpen(false);
  }

  async function renameConversation(item: ChatConversation) {
    const title = window.prompt('修改对话名称', item.title)?.trim();
    if (!title || title === item.title) return;
    await requestJson(`/api/chats/${item.id}`, { method: 'PATCH', body: { title } });
    setConversations((items) => items.map((entry) => entry.id === item.id ? { ...entry, title } : entry));
  }

  async function removeConversation(item: ChatConversation) {
    if (!window.confirm(`删除“${item.title}”及其中的图片？`)) return;
    await requestJson(`/api/chats/${item.id}`, { method: 'DELETE' });
    const remaining = conversations.filter((entry) => entry.id !== item.id);
    setConversations(remaining);
    if (activeId === item.id) {
      if (remaining[0]) await selectConversation(remaining[0].id);
      else { setActiveId(''); setMessages([]); }
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((items) => [...items, ...Array.from(list)].slice(0, 4));
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if ((!input.trim() && !files.length) || sending) return;
    let conversationId = activeId;
    if (!conversationId) {
      const created = await requestJson<{ conversation: ChatConversation }>('/api/chats', { method: 'POST', body: {} });
      conversationId = created.conversation.id; setActiveId(conversationId); setConversations((items) => [created.conversation, ...items]);
    }
    const text = input.trim(); const currentFiles = files;
    setSending(true); setError(''); setInput(''); setFiles([]);
    const temporary: ChatMessage = { id: 'pending', role: 'user', content: text, status: 'pending', errorMessage: null, createdAt: new Date().toISOString(), attachments: currentFiles.map((file, index) => ({ id: `local-${index}`, filename: file.name, mimeType: file.type, byteSize: file.size, url: '' })) };
    setMessages((items) => [...items, temporary]);
    try {
      const compressedFiles = await Promise.all(currentFiles.map(compressChatImage));
      const form = new FormData(); form.append('content', text); compressedFiles.forEach((file) => form.append('images', file));
      const result = await postForm<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(`/api/chats/${conversationId}/messages`, form);
      setMessages((items) => [...items.filter((item) => item.id !== 'pending'), result.userMessage, result.assistantMessage]);
      const refreshed = await requestJson<{ conversations: ChatConversation[] }>('/api/chats'); setConversations(refreshed.conversations);
    } catch (caught) {
      setMessages((items) => items.filter((item) => item.id !== 'pending'));
      setInput(text); setFiles(currentFiles); setError(caught instanceof Error ? caught.message : '发送失败，请重试。');
    } finally { setSending(false); }
  }

  return <div className="chat-page">
    <aside className={`chat-sidebar ${drawerOpen ? 'open' : ''}`}>
      <header><strong>历史对话</strong><button type="button" onClick={() => setDrawerOpen(false)} className="chat-mobile-close"><X size={18} /></button></header>
      <button className="button button-primary chat-new" type="button" onClick={newConversation}><Plus size={17} />新建对话</button>
      <div className="chat-list">{conversations.map((item) => <div className={item.id === activeId ? 'active' : ''} key={item.id}>
        <button type="button" className="chat-select" onClick={() => selectConversation(item.id)}><MessageSquareText size={16} /><span>{item.title}</span></button>
        <button type="button" aria-label="重命名" onClick={() => renameConversation(item)}><Pencil size={14} /></button>
        <button type="button" aria-label="删除" onClick={() => removeConversation(item)}><Trash2 size={14} /></button>
      </div>)}</div>
    </aside>
    {drawerOpen && <button className="chat-overlay" aria-label="关闭对话列表" onClick={() => setDrawerOpen(false)} />}
    <section className="chat-main">
      <header className="chat-main-header"><button type="button" onClick={() => setDrawerOpen(true)}><Menu size={18} /></button><strong>{conversations.find((item) => item.id === activeId)?.title || '新对话'}</strong></header>
      <div className="chat-messages">
        {loading ? <LoadingState text="正在读取对话..." /> : !messages.length ? <div className="chat-empty"><MessageSquareText size={34} /><h2>开始一个对话</h2><p>可以连续提问，也可以上传图片让文字模型查看。</p></div> : messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-avatar">{message.role === 'user' ? '你' : 'AI'}</div><div className="chat-bubble">
            {message.content && <p>{message.content}</p>}
            {message.attachments.length > 0 && <div className="chat-attachments">{message.attachments.map((item) => item.url ? <img src={item.url} alt={item.filename} key={item.id} /> : <span key={item.id}>{item.filename}</span>)}</div>}
            {message.status === 'pending' && <small>正在发送...</small>}{message.status === 'error' && <small className="chat-error">{message.errorMessage}</small>}
          </div>
        </article>)}
        {sending && <div className="chat-thinking">AI 正在回复...</div>}
      </div>
      <form className="chat-composer" onSubmit={send}>
        {error && <ErrorState message={error} />}
        {previews.length > 0 && <div className="chat-upload-previews">{previews.map(({ file, url }, index) => <div key={`${file.name}-${index}`}><img src={url} alt={file.name} /><button type="button" onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={13} /></button></div>)}</div>}
        <div><label className="chat-upload"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} /><ImagePlus size={20} /></label><textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入消息，或上传图片..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="chat-send" type="submit" disabled={sending || (!input.trim() && !files.length)}><Send size={19} /></button></div>
        <small>每条消息最多4张图片，上传时会自动压缩</small>
      </form>
    </section>
  </div>;
}
