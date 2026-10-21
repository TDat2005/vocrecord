import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import { getCommentStatus } from '../../utils/status';
import { StatusBadge } from '../ui';
import { PageHeader } from './PageHeader';

export function Comments() {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [drafts, setDrafts] = useState({});

  const load = useCallback(() => {
    api.get('/comments/manage').then((data) => { if (data.success) setComments(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const run = async (request, successMessage) => {
    try {
      const data = await request();
      if (data.success) {
        toast.success(successMessage);
        load();
        return true;
      }
      toast.error(data.message || 'Thao tác thất bại');
    } catch {
      toast.error(NETWORK_ERROR);
    }
    return false;
  };

  const reply = async (comment) => {
    const content = (drafts[comment.id] || '').trim();
    if (!content) return;
    const ok = await run(() => api.post(`/comments/${comment.id}/reply`, { content }), 'Đã gửi phản hồi');
    if (ok) setDrafts((current) => ({ ...current, [comment.id]: '' }));
  };

  return (
    <>
      <PageHeader
        title="Hỏi đáp sản phẩm"
        subtitle="Câu hỏi chỉ hiển thị trên trang sản phẩm sau khi được duyệt."
        actions={<button type="button" className="btn btn--secondary" onClick={load}><RefreshCw size={16} /> Làm mới</button>}
      />
      <section className="card card--flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th>Người gửi</th><th>Nội dung</th><th>Trạng thái</th><th>Phản hồi</th><th /></tr></thead>
            <tbody>
              {comments.length === 0 && <tr><td colSpan={6} className="table__empty">Chưa có câu hỏi nào.</td></tr>}
              {comments.map((comment) => (
                <tr key={comment.id}>
                  <td className="font-medium">{comment.product_title}</td>
                  <td>
                    <div>{comment.author}</div>
                    <div className="text-xs text-muted">{formatDateTime(comment.created_at)}</div>
                  </td>
                  <td style={{ minWidth: '16rem' }} className="pre-wrap">{comment.content}</td>
                  <td><StatusBadge status={getCommentStatus(comment.status)} /></td>
                  <td>
                    {comment.parent_id ? (
                      <span className="text-muted text-xs">Phản hồi của cửa hàng</span>
                    ) : (
                      <form className="reply-cell" onSubmit={(event) => { event.preventDefault(); reply(comment); }}>
                        <input
                          className="input input--sm"
                          value={drafts[comment.id] || ''}
                          onChange={(e) => setDrafts((current) => ({ ...current, [comment.id]: e.target.value }))}
                          placeholder="Trả lời..."
                          aria-label="Nội dung trả lời"
                        />
                        <button type="submit" className="btn btn--primary btn--sm" disabled={!(drafts[comment.id] || '').trim()}>Gửi</button>
                      </form>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {comment.status !== 'daduyet' && (
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => run(() => api.put(`/comments/${comment.id}/status`, { status: 'daduyet' }), 'Đã duyệt')}>Duyệt</button>
                      )}
                      {comment.status !== 'an' && (
                        <button type="button" className="btn btn--plain btn--plain-critical text-xs" onClick={() => run(() => api.put(`/comments/${comment.id}/status`, { status: 'an' }), 'Đã ẩn')}>Ẩn</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
