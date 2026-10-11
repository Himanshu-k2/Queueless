const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');

router.post('/chat', requireAuth, chat);

module.exports = router;
