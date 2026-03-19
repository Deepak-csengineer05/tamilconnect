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
    isAdmin: {
        type: Boolean,
        default: false,
    },
    banned: {
        type: Boolean,
        default: false,
        index: true,
    },
    // Upgrade: hyperlocal + match quality + safety controls
    matchPreferences: {
        mode: {
            type: String,
            enum: ['smart', 'district-only', 'nearby-districts', 'open'],
            default: 'smart',
        },
        strictInterests: {
            type: Boolean,
            default: false,
        },
        sameDistrictOnly: {
            type: Boolean,
            default: false,
        },
    },
    safeMode: {
        enabled: {
            type: Boolean,
            default: false,
        },
        faceBlur: {
            type: Boolean,
            default: false,
        },
        voiceOnly: {
            type: Boolean,
            default: false,
        },
        strictProfileFilter: {
            type: Boolean,
            default: false,
        },
    },
    trustScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
        index: true,
    },
    trustLevel: {
        type: String,
        enum: ['new', 'watch', 'trusted', 'verified'],
        default: 'new',
    },
    badges: [{ type: String }],
    streakDays: {
        type: Number,
        default: 0,
    },
    lastCheckInAt: {
        type: Date,
        default: null,
    },
    challengeProgress: {
        weeklyMatches: { type: Number, default: 0 },
        districtDiversity: { type: Number, default: 0 },
        roomsJoined: { type: Number, default: 0 },
        completedThisWeek: { type: Boolean, default: false },
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    referredBy: {
        type: String,
        default: null,
    },
    referralCount: {
        type: Number,
        default: 0,
    },
    collegeName: {
        type: String,
        default: '',
        trim: true,
    },
    campusVerified: {
        type: Boolean,
        default: false,
    },
    likedUsers: [{ type: String }],
}, {
    timestamps: true,
});

userSchema.index({ district: 1, language: 1 });
userSchema.index({ collegeName: 1, campusVerified: 1 });

module.exports = mongoose.model('User', userSchema);
