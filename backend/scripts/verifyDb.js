const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');

dotenv.config();

const verifyData = async () => {
  await connectDB();
  const orgCount = await Organization.countDocuments();
  const userCount = await User.countDocuments();
  const staffCount = await User.countDocuments({ role: 'staff' });
  const customerCount = await User.countDocuments({ role: 'customer' });
  const serviceCount = await Service.countDocuments();
  const appointmentCount = await Appointment.countDocuments();
  const queueCount = await QueueEntry.countDocuments();
  
  console.log(`Organisations: ${orgCount}`);
  console.log(`Users Total: ${userCount} (Staff: ${staffCount}, Customers: ${customerCount})`);
  console.log(`Services: ${serviceCount}`);
  console.log(`Appointments: ${appointmentCount}`);
  console.log(`Queue Entries: ${queueCount}`);
  process.exit(0);
};

verifyData();
