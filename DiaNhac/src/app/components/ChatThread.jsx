import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { formatDateTime } from '../utils/format';
import '../../styles/pages/chat.css';

// Khung tin nhắn + ô soạn tin, dùng cho cả trang Chat của khách và Chat trong trang quản trị.
// ownRole: vai trò của người đang xem ('khachhang' hoặc 'staff') để căn bong bóng sang phải.
export function ChatThread({ messages, ownRole, onSend, disabled, emptyText, placeholder, authorLabel }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const isOwn = (message) => (ownRole === 'khachhang'
    ? message.sender_role === 'khachhang'
    : message.sender_role !== 'khachhang');

  const handleSend = async (event) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending || content.length > 2000) return;
    setSending(true);
    setDraft('');
    const sent = await onSend(content);
    if (!sent) setDraft(content);
    setSending(false);
  };

  return (
    <>
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">{emptyText}</p>}
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${isOwn(message) ? 'chat-bubble--own' : ''}`}>
            <p className="pre-wrap">{message.content}</p>
            <span className="chat-bubble__meta">
              {authorLabel ? authorLabel(message) : message.sender_name} · {formatDateTime(message.created_at)}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-compose" onSubmit={handleSend}>
        <textarea
          className="textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          maxLength={2000}
          rows={2}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Nội dung tin nhắn"
        />
        <button type="submit" className="btn btn--primary" disabled={disabled || sending || !draft.trim()}>
          <Send size={16} /> {sending ? 'Đang gửi' : 'Gửi'}
        </button>
      </form>
    </>
  );
}
