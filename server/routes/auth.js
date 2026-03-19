const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const MatchFeedback = require('../models/MatchFeedback');
const ConnectionRequest = require('../models/ConnectionRequest');
const verifyToken = require('../middleware/verifyToken');

const DISTRICT_NEIGHBORS = {
    Chennai: ['Tiruvallur', 'Chengalpattu', 'Kanchipuram'],
    Coimbatore: ['Tiruppur', 'Erode', 'The Nilgiris'],
    Madurai: ['Dindigul', 'Sivaganga', 'Theni'],
    Salem: ['Namakkal', 'Dharmapuri', 'Erode'],
};

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function generateReferralCode(displayName, uid) {
    const namePart = (displayName || 'TC').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'TC';
    const uidPart = (uid || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-4) || '0000';
    const rand = Math.floor(Math.random() * 900 + 100);
    return `${namePart}${uidPart}${rand}`;
}

function deriveTrustMeta(user) {
    const base = 100;
    const reportPenalty = (user.reportCount || 0) * 6;
    const flaggedPenalty = user.flagged ? 22 : 0;
    const bannedPenalty = user.banned ? 40 : 0;
    const chatBonus = Math.min(12, Math.floor((user.chatCount || 0) / 5));
    const score = clamp(base - reportPenalty - flaggedPenalty - bannedPenalty + chatBonus, 0, 100);

    let trustLevel = 'new';
    if (score >= 85) trustLevel = 'verified';
    else if (score >= 70) trustLevel = 'trusted';
    else if (score >= 45) trustLevel = 'watch';

    return { score, trustLevel };
}

function updateBadgeSet(user) {
    const badges = new Set(user.badges || []);
    if ((user.chatCount || 0) >= 25) badges.add('Conversation Starter');
    if ((user.referralCount || 0) >= 3) badges.add('Community Grower');
    if ((user.streakDays || 0) >= 7) badges.add('Consistency Star');
    if ((user.trustLevel || '') === 'verified') badges.add('Trusted Member');
    user.badges = [...badges];
}

