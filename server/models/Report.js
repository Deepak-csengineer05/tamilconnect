const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: String,
        required: true,
    },
    reportedId: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        enum: ['Inappropriate content', 'Harassment', 'Spam', 'Underage'],
        required: true,
    },
    resolved: {
        type: Boolean,
        default: false,
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

// Index for fast admin report listing (filter by resolved, sort by date)
reportSchema.index({ resolved: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
