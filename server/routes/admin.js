const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Report = require('../models/Report');
const Room = require('../models/Room');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const { addPublicRoom, removePublicRoom } = require('../socket/matchmaking');

// Apply auth + admin check to ALL routes in this router
router.use(verifyToken);
router.use(verifyAdmin);

// ── Stats ─────────────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalRooms, totalReports, bannedUsers, flaggedUsers, unresolvedReports] =
            await Promise.all([
                User.countDocuments(),
                Room.countDocuments(),
                Report.countDocuments(),
                User.countDocuments({ banned: true }),
                User.countDocuments({ flagged: true }),
                Report.countDocuments({ resolved: false }),
            ]);

        // New users in last 7 days
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: since } });

        res.json({
            totalUsers,
            totalRooms,
            totalReports,
            bannedUsers,
            flaggedUsers,
            unresolvedReports,
            newUsersThisWeek,
        });
    } catch (err) {
        console.error('Admin stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── Users ─────────────────────────────────────────────────────────────────
// GET /api/admin/users?search=&page=&limit=
router.get('/users', async (req, res) => {
    try {
        const { search = '', page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Escape user input before using as regex to prevent ReDoS
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filter = escapedSearch
            ? {
                  $or: [
                      { displayName: { $regex: escapedSearch, $options: 'i' } },
                      { email: { $regex: escapedSearch, $options: 'i' } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .select('-__v')
                .lean(),
            User.countDocuments(filter),
        ]);

        res.json({ users, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        console.error('Admin users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/admin/users/:uid
router.get('/users/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const reports = await Report.find({ reportedId: req.params.uid })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json({ user, reports });
    } catch (err) {
        console.error('Admin get user error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// PATCH /api/admin/users/:uid/ban
router.patch('/users/:uid/ban', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.isAdmin) return res.status(400).json({ error: 'Cannot ban another admin' });

        user.banned = !user.banned;
        await user.save();
        res.json({ message: `User ${user.banned ? 'banned' : 'unbanned'}`, banned: user.banned });
    } catch (err) {
        console.error('Admin ban error:', err.message);
        res.status(500).json({ error: 'Failed to update ban status' });
    }
});

// PATCH /api/admin/users/:uid/flag
router.patch('/users/:uid/flag', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.flagged = !user.flagged;
        await user.save();
        res.json({ message: `User ${user.flagged ? 'flagged' : 'unflagged'}`, flagged: user.flagged });
    } catch (err) {
        console.error('Admin flag error:', err.message);
        res.status(500).json({ error: 'Failed to update flag status' });
    }
});

// DELETE /api/admin/users/:uid
router.delete('/users/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.isAdmin) return res.status(400).json({ error: 'Cannot delete an admin account' });

        await User.deleteOne({ uid: req.params.uid });
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Admin delete user error:', err.message);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ── Reports ───────────────────────────────────────────────────────────────
// GET /api/admin/reports?resolved=false&page=&limit=
router.get('/reports', async (req, res) => {
    try {
        const { resolved, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {};
        if (resolved === 'true') filter.resolved = true;
        if (resolved === 'false') filter.resolved = false;

        const [reports, total] = await Promise.all([
            Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            Report.countDocuments(filter),
        ]);

        // Enrich with display names
        const uids = new Set();
        reports.forEach(r => { uids.add(r.reporterId); uids.add(r.reportedId); });
        const users = await User.find({ uid: { $in: [...uids] } }).select('uid displayName email').lean();
        const userMap = Object.fromEntries(users.map(u => [u.uid, u]));

        const enriched = reports.map(r => ({
            ...r,
            reporter: userMap[r.reporterId] || { displayName: 'Unknown', email: '' },
            reported: userMap[r.reportedId] || { displayName: 'Unknown', email: '' },
        }));

        res.json({ reports: enriched, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        console.error('Admin reports error:', err.message);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// PATCH /api/admin/reports/:id/resolve
router.patch('/reports/:id/resolve', async (req, res) => {
    try {
        const report = await Report.findByIdAndUpdate(
            req.params.id,
            { resolved: true, resolvedAt: new Date() },
            { new: true }
        );
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json({ message: 'Report resolved', report });
    } catch (err) {
        console.error('Admin resolve report error:', err.message);
        res.status(500).json({ error: 'Failed to resolve report' });
    }
});

// DELETE /api/admin/reports/:id
router.delete('/reports/:id', async (req, res) => {
    try {
        const report = await Report.findByIdAndDelete(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json({ message: 'Report deleted' });
    } catch (err) {
        console.error('Admin delete report error:', err.message);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// ── Rooms ─────────────────────────────────────────────────────────────────
// GET /api/admin/rooms
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find().sort({ isDefault: -1, createdAt: 1 }).lean();
        res.json({ rooms });
    } catch (err) {
        console.error('Admin rooms error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// POST /api/admin/rooms
router.post('/rooms', async (req, res) => {
    try {
        const { name, emoji, desc, maxSize } = req.body;
        if (!name) return res.status(400).json({ error: 'Room name is required' });

        // Generate a URL-safe key from name
        const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const existing = await Room.findOne({ key });
        if (existing) return res.status(409).json({ error: 'A room with this name already exists' });

        const room = await Room.create({
            key,
            name,
            emoji: emoji || '💬',
            desc: desc || '',
            maxSize: maxSize || 6,
            isDefault: false,
            createdBy: req.user.uid,
        });

        addPublicRoom(room.key);
        res.status(201).json({ message: 'Room created', room });
    } catch (err) {
        console.error('Admin create room error:', err.message);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// PUT /api/admin/rooms/:id
router.put('/rooms/:id', async (req, res) => {
    try {
        const { name, emoji, desc, maxSize } = req.body;
        const room = await Room.findByIdAndUpdate(
            req.params.id,
            { name, emoji, desc, maxSize },
            { new: true, runValidators: true }
        );
        if (!room) return res.status(404).json({ error: 'Room not found' });
        res.json({ message: 'Room updated', room });
    } catch (err) {
        console.error('Admin update room error:', err.message);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// DELETE /api/admin/rooms/:id
router.delete('/rooms/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        if (room.isDefault) return res.status(400).json({ error: 'Cannot delete default rooms' });

        await Room.findByIdAndDelete(req.params.id);
        removePublicRoom(room.key);
        res.json({ message: 'Room deleted', key: room.key });
    } catch (err) {
        console.error('Admin delete room error:', err.message);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

module.exports = router;
