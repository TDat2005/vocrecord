const pool = require('../config/database');

// Chạy work(connection) trong một transaction: lỗi thì rollback, luôn trả kết nối về pool.
async function withTransaction(work) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback().catch((rollbackError) => console.error('Rollback error:', rollbackError.message));
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { withTransaction };
