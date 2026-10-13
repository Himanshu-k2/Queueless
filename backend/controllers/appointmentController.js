const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Organization = require('../models/Organization');

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const minutesToTime = (mins) => {
  const hours = Math.floor(mins / 60).toString().padStart(2, '0');
  const minutes = (mins % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatTime12H = (time24) => {
  const [h, m] = time24.split(':');
  const hInt = parseInt(h, 10);
  const ampm = hInt >= 12 ? 'PM' : 'AM';
  const h12 = hInt % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const parseDateString = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  return new Date(d).toISOString().split('T')[0];
};

exports.getAvailableSlots = async (req, res) => {
  let { orgId, serviceId, date } = req.query;
  
  if (!serviceId || !date) {
    return res.status(400).json({ message: 'Service and date are required.' });
  }

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    if (!orgId) {
      orgId = service.organization;
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const dateStr = parseDateString(date);
    const todayStr = new Date().toISOString().split('T')[0];

    if (dateStr < todayStr) {
      return res.status(400).json({ message: 'Cannot book appointments in the past.' });
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    const openMins = timeToMinutes(org.businessHours?.open || '09:00');
    const closeMins = timeToMinutes(org.businessHours?.close || '17:00');
    const duration = service.estimatedDuration || 15;

    // Fetch existing scheduled appointments
    const bookedAppointments = await Appointment.find({
      organization: org._id,
      service: service._id,
      date: { $gte: selectedDate, $lt: nextDay },
      status: 'scheduled'
    });

    const bookedTimes = bookedAppointments.map(app => app.time); // e.g. "09:00"
    
    // Generate slots
    const slots = [];
    const now = new Date();
    const isToday = dateStr === todayStr;
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (let m = openMins; m + duration <= closeMins; m += duration) {
      const time24 = minutesToTime(m);
      
      // If it's today, filter out past slots + 15 min buffer
      if (isToday && m <= currentMins + 15) {
        continue;
      }

      if (!bookedTimes.includes(time24)) {
        slots.push({
          time24,
          time12: formatTime12H(time24)
        });
      }
    }

    res.json(slots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Failed to fetch available slots. Please try again.' });
  }
};

exports.bookAppointment = async (req, res) => {
  let { organization, service, date, time, notes } = req.body;
  try {
    if (!service || !date || !time) {
      return res.status(400).json({ message: 'Service, date, and time are required.' });
    }

    const serviceDoc = await Service.findById(service);
    if (!serviceDoc) {
      return res.status(404).json({ message: 'Selected service not found.' });
    }

    if (!organization) {
      organization = serviceDoc.organization;
    }

    const org = await Organization.findById(organization);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const dateStr = parseDateString(date);
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (dateStr < todayStr) {
      return res.status(400).json({ message: 'Cannot book appointments in the past.' });
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    // Check organization business hours
    const openMins = timeToMinutes(org.businessHours?.open || '09:00');
    const closeMins = timeToMinutes(org.businessHours?.close || '17:00');
    const reqMins = timeToMinutes(time);

    if (reqMins < openMins || reqMins >= closeMins) {
      return res.status(400).json({ message: 'Requested time is outside business hours.' });
    }

    // If today, prevent booking past time
    if (dateStr === todayStr) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      if (reqMins <= currentMins) {
        return res.status(400).json({ message: 'Cannot book a time slot in the past.' });
      }
    }

    // Check duplicates for this customer
    const existingUserAppt = await Appointment.findOne({
      customer: req.user._id,
      service: serviceDoc._id,
      date: { $gte: selectedDate, $lt: nextDay },
      status: 'scheduled'
    });

    if (existingUserAppt) {
      return res.status(400).json({ message: 'You already have an appointment for this service on the selected date.' });
    }

    // Check capacity (slot already taken)
    const slotTaken = await Appointment.findOne({
      organization: org._id,
      service: serviceDoc._id,
      date: { $gte: selectedDate, $lt: nextDay },
      time,
      status: 'scheduled'
    });

    if (slotTaken) {
      return res.status(400).json({ message: 'That time slot is no longer available. Please choose another time.' });
    }

    // Token generation
    const tokenNumber = `APT-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const appointment = new Appointment({
      customer: req.user._id,
      organization: org._id,
      service: serviceDoc._id,
      date: selectedDate,
      time,
      notes,
      tokenNumber
    });
    
    const createdAppointment = await appointment.save();

    // Notify real-time listeners
    try {
      const io = require('../socket').getIo();
      io.to(`user_${req.user._id}`).emit('user_updated');
    } catch (e) {}

    res.status(201).json(createdAppointment);
  } catch (error) {
    console.error('Appointment booking error:', error);
    res.status(500).json({ message: error.message || 'An unexpected error occurred while booking. Please try again later.' });
  }
};

exports.getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user._id })
      .populate('organization', 'name type address businessHours')
      .populate('service', 'name estimatedDuration type description')
      .sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    res.status(500).json({ message: 'Failed to fetch your appointments.' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, customer: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment is already cancelled.' });
    }
    if (appointment.status !== 'scheduled') {
      return res.status(400).json({ message: `Cannot cancel an appointment that is ${appointment.status}.` });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    try {
      const io = require('../socket').getIo();
      io.to(`user_${req.user._id}`).emit('user_updated');
    } catch (e) {}

    res.json({ message: 'Appointment cancelled successfully.', appointment });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Failed to cancel appointment. Please try again.' });
  }
};

exports.rescheduleAppointment = async (req, res) => {
  const { date, time } = req.body;
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, customer: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({ message: `Cannot reschedule an appointment that is ${appointment.status}.` });
    }

    const dateStr = parseDateString(date);
    const todayStr = new Date().toISOString().split('T')[0];

    if (dateStr < todayStr) {
      return res.status(400).json({ message: 'Cannot reschedule to a date in the past.' });
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    const org = await Organization.findById(appointment.organization);
    const openMins = timeToMinutes(org?.businessHours?.open || '09:00');
    const closeMins = timeToMinutes(org?.businessHours?.close || '17:00');
    const reqMins = timeToMinutes(time);

    if (reqMins < openMins || reqMins >= closeMins) {
      return res.status(400).json({ message: 'Requested time is outside business hours.' });
    }

    if (dateStr === todayStr) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      if (reqMins <= currentMins) {
        return res.status(400).json({ message: 'Cannot reschedule to a past time slot today.' });
      }
    }

    const slotTaken = await Appointment.findOne({
      _id: { $ne: appointment._id },
      organization: appointment.organization,
      service: appointment.service,
      date: { $gte: selectedDate, $lt: nextDay },
      time,
      status: 'scheduled'
    });

    if (slotTaken) {
      return res.status(400).json({ message: 'That time slot is no longer available. Please choose another time.' });
    }

    appointment.date = selectedDate;
    appointment.time = time;
    await appointment.save();

    try {
      const io = require('../socket').getIo();
      io.to(`user_${req.user._id}`).emit('user_updated');
    } catch (e) {}

    res.json({ message: 'Appointment rescheduled successfully.', appointment });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ message: 'Failed to reschedule appointment. Please try again.' });
  }
};
