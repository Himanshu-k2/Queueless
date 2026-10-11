const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String, // e.g. "10:00 AM"
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
  },
  tokenNumber: {
    type: String,
  },
  checkInStatus: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  }
}, { timestamps: true });

// Compound index for querying a user's appointments in an org or on a date
appointmentSchema.index({ organization: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
