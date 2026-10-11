const express = require('express');
const router = express.Router();
const { bookAppointment, getUserAppointments, getAvailableSlots, cancelAppointment } = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');

router.get('/available-slots', getAvailableSlots);

router.route('/')
  .post(requireAuth, bookAppointment)
  .get(requireAuth, getUserAppointments);

router.put('/:id/cancel', requireAuth, cancelAppointment);
router.put('/:id/reschedule', requireAuth, require('../controllers/appointmentController').rescheduleAppointment);

module.exports = router;
