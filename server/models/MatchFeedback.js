const mongoose = require('mongoose');

const matchFeedbackSchema = new mongoose.Schema(
    {
        reviewerUid: {
            type: String,
            required: true,
            index: true,
        },
        targetUid: {
            type: String,
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 3,
        },
        liked: {
            type: Boolean,
            default: false,
        },
        tags: [{ type: String }],
        roomId: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

matchFeedbackSchema.index({ reviewerUid: 1, targetUid: 1, roomId: 1 });

module.exports = mongoose.model('MatchFeedback', matchFeedbackSchema);