// POST /api/auth/setup - Create or update user profile after setup
router.post('/setup', verifyToken, async (req, res) => {
    try {
        const {
            displayName,
            district,
            language,
            interests,
            gender,
            collegeName,
            matchPreferences,
            safeMode,
        } = req.body;
        const { uid, email, picture } = req.user;

        const payload = {
            uid,
            displayName,
            email,
            photoURL: picture || '',
            district,
            language,
            interests,
            gender: gender || '',
            collegeName: (collegeName || '').trim(),
            setupComplete: true,
        };

        if (matchPreferences && typeof matchPreferences === 'object') {
            payload.matchPreferences = {
                mode: matchPreferences.mode || 'smart',
                strictInterests: Boolean(matchPreferences.strictInterests),
                sameDistrictOnly: Boolean(matchPreferences.sameDistrictOnly),
            };
        }
        if (safeMode && typeof safeMode === 'object') {
            payload.safeMode = {
                enabled: Boolean(safeMode.enabled),
                faceBlur: Boolean(safeMode.faceBlur),
                voiceOnly: Boolean(safeMode.voiceOnly),
                strictProfileFilter: Boolean(safeMode.strictProfileFilter),
            };
        }

        let user = await User.findOneAndUpdate(
            { uid },
            payload,
            { upsert: true, new: true, runValidators: true }
        );

        if (!user.referralCode) {
            let code = generateReferralCode(user.displayName, uid);
            for (let i = 0; i < 3; i++) {
                const exists = await User.exists({ referralCode: code });
                if (!exists) break;
                code = generateReferralCode(user.displayName, `${uid}${i}`);
            }
            user.referralCode = code;
        }

        const trust = deriveTrustMeta(user);
        user.trustScore = trust.score;
        user.trustLevel = trust.trustLevel;
        updateBadgeSet(user);
        await user.save();

        res.status(200).json({ message: 'Profile saved', user });
    } catch (error) {
        console.error('Setup error:', error.message);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const trust = deriveTrustMeta(user);
        let dirty = false;
        if (user.trustScore !== trust.score) {
            user.trustScore = trust.score;
            dirty = true;
        }
        if (user.trustLevel !== trust.trustLevel) {
            user.trustLevel = trust.trustLevel;
            dirty = true;
        }
        const beforeBadges = JSON.stringify(user.badges || []);
        updateBadgeSet(user);
        if (beforeBadges !== JSON.stringify(user.badges || [])) dirty = true;
        if (dirty) await user.save();

        res.status(200).json({ user });
    } catch (error) {
        console.error('Profile fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const {
            displayName,
            district,
            language,
            interests,
            gender,
            collegeName,
            matchPreferences,
            safeMode,
        } = req.body;

        const updates = {
            displayName,
            district,
            language,
            interests,
            gender,
        };
        if (typeof collegeName === 'string') updates.collegeName = collegeName.trim();
        if (matchPreferences && typeof matchPreferences === 'object') {
            updates.matchPreferences = {
                mode: matchPreferences.mode || 'smart',
                strictInterests: Boolean(matchPreferences.strictInterests),
                sameDistrictOnly: Boolean(matchPreferences.sameDistrictOnly),
            };
        }
        if (safeMode && typeof safeMode === 'object') {
            updates.safeMode = {
                enabled: Boolean(safeMode.enabled),
                faceBlur: Boolean(safeMode.faceBlur),
                voiceOnly: Boolean(safeMode.voiceOnly),
                strictProfileFilter: Boolean(safeMode.strictProfileFilter),
            };
        }

        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            updates,
            { new: true, runValidators: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        const trust = deriveTrustMeta(user);
        user.trustScore = trust.score;
        user.trustLevel = trust.trustLevel;
        updateBadgeSet(user);
        await user.save();

        res.status(200).json({ message: 'Profile updated', user });
    } catch (error) {
        console.error('Profile update error:', error.message);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/auth/preferences - Update safety + matching preferences
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const { matchPreferences, safeMode } = req.body;
        const updates = {};

        if (matchPreferences && typeof matchPreferences === 'object') {
            updates.matchPreferences = {
                mode: matchPreferences.mode || 'smart',
                strictInterests: Boolean(matchPreferences.strictInterests),
                sameDistrictOnly: Boolean(matchPreferences.sameDistrictOnly),
            };
        }
        if (safeMode && typeof safeMode === 'object') {
            updates.safeMode = {
                enabled: Boolean(safeMode.enabled),
                faceBlur: Boolean(safeMode.faceBlur),
                voiceOnly: Boolean(safeMode.voiceOnly),
                strictProfileFilter: Boolean(safeMode.strictProfileFilter),
            };
        }

        const user = await User.findOneAndUpdate({ uid: req.user.uid }, updates, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'Preferences updated', user });
    } catch (error) {
        console.error('Preferences update error:', error.message);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// POST /api/auth/increment-chat - Increment chat count
router.post('/increment-chat', verifyToken, async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            { $inc: { chatCount: 1, 'challengeProgress.weeklyMatches': 1 } },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        const trust = deriveTrustMeta(user);
        user.trustScore = trust.score;
        user.trustLevel = trust.trustLevel;
        updateBadgeSet(user);
        await user.save();

        res.status(200).json({ chatCount: user.chatCount });
    } catch (error) {
        console.error('Chat increment error:', error.message);
        res.status(500).json({ error: 'Failed to increment chat count' });
    }
});

// POST /api/auth/match-feedback - compatibility feedback loop
router.post('/match-feedback', verifyToken, async (req, res) => {
    try {
        const { targetUid, rating = 3, liked = false, tags = [], roomId = '' } = req.body;
        if (!targetUid || targetUid === req.user.uid) {
            return res.status(400).json({ error: 'Invalid target user' });
        }

        const targetExists = await User.exists({ uid: targetUid });
        if (!targetExists) return res.status(404).json({ error: 'User not found' });

        const feedback = await MatchFeedback.findOneAndUpdate(
            { reviewerUid: req.user.uid, targetUid, roomId: roomId || '' },
            {
                reviewerUid: req.user.uid,
                targetUid,
                rating: clamp(Number(rating) || 3, 1, 5),
                liked: Boolean(liked),
                tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
                roomId: roomId || '',
            },
            { upsert: true, new: true, runValidators: true }
        );

        if (liked) {
            await User.findOneAndUpdate(
                { uid: req.user.uid },
                { $addToSet: { likedUsers: targetUid } }
            );
        }

        const aggregate = await MatchFeedback.aggregate([
            { $match: { targetUid } },
            {
                $group: {
                    _id: '$targetUid',
                    avgRating: { $avg: '$rating' },
                    likes: { $sum: { $cond: ['$liked', 1, 0] } },
                    total: { $sum: 1 },
                },
            },
        ]);

        res.json({
            message: 'Feedback recorded',
            feedback,
            targetScore: aggregate[0] || { avgRating: 0, likes: 0, total: 0 },
        });
    } catch (error) {
        console.error('Match feedback error:', error.message);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// GET /api/auth/discover/recommendations
router.get('/discover/recommendations', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }).lean();
        if (!me) return res.status(404).json({ error: 'User not found' });

        const districtPool = [me.district, ...(DISTRICT_NEIGHBORS[me.district] || [])].filter(Boolean);
        const interestPool = me.interests || [];

        const [users, rooms] = await Promise.all([
            User.find(
                {
                    uid: { $ne: me.uid },
                    banned: false,
                    district: { $in: districtPool.length ? districtPool : [me.district] },
                    language: { $in: [me.language, 'Both', 'Tamil', 'English'] },
                },
                'uid displayName district language interests trustScore badges'
            )
                .limit(20)
                .lean(),
            Room.find(
                {
                    $or: [
                        { district: me.district },
                        { district: '' },
                        { tags: { $in: interestPool } },
                        { language: me.language },
                        { language: 'Both' },
                    ],
                }
            )
                .sort({ isDefault: -1, createdAt: -1 })
                .limit(20)
                .lean(),
        ]);

        const scoredUsers = users
            .map((u) => {
                const shared = (u.interests || []).filter((i) => interestPool.includes(i)).length;
                const districtBonus = u.district === me.district ? 3 : 1;
                const score = shared * 2 + districtBonus + Math.floor((u.trustScore || 50) / 20);
                return { ...u, matchScore: score, sharedInterests: shared };
            })
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 8);

        const scoredRooms = rooms
            .map((r) => {
                const sharedTags = (r.tags || []).filter((t) => interestPool.includes(t)).length;
                const score = sharedTags * 2 + (r.district === me.district ? 3 : 0) + (r.isDefault ? 1 : 0);
                return { ...r, recommendationScore: score };
            })
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, 8);

        res.json({ users: scoredUsers, rooms: scoredRooms });
    } catch (error) {
        console.error('Recommendations error:', error.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// GET /api/auth/icebreakers
router.get('/icebreakers', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }).lean();
        if (!me) return res.status(404).json({ error: 'User not found' });

        const interest = (me.interests || [])[0] || 'music';
        const district = me.district || 'Tamil Nadu';

        const starters = [
            `Hey! How is the vibe in ${district} today?`,
            `I saw you like ${interest}. What got you into it?`,
            'Tamil or English, your choice. I can do both.',
            'What is one underrated spot in your district?',
            `If we start with ${interest}, what should we talk about first?`,
        ];

        res.json({ starters });
    } catch (error) {
        console.error('Icebreaker error:', error.message);
        res.status(500).json({ error: 'Failed to fetch icebreakers' });
    }
});

