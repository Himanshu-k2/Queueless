const express = require('express');
const router = express.Router();
const { getOrganizations, getOrganizationById, createOrganization } = require('../controllers/orgController');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');

router.route('/')
  .get(getOrganizations)
  .post(requireAuth, requireAdmin, createOrganization);

router.route('/staff/my-orgs')
  .get(requireAuth, requireStaff, require('../controllers/orgController').getMyOrganizations);

router.route('/:id')
  .get(getOrganizationById);

module.exports = router;
