import { useCallback, useEffect, useState } from 'react';
import { ChatThread } from '../ChatThread';
import { Badge } from '../ui';
import { useToast } from '../../context/ToastContext';
import { useChatRoom } from '../../hooks/useChatRoom';
import { api, NETWORK_ERROR } from '../../utils/api';
import { PageHeader } from './PageHeader';

export function AdminChat() {
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadConversations = useCallback(() => {
    api.get('/chat/manage/conversations?status=all&limit=100')
      .then((data) => { if (data.success) setConversations(data.data || []); })
      .catch(() => {});
  }, []);

  const { messages, connected, send } = useChatRoom(selected?.id, { onInboxUpdated: loadConversations });

  useEffect(() => {
    loadConversations();
    const timer = window.setInterval(loadConversations, 30000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  const toggleStatus = async () => {
    const status = selected.status === 'mo' ? 'dong' : 'mo';
    try {
      const data = await api.put(`/chat/manage/conversations/${selected.id}/status`, { status });
      if (data.success) {
        const updated = { ...selected, status };
        setSelected(updated);
        setConversations((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        toast.error(data.message || 'Không thể cập nhật cuộc chat');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  return (
    <>
      <PageHeader title="Chat khách hàng" subtitle="Trả lời câu hỏi của khách theo thời gian thực." />
      <section className="card card--flush admin-chat">
        <aside className="admin-chat__list">
          <div className="admin-chat__list-header">
            <span>Cuộc chat ({conversations.length})</span>
            <Badge tone={connected ? 'success' : 'neutral'}>{connected ? 'Trực tuyến' : selected ? 'Ngoại tuyến' : '—'}</Badge>
          </div>
          {conversations.length === 0 && <p className="chat-empty">Chưa có cuộc chat.</p>}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelected(conversation)}
              className={`admin-chat__item ${selected?.id === conversation.id ? 'admin-chat__item--active' : ''}`}
            >
              <span className="admin-chat__item-top">
                <strong>{conversation.customer_name || 'Khách hàng'}</strong>
                {Number(conversation.unread_count) > 0 && <span className="admin-chat__unread">{conversation.unread_count}</span>}
              </span>
              <span className="text-xs text-muted">{conversation.product_title || 'Tư vấn chung'}{conversation.status === 'dong' ? ' · Đã đóng' : ''}</span>
              <span className="text-xs text-muted line-clamp-1">{conversation.last_message || 'Chưa có tin nhắn'}</span>
            </button>
          ))}
        </aside>

        <div className="admin-chat__room">
          {selected ? (
            <>
              <div className="chat-panel__header">
                <div>
                  <p className="font-semibold">{selected.customer_name}</p>
                  <p className="text-xs text-muted">{selected.product_title || 'Tư vấn chung'}</p>
                </div>
                <button type="button" className="btn btn--secondary btn--sm" onClick={toggleStatus}>
                  {selected.status === 'mo' ? 'Đóng cuộc chat' : 'Mở lại'}
                </button>
              </div>
              <ChatThread
                messages={messages}
                ownRole="staff"
                onSend={send}
                emptyText="Chưa có tin nhắn."
                placeholder="Trả lời khách hàng..."
              />
            </>
          ) : (
            <p className="chat-empty">Chọn một cuộc chat để xem và trả lời.</p>
          )}
        </div>
      </section>
    </>
  );
}