// POST /api/auth/connect-request/:targetUid
router.post('/connect-request/:targetUid', verifyToken, async (req, res) => {
    try {
        const fromUid = req.user.uid;
        const { targetUid } = req.params;
        const { note = '' } = req.body;

        if (fromUid === targetUid) return res.status(400).json({ error: 'Cannot connect to yourself' });
        const targetExists = await User.exists({ uid: targetUid });
        if (!targetExists) return res.status(404).json({ error: 'User not found' });

        const request = await ConnectionRequest.findOneAndUpdate(
            { fromUid, toUid: targetUid },
            {
                fromUid,
                toUid: targetUid,
                note: String(note || '').slice(0, 180),
                status: 'pending',
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(201).json({ message: 'Connection request sent', request });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Request already exists' });
        }
        console.error('Connect request error:', error.message);
        res.status(500).json({ error: 'Failed to send request' });
    }
});

// GET /api/auth/connect-requests
router.get('/connect-requests', verifyToken, async (req, res) => {
    try {
        const uid = req.user.uid;
        const [incoming, outgoing] = await Promise.all([
            ConnectionRequest.find({ toUid: uid }).sort({ createdAt: -1 }).lean(),
            ConnectionRequest.find({ fromUid: uid }).sort({ createdAt: -1 }).lean(),
        ]);

        res.json({ incoming, outgoing });
    } catch (error) {
        console.error('Get connect requests error:', error.message);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// PATCH /api/auth/connect-request/:id
router.patch('/connect-request/:id', verifyToken, async (req, res) => {
    try {
        const { action } = req.body;
        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const request = await ConnectionRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.toUid !== req.user.uid) return res.status(403).json({ error: 'Not allowed' });

        request.status = action === 'accept' ? 'accepted' : 'rejected';
        await request.save();

        if (action === 'accept') {
            await Promise.all([
                User.findOneAndUpdate(
                    { uid: request.fromUid },
                    { $addToSet: { follows: request.toUid } }
                ),
                User.findOneAndUpdate(
                    { uid: request.toUid },
                    { $addToSet: { follows: request.fromUid } }
                ),
            ]);
        }

        res.json({ message: `Request ${request.status}`, request });
    } catch (error) {
        console.error('Respond connect request error:', error.message);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// POST /api/auth/referral/redeem
router.post('/referral/redeem', verifyToken, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Referral code required' });

        const me = await User.findOne({ uid: req.user.uid });
        if (!me) return res.status(404).json({ error: 'User not found' });
        if (me.referredBy) return res.status(400).json({ error: 'Referral already redeemed' });

        const owner = await User.findOne({ referralCode: String(code).trim().toUpperCase() });
        if (!owner) return res.status(404).json({ error: 'Invalid referral code' });
        if (owner.uid === me.uid) return res.status(400).json({ error: 'Cannot redeem your own code' });

        me.referredBy = owner.uid;
        await me.save();

        owner.referralCount = (owner.referralCount || 0) + 1;
        updateBadgeSet(owner);
        await owner.save();

        res.json({ message: 'Referral redeemed successfully' });
    } catch (error) {
        console.error('Referral redeem error:', error.message);
        res.status(500).json({ error: 'Failed to redeem referral' });
    }
});

// GET /api/auth/referral
router.get('/referral', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }, 'referralCode referralCount referredBy').lean();
        if (!me) return res.status(404).json({ error: 'User not found' });
        res.json(me);
    } catch (error) {
        console.error('Referral fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch referral data' });
    }
});

