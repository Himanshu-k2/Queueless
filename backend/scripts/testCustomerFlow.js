const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const jwt = require('jsonwebtoken');

dotenv.config();

const runTest = async () => {
  try {
    await connectDB();
    console.log('Connected to DB for testing.');

    // 1. Find or create a test customer
    const email = 'pappu.customer@test.com';
    let customer = await User.findOne({ email });
    if (!customer) {
      customer = await User.create({
        name: 'Pappu Kumar',
        email,
        password: 'password123',
        phone: '9876543210',
        role: 'customer',
        status: 'active'
      });
      console.log('Created test customer: Pappu Kumar');
    } else {
      console.log('Found existing test customer: ' + customer.name);
    }

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('Generated test token.');

    // 2. Test profile fetch & update
    const userController = require('../controllers/userController');
    
    // Simulate updating profile
    let mockReq = {
      user: customer,
      body: { name: 'Pappu Updated', phone: '9988776655' }
    };
    let mockRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ code, ...data }) })
    };

    let updated = await new Promise((resolve) => {
      userController.updateUserProfile(mockReq, {
        json: resolve,
        status: (code) => ({ json: (d) => resolve({ code, ...d }) })
      }, (err) => resolve({ error: err }));
    });
    console.log('Profile update response name:', updated.name, 'phone:', updated.phone);
    if (updated.name !== 'Pappu Updated') throw new Error('Profile update failed');

    // 3. Test Service retrieval
    const service = await Service.findOne({ type: 'appointment' }).populate('organization');
    if (!service) throw new Error('No appointment service found in DB');
    console.log(`Found service: ${service.name} (${service._id}) at ${service.organization.name}`);

    // 4. Test Available Slots
    const appointmentController = require('../controllers/appointmentController');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const slotsReq = {
      query: { serviceId: service._id.toString(), date: dateStr }
    };
    const slots = await new Promise((resolve) => {
      appointmentController.getAvailableSlots(slotsReq, {
        json: resolve,
        status: (code) => ({ json: (d) => resolve({ code, ...d }) })
      });
    });
    console.log(`Available slots for ${dateStr}: ${slots.length} slots.`);
    if (!Array.isArray(slots) || slots.length === 0) throw new Error('No available slots returned');

    const chosenSlot = slots[0].time24;

    // 5. Test Booking
    // Clean any existing test appointments for this customer on dateStr
    await Appointment.deleteMany({ customer: customer._id, date: { $gte: new Date(dateStr) } });

    const bookReq = {
      user: customer,
      body: {
        service: service._id.toString(),
        date: dateStr,
        time: chosenSlot
      }
    };
    const booked = await new Promise((resolve) => {
      appointmentController.bookAppointment(bookReq, {
        status: (code) => ({ json: (d) => resolve({ code, ...d }) }),
        json: resolve
      });
    });
    const tokenNumber = booked.tokenNumber || booked._doc?.tokenNumber;
    const appointmentId = booked._id || booked._doc?._id;
    console.log(`Booked appointment token: ${tokenNumber}, status: ${booked.code || 201}`);
    if (!tokenNumber) throw new Error('Booking failed: ' + JSON.stringify(booked));

    // 6. Test Duplicate Booking Prevention
    const duplicateBooked = await new Promise((resolve) => {
      appointmentController.bookAppointment(bookReq, {
        status: (code) => ({ json: (d) => resolve({ code, ...d }) }),
        json: resolve
      });
    });
    console.log(`Duplicate prevention check code: ${duplicateBooked.code}, message: ${duplicateBooked.message}`);
    if (duplicateBooked.code !== 400) throw new Error('Duplicate booking was not prevented!');

    // 7. Test Get User Appointments
    const appts = await new Promise((resolve) => {
      appointmentController.getUserAppointments({ user: customer }, {
        json: resolve,
        status: (code) => ({ json: (d) => resolve({ code, ...d }) })
      });
    });
    console.log(`Customer has ${appts.length} appointment(s). Org populated: ${appts[0].organization.name}`);
    if (!appts[0].organization?.name) throw new Error('Organization not populated in appointments');

    // 8. Test Active Queues for Customer
    const queueController = require('../controllers/queueController');
    const queueService = require('../services/queueService');
    const queueSvc = await Service.findOne({ type: 'queue' });
    if (queueSvc) {
      // Clean previous active queue for this service
      await QueueEntry.deleteMany({ customer: customer._id, service: queueSvc._id });
      await queueService.joinQueue(customer._id, queueSvc.organization, queueSvc._id);
      console.log(`Joined digital queue for service: ${queueSvc.name}`);
    }

    const myQueues = await new Promise((resolve) => {
      queueController.getMyQueues({ user: customer }, {
        json: resolve,
        status: (code) => ({ json: (d) => resolve({ code, ...d }) })
      });
    });
    console.log(`Customer active queues count: ${myQueues.length}`);
    if (myQueues.length > 0) {
      console.log(`First active queue token: ${myQueues[0].tokenNumber}, peopleAhead: ${myQueues[0].peopleAhead}, wait: ${myQueues[0].estimatedWaitTime}m`);
    }

    // 9. Test Appointment Cancellation
    const cancelRes = await new Promise((resolve) => {
      appointmentController.cancelAppointment({ params: { id: appointmentId.toString() }, user: customer }, {
        json: resolve,
        status: (code) => ({ json: (d) => resolve({ code, ...d }) })
      });
    });
    console.log('Appointment cancel message:', cancelRes.message);
    if (!cancelRes.appointment || cancelRes.appointment.status !== 'cancelled') {
      throw new Error('Appointment was not cancelled');
    }

    console.log('\n========================================');
    console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
};

runTest();
