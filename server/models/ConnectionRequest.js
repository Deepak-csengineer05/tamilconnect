const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema(
    {
        fromUid: {
            type: String,
            required: true,
            index: true,
        },
        toUid: {
            type: String,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
            index: true,
        },
        note: {
            type: String,
            default: '',
            trim: true,
            maxlength: 180,
        },
    },
    { timestamps: true }
);

connectionRequestSchema.index({ fromUid: 1, toUid: 1 }, { unique: true });

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
