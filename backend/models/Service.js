const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['queue', 'appointment', 'both'],
    default: 'queue',
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 15,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
