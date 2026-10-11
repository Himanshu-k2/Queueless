const express = require('express');
const router = express.Router();
const { joinQueue, getQueueStatus, updateQueueStatus, callNext, getActiveQueue } = require('../controllers/queueController');
const { requireAuth, requireAdmin, requireStaff, checkStaffOrgAccess } = require('../middleware/auth');

router.route('/')
  .post(requireAuth, joinQueue);

router.route('/active')
  .get(requireAuth, requireStaff, checkStaffOrgAccess, getActiveQueue);

router.route('/process-carry-forward')
  .post(requireAuth, requireStaff, checkStaffOrgAccess, require('../controllers/queueController').processCarryForward);

router.route('/call-next')
  .post(requireAuth, requireStaff, checkStaffOrgAccess, callNext);

router.route('/:id')
  .get(requireAuth, getQueueStatus)
  .put(requireAuth, updateQueueStatus);

module.exports = router;
