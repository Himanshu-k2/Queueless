const mongoose = require('mongoose');

const queueRuleSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  strategy: {
    type: String,
    enum: ['FIFO', 'PRIORITY'],
    default: 'FIFO'
  },
  maxQueueSize: {
    type: Number,
    default: 100,
  },
  maxSkipsBeforeNoShow: {
    type: Number,
    default: 2,
  },
  
  // Hospital specific / Allocation Window configuration
  allocationWindow: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String }, // e.g., "16:00"
    endTime: { type: String },   // e.g., "16:20"
    carryForwardEnabled: { type: Boolean, default: false },
    morningCutoffTime: { type: String } // e.g., "13:00"
  },
  
  // Bank / College configuration
  routingStrategy: {
    type: String,
    enum: ['SERVICE', 'COUNTER', 'DEPARTMENT'],
    default: 'SERVICE'
  },
  
  // Diagnostic Lab configuration
  waitlist: {
    enabled: { type: Boolean, default: false },
    maxCapacity: { type: Number, default: 20 }
  }
}, { timestamps: true });

module.exports = mongoose.model('QueueRule', queueRuleSchema);
