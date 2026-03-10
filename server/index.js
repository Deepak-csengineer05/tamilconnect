require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/report');
const adminRoutes = require('./routes/admin');
const roomsRoutes = require('./routes/rooms');
const Room = require('./models/Room');
const initializeSocket = require('./socket/matchmaking');
const { initRoomsFromDB } = require('./socket/matchmaking');

// Default rooms to seed if DB has none
const DEFAULT_ROOMS = [
    { key: 'csk-fans',   name: 'CSK Fan Room',        emoji: '🏏', desc: 'Talk cricket, IPL and CSK!',             isDefault: true },
    { key: 'kollywood',  name: 'Kollywood Discussion', emoji: '🎬', desc: 'Movies, gossip and new releases',          isDefault: true },
    { key: 'food-tn',    name: 'Food Lovers TN',       emoji: '🍛', desc: 'Recipes, restaurants & food',             isDefault: true },
    { key: 'tech-tamil', name: 'Tech Tamil',           emoji: '💻', desc: 'Coding, startups & gadgets',              isDefault: true },
    { key: 'music-jam',  name: 'Music Jam',            emoji: '🎵', desc: 'Tamil music, artists & more',             isDefault: true },
];

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
app.use('/api/admin', adminRoutes);
app.use('/api/rooms', roomsRoutes);

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

        // Seed default rooms if none exist
        const roomCount = await Room.countDocuments();
        if (roomCount === 0) {
            await Room.insertMany(DEFAULT_ROOMS);
            console.log('✅ Default rooms seeded');
        }

        // Load all rooms into socket memory
        const rooms = await Room.find({}).lean();
        initRoomsFromDB(rooms);
        console.log(`✅ ${rooms.length} rooms loaded into socket`);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
