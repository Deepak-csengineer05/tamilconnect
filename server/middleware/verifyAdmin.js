const User = require('../models/User');

/**
 * Middleware to verify the requester is an admin.
 * Must be used AFTER verifyToken so req.user is available.
 */
const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ uid: req.user.uid }).select('isAdmin banned').lean();
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        if (user.banned) {
            return res.status(403).json({ error: 'Account is banned' });
        }
        next();
    } catch (err) {
        console.error('Admin verification error:', err.message);
        return res.status(500).json({ error: 'Admin verification failed' });
    }
};

module.exports = verifyAdmin;
