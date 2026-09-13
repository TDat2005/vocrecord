const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ChatService = require('../services/chat.service');
const { publishChatMessage } = require('../services/realtime.service');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const staff = [authenticate, requireRole('admin', 'nhanvien')];
const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const getConversationForUser = async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        res.status(400).json({ success: false, message: 'ID cuộc chat không hợp lệ' });
        return null;
    }
    const conversation = await ChatService.getConversationById(id);
    if (!ChatService.canAccess(conversation, req.user)) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập cuộc chat này' });
        return null;
    }
    return conversation;
};

router.get('/conversations', authenticate, async (req, res, next) => {
    try {
        if (ChatService.isStaff(req.user)) {
            return res.json({ success: true, data: await ChatService.listStaffConversations({ limit: 100, offset: 0 }) });
        }
        if (!req.user.customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });
        return res.json({ success: true, data: await ChatService.listCustomerConversations(req.user.customerId) });
    } catch (error) { next(error); }
});

router.post('/conversations', authenticate, async (req, res, next) => {
    try {
        if (!req.user.customerId) return res.status(403).json({ success: false, message: 'Chỉ khách hàng mới có thể mở chat' });
        const productId = req.body.product_id ? parseId(req.body.product_id) : null;
        const orderId = req.body.order_id ? parseId(req.body.order_id) : null;
        if (req.body.product_id && !productId) return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ' });
        if (req.body.order_id && !orderId) return res.status(400).json({ success: false, message: 'Đơn hàng không hợp lệ' });

        if (productId) {
            const [products] = await pool.query('SELECT MaSP FROM SanPham WHERE MaSP = ?', [productId]);
            if (!products.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        if (orderId) {
            const [orders] = await pool.query('SELECT MaDH FROM DonHang WHERE MaDH = ? AND MaKH = ?', [orderId, req.user.customerId]);
            if (!orders.length) return res.status(404).json({ success: false, message: 'Đơn hàng không thuộc tài khoản của bạn' });
        }

        const conversation = await ChatService.getOrCreateConversation(req.user.customerId, {
            productId,
            orderId,
            subject: String(req.body.subject || '').trim().slice(0, 200) || null
        });
        res.status(201).json({ success: true, data: conversation });
    } catch (error) { next(error); }
});

router.get('/conversations/:id/messages', authenticate, async (req, res, next) => {
    try {
        const conversation = await getConversationForUser(req, res);
        if (!conversation) return;
        const limitValue = Number.parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 50;
        const before = req.query.before ? parseId(req.query.before) : null;
        res.json({ success: true, data: await ChatService.listMessages(conversation.id, { limit, before }) });
    } catch (error) { next(error); }
});

router.post('/conversations/:id/messages', authenticate, async (req, res, next) => {
    try {
        const conversation = await getConversationForUser(req, res);
        if (!conversation) return;
        const content = String(req.body.content || '').trim();
        if (!content || content.length > 2000) return res.status(400).json({ success: false, message: 'Tin nhắn phải từ 1 đến 2000 ký tự' });
        const message = await ChatService.saveMessage(conversation.id, req.user, content);
        publishChatMessage(req.app.get('io'), conversation, message);
        res.status(201).json({ success: true, data: message });
    } catch (error) { next(error); }
});

router.put('/conversations/:id/read', authenticate, async (req, res, next) => {
    try {
        const conversation = await getConversationForUser(req, res);
        if (!conversation) return;
        await ChatService.markRead(conversation.id, req.user.id);
        res.json({ success: true });
    } catch (error) { next(error); }
});

router.get('/manage/conversations', ...staff, async (req, res, next) => {
    try {
        const status = ['all', 'mo', 'dong'].includes(req.query.status) ? req.query.status : 'all';
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
        res.json({ success: true, data: await ChatService.listStaffConversations({ status, limit, offset: (page - 1) * limit }) });
    } catch (error) { next(error); }
});

router.put('/manage/conversations/:id/status', ...staff, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        const status = String(req.body.status || '');
        if (!id || !['mo', 'dong'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        const updated = await ChatService.updateStatus(id, status);
        res.json({ success: updated, message: updated ? 'Đã cập nhật cuộc chat' : 'Không tìm thấy cuộc chat' });
    } catch (error) { next(error); }
});

module.exports = router;
