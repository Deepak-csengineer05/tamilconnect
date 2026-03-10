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

module.exports = mongoose.model('Report', reportSchema);
