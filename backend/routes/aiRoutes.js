const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { chat } = require('../controllers/aiController');

// Optional authentication middleware:
// Populates req.user if a valid Bearer token is provided,
// but gracefully allows guests/visitors without blocking requests.
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      if (token && token !== 'undefined' && token !== 'null') {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id === 'admin_env') {
          req.user = { _id: 'admin_env', role: 'admin', name: 'Global Admin', email: process.env.ADMIN_EMAIL, organizations: [] };
        } else {
          req.user = await User.findById(decoded.id).select('-password');
        }
      }
    } catch (err) {
      // Invalid/expired token: continue unauthenticated without throwing error
      req.user = null;
    }
  }
  next();
};

router.post('/chat', optionalAuth, chat);

module.exports = router;
