const express = require('express');
const router = express.Router();
const { registerUser, registerStaff, loginUser, getUserProfile } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/register-staff', registerStaff);
router.post('/login', loginUser);
router.post('/logout', (req, res) => res.json({ message: 'Logged out successfully' }));
router.route('/profile').get(requireAuth, getUserProfile);

module.exports = router;
