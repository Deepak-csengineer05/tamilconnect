const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const verifyToken = require('../middleware/verifyToken');
const { addPublicRoom } = require('../socket/matchmaking');

// GET /api/rooms — list all rooms (public)
router.get('/', verifyToken, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ isDefault: -1, createdAt: 1 }).lean();
        res.json({ rooms });
    } catch (err) {
        console.error('Rooms list error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// POST /api/rooms — create a custom room (any logged-in user)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, emoji, desc } = req.body;
        if (!name || name.trim().length < 3) {
            return res.status(400).json({ error: 'Room name must be at least 3 characters' });
        }

        // Check user hasn't created too many rooms (max 3 per user)
        const userRoomCount = await Room.countDocuments({ createdBy: req.user.uid });
        if (userRoomCount >= 3) {
            return res.status(400).json({ error: 'You can only create up to 3 rooms' });
        }

        const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const existing = await Room.findOne({ key });
        if (existing) {
            return res.status(409).json({ error: 'A room with this name already exists' });
        }

        const room = await Room.create({
            key,
            name: name.trim(),
            emoji: emoji || '💬',
            desc: (desc || '').trim(),
            isDefault: false,
            createdBy: req.user.uid,
        });

        addPublicRoom(room.key);
        res.status(201).json({ message: 'Room created', room });
    } catch (err) {
        console.error('Create room error:', err.message);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// DELETE /api/rooms/:id — delete own room
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        if (room.isDefault) return res.status(400).json({ error: 'Cannot delete default rooms' });
        if (room.createdBy !== req.user.uid) {
            return res.status(403).json({ error: 'You can only delete rooms you created' });
        }

        const { removePublicRoom } = require('../socket/matchmaking');
        await Room.findByIdAndDelete(req.params.id);
        removePublicRoom(room.key);
        res.json({ message: 'Room deleted' });
    } catch (err) {
        console.error('Delete room error:', err.message);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

module.exports = router;