// PUT /api/auth/campus
router.put('/campus', verifyToken, async (req, res) => {
    try {
        const { collegeName } = req.body;
        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            {
                collegeName: String(collegeName || '').trim().slice(0, 80),
                campusVerified: Boolean(collegeName && String(collegeName).trim().length >= 4),
            },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'Campus updated', user });
    } catch (error) {
        console.error('Campus update error:', error.message);
        res.status(500).json({ error: 'Failed to update campus' });
    }
});

// GET /api/auth/campus/circle
router.get('/campus/circle', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }).lean();
        if (!me) return res.status(404).json({ error: 'User not found' });
        if (!me.collegeName) return res.json({ users: [] });

        const users = await User.find(
            {
                uid: { $ne: me.uid },
                collegeName: me.collegeName,
                banned: false,
            },
            'uid displayName district language interests trustScore'
        )
            .limit(50)
            .lean();

        res.json({ users, collegeName: me.collegeName });
    } catch (error) {
        console.error('Campus circle error:', error.message);
        res.status(500).json({ error: 'Failed to fetch campus circle' });
    }
});

// GET /api/auth/me/challenges
router.get('/me/challenges', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }, 'streakDays challengeProgress badges').lean();
        if (!me) return res.status(404).json({ error: 'User not found' });

        const weeklyTarget = {
            weeklyMatches: 8,
            districtDiversity: 3,
            roomsJoined: 2,
        };

        res.json({
            streakDays: me.streakDays || 0,
            challengeProgress: me.challengeProgress || {},
            weeklyTarget,
            badges: me.badges || [],
        });
    } catch (error) {
        console.error('Challenges fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

// POST /api/auth/me/challenge/checkin
router.post('/me/challenge/checkin', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid });
        if (!me) return res.status(404).json({ error: 'User not found' });

        const now = new Date();
        const last = me.lastCheckInAt ? new Date(me.lastCheckInAt) : null;

        let alreadyCheckedInToday = false;
        if (last) {
            const sameDay =
                last.getUTCFullYear() === now.getUTCFullYear() &&
                last.getUTCMonth() === now.getUTCMonth() &&
                last.getUTCDate() === now.getUTCDate();
            if (sameDay) alreadyCheckedInToday = true;
        }

        if (alreadyCheckedInToday) {
            return res.json({ message: 'Already checked in today', streakDays: me.streakDays || 0 });
        }

        if (!last) {
            me.streakDays = 1;
        } else {
            const diffDays = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) / (1000 * 60 * 60 * 24));
            me.streakDays = diffDays === 1 ? (me.streakDays || 0) + 1 : 1;
        }

        me.lastCheckInAt = now;
        updateBadgeSet(me);
        await me.save();

        res.json({ message: 'Check-in recorded', streakDays: me.streakDays });
    } catch (error) {
        console.error('Check-in error:', error.message);
        res.status(500).json({ error: 'Failed to check in' });
    }
});

