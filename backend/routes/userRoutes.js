const express = require('express');
const router = express.Router();
const { registerUser, registerStaff, loginUser, getUserProfile, updateUserProfile, changePassword } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/register-staff', registerStaff);
router.post('/login', loginUser);
router.post('/logout', (req, res) => res.json({ message: 'Logged out successfully' }));
router.route('/profile')
  .get(requireAuth, getUserProfile)
  .put(requireAuth, updateUserProfile);
router.put('/change-password', requireAuth, changePassword);

module.exports = router;
