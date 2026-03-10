const User = require('../models/User');

/**
 * Smart Matchmaking Algorithm
 * 
 * How it works:
 * 1. User joins queue with their peerId, uid, language, and interests
 * 2. Server tries to find the best match based on:
 *    a. Shared interests (highest priority — more shared interests = better match)
 *    b. Language compatibility (Tamil+Tamil, English+English, Both+anything)
 *    c. Fallback: after 15 seconds, match with any available user
 * 3. When matched, both users join a Socket.io room for text chat
 * 4. PeerJS IDs are exchanged for WebRTC video connection
 */

/**
 * Smart Matchmaking Algorithm — 3-tier fallback
 *
 * Tier 1 (instant):   Smart match — shared interests + language compatibility
 * Tier 2 (5 seconds): Relaxed match — language compatible, any interests
 * Tier 3 (10 seconds): Anyone online — pure Omegle-style, no filters
 */

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

function initializeSocket(io) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        /**
         * Event: join-queue
         * User wants to start matchmaking.
         * Data: { peerId, uid, language, interests }
         */
        socket.on('join-queue', async (data) => {
            const { peerId, uid, language, interests } = data;

            socketUserMap.set(socket.id, uid);

            const userEntry = {
                socketId: socket.id,
                peerId,
                uid,
                language: language || 'Both',
                interests: interests || [],
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

                    io.to(partnerId).emit('partner-skipped');

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
        });
    });
}

module.exports = initializeSocket;
