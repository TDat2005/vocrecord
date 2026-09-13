import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MessageCircle, Send, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../config/api';
import '../../styles/pages/chat.css';

type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_role: string;
  sender_name: string;
  content: string;
  created_at: string;
};

type Conversation = {
  id: number;
  status: 'mo' | 'dong';
  subject?: string;
  customer_name?: string;
};

const token = () => localStorage.getItem('token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
const socketUrl = () => import.meta.env.VITE_SOCKET_URL || window.location.origin;

const appendUnique = (items: ChatMessage[], message: ChatMessage) => (
  items.some((item) => Number(item.id) === Number(message.id)) ? items : [...items, message]
);

export function Chat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connection, setConnection] = useState<'connected' | 'offline'>('offline');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async (conversationId: number) => {
    const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages?limit=100`, { headers: authHeaders() });
    const data = await response.json();
    if (data.success) setMessages(data.data || []);
  };

  useEffect(() => {
    let cancelled = false;
    const loadConversation = async () => {
      if (!token()) { setLoading(false); return; }
      try {
        const listResponse = await fetch(`${API_BASE}/chat/conversations`, { headers: authHeaders() });
        const listData = await listResponse.json();
        let current = (listData.data || []).find((item: Conversation) => item.status === 'mo');
        if (!current) {
          const createResponse = await fetch(`${API_BASE}/chat/conversations`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ subject: 'Tư vấn chung' }) });
          const createData = await createResponse.json();
          if (!createData.success) throw new Error(createData.message || 'Không thể mở chat');
          current = createData.data;
        }
        if (!cancelled) {
          setConversation(current);
          await loadMessages(current.id);
          await fetch(`${API_BASE}/chat/conversations/${current.id}/read`, { method: 'PUT', headers: authHeaders() });
        }
      } catch (error) {
        if (!cancelled) console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadConversation();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!conversation || !token()) return undefined;
    const socket = io(socketUrl(), { path: '/socket.io', auth: { token: token() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnection('connected');
      socket.emit('conversation:join', { conversationId: conversation.id });
    });
    socket.on('disconnect', () => setConnection('offline'));
    socket.on('connect_error', () => setConnection('offline'));
    socket.on('chat:message', (message: ChatMessage) => {
      if (Number(message.conversation_id) === Number(conversation.id)) setMessages((current) => appendUnique(current, message));
    });
    return () => {
      socket.emit('conversation:leave', { conversationId: conversation.id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversation?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendByRest = async (content: string) => {
    if (!conversation) return false;
    const response = await fetch(`${API_BASE}/chat/conversations/${conversation.id}/messages`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ content }) });
    const data = await response.json();
    if (data.success && data.data) setMessages((current) => appendUnique(current, data.data));
    return Boolean(data.success);
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending || !conversation || content.length > 2000) return;
    setSending(true);
    setDraft('');
    let sent = false;
    const socket = socketRef.current;
    if (socket?.connected) {
      sent = await new Promise<boolean>((resolve) => {
        socket.timeout(5000).emit('chat:send', { conversationId: conversation.id, content }, (error: Error | null, response: any) => {
          if (!error && response?.success) {
            if (response.data) setMessages((current) => appendUnique(current, response.data));
            resolve(true);
          } else resolve(false);
        });
      });
    }
    if (!sent) sent = await sendByRest(content).catch(() => false);
    if (!sent) setDraft(content);
    setSending(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  };

  const user = localStorage.getItem('user');
  if (!user || !token()) {
    return <div className="page page--gray chat-page"><div className="container chat-login-state"><MessageCircle size={56} /><h1>CHAT VỚI VỌC RECORDS</h1><p>Đăng nhập để hỏi về sản phẩm, đơn hàng hoặc đổi trả.</p><Link to="/login" className="neo-btn neo-btn--primary">ĐĂNG NHẬP ĐỂ CHAT</Link></div></div>;
  }

  return (
    <div className="page page--gray chat-page">
      <div className="container">
        <div className="chat-page-heading"><div><p className="page-kicker">HỖ TRỢ KHÁCH HÀNG</p><h1 className="page-title">CHAT VỚI VỌC RECORDS</h1><p className="page-subtitle">Hỏi nhanh về tình trạng đĩa, thiết bị, giao hàng hoặc đổi trả.</p></div><MessageCircle size={52} /></div>
        <section className="chat-panel">
          <div className="chat-panel-header"><div><strong>{conversation?.subject || 'Tư vấn với Vọc Records'}</strong><span>Nhân viên sẽ phản hồi trong giờ làm việc.</span></div><span className={`chat-connection ${connection}`} title={connection === 'connected' ? 'Đang kết nối trực tiếp' : 'Đang dùng gửi dự phòng REST'}>{connection === 'connected' ? <><Wifi size={16} /> TRỰC TUYẾN</> : <><WifiOff size={16} /> GỬI DỰ PHÒNG</>}</span></div>
          <div className="chat-messages" aria-live="polite">
            {loading ? <div className="chat-empty">ĐANG MỞ CUỘC CHAT...</div> : messages.length === 0 ? <div className="chat-empty">Chào bạn! Hãy để lại câu hỏi, Vọc sẽ tư vấn ngay khi có thể.</div> : messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_role === 'khachhang' ? 'chat-bubble--customer' : 'chat-bubble--staff'}`}><div>{message.content}</div><small>{message.sender_role === 'khachhang' ? 'Bạn' : message.sender_name || 'Vọc Records'} · {new Date(message.created_at).toLocaleString('vi-VN')}</small></div>)}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-compose" onSubmit={sendMessage}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} maxLength={2000} rows={2} placeholder="Viết câu hỏi của bạn..." disabled={loading || conversation?.status === 'dong'} /><button type="submit" className="neo-btn neo-btn--primary" disabled={sending || !draft.trim() || conversation?.status === 'dong'}>{sending ? 'ĐANG GỬI...' : <><Send size={18} /> GỬI</>}</button></form>
        </section>
      </div>
    </div>
  );
}
