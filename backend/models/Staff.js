const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['staff', 'manager'],
    default: 'staff',
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

// Prevent a user from being staff twice in the same org
staffSchema.index({ user: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('Staff', staffSchema);
