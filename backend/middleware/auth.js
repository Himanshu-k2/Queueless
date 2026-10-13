const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.id === 'admin_env') {
        req.user = { _id: 'admin_env', role: 'admin', name: 'Global Admin', email: process.env.ADMIN_EMAIL, organizations: [] };
        return next();
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found or session expired.' });
      }
      return next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Access denied. Staff role required.' });
  }
  next();
};

const checkStaffOrgAccess = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  
  const orgId = req.params.orgId || req.query.orgId || req.body.organization || req.body.orgId;
  
  if (req.user.role === 'staff') {
    if (!orgId) return res.status(400).json({ message: 'Organization ID is required to verify access.' });
    
    const userOrgs = req.user.organizations.map(id => id.toString());
    if (!userOrgs.includes(orgId.toString())) {
      return res.status(403).json({ message: 'You are not authorized to manage this organization.' });
    }
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireStaff, checkStaffOrgAccess };
