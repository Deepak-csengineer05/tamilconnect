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
 * Higher score = better match.
 */
function calculateMatchScore(user1, user2) {
    let score = 0;

    // Language compatibility check
    const langCompatible =
        user1.language === 'Both' ||
        user2.language === 'Both' ||
        user1.language === user2.language;

    if (!langCompatible) return -1; // Incompatible languages
    if (user1.language === user2.language && user1.language !== 'Both') {
        score += 3; // Exact language match bonus
    } else {
        score += 1; // Partial compatibility
    }

    // Count shared interests
    const shared = user1.interests.filter(i => user2.interests.includes(i));
    score += shared.length * 2; // Each shared interest worth 2 points

    return score;
}

/**
 * Find the best match for a user from the waiting queue.
 * Returns the socket ID of the best match, or null if none found.
 */
function findBestMatch(user, isFallback = false) {
    let bestMatch = null;
    let bestScore = -1;

    for (const [socketId, candidate] of waitingQueue) {
        // Don't match with yourself
        if (socketId === user.socketId) continue;
        // Don't match with the same user account
        if (candidate.uid === user.uid) continue;

        const score = calculateMatchScore(user, candidate);

        // In fallback mode, accept any non-negative score
        // In normal mode, require at least some compatibility (score > 0)
        if (isFallback ? score >= 0 : score > 0) {
            if (score > bestScore) {
                bestScore = score;
                bestMatch = socketId;
            }
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

            // Store socket-user mapping
            socketUserMap.set(socket.id, uid);

            const userEntry = {
                socketId: socket.id,
                peerId,
                uid,
                language: language || 'Both',
                interests: interests || [],
                joinedAt: Date.now(),
            };

            // Try to find an immediate match
            const matchSocketId = findBestMatch(userEntry);

            if (matchSocketId) {
                const matchedUser = waitingQueue.get(matchSocketId);
                waitingQueue.delete(matchSocketId);

                // Create a room for the matched pair
                const roomId = `room_${socket.id}_${matchSocketId}`;
                activeRooms.set(roomId, {
                    user1SocketId: socket.id,
                    user2SocketId: matchSocketId,
                });

                // Track room association
                socketRoomMap.set(socket.id, roomId);
                socketRoomMap.set(matchSocketId, roomId);

                // Both users join the Socket.io room
                socket.join(roomId);
                io.sockets.sockets.get(matchSocketId)?.join(roomId);

                // Fetch partner profiles from DB for display
                let user1Profile = null;
                let user2Profile = null;
                try {
                    [user1Profile, user2Profile] = await Promise.all([
                        User.findOne({ uid }).select('displayName language interests district').lean(),
                        User.findOne({ uid: matchedUser.uid }).select('displayName language interests district').lean(),
                    ]);
                } catch (err) {
                    console.error('Failed to fetch profiles:', err.message);
                }

                // Notify both users of the match
                socket.emit('matched', {
                    peerId: matchedUser.peerId,
                    partnerUid: matchedUser.uid,
                    roomId,
                    partner: user2Profile,
                });

                io.to(matchSocketId).emit('matched', {
                    peerId: userEntry.peerId,
                    partnerUid: uid,
                    roomId,
                    partner: user1Profile,
                });

                // Increment chat count for both users
                try {
                    await Promise.all([
                        User.findOneAndUpdate({ uid }, { $inc: { chatCount: 1 } }),
                        User.findOneAndUpdate({ uid: matchedUser.uid }, { $inc: { chatCount: 1 } }),
                    ]);
                } catch (err) {
                    console.error('Failed to increment chat count:', err.message);
                }
            } else {
                // No match found — add to queue
                waitingQueue.set(socket.id, userEntry);

                // Set a 15-second fallback timer
                setTimeout(() => {
                    // Check if user is still in queue
                    if (waitingQueue.has(socket.id)) {
                        const fallbackMatch = findBestMatch(userEntry, true);

                        if (fallbackMatch) {
                            const matchedUser = waitingQueue.get(fallbackMatch);
                            waitingQueue.delete(socket.id);
                            waitingQueue.delete(fallbackMatch);

                            const roomId = `room_${socket.id}_${fallbackMatch}`;
                            activeRooms.set(roomId, {
                                user1SocketId: socket.id,
                                user2SocketId: fallbackMatch,
                            });

                            socketRoomMap.set(socket.id, roomId);
                            socketRoomMap.set(fallbackMatch, roomId);

                            socket.join(roomId);
                            io.sockets.sockets.get(fallbackMatch)?.join(roomId);

                            socket.emit('matched', {
                                peerId: matchedUser.peerId,
                                partnerUid: matchedUser.uid,
                                roomId,
                                partner: null, // Fallback match — profile fetched client-side
                            });

                            io.to(fallbackMatch).emit('matched', {
                                peerId: userEntry.peerId,
                                partnerUid: uid,
                                roomId,
                                partner: null,
                            });
                        }
                    }
                }, 15000);
            }
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
