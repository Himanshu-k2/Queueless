const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['Hospital', 'Bank', 'College', 'University', 'Diagnostic Lab', 'Government Service', 'Other'],
    required: true,
  },
  description: {
    type: String,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  contactEmail: {
    type: String,
  },
  contactPhone: {
    type: String,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessHours: {
    open: { type: String, default: "09:00" }, // 24H format
    close: { type: String, default: "17:00" } // 24H format
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
