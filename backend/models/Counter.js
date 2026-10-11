const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  currentStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Counter', counterSchema);
