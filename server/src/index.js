require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const pool = require('./config/database');
const { registerRealtime } = require('./services/realtime.service');
const errorMiddleware = require('./middleware/error.middleware');
const { startJobs } = require('./jobs');
const { SHIPPING_FEE, PAYOS_TIMEOUT_MINUTES, MAX_ORDER_NOTE } = require('./constants/order');

const app = express();
const httpServer = http.createServer(app);
// Số lớp proxy phía trước API: dev/docker-compose = 1 (Nginx); production = 2 (Caddy -> Nginx).
// Đặt đúng để req.ip là IP thật của người dùng (dùng cho giới hạn số lần đăng nhập/gửi OTP).
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed'));
    },
    credentials: true
};
const io = new Server(httpServer, {
    path: '/socket.io',
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 100 * 1024
});
registerRealtime(io);
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
// Tìm bằng ảnh có thể gửi ảnh (base64) lên khi trình duyệt không tự chạy được mô hình: cho phép body lớn hơn.
app.use('/api/search/image', express.json({ limit: '6mb' }));
// Thẩm định đĩa cũ: khách gửi tối đa 4 ảnh × 2MB; mã base64 dài hơn ảnh gốc khoảng 1/3 nên cần ~11MB.
app.use('/api/tradein/items', express.json({ limit: '12mb' }));
// Gửi yêu cầu trả hàng kèm tối đa 4 ảnh bằng chứng (2MB mỗi ảnh).
app.post('/api/returns', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '100kb' }));
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, service: 'api', database: 'up' });
    } catch (error) {
        res.status(503).json({ success: false, service: 'api', database: 'down' });
    }
});

// Cấu hình công khai cho giao diện và MCP (để con số như phí ship chỉ nằm ở server).
app.get('/api/config', (req, res) => {
    res.json({ success: true, data: { shippingFee: SHIPPING_FEE, payosTimeoutMinutes: PAYOS_TIMEOUT_MINUTES, maxOrderNote: MAX_ORDER_NOTE } });
});

// Routes
const ROUTES = {
    auth: 'auth', products: 'product', orders: 'order', account: 'account', admin: 'admin', blogs: 'blog',
    discounts: 'discount', employees: 'employee', wishlist: 'wishlist', payos: 'payos', shipping: 'shipping',
    comments: 'comment', returns: 'return', chat: 'chat', search: 'search', assistant: 'assistant', tradein: 'tradein',
};
for (const [prefix, file] of Object.entries(ROUTES)) app.use(`/api/${prefix}`, require(`./routes/${file}.routes`));

// Error Handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Vọc Records API server running on port ${PORT}`);
    // Tải mô hình tìm kiếm và tính vector ở nền, không chặn việc nhận request.
    setTimeout(() => require('./services/ai/catalog-search').warmUp(), 1000).unref();
    startJobs();
});

const shutdown = async () => {
    io.close();
    httpServer.close(async () => {
        await pool.end();
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
