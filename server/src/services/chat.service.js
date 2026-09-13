const pool = require('../config/database');

const conversationSelect = `
    SELECT c.MaCuocChat AS id, c.MaKH AS customer_id, c.MaSP AS product_id, c.MaDH AS order_id,
           c.ChuDe AS subject, c.TrangThai AS status, c.TinNhanCuoi AS last_message_at,
           c.NgayTao AS created_at, c.NgayCapNhat AS updated_at,
           kh.HoTen AS customer_name, kh.Email AS customer_email, tk.MaTK AS customer_account_id,
           sp.TenSP AS product_title
    FROM ChatConversation c
    JOIN KhachHang kh ON kh.MaKH = c.MaKH
    LEFT JOIN TaiKhoan tk ON tk.MaTK = kh.MaTK
    LEFT JOIN SanPham sp ON sp.MaSP = c.MaSP`;

const conversationListSelect = `
    SELECT c.MaCuocChat AS id, c.MaKH AS customer_id, c.MaSP AS product_id, c.MaDH AS order_id,
           c.ChuDe AS subject, c.TrangThai AS status, c.TinNhanCuoi AS last_message_at,
           c.NgayTao AS created_at, c.NgayCapNhat AS updated_at,
           kh.HoTen AS customer_name, kh.Email AS customer_email, tk.MaTK AS customer_account_id,
           sp.TenSP AS product_title,
           (SELECT m.NoiDung FROM ChatMessage m WHERE m.MaCuocChat = c.MaCuocChat ORDER BY m.MaTinNhan DESC LIMIT 1) AS last_message`;

const conversationFrom = `
    FROM ChatConversation c
    JOIN KhachHang kh ON kh.MaKH = c.MaKH
    LEFT JOIN TaiKhoan tk ON tk.MaTK = kh.MaTK
    LEFT JOIN SanPham sp ON sp.MaSP = c.MaSP`;

const messageSelect = `
    SELECT m.MaTinNhan AS id, m.MaCuocChat AS conversation_id, m.MaTK AS sender_account_id,
           m.VaiTroNguoiGui AS sender_role, m.NoiDung AS content, m.DaDoc AS is_read,
           m.NgayTao AS created_at,
           COALESCE(nv.HoTen, kh.HoTen, tk.TenDangNhap, 'Nhân viên') AS sender_name
    FROM ChatMessage m
    JOIN TaiKhoan tk ON tk.MaTK = m.MaTK
    LEFT JOIN NhanVien nv ON nv.MaTK = m.MaTK
    LEFT JOIN KhachHang kh ON kh.MaTK = m.MaTK`;

const staffRoles = ['admin', 'nhanvien'];

const isStaff = (user) => Boolean(user && staffRoles.includes(user.role));

const getConversationById = async (id) => {
    const [rows] = await pool.query(`${conversationSelect} WHERE c.MaCuocChat = ?`, [id]);
    return rows[0] || null;
};

const canAccess = (conversation, user) => {
    if (!conversation || !user) return false;
    return isStaff(user) || (user.customerId && Number(conversation.customer_id) === Number(user.customerId));
};

const getOrCreateConversation = async (customerId, context = {}) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [existing] = await connection.query(
            `${conversationSelect} WHERE c.MaKH = ? AND c.TrangThai = 'mo' ORDER BY c.TinNhanCuoi DESC, c.MaCuocChat DESC LIMIT 1 FOR UPDATE`,
            [customerId]
        );

        let conversationId = existing[0]?.id;
        if (!conversationId) {
            const [result] = await connection.execute(
                'INSERT INTO ChatConversation (MaKH, MaSP, MaDH, ChuDe) VALUES (?, ?, ?, ?)',
                [customerId, context.productId || null, context.orderId || null, context.subject || null]
            );
            conversationId = result.insertId;
        }

        await connection.commit();
        return getConversationById(conversationId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const listCustomerConversations = async (customerId) => {
    const [rows] = await pool.query(`
        ${conversationListSelect},
        (SELECT COUNT(*) FROM ChatMessage m WHERE m.MaCuocChat = c.MaCuocChat AND m.DaDoc = FALSE AND m.VaiTroNguoiGui <> 'khachhang') AS unread_count
        ${conversationFrom}
        WHERE c.MaKH = ?
        ORDER BY COALESCE(c.TinNhanCuoi, c.NgayTao) DESC, c.MaCuocChat DESC`,
        [customerId]
    );
    return rows;
};

const listStaffConversations = async ({ status = 'all', limit = 100, offset = 0 } = {}) => {
    const params = [];
    let where = '';
    if (status !== 'all') {
        where = 'WHERE c.TrangThai = ?';
        params.push(status);
    }
    params.push(limit, offset);
    const [rows] = await pool.query(`
        ${conversationListSelect},
        (SELECT COUNT(*) FROM ChatMessage m WHERE m.MaCuocChat = c.MaCuocChat AND m.DaDoc = FALSE AND m.VaiTroNguoiGui = 'khachhang') AS unread_count
        ${conversationFrom}
        ${where}
        ORDER BY COALESCE(c.TinNhanCuoi, c.NgayTao) DESC, c.MaCuocChat DESC
        LIMIT ? OFFSET ?`,
        params
    );
    return rows;
};

const listMessages = async (conversationId, { limit = 50, before = null } = {}) => {
    const params = [conversationId];
    let beforeClause = '';
    if (before) {
        beforeClause = ' AND m.MaTinNhan < ?';
        params.push(before);
    }
    params.push(limit);
    const [rows] = await pool.query(
        `${messageSelect} WHERE m.MaCuocChat = ?${beforeClause} ORDER BY m.MaTinNhan DESC LIMIT ?`,
        params
    );
    return rows.reverse();
};

const saveMessage = async (conversationId, user, content) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [conversations] = await connection.execute(
            'SELECT MaCuocChat, TrangThai FROM ChatConversation WHERE MaCuocChat = ? FOR UPDATE',
            [conversationId]
        );
        const conversation = conversations[0];
        if (!conversation) {
            const error = new Error('Không tìm thấy cuộc chat');
            error.status = 404;
            throw error;
        }
        if (conversation.TrangThai === 'dong' && !isStaff(user)) {
            const error = new Error('Cuộc chat đã đóng');
            error.status = 409;
            throw error;
        }

        const [result] = await connection.execute(
            'INSERT INTO ChatMessage (MaCuocChat, MaTK, VaiTroNguoiGui, NoiDung) VALUES (?, ?, ?, ?)',
            [conversationId, user.id, user.role, content]
        );
        await connection.execute('UPDATE ChatConversation SET TinNhanCuoi = NOW() WHERE MaCuocChat = ?', [conversationId]);
        await connection.commit();

        const [messages] = await pool.query(`${messageSelect} WHERE m.MaTinNhan = ?`, [result.insertId]);
        return messages[0];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const markRead = async (conversationId, accountId) => {
    await pool.execute(
        'UPDATE ChatMessage SET DaDoc = TRUE WHERE MaCuocChat = ? AND MaTK <> ? AND DaDoc = FALSE',
        [conversationId, accountId]
    );
};

const updateStatus = async (conversationId, status) => {
    const [result] = await pool.execute('UPDATE ChatConversation SET TrangThai = ? WHERE MaCuocChat = ?', [status, conversationId]);
    return result.affectedRows > 0;
};

module.exports = {
    canAccess,
    getConversationById,
    getOrCreateConversation,
    listCustomerConversations,
    listStaffConversations,
    listMessages,
    saveMessage,
    markRead,
    updateStatus,
    isStaff
};
