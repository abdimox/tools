import type { ChatConversation, ChatMessage } from './types';

interface ChatState {
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>;
}

const DB_NAME = 'loho-xhs-static';
const STORE_NAME = 'state';
const STATE_KEY = 'chat-state-v1';
const emptyState = (): ChatState => ({ conversations: [], messages: {} });

function openDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readState(): Promise<ChatState> {
  const db = await openDatabase();
  return new Promise<ChatState>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result || emptyState());
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

async function writeState(state: ChatState): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

export async function listConversations(): Promise<ChatConversation[]> {
  return (await readState()).conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createConversation(title = '新对话'): Promise<ChatConversation> {
  const state = await readState();
  const now = new Date().toISOString();
  const conversation = { id: crypto.randomUUID(), title, createdAt: now, updatedAt: now };
  state.conversations.unshift(conversation);
  state.messages[conversation.id] = [];
  await writeState(state);
  return conversation;
}

export async function getMessages(id: string): Promise<ChatMessage[]> {
  return (await readState()).messages[id] || [];
}

export async function saveMessages(id: string, messages: ChatMessage[], title?: string): Promise<void> {
  const state = await readState();
  const now = new Date().toISOString();
  state.messages[id] = messages;
  state.conversations = state.conversations.map((item) => item.id === id
    ? { ...item, title: title || item.title, updatedAt: now }
    : item);
  await writeState(state);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const state = await readState();
  state.conversations = state.conversations.map((item) => item.id === id ? { ...item, title } : item);
  await writeState(state);
}

export async function deleteConversation(id: string): Promise<void> {
  const state = await readState();
  state.conversations = state.conversations.filter((item) => item.id !== id);
  delete state.messages[id];
  await writeState(state);
}

export async function exportChatHistory(): Promise<Blob> {
  return new Blob([JSON.stringify(await readState(), null, 2)], { type: 'application/json' });
}

export async function importChatHistory(file: File): Promise<void> {
  const parsed = JSON.parse(await file.text()) as ChatState;
  if (!Array.isArray(parsed.conversations) || !parsed.messages || typeof parsed.messages !== 'object') {
    throw new Error('备份文件格式不正确。');
  }
  await writeState(parsed);
}
