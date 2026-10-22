import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { API_BASE } from '../config/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, NETWORK_ERROR } from '../utils/api';
import { getToken } from '../utils/auth';
import { formatPrice } from '../utils/format';
import { SafeImage } from './SafeImage';
import '../../styles/components/assistant.css';

const STORAGE_KEY = 'voc_assistant_chat';
const SUGGESTIONS = [
  'Nhạc buồn nghe lúc mưa, dưới 800k',
  'Gợi ý mâm đĩa cho người mới bắt đầu',
  'Quà tặng cho bạn thích jazz',
  'Mã WELCOME10 dùng được không?',
];

let lastId = 0;
const newId = () => `${Date.now()}-${++lastId}`;

// Lịch sử chat giữ theo tab (sessionStorage): tải lại trang không mất, đóng tab thì xóa.
function loadChat() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Đọc Server-Sent Events từ fetch (EventSource chỉ hỗ trợ GET, còn chat cần POST lịch sử hội thoại).
async function* readEvents(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = chunk.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
      if (!data) continue; // dòng ": ping" giữ kết nối
      try {
        yield JSON.parse(data);
      } catch {
        // bỏ qua sự kiện hỏng
      }
    }
  }
}

function mergeProducts(current = [], incoming = []) {
  const byId = new Map(current.map((p) => [p.id, p]));
  for (const product of incoming) byId.set(product.id, product);
  return [...byId.values()].slice(0, 12);
}

// Hiển thị chữ của trợ lý: xuống dòng, gạch đầu dòng và **đậm** — không chèn HTML.
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>
  ));
}

function FormattedText({ text }) {
  const blocks = [];
  for (const line of text.split('\n')) {
    const bullet = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last && last.type === 'list') last.items.push(bullet[1]);
      else blocks.push({ type: 'list', items: [bullet[1]] });
    } else if (line.trim()) {
      blocks.push({ type: 'p', text: line });
    }
  }
  return blocks.map((block, i) => (block.type === 'list'
    ? <ul key={i}>{block.items.map((item, j) => <li key={j}><Inline text={item} /></li>)}</ul>
    : <p key={i}><Inline text={block.text} /></p>));
}

