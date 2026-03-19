const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    emoji: {
        type: String,
        default: '💬',
    },
    desc: {
        type: String,
        default: '',
        trim: true,
    },
    isDefault: {
        type: Boolean,
        default: false, // system rooms cannot be deleted
    },
    createdBy: {
        type: String,
        default: null, // uid of creator; null = system room
    },
    maxSize: {
        type: Number,
        default: 6,
        min: 2,
        max: 12,
    },
    topic: {
        type: String,
        default: '',
        trim: true,
    },
    tags: [{ type: String }],
    district: {
        type: String,
        default: '',
        trim: true,
    },
    language: {
        type: String,
        enum: ['Tamil', 'English', 'Both', ''],
        default: '',
    },
    roomType: {
        type: String,
        enum: ['public', 'district', 'interest', 'event'],
        default: 'public',
    },
    isPersistent: {
        type: Boolean,
        default: true,
    },
    scheduledAt: {
        type: Date,
        default: null,
    },
    hostUid: {
        type: String,
        default: null,
    },
    hostToolsEnabled: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

roomSchema.index({ district: 1, language: 1, roomType: 1 });
roomSchema.index({ tags: 1, topic: 1 });

module.exports = mongoose.model('Room', roomSchema);
