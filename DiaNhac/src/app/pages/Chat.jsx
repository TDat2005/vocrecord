import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { ChatThread } from '../components/ChatThread';
import { Badge, EmptyState } from '../components/ui';
import { useChatRoom } from '../hooks/useChatRoom';
import { api } from '../utils/api';
import { isStaff, useCurrentUser } from '../utils/auth';
import '../../styles/pages/chat.css';

export function Chat() {
  const user = useCurrentUser();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { messages, connected, send } = useChatRoom(conversation?.id);
  // Tài khoản nhân viên cũng có hồ sơ khách hàng; API /chat/conversations trả về MỌI cuộc chat cho nhân viên,
  // nên nếu cho mở ở đây sẽ lấy nhầm cuộc chat của khách khác.
  const customerId = isStaff(user) ? null : user?.customer_id;

  // Mở cuộc chat đang mở của khách, chưa có thì tạo mới.
  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await api.get('/chat/conversations');
        let current = (list.data || []).find((item) => item.status === 'mo');
        if (!current) {
          const created = await api.post('/chat/conversations', { subject: 'Tư vấn chung' });
          if (!created.success) throw new Error(created.message || 'Không thể mở cuộc chat');
          current = created.data;
        }
        if (!cancelled) setConversation(current);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không thể mở cuộc chat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (!user) {
    return (
      <div className="page">
        <EmptyState
          icon={MessageCircle}
          title="Chat với Vọc Records"
          action={<Link to="/login" state={{ returnUrl: '/chat' }} className="btn btn--primary">Đăng nhập để chat</Link>}
        >
          Đăng nhập để hỏi về sản phẩm, đơn hàng hoặc đổi trả.
        </EmptyState>
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="page">
        <EmptyState icon={MessageCircle} title="Bạn đang đăng nhập bằng tài khoản nhân viên" action={<Link to="/admin?tab=chat" className="btn btn--primary">Mở chat quản trị</Link>}>
          Nhân viên trả lời khách hàng trong trang quản trị.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page page--subtle">
      <div className="container chat-page">
        <div className="page-header">
          <h1 className="page-title">Chat với Vọc Records</h1>
          <p className="page-subtitle">Hỏi nhanh về tình trạng đĩa, thiết bị, giao hàng hoặc đổi trả.</p>
        </div>

        <section className="card card--flush chat-panel">
          <div className="chat-panel__header">
            <div>
              <p className="font-semibold">{conversation?.subject || 'Tư vấn với Vọc Records'}</p>
              <p className="text-sm text-muted">Nhân viên sẽ phản hồi trong giờ làm việc.</p>
            </div>
            <Badge tone={connected ? 'success' : 'neutral'}>{connected ? 'Trực tuyến' : 'Ngoại tuyến'}</Badge>
          </div>
          {loading ? (
            <p className="chat-empty">Đang mở cuộc chat...</p>
          ) : error ? (
            <p className="chat-empty">{error}</p>
          ) : (
            <ChatThread
              messages={messages}
              ownRole="khachhang"
              onSend={send}
              disabled={!conversation || conversation.status === 'dong'}
              emptyText="Chào bạn! Hãy để lại câu hỏi, Vọc Records sẽ tư vấn ngay khi có thể."
              placeholder="Viết câu hỏi của bạn..."
              authorLabel={(message) => (message.sender_role === 'khachhang' ? 'Bạn' : message.sender_name || 'Vọc Records')}
            />
          )}
        </section>
      </div>
    </div>
  );
}
