const jwt = require('jsonwebtoken');
const ChatService = require('./chat.service');

const conversationRoom = (id) => `chat:conversation:${id}`;
const accountRoom = (id) => `chat:account:${id}`;

const publishChatMessage = (io, conversation, message) => {
    if (!io || !conversation || !message) return;
    io.to(conversationRoom(conversation.id)).emit('chat:message', message);
    if (conversation.customer_account_id) {
        io.to(accountRoom(conversation.customer_account_id)).emit('chat:message', message);
    }
    if (message.sender_role === 'khachhang') {
        io.to('chat:staff').emit('chat:inbox-updated', { conversation_id: conversation.id, message });
    }
};

const registerRealtime = (io) => {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token || !process.env.JWT_SECRET) return next(new Error('Unauthorized'));
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (error) {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const user = socket.user;
        socket.join(accountRoom(user.id));
        if (ChatService.isStaff(user)) socket.join('chat:staff');

        socket.on('conversation:join', async (payload, ack = () => {}) => {
            try {
                const conversationId = Number(typeof payload === 'object' ? payload.conversationId : payload);
                if (!Number.isInteger(conversationId) || conversationId <= 0) return ack({ success: false, message: 'ID cuộc chat không hợp lệ' });
                const conversation = await ChatService.getConversationById(conversationId);
                if (!ChatService.canAccess(conversation, user)) return ack({ success: false, message: 'Không có quyền truy cập' });
                socket.join(conversationRoom(conversationId));
                ack({ success: true, data: conversation });
            } catch (error) {
                ack({ success: false, message: 'Không thể mở cuộc chat' });
            }
        });

        socket.on('conversation:leave', (payload) => {
            const conversationId = Number(typeof payload === 'object' ? payload.conversationId : payload);
            if (Number.isInteger(conversationId)) socket.leave(conversationRoom(conversationId));
        });

        socket.on('chat:send', async (payload = {}, ack = () => {}) => {
            try {
                const conversationId = Number(payload.conversationId);
                const content = String(payload.content || '').trim();
                if (!Number.isInteger(conversationId) || conversationId <= 0 || !content || content.length > 2000) {
                    return ack({ success: false, message: 'Nội dung chat không hợp lệ' });
                }
                const conversation = await ChatService.getConversationById(conversationId);
                if (!ChatService.canAccess(conversation, user)) return ack({ success: false, message: 'Không có quyền truy cập' });
                const message = await ChatService.saveMessage(conversationId, user, content);
                publishChatMessage(io, conversation, message);
                ack({ success: true, data: message });
            } catch (error) {
                ack({ success: false, message: error.status ? error.message : 'Không thể gửi tin nhắn' });
            }
        });

        socket.on('conversation:read', async (payload, ack = () => {}) => {
            try {
                const conversationId = Number(typeof payload === 'object' ? payload.conversationId : payload);
                const conversation = await ChatService.getConversationById(conversationId);
                if (!ChatService.canAccess(conversation, user)) return ack({ success: false, message: 'Không có quyền truy cập' });
                await ChatService.markRead(conversationId, user.id);
                ack({ success: true });
            } catch (error) {
                ack({ success: false, message: 'Không thể cập nhật đã đọc' });
            }
        });
    });
};

module.exports = { registerRealtime, publishChatMessage };
