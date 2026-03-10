const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

// POST /api/auth/setup — Create or update user profile after setup
router.post('/setup', verifyToken, async (req, res) => {
    try {
        const { displayName, district, language, interests } = req.body;
        const { uid, email, picture } = req.user;

        const user = await User.findOneAndUpdate(
            { uid },
            {
                uid,
                displayName,
                email,
                photoURL: picture || '',
                district,
                language,
                interests,
                setupComplete: true,
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({ message: 'Profile saved', user });
    } catch (error) {
        console.error('Setup error:', error.message);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

// GET /api/auth/profile — Get current user's profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Profile fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/auth/profile — Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { displayName, district, language, interests } = req.body;

        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            { displayName, district, language, interests },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'Profile updated', user });
    } catch (error) {
        console.error('Profile update error:', error.message);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST /api/auth/increment-chat — Increment chat count
router.post('/increment-chat', verifyToken, async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            { $inc: { chatCount: 1 } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ chatCount: user.chatCount });
    } catch (error) {
        console.error('Chat increment error:', error.message);
        res.status(500).json({ error: 'Failed to increment chat count' });
    }
});

module.exports = router;