// POST /api/auth/follow/:targetUid - Follow a user
router.post('/follow/:targetUid', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { targetUid } = req.params;

        if (uid === targetUid) return res.status(400).json({ error: 'Cannot follow yourself' });

        const targetExists = await User.exists({ uid: targetUid });
        if (!targetExists) return res.status(404).json({ error: 'User not found' });

        await User.findOneAndUpdate(
            { uid },
            { $addToSet: { follows: targetUid } }
        );

        res.status(200).json({ message: 'Followed successfully' });
    } catch (error) {
        console.error('Follow error:', error.message);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});

// DELETE /api/auth/follow/:targetUid - Unfollow a user
router.delete('/follow/:targetUid', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { targetUid } = req.params;

        await User.findOneAndUpdate(
            { uid },
            { $pull: { follows: targetUid } }
        );

        res.status(200).json({ message: 'Unfollowed successfully' });
    } catch (error) {
        console.error('Unfollow error:', error.message);
        res.status(500).json({ error: 'Failed to unfollow user' });
    }
});

// GET /api/auth/follows - Get list of users I follow
router.get('/follows', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ uid: req.user.uid }).lean();
        if (!me) return res.status(404).json({ error: 'User not found' });

        const followedUsers = await User.find(
            { uid: { $in: me.follows || [] } },
            'uid displayName district language interests gender trustScore badges'
        ).lean();

        res.status(200).json({ follows: followedUsers, count: followedUsers.length });
    } catch (error) {
        console.error('Follows fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch follows' });
    }
});

module.exports = router;
