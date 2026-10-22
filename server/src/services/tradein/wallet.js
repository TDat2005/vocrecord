// Ví tín dụng cửa hàng: số dư lưu ở KhachHang.SoDuTinDung, mọi biến động ghi vào GiaoDichTinDung.
// Luôn gọi trong transaction của nghiệp vụ gây ra biến động (thu mua, ký gửi, thanh toán, hủy đơn).

const toAmount = (value) => Math.round(Number(value) || 0);

// Cộng (amount > 0) hoặc trừ (amount < 0) ví. Trừ quá số dư thì báo lỗi 409.
async function addEntry(connection, { customerId, amount, type, requestId = null, contractId = null, orderId = null, note = null }) {
    const value = toAmount(amount);
    if (!value) return null;
    const [updated] = await connection.execute(
        'UPDATE KhachHang SET SoDuTinDung = SoDuTinDung + ? WHERE MaKH = ? AND SoDuTinDung + ? >= 0',
        [value, customerId, value]
    );
    if (!updated.affectedRows) {
        const error = new Error('Số dư ví tín dụng không đủ');
        error.status = 409;
        throw error;
    }
    const [[row]] = await connection.execute('SELECT SoDuTinDung FROM KhachHang WHERE MaKH = ?', [customerId]);
    await connection.execute(
        'INSERT INTO GiaoDichTinDung (MaKH, SoTien, SoDuSau, Loai, MaYC, MaHD, MaDH, GhiChu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [customerId, value, row.SoDuTinDung, type, requestId, contractId, orderId, note ? String(note).slice(0, 255) : null]
    );
    return Number(row.SoDuTinDung);
}

async function getBalance(connection, customerId, { forUpdate = false } = {}) {
    const [[row]] = await connection.execute(`SELECT SoDuTinDung FROM KhachHang WHERE MaKH = ?${forUpdate ? ' FOR UPDATE' : ''}`, [customerId]);
    return row ? Number(row.SoDuTinDung) : 0;
}

async function getHistory(connection, customerId, limit = 50) {
    const [rows] = await connection.query(
        `SELECT MaGD AS id, SoTien AS amount, SoDuSau AS balance_after, Loai AS type, MaYC AS request_id, MaHD AS contract_id,
                MaDH AS order_id, GhiChu AS note, NgayTao AS created_at
         FROM GiaoDichTinDung WHERE MaKH = ? ORDER BY MaGD DESC LIMIT ?`,
        [customerId, limit]
    );
    return rows.map((row) => ({ ...row, amount: Number(row.amount), balance_after: Number(row.balance_after) }));
}

module.exports = { addEntry, getBalance, getHistory };
