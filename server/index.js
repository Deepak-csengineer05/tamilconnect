require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/report');
const initializeSocket = require('./socket/matchmaking');

const app = express();
const server = http.createServer(app);

// CORS allowed origins
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    /\.vercel\.app$/,
];

// Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser requests
        const allowed = allowedOrigins.some((o) =>
            typeof o === 'string' ? o === origin : o.test(origin)
        );
        callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
    },
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/report', reportRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.io matchmaking
initializeSocket(io);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
