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

exports.getAvailableSlots = async (req, res) => {
  const { orgId, serviceId, date } = req.query;
  
  if (!orgId || !serviceId || !date) {
    return res.status(400).json({ message: 'Organization, service, and date are required.' });
  }

  try {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({ message: 'Cannot book appointments in the past.' });
    }

    const org = await Organization.findById(orgId);
    const service = await Service.findById(serviceId);

    if (!org || !service) {
      return res.status(404).json({ message: 'Organization or Service not found.' });
    }

    const openMins = timeToMinutes(org.businessHours?.open || '09:00');
    const closeMins = timeToMinutes(org.businessHours?.close || '17:00');
    const duration = service.estimatedDuration || 15;

    // Fetch existing appointments
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const bookedAppointments = await Appointment.find({
      organization: orgId,
      service: serviceId,
      date: { $gte: selectedDate, $lt: nextDay },
      status: { $in: ['scheduled'] }
    });

    const bookedTimes = bookedAppointments.map(app => app.time); // e.g. "09:00"
    
    // Generate slots
    const slots = [];
    const now = new Date();
    const isToday = selectedDate.getTime() === today.getTime();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (let m = openMins; m + duration <= closeMins; m += duration) {
      const time24 = minutesToTime(m);
      
      // If it's today, filter out past slots + 30 min buffer
      if (isToday && m < currentMins + 30) {
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
    res.status(500).json({ message: 'Failed to fetch available slots. Please try again.' });
  }
};

exports.bookAppointment = async (req, res) => {
  const { organization, service, date, time, notes } = req.body;
  try {
    if (!organization || !service || !date || !time) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({ message: 'Cannot book appointments in the past.' });
    }

    // Check organization business hours
    const org = await Organization.findById(organization);
    const openMins = timeToMinutes(org.businessHours?.open || '09:00');
    const closeMins = timeToMinutes(org.businessHours?.close || '17:00');
    const reqMins = timeToMinutes(time);

    if (reqMins < openMins || reqMins >= closeMins) {
      return res.status(400).json({ message: 'Requested time is outside business hours.' });
    }

    // Check duplicates for this user
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingUserAppt = await Appointment.findOne({
      customer: req.user._id,
      service,
      date: { $gte: selectedDate, $lt: nextDay },
      status: 'scheduled'
    });

    if (existingUserAppt) {
      return res.status(400).json({ message: 'You already have an appointment for this service on the selected date.' });
    }

    // Check capacity (slot already taken)
    const slotTaken = await Appointment.findOne({
      organization,
      service,
      date: { $gte: selectedDate, $lt: nextDay },
      time,
      status: 'scheduled'
    });

    if (slotTaken) {
      return res.status(400).json({ message: 'That time slot is no longer available. Please choose another time.' });
    }

    // Basic logic for token generation
    const tokenNumber = `APT-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const appointment = new Appointment({
      customer: req.user._id,
      organization,
      service,
      date: selectedDate,
      time,
      notes,
      tokenNumber
    });
    
    const createdAppointment = await appointment.save();
    res.status(201).json(createdAppointment);
  } catch (error) {
    res.status(500).json({ message: 'An unexpected error occurred while booking. Please try again later.' });
  }
};

exports.getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user._id })
      .populate('organization', 'name')
      .populate('service', 'name')
      .sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (error) {
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
    res.json({ message: 'Appointment cancelled successfully.', appointment });
  } catch (error) {
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

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({ message: 'Cannot reschedule to a date in the past.' });
    }

    const org = await Organization.findById(appointment.organization);
    const openMins = timeToMinutes(org.businessHours?.open || '09:00');
    const closeMins = timeToMinutes(org.businessHours?.close || '17:00');
    const reqMins = timeToMinutes(time);

    if (reqMins < openMins || reqMins >= closeMins) {
      return res.status(400).json({ message: 'Requested time is outside business hours.' });
    }

    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

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

    res.json({ message: 'Appointment rescheduled successfully.', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reschedule appointment. Please try again.' });
  }
};
