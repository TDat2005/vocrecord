import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../config/api';

type Conversation = { id: number; status: 'mo' | 'dong'; customer_name: string; product_title?: string; last_message?: string; unread_count?: number; };
type ChatMessage = { id: number; conversation_id: number; sender_role: string; sender_name: string; content: string; created_at: string; };
const token = () => localStorage.getItem('token') || '';
const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
const socketUrl = () => import.meta.env.VITE_SOCKET_URL || window.location.origin;
const addUnique = (items: ChatMessage[], message: ChatMessage) => items.some((item) => Number(item.id) === Number(message.id)) ? items : [...items, message];

export function AdminChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const loadConversations = async () => {
    const response = await fetch(`${API_BASE}/chat/manage/conversations?status=all&limit=100`, { headers: headers() });
    const data = await response.json();
    if (data.success) setConversations(data.data || []);
  };
  const loadMessages = async (conversation: Conversation) => {
    const response = await fetch(`${API_BASE}/chat/conversations/${conversation.id}/messages?limit=100`, { headers: headers() });
    const data = await response.json();
    if (data.success) setMessages(data.data || []);
    await fetch(`${API_BASE}/chat/conversations/${conversation.id}/read`, { method: 'PUT', headers: headers() });
  };

  useEffect(() => { loadConversations().catch(console.error); const timer = window.setInterval(() => loadConversations().catch(console.error), 30000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    if (!selected) return undefined;
    loadMessages(selected).catch(console.error);
    const socket = io(socketUrl(), { path: '/socket.io', auth: { token: token() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('conversation:join', { conversationId: selected.id }); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('chat:message', (message: ChatMessage) => { if (Number(message.conversation_id) === Number(selected.id)) setMessages((current) => addUnique(current, message)); });
    socket.on('chat:inbox-updated', () => loadConversations().catch(console.error));
    return () => { socket.emit('conversation:leave', { conversationId: selected.id }); socket.disconnect(); socketRef.current = null; };
  }, [selected?.id]);

  const sendRest = async (content: string) => {
    if (!selected) return false;
    const response = await fetch(`${API_BASE}/chat/conversations/${selected.id}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify({ content }) });
    const data = await response.json();
    if (data.success && data.data) setMessages((current) => addUnique(current, data.data));
    return Boolean(data.success);
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!selected || !content) return;
    setDraft('');
    let sent = false;
    if (socketRef.current?.connected) {
      sent = await new Promise<boolean>((resolve) => socketRef.current!.timeout(5000).emit('chat:send', { conversationId: selected.id, content }, (error: Error | null, response: any) => { if (!error && response?.success) { if (response.data) setMessages((current) => addUnique(current, response.data)); resolve(true); } else resolve(false); }));
    }
    if (!sent) sent = await sendRest(content).catch(() => false);
    if (!sent) setDraft(content);
  };
  const closeOrOpen = async () => {
    if (!selected) return;
    const status = selected.status === 'mo' ? 'dong' : 'mo';
    const response = await fetch(`${API_BASE}/chat/manage/conversations/${selected.id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) });
    const data = await response.json();
    if (data.success) { const updated = { ...selected, status }; setSelected(updated); setConversations((items) => items.map((item) => item.id === updated.id ? updated : item)); }
  };

  return <div className="admin-chat-layout"><aside className="admin-chat-list"><div className="flex-between"><h3>CUỘC CHAT</h3><span>{connected ? <Wifi size={17} /> : <WifiOff size={17} />}</span></div>{conversations.length === 0 ? <p>Chưa có cuộc chat.</p> : conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelected(conversation)} className={`admin-chat-conversation ${selected?.id === conversation.id ? 'active' : ''}`}><strong>{conversation.customer_name || 'Khách hàng'}</strong><small>{conversation.product_title || 'Tư vấn chung'}</small><span>{conversation.last_message || 'Chưa có tin nhắn'} {Number(conversation.unread_count) > 0 && <b>{conversation.unread_count}</b>}</span></button>)}</aside><section className="admin-chat-room">{selected ? <><div className="admin-chat-room-header"><div><h3>{selected.customer_name}</h3><small>{selected.product_title || 'Tư vấn chung'}</small></div><button onClick={closeOrOpen} className="neo-btn neo-btn--secondary neo-btn--sm">{selected.status === 'mo' ? 'ĐÓNG CHAT' : 'MỞ LẠI'}</button></div><div className="admin-chat-messages">{messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_role === 'khachhang' ? 'chat-bubble--customer' : 'chat-bubble--staff'}`}><div>{message.content}</div><small>{message.sender_name} · {new Date(message.created_at).toLocaleString('vi-VN')}</small></div>)}</div><form className="chat-compose" onSubmit={send}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Trả lời khách hàng..." /><button className="neo-btn neo-btn--primary" type="submit"><Send size={18} /> GỬI</button></form></> : <div className="chat-empty">Chọn một cuộc chat để xem và trả lời.</div>}</section></div>;
}
