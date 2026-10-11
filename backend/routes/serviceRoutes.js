const express = require('express');
const router = express.Router();
const { getServicesByOrg, createService } = require('../controllers/serviceController');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');

router.route('/org/:orgId')
  .get(getServicesByOrg);

router.route('/')
  .post(requireAuth, requireAdmin, createService);

module.exports = router;
