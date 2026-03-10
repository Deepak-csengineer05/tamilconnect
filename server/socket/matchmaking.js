const User = require('../models/User');

/**
 * Smart Matchmaking Algorithm — 3-tier fallback
 *
 * Tier 1 (instant):   Smart match — shared interests + language compatibility
 * Tier 2 (5 seconds): Relaxed match — language compatible, any interests
 * Tier 3 (10 seconds): Anyone online — pure Omegle-style, no filters
 *
 * ─── Free-Tier Capacity (Render 512 MB RAM) ──────────────────────
 * Since all video/audio is P2P (WebRTC), this server only handles
 * signaling (socket events + matchmaking). Memory footprint per
 * connection is ~8–15 KB. The binding constraint is shared CPU (0.1 vCPU).
 *
 * Safe concurrent limit: MAX_CONNECTIONS = 100
 * Beyond that, new connections are rejected with 'server-full'.
 * ─────────────────────────────────────────────────────────────────
 */

const MAX_CONNECTIONS = 100; // safe ceiling for 512 MB / 0.1 vCPU free tier

// Waiting queue: Map<socketId, { socketId, peerId, uid, language, interests, joinedAt }>
const waitingQueue = new Map();

// Active rooms: Map<roomId, { user1SocketId, user2SocketId }>
const activeRooms = new Map();

// Socket-to-room mapping for cleanup: Map<socketId, roomId>
const socketRoomMap = new Map();

// Socket-to-userId mapping: Map<socketId, uid>
const socketUserMap = new Map();

/**
 * Calculate match score between two users.
 * Higher score = better match. Returns -1 for incompatible languages.
 */
function calculateMatchScore(user1, user2) {
    let score = 0;

    const langCompatible =
        user1.language === 'Both' ||
        user2.language === 'Both' ||
        user1.language === user2.language;

    if (!langCompatible) return -1;
    if (user1.language === user2.language && user1.language !== 'Both') {
        score += 3;
    } else {
        score += 1;
    }

    const shared = user1.interests.filter(i => user2.interests.includes(i));
    score += shared.length * 2;

    // Vibe Mode: same vibe = strong bonus
    if (user1.vibe && user2.vibe && user1.vibe === user2.vibe) {
        score += 4;
    }

    // Same District Mode: only applies when both users opted in
    if (user1.sameDistrict && user2.sameDistrict &&
        user1.district && user1.district === user2.district) {
        score += 10;
    }

    return score;
}

/**
 * Find best match. mode controls strictness:
 *   'smart'   — needs language compat + shared interests (score > 0)
 *   'relaxed' — needs language compat only (score >= 0)
 *   'anyone'  — any user in queue, no filters at all
 */
function findBestMatch(user, mode = 'smart') {
    let bestMatch = null;
    let bestScore = -Infinity;

    for (const [socketId, candidate] of waitingQueue) {
        if (socketId === user.socketId) continue;
        if (candidate.uid === user.uid) continue;

        if (mode === 'anyone') {
            // Accept literally anyone — return first valid candidate
            return socketId;
        }

        const score = calculateMatchScore(user, candidate);
        const threshold = mode === 'relaxed' ? 0 : 1;

        if (score >= threshold && score > bestScore) {
            bestScore = score;
            bestMatch = socketId;
        }
    }

    return bestMatch;
}

// ── Public Group Rooms ────────────────────────────────────────────────────
const MAX_ROOM_SIZE = 6;
// publicRoomMap: roomKey -> [{socketId, peerId, uid, displayName}]
// Populated dynamically from DB via initRoomsFromDB() called at server startup
const publicRoomMap = new Map();
// socketPublicRoomMap: socketId -> roomKey
const socketPublicRoomMap = new Map();
// io instance stored for use in exported helper functions
let _io = null;

function getRoomCounts() {
    const counts = {};
    for (const [key, ps] of publicRoomMap) counts[key] = ps.length;
    return counts;
}

