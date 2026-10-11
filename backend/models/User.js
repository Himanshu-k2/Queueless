const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'admin'],
    default: 'customer',
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'active' // customers default to active, staff explicitly set to pending on registration
  },
  organizations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }],
  phone: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
