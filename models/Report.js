const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['contact', 'bug'],
        required: true
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    message: {
        type: String
    },
    bugName: {
        type: String
    },
    bugDescription: {
        type: String
    },
    deviceType: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
