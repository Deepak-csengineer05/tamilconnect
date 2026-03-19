const mongoose = require('mongoose');

const roomEventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        roomKey: {
            type: String,
            required: true,
            index: true,
        },
        hostUid: {
            type: String,
            required: true,
            index: true,
        },
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
        startsAt: {
            type: Date,
            required: true,
            index: true,
        },
        endsAt: {
            type: Date,
            default: null,
        },
        capacity: {
            type: Number,
            default: 50,
            min: 2,
            max: 500,
        },
        rsvps: [{ type: String }],
        isCancelled: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('RoomEvent', roomEventSchema);
