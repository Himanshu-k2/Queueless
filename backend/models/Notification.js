const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['queue_update', 'appointment_reminder', 'system'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedData: {
    type: mongoose.Schema.Types.Mixed,
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
