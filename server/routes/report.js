const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

// POST /api/report — Submit a report against another user
router.post('/', verifyToken, async (req, res) => {
    try {
        const { reportedId, reason } = req.body;
        const reporterId = req.user.uid;

        if (!reportedId || !reason) {
            return res.status(400).json({ error: 'reportedId and reason are required' });
        }

        // Create the report
        const report = await Report.create({
            reporterId,
            reportedId,
            reason,
        });

        // Increment report count on the reported user
        const reportedUser = await User.findOneAndUpdate(
            { uid: reportedId },
            { $inc: { reportCount: 1 } },
            { new: true }
        );

        // Auto-flag the user if they have 3 or more reports
        if (reportedUser && reportedUser.reportCount >= 3) {
            await User.findOneAndUpdate(
                { uid: reportedId },
                { flagged: true }
            );
        }

        res.status(201).json({ message: 'Report submitted', report });
    } catch (error) {
        console.error('Report error:', error.message);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

module.exports = router;
