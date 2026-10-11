const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

exports.registerUser = async (req, res, next) => {
  const { name, email, password, phone } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    const user = await User.create({ name, email, password, phone, role: 'customer', status: 'active' });
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

exports.registerStaff = async (req, res, next) => {
  const { name, email, password, phone, organization } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    const user = await User.create({ 
      name, 
      email, 
      password, 
      phone, 
      role: 'staff', 
      status: 'pending',
      organizations: organization ? [organization] : []
    });
    
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        message: 'Staff registration submitted and pending admin approval.'
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // Check if it's the admin credentials from env
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      return res.json({
        _id: 'admin_env',
        name: 'QueueLess Global Admin',
        email: process.env.ADMIN_EMAIL,
        role: 'admin',
        token: generateToken('admin_env'), // fake ID for JWT, we will intercept this in requireAuth
      });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (user.role === 'staff') {
        if (user.status === 'pending') {
          return res.status(403).json({ message: 'Your staff account is pending admin approval.' });
        }
        if (user.status === 'rejected') {
          return res.status(403).json({ message: 'Your staff account was rejected.' });
        }
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};
