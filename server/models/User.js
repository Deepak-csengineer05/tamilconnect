const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    photoURL: {
        type: String,
        default: '',
    },
    district: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        enum: ['Tamil', 'English', 'Both'],
        default: 'Both',
    },
    interests: [{
        type: String,
    }],
    chatCount: {
        type: Number,
        default: 0,
    },
    reportCount: {
        type: Number,
        default: 0,
    },
    flagged: {
        type: Boolean,
        default: false,
    },
    setupComplete: {
        type: Boolean,
        default: false,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say', ''],
        default: '',
    },
    follows: [{ type: String }], // array of uids this user follows
}, {
    timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