function initializeSocket(io) {
    _io = io;
    io.on('connection', (socket) => {
        // ── Enforce connection cap ─────────────────────────────────
        const currentCount = io.sockets.sockets.size;
        if (currentCount > MAX_CONNECTIONS) {
            socket.emit('server-full', { max: MAX_CONNECTIONS });
            socket.disconnect(true);
            return;
        }

        console.log(`User connected: ${socket.id} (${currentCount}/${MAX_CONNECTIONS})`);

        // Broadcast updated online count to all connected clients
        io.emit('online-count', currentCount);

        // Send current public room counts to this client
        socket.emit('room-counts', getRoomCounts());

        /**
         * Event: join-queue
         * User wants to start matchmaking.
         * Data: { peerId, uid, language, interests }
         */
        socket.on('join-queue', async (data) => {
            const { peerId, uid, language, interests, vibe, district, sameDistrict } = data;

            socketUserMap.set(socket.id, uid);

            const userEntry = {
                socketId: socket.id,
                peerId,
                uid,
                language: language || 'Both',
                interests: interests || [],
                vibe: vibe || null,
                district: district || null,
                sameDistrict: sameDistrict || false,
                joinedAt: Date.now(),
            };

            // Helper: execute a match between userEntry and a queued candidate
            const executeMatch = async (matchSocketId, matchType) => {
                const matchedUser = waitingQueue.get(matchSocketId);
                if (!matchedUser) return false; // already matched by someone else

                waitingQueue.delete(socket.id);
                waitingQueue.delete(matchSocketId);

                const roomId = `room_${socket.id}_${matchSocketId}`;
                activeRooms.set(roomId, {
                    user1SocketId: socket.id,
                    user2SocketId: matchSocketId,
                });
                socketRoomMap.set(socket.id, roomId);
                socketRoomMap.set(matchSocketId, roomId);

                socket.join(roomId);
                io.sockets.sockets.get(matchSocketId)?.join(roomId);

                // Fetch both profiles for display
                let user1Profile = null;
                let user2Profile = null;
                try {
                    [user1Profile, user2Profile] = await Promise.all([
                        User.findOne({ uid }).select('displayName language interests district').lean(),
                        User.findOne({ uid: matchedUser.uid }).select('displayName language interests district').lean(),
                    ]);
                } catch (err) {
                    console.error('Profile fetch error:', err.message);
                }

                socket.emit('matched', {
                    peerId: matchedUser.peerId,
                    partnerUid: matchedUser.uid,
                    roomId,
                    partner: user2Profile,
                    matchType,
                });
                io.to(matchSocketId).emit('matched', {
                    peerId: userEntry.peerId,
                    partnerUid: uid,
                    roomId,
                    partner: user1Profile,
                    matchType,
                });

                // Increment chat counts
                try {
                    await Promise.all([
                        User.findOneAndUpdate({ uid }, { $inc: { chatCount: 1 } }),
                        User.findOneAndUpdate({ uid: matchedUser.uid }, { $inc: { chatCount: 1 } }),
                    ]);
                } catch (err) {
                    console.error('Chat count error:', err.message);
                }

                return true;
            };

            // --- Tier 1: Instant smart match (interests + language) ---
            const instantMatch = findBestMatch(userEntry, 'smart');
            if (instantMatch) {
                await executeMatch(instantMatch, 'smart');
                return;
            }

            // No immediate match — enter queue
            waitingQueue.set(socket.id, userEntry);

            // --- Tier 2: After 5s — language-compatible, any interests ---
            setTimeout(async () => {
                if (!waitingQueue.has(socket.id)) return;
                const relaxedMatch = findBestMatch(userEntry, 'relaxed');
                if (relaxedMatch) {
                    await executeMatch(relaxedMatch, 'relaxed');
                }
            }, 5000);

            // --- Tier 3: After 10s — anyone online, pure Omegle-style ---
            setTimeout(async () => {
                if (!waitingQueue.has(socket.id)) return;
                const anyMatch = findBestMatch(userEntry, 'anyone');
                if (anyMatch) {
                    await executeMatch(anyMatch, 'random');
                }
            }, 10000);
        });

        /**
         * Event: leave-queue
         * User cancels matchmaking.
         */
        socket.on('leave-queue', () => {
            waitingQueue.delete(socket.id);
        });

        /**
         * Event: send-message
         * User sends a text chat message within the room.
         * Data: { roomId, message, senderName }
         */
        socket.on('send-message', (data) => {
            const { roomId, message, senderName } = data;
            // Broadcast message to the room (including sender for consistency)
            io.to(roomId).emit('receive-message', {
                message,
                senderName,
                senderId: socket.id,
                timestamp: Date.now(),
            });
        });

        /**
         * Event: typing
         * Relay typing status to the partner in the same room.
         * Data: { roomId, isTyping }
         */
        socket.on('typing', (data) => {
            const { roomId, isTyping } = data;
            socket.to(roomId).emit('partner-typing', { isTyping });
        });

        /**
         * Event: skip-partner
         * User wants to skip current partner and find a new one.
         */
        socket.on('skip-partner', () => {
            const roomId = socketRoomMap.get(socket.id);

            if (roomId) {
                const room = activeRooms.get(roomId);
                if (room) {
                    // Notify the partner that they were skipped
                    const partnerId = room.user1SocketId === socket.id
                        ? room.user2SocketId
                        : room.user1SocketId;

                    // Ghost Mode: partner sees "connection lost", never "you were skipped"
                    io.to(partnerId).emit('partner-disconnected');

                    // Clean up the room
                    socket.leave(roomId);
                    io.sockets.sockets.get(partnerId)?.leave(roomId);

                    socketRoomMap.delete(socket.id);
                    socketRoomMap.delete(partnerId);
                    activeRooms.delete(roomId);
                }
            }
        });

        /**
         * Event: end-call
         * User ends the current call.
         */
        socket.on('end-call', () => {
            const roomId = socketRoomMap.get(socket.id);

            if (roomId) {
                const room = activeRooms.get(roomId);
                if (room) {
                    const partnerId = room.user1SocketId === socket.id
                        ? room.user2SocketId
                        : room.user1SocketId;

                    io.to(partnerId).emit('call-ended');

                    socket.leave(roomId);
                    io.sockets.sockets.get(partnerId)?.leave(roomId);

                    socketRoomMap.delete(socket.id);
                    socketRoomMap.delete(partnerId);
                    activeRooms.delete(roomId);
                }
            }
        });

        /**
         * Event: disconnect
         * Clean up when user disconnects.
         */
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);

            // Remove from waiting queue
            waitingQueue.delete(socket.id);

            // Clean up active room
            const roomId = socketRoomMap.get(socket.id);
            if (roomId) {
                const room = activeRooms.get(roomId);
                if (room) {
                    const partnerId = room.user1SocketId === socket.id
                        ? room.user2SocketId
                        : room.user1SocketId;

                    io.to(partnerId).emit('partner-disconnected');

                    io.sockets.sockets.get(partnerId)?.leave(roomId);
                    socketRoomMap.delete(partnerId);
                }

                socketRoomMap.delete(socket.id);
                activeRooms.delete(roomId);
            }

            socketUserMap.delete(socket.id);

            // Clean up public room if user was in one
            const pubRoomKey = socketPublicRoomMap.get(socket.id);
            if (pubRoomKey) {
                const ps = publicRoomMap.get(pubRoomKey) || [];
                const leaving = ps.find(p => p.socketId === socket.id);
                publicRoomMap.set(pubRoomKey, ps.filter(p => p.socketId !== socket.id));
                socketPublicRoomMap.delete(socket.id);
                if (leaving) {
                    io.to(`pub_${pubRoomKey}`).emit('room-peer-left', {
                        peerId: leaving.peerId,
                        displayName: leaving.displayName,
                    });
                }
                io.emit('room-counts', getRoomCounts());
            }

            // Broadcast updated online count (after cleanup)
            io.emit('online-count', io.sockets.sockets.size);
        });

        // ── Public Group Room Handlers ─────────────────────────────────────
        socket.on('get-room-counts', () => {
            socket.emit('room-counts', getRoomCounts());
        });

        socket.on('join-public-room', ({ roomKey, peerId, uid, displayName }) => {
            const ps = publicRoomMap.get(roomKey);
            if (!ps) return;
            if (ps.length >= MAX_ROOM_SIZE) { socket.emit('room-full'); return; }

            const participant = { socketId: socket.id, peerId, uid, displayName };
            ps.push(participant);
            socketPublicRoomMap.set(socket.id, roomKey);
            socket.join(`pub_${roomKey}`);

            // Send current participants to the new joiner (exclude self)
            socket.emit('room-state', {
                room: roomKey,
                participants: ps.filter(p => p.socketId !== socket.id),
            });
            // Notify others that someone joined
            socket.to(`pub_${roomKey}`).emit('room-peer-joined', { participant });
            io.emit('room-counts', getRoomCounts());
        });

        socket.on('leave-public-room', () => {
            const roomKey = socketPublicRoomMap.get(socket.id);
            if (!roomKey) return;
            const ps = publicRoomMap.get(roomKey) || [];
            const leaving = ps.find(p => p.socketId === socket.id);
            publicRoomMap.set(roomKey, ps.filter(p => p.socketId !== socket.id));
            socket.leave(`pub_${roomKey}`);
            socketPublicRoomMap.delete(socket.id);
            if (leaving) {
                io.to(`pub_${roomKey}`).emit('room-peer-left', {
                    peerId: leaving.peerId,
                    displayName: leaving.displayName,
                });
            }
            io.emit('room-counts', getRoomCounts());
        });

        socket.on('room-message', ({ roomKey, message, senderName }) => {
            if (!publicRoomMap.has(roomKey)) return;
            io.to(`pub_${roomKey}`).emit('room-message', {
                message,
                senderName,
                senderId: socket.id,
                timestamp: Date.now(),
            });
        });
    });
}

// ── Dynamic room management (called from admin/rooms routes) ─────────────
function initRoomsFromDB(rooms) {
    publicRoomMap.clear();
    rooms.forEach(r => publicRoomMap.set(r.key, []));
}

function addPublicRoom(key) {
    if (!publicRoomMap.has(key)) {
        publicRoomMap.set(key, []);
    }
    _io?.emit('room-counts', getRoomCounts());
    _io?.emit('rooms-updated');
}

function removePublicRoom(key) {
    const participants = publicRoomMap.get(key) || [];
    participants.forEach(p => {
        const s = _io?.sockets?.sockets?.get(p.socketId);
        if (s) {
            s.emit('room-deleted', { roomKey: key });
            s.leave(`pub_${key}`);
        }
        socketPublicRoomMap.delete(p.socketId);
    });
    publicRoomMap.delete(key);
    _io?.emit('room-counts', getRoomCounts());
    _io?.emit('rooms-updated');
}

module.exports = initializeSocket;
module.exports.initRoomsFromDB = initRoomsFromDB;
module.exports.addPublicRoom = addPublicRoom;
module.exports.removePublicRoom = removePublicRoom;
