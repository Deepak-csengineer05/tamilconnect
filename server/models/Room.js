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
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
