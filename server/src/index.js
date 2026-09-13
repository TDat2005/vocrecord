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
const fs = require('fs');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);
app.set('trust proxy', 1);
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

// Helper to safely load route if exists
const loadRoute = (routePath, routerName) => {
    const fullPath = path.join(__dirname, 'routes', `${routerName}.routes.js`);
    if (fs.existsSync(fullPath)) {
        app.use(routePath, require(`./routes/${routerName}.routes`));
    } else {
        // Fallback for missing routes
        const router = express.Router();
        router.all('*', (req, res) => res.status(501).json({ success: false, error: 'Not Implemented Yet' }));
        app.use(routePath, router);
    }
};

// Routes
loadRoute('/api/auth', 'auth');
loadRoute('/api/products', 'product');
loadRoute('/api/orders', 'order');
loadRoute('/api/account', 'account');
loadRoute('/api/admin', 'admin');
loadRoute('/api/blogs', 'blog');
loadRoute('/api/discounts', 'discount');
loadRoute('/api/employees', 'employee');
loadRoute('/api/wishlist', 'wishlist');
loadRoute('/api/payos', 'payos');
loadRoute('/api/shipping', 'shipping');
loadRoute('/api/comments', 'comment');
loadRoute('/api/returns', 'return');
loadRoute('/api/chat', 'chat');

// Error Handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Vọc Records API server running on port ${PORT}`);
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
