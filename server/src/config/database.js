const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'clonevocrecord',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    // CSDL lưu giờ UTC. Đọc/ghi luôn theo UTC, không theo múi giờ máy chạy Node:
    // production đặt TZ=Asia/Ho_Chi_Minh, trước đây mysql2 hiểu giờ trong CSDL là giờ Việt Nam nên lệch 7 tiếng.
    timezone: 'Z'
});

// Phiên MySQL cũng dùng UTC để NOW()/CURRENT_TIMESTAMP khớp với cách đọc ở trên, kể cả khi máy chủ MySQL đặt múi giờ khác.
pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
});

module.exports = pool;
