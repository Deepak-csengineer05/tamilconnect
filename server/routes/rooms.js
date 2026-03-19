const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const RoomEvent = require('../models/RoomEvent');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const { addPublicRoom } = require('../socket/matchmaking');

function normalizeKey(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
}

// GET /api/rooms - list rooms with optional filters
router.get('/', verifyToken, async (req, res) => {
    try {
        const { district = '', tag = '', roomType = '', language = '' } = req.query;
        const filter = {};

        if (district) {
            filter.$or = [{ district }, { district: '' }];
        }
        if (tag) {
            filter.tags = { $in: [String(tag)] };
        }
        if (roomType) {
            filter.roomType = String(roomType);
        }
        if (language) {
            filter.language = { $in: [String(language), 'Both', ''] };
        }

        const rooms = await Room.find(filter).sort({ isDefault: -1, createdAt: 1 }).lean();
        res.json({ rooms });
    } catch (err) {
        console.error('Rooms list error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// GET /api/rooms/recommended - room suggestions for current user
router.get('/recommended', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }).lean();
        if (!me) return res.status(404).json({ error: 'User not found' });

        const rooms = await Room.find({
            $or: [
                { district: me.district },
                { district: '' },
                { tags: { $in: me.interests || [] } },
                { language: me.language },
                { language: 'Both' },
                { language: '' },
            ],
        })
            .sort({ isDefault: -1, createdAt: -1 })
            .limit(20)
            .lean();

        const ranked = rooms
            .map((r) => {
                const sharedTags = (r.tags || []).filter((t) => (me.interests || []).includes(t)).length;
                const score = sharedTags * 2 + (r.district === me.district ? 3 : 0) + (r.isDefault ? 1 : 0);
                return { ...r, recommendationScore: score };
            })
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, 8);

        res.json({ rooms: ranked });
    } catch (err) {
        console.error('Recommended rooms error:', err.message);
        res.status(500).json({ error: 'Failed to fetch recommended rooms' });
    }
});

// POST /api/rooms - create custom room (enhanced host/topic support)
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            name,
            emoji,
            desc,
            topic,
            tags = [],
            district = '',
            language = '',
            roomType = 'public',
            isPersistent = true,
            scheduledAt = null,
            maxSize = 6,
        } = req.body;

        if (!name || String(name).trim().length < 3) {
            return res.status(400).json({ error: 'Room name must be at least 3 characters' });
        }

        const userRoomCount = await Room.countDocuments({ createdBy: req.user.uid });
        if (userRoomCount >= 6) {
            return res.status(400).json({ error: 'You can only create up to 6 rooms' });
        }

        const key = normalizeKey(name);
        if (!key) return res.status(400).json({ error: 'Invalid room name' });

        const existing = await Room.findOne({ key });
        if (existing) return res.status(409).json({ error: 'A room with this name already exists' });

        const room = await Room.create({
            key,
            name: String(name).trim(),
            emoji: emoji || '💬',
            desc: String(desc || '').trim(),
            topic: String(topic || '').trim(),
            tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
            district: String(district || '').trim(),
            language: String(language || ''),
            roomType: ['public', 'district', 'interest', 'event'].includes(roomType) ? roomType : 'public',
            isPersistent: Boolean(isPersistent),
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            maxSize: Math.max(2, Math.min(12, Number(maxSize) || 6)),
            isDefault: false,
            createdBy: req.user.uid,
            hostUid: req.user.uid,
            hostToolsEnabled: true,
        });

        addPublicRoom(room.key);
        res.status(201).json({ message: 'Room created', room });
    } catch (err) {
        console.error('Create room error:', err.message);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// DELETE /api/rooms/:id - delete own room
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

// GET /api/rooms/events - list upcoming events
router.get('/events/list', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const events = await RoomEvent.find({ startsAt: { $gte: now }, isCancelled: false })
            .sort({ startsAt: 1 })
            .limit(50)
            .lean();

        res.json({ events });
    } catch (err) {
        console.error('Events list error:', err.message);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// POST /api/rooms/events - create a hosted event
router.post('/events', verifyToken, async (req, res) => {
    try {
        const {
            title,
            description = '',
            roomKey,
            startsAt,
            endsAt = null,
            capacity = 50,
            district = '',
            language = '',
        } = req.body;

        if (!title || String(title).trim().length < 3) {
            return res.status(400).json({ error: 'Event title is required' });
        }
        if (!roomKey) return res.status(400).json({ error: 'roomKey is required' });
        if (!startsAt) return res.status(400).json({ error: 'startsAt is required' });

        const room = await Room.findOne({ key: roomKey });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        const event = await RoomEvent.create({
            title: String(title).trim(),
            description: String(description).trim(),
            roomKey,
            hostUid: req.user.uid,
            district: String(district || room.district || '').trim(),
            language: String(language || room.language || ''),
            startsAt: new Date(startsAt),
            endsAt: endsAt ? new Date(endsAt) : null,
            capacity: Math.max(2, Math.min(500, Number(capacity) || 50)),
            rsvps: [req.user.uid],
        });

        res.status(201).json({ message: 'Event created', event });
    } catch (err) {
        console.error('Create event error:', err.message);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// PATCH /api/rooms/events/:id/rsvp - RSVP to event
router.patch('/events/:id/rsvp', verifyToken, async (req, res) => {
    try {
        const { join = true } = req.body;
        const event = await RoomEvent.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.isCancelled) return res.status(400).json({ error: 'Event was cancelled' });

        if (join) {
            if ((event.rsvps || []).length >= event.capacity) {
                return res.status(400).json({ error: 'Event is full' });
            }
            event.rsvps = [...new Set([...(event.rsvps || []), req.user.uid])];
        } else {
            event.rsvps = (event.rsvps || []).filter((uid) => uid !== req.user.uid);
        }

        await event.save();
        res.json({ message: join ? 'RSVP confirmed' : 'RSVP removed', event });
    } catch (err) {
        console.error('RSVP error:', err.message);
        res.status(500).json({ error: 'Failed to update RSVP' });
    }
});

module.exports = router;
