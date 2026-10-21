import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../utils/api';
import { getToken } from '../utils/auth';

const socketUrl = () => import.meta.env.VITE_SOCKET_URL || window.location.origin;

const appendUnique = (items, message) => (
  items.some((item) => Number(item.id) === Number(message.id)) ? items : [...items, message]
);

// Kết nối một cuộc chat: tải lịch sử, nhận tin realtime qua Socket.IO,
// gửi tin qua socket và tự chuyển sang REST nếu socket mất kết nối.
export function useChatRoom(conversationId, { onInboxUpdated } = {}) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const inboxRef = useRef(onInboxUpdated);
  inboxRef.current = onInboxUpdated;

  useEffect(() => {
    setMessages([]);
    if (!conversationId) return undefined;
    let cancelled = false;

    api.get(`/chat/conversations/${conversationId}/messages?limit=100`)
      .then((data) => { if (!cancelled && data.success) setMessages(data.data || []); })
      .then(() => api.put(`/chat/conversations/${conversationId}/read`))
      .catch(() => {});

    const socket = io(socketUrl(), { path: '/socket.io', auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('conversation:join', { conversationId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('chat:message', (message) => {
      if (Number(message.conversation_id) === Number(conversationId)) setMessages((current) => appendUnique(current, message));
    });
    socket.on('chat:inbox-updated', () => inboxRef.current?.());

    return () => {
      cancelled = true;
      socket.emit('conversation:leave', { conversationId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [conversationId]);

  const send = useCallback(async (content) => {
    const socket = socketRef.current;
    let sent = false;
    if (socket?.connected) {
      sent = await new Promise((resolve) => {
        socket.timeout(5000).emit('chat:send', { conversationId, content }, (error, response) => {
          if (!error && response?.success) {
            if (response.data) setMessages((current) => appendUnique(current, response.data));
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    }
    if (!sent) {
      try {
        const data = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
        if (data.success && data.data) setMessages((current) => appendUnique(current, data.data));
        sent = Boolean(data.success);
      } catch {
        sent = false;
      }
    }
    return sent;
  }, [conversationId]);

  return { messages, connected, send };
}
