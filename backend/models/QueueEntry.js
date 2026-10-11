const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'called', 'serving', 'completed', 'skipped', 'no-show', 'cancelled'],
    default: 'waiting',
    index: true,
  },
  tokenNumber: {
    type: String,
    required: true,
  },
  position: {
    type: Number,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  calledAt: Date,
  servedAt: Date,
  completedAt: Date,
  priorityScore: {
    type: Number,
    default: 0
  },
  isWaitlisted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

queueEntrySchema.index({ organization: 1, service: 1, status: 1 });

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