function ProductStrip({ products, onAdd, onNavigate }) {
  return (
    <div className="assistant-products thin-scrollbar">
      {products.map((product) => {
        const soldOut = Number(product.stock) <= 0;
        return (
          <div key={product.id} className="assistant-product">
            <Link to={`/product/${product.id}`} className="assistant-product__media" onClick={onNavigate}>
              <SafeImage src={product.image} alt={product.title} />
            </Link>
            <Link to={`/product/${product.id}`} className="assistant-product__title line-clamp-2" onClick={onNavigate}>{product.title}</Link>
            <span className="assistant-product__price">{formatPrice(product.price)}</span>
            <button type="button" className="btn btn--secondary btn--sm btn--full" disabled={soldOut} onClick={() => onAdd(product)}>
              {soldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(null); // null: chưa biết server đã bật AI chưa
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const { addToCart } = useCart();
  const toast = useToast();

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.status).slice(-30)));
    } catch {
      // trình duyệt chặn lưu trữ: chat vẫn dùng được trong phiên
    }
  }, [messages]);

  useEffect(() => {
    if (!open || enabled !== null) return;
    api.get('/assistant/status')
      .then((data) => setEnabled(Boolean(data.success && data.data.enabled)))
      .catch(() => setEnabled(false));
  }, [open, enabled]);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Chỉ sửa tin trả lời đang chạy; đã bấm "Cuộc trò chuyện mới" thì bỏ qua sự kiện còn sót.
  const updateLast = (change) => setMessages((current) => {
    if (current.length === 0 || current[current.length - 1].role !== 'assistant') return current;
    const copy = [...current];
    copy[copy.length - 1] = change(copy[copy.length - 1]);
    return copy;
  });

  const addProduct = (product, quantity = 1) => {
    addToCart(product, quantity);
    toast.success(`Đã thêm ${quantity > 1 ? `${quantity} × ` : ''}"${product.title}" vào giỏ hàng`);
  };

  // Không dùng được mô hình AI (server chưa có API key, hết lượt miễn phí, mất mạng):
  // vẫn trả lời bằng tìm kiếm thông minh (không cần LLM).
  const answerWithSearch = async (text, reason = 'Trợ lý trò chuyện AI chưa được bật ở cửa hàng này') => {
    const data = await api.get(`/search?q=${encodeURIComponent(text)}&limit=6`);
    const results = data.success ? data.data.results : [];
    updateLast((m) => ({
      ...m,
      status: null,
      error: false,
      content: results.length
        ? `${reason}, nhưng mình đã tìm được các sản phẩm phù hợp:`
        : `${reason}, và mình chưa tìm thấy sản phẩm khớp. Bạn thử mô tả khác nhé.`,
      products: results,
    }));
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...messages.filter((m) => m.content && !m.error), { role: 'user', content }]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content, products: m.products?.map((p) => ({ id: p.id, title: p.title })) }));
    setMessages((current) => [
      ...current,
      { id: newId(), role: 'user', content },
      { id: newId(), role: 'assistant', content: '', products: [], status: 'Đang suy nghĩ...' },
    ]);
    setInput('');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (enabled === false) {
        await answerWithSearch(content);
        return;
      }
      const token = getToken();
      const response = await fetch(`${API_BASE}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!response.ok || !String(response.headers.get('content-type')).includes('text/event-stream')) {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'AI_NOT_CONFIGURED') {
          setEnabled(false);
          await answerWithSearch(content);
          return;
        }
        updateLast((m) => ({ ...m, status: null, error: true, content: data.message || 'Trợ lý đang bận, bạn thử lại sau nhé.' }));
        return;
      }
      for await (const event of readEvents(response)) {
        if (event.type === 'text') {
          updateLast((m) => ({ ...m, status: null, content: m.content + event.text }));
        } else if (event.type === 'tool') {
          updateLast((m) => ({ ...m, status: `${event.label}...` }));
        } else if (event.type === 'products') {
          updateLast((m) => ({ ...m, products: mergeProducts(m.products, event.items) }));
        } else if (event.type === 'cart_add') {
          addProduct(event.product, event.quantity);
        } else if (event.type === 'error' && event.fallback) {
          await answerWithSearch(content, event.message.replace(/\.$/, ''));
        } else if (event.type === 'error') {
          updateLast((m) => ({ ...m, status: null, error: !m.content, content: m.content ? `${m.content}\n\n${event.message}` : event.message }));
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        updateLast((m) => ({ ...m, status: null, error: !m.content, content: m.content || NETWORK_ERROR }));
      }
    } finally {
      updateLast((m) => ({ ...m, status: null }));
      setBusy(false);
      abortRef.current = null;
    }
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
  };

  return (
    <>
      {!open && (
        <button type="button" className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Mở trợ lý mua sắm AI">
          <Sparkles size={20} />
          <span>Trợ lý AI</span>
        </button>
      )}

      {open && (
        <section className="assistant-panel" role="dialog" aria-label="Trợ lý mua sắm AI">
          <header className="assistant-panel__header">
            <div>
              <h2 className="assistant-panel__title"><Sparkles size={18} /> Trợ lý mua sắm</h2>
              <p className="assistant-panel__subtitle">
                {enabled === false ? 'Chế độ tìm kiếm thông minh (AI chat chưa bật)' : 'Hỏi bằng lời của bạn, mình tìm đĩa giúp'}
              </p>
            </div>
            <div className="assistant-panel__actions">
              {messages.length > 0 && (
                <button type="button" className="icon-button icon-button--sm" onClick={resetChat} title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới">
                  <RotateCcw size={16} />
                </button>
              )}
              <button type="button" className="icon-button icon-button--sm" onClick={() => setOpen(false)} aria-label="Đóng trợ lý">
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="assistant-panel__messages thin-scrollbar" ref={listRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="assistant-welcome">
                <p>Chào bạn! Mình là trợ lý của Vọc Records. Hãy tả nhạc bạn muốn nghe, ngân sách, hay hỏi về đơn hàng.</p>
                <div className="assistant-welcome__suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion} type="button" className="chip" onClick={() => send(suggestion)}>{suggestion}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`assistant-msg assistant-msg--${m.role} ${m.error ? 'assistant-msg--error' : ''}`}>
                {m.content && <div className="assistant-msg__bubble"><FormattedText text={m.content} /></div>}
                {m.status && <div className="assistant-msg__status"><span className="assistant-dots" aria-hidden="true" />{m.status}</div>}
                {m.products?.length > 0 && <ProductStrip products={m.products} onAdd={addProduct} onNavigate={() => setOpen(false)} />}
              </div>
            ))}
          </div>

          <form className="assistant-panel__composer" onSubmit={(event) => { event.preventDefault(); send(input); }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Nhập câu hỏi..."
              aria-label="Tin nhắn cho trợ lý"
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !input.trim()} aria-label="Gửi">
              <Send size={18} />
            </button>
          </form>
          <p className="assistant-panel__disclaimer">AI có thể nhầm, giá và tồn kho chính xác nằm ở trang sản phẩm và giỏ hàng.</p>
        </section>
      )}
    </>
  );
}
