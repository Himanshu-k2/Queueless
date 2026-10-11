const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Organization = require('../models/Organization');
const Service = require('../models/Service');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const QueueRule = require('../models/QueueRule');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // 1. Clear existing data to prevent duplicates on rerun
    await Organization.deleteMany({});
    await Service.deleteMany({});
    await User.deleteMany({});
    await QueueEntry.deleteMany({});
    await Appointment.deleteMany({});
    await QueueRule.deleteMany({});
    console.log('Cleared existing data.');

    // 2. Create Global Admin (dummy ID reference for ownership)
    const adminUser = await User.create({
      name: 'Global Admin',
      email: process.env.ADMIN_EMAIL || 'admin@queueless.com',
      password: process.env.ADMIN_PASSWORD || 'password123',
      role: 'admin',
      status: 'active'
    });

    // 3. Create Organizations
    const orgsData = [
      // HOSPITALS
      {
        name: 'CityCare Hospital', type: 'Hospital', description: 'Premier healthcare facility in Jamshedpur.',
        address: { city: 'Jamshedpur', state: 'Jharkhand' }, location: { latitude: 22.8056, longitude: 86.2039 },
        businessHours: { open: '08:00', close: '20:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'Sunrise Multispeciality Hospital', type: 'Hospital', description: 'Advanced care in Ranchi.',
        address: { city: 'Ranchi', state: 'Jharkhand' }, location: { latitude: 23.3451, longitude: 85.3106 },
        businessHours: { open: '08:00', close: '22:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'MetroCare Hospital', type: 'Hospital', description: 'Trusted care in Patna.',
        address: { city: 'Patna', state: 'Bihar' }, location: { latitude: 25.5951, longitude: 85.1386 },
        businessHours: { open: '00:00', close: '23:59' }, status: 'approved', owner: adminUser._id
      },
      // BANKS
      {
        name: 'SecureBank', type: 'Bank', description: 'Trusted banking partner in Jamshedpur.',
        address: { city: 'Jamshedpur', state: 'Jharkhand' }, location: { latitude: 22.8026, longitude: 86.2009 },
        businessHours: { open: '09:00', close: '16:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'National Trust Bank', type: 'Bank', description: 'Secure financial services in Ranchi.',
        address: { city: 'Ranchi', state: 'Jharkhand' }, location: { latitude: 23.3421, longitude: 85.3086 },
        businessHours: { open: '09:00', close: '16:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'CapitalBank', type: 'Bank', description: 'Capitalize your finances in Patna.',
        address: { city: 'Patna', state: 'Bihar' }, location: { latitude: 25.5921, longitude: 85.1356 },
        businessHours: { open: '09:00', close: '16:00' }, status: 'approved', owner: adminUser._id
      },
      // COLLEGES / UNIVERSITIES
      {
        name: 'NIT Jamshedpur Student Services', type: 'College', description: 'National Institute of Technology student center.',
        address: { city: 'Jamshedpur', state: 'Jharkhand' }, location: { latitude: 22.7766, longitude: 86.1438 },
        businessHours: { open: '10:00', close: '17:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'Ranchi University Student Centre', type: 'University', description: 'Central hub for Ranchi University students.',
        address: { city: 'Ranchi', state: 'Jharkhand' }, location: { latitude: 23.3731, longitude: 85.3226 },
        businessHours: { open: '10:00', close: '17:00' }, status: 'approved', owner: adminUser._id
      },
      // DIAGNOSTIC CENTRES
      {
        name: 'LifeCheck Diagnostics', type: 'Diagnostic Lab', description: 'Accurate pathology and imaging in Jamshedpur.',
        address: { city: 'Jamshedpur', state: 'Jharkhand' }, location: { latitude: 22.8106, longitude: 86.2109 },
        businessHours: { open: '07:00', close: '21:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'Prime Diagnostics', type: 'Diagnostic Lab', description: 'Fast and reliable tests in Ranchi.',
        address: { city: 'Ranchi', state: 'Jharkhand' }, location: { latitude: 23.3501, longitude: 85.3156 },
        businessHours: { open: '07:00', close: '21:00' }, status: 'approved', owner: adminUser._id
      },
      // GOVERNMENT / PUBLIC SERVICES
      {
        name: 'Citizen Service Centre', type: 'Government Service', description: 'One-stop public services in Jamshedpur.',
        address: { city: 'Jamshedpur', state: 'Jharkhand' }, location: { latitude: 22.7956, longitude: 86.1959 },
        businessHours: { open: '10:00', close: '18:00' }, status: 'approved', owner: adminUser._id
      },
      {
        name: 'Public Service Centre', type: 'Government Service', description: 'Government document assistance in Ranchi.',
        address: { city: 'Ranchi', state: 'Jharkhand' }, location: { latitude: 23.3401, longitude: 85.3056 },
        businessHours: { open: '10:00', close: '18:00' }, status: 'approved', owner: adminUser._id
      }
    ];

    const orgs = await Organization.insertMany(orgsData);
    console.log('Created Organizations.');
    const getOrg = (name) => orgs.find(o => o.name === name);

    // 4. Create Services
    const servicesData = [
      // CityCare
      { name: 'General Consultation', description: 'Meet with a general physician', type: 'queue', estimatedDuration: 15, organization: getOrg('CityCare Hospital')._id },
      { name: 'Cardiology', description: 'Heart specialist', type: 'appointment', estimatedDuration: 30, organization: getOrg('CityCare Hospital')._id },
      { name: 'Pediatrics', description: 'Child specialist', type: 'appointment', estimatedDuration: 20, organization: getOrg('CityCare Hospital')._id },
      { name: 'Orthopedics', description: 'Bone and joint care', type: 'appointment', estimatedDuration: 25, organization: getOrg('CityCare Hospital')._id },
      { name: 'Emergency Consultation', description: 'Urgent medical attention', type: 'queue', estimatedDuration: 10, organization: getOrg('CityCare Hospital')._id },
      
      // Sunrise
      { name: 'General Medicine', description: 'Primary care', type: 'queue', estimatedDuration: 15, organization: getOrg('Sunrise Multispeciality Hospital')._id },
      { name: 'Orthopedics', description: 'Bone specialist', type: 'appointment', estimatedDuration: 25, organization: getOrg('Sunrise Multispeciality Hospital')._id },
      { name: 'Pediatrics', description: 'Child care', type: 'appointment', estimatedDuration: 20, organization: getOrg('Sunrise Multispeciality Hospital')._id },
      { name: 'Diagnostics', description: 'In-house lab', type: 'queue', estimatedDuration: 15, organization: getOrg('Sunrise Multispeciality Hospital')._id },

      // MetroCare
      { name: 'General Consultation', description: 'Primary care', type: 'queue', estimatedDuration: 15, organization: getOrg('MetroCare Hospital')._id },
      { name: 'Cardiology', description: 'Heart center', type: 'appointment', estimatedDuration: 30, organization: getOrg('MetroCare Hospital')._id },
      { name: 'Neurology', description: 'Brain and nerve specialist', type: 'appointment', estimatedDuration: 40, organization: getOrg('MetroCare Hospital')._id },
      { name: 'Pediatrics', description: 'Child care', type: 'queue', estimatedDuration: 20, organization: getOrg('MetroCare Hospital')._id },

      // SecureBank
      { name: 'Account Opening', description: 'Open a new bank account', type: 'queue', estimatedDuration: 20, organization: getOrg('SecureBank')._id },
      { name: 'Cash Services', description: 'Deposit or withdraw cash', type: 'queue', estimatedDuration: 5, organization: getOrg('SecureBank')._id },
      { name: 'Loan Assistance', description: 'Discuss loan options', type: 'appointment', estimatedDuration: 30, organization: getOrg('SecureBank')._id },
      { name: 'Customer Support', description: 'General help', type: 'queue', estimatedDuration: 15, organization: getOrg('SecureBank')._id },

      // National Trust Bank
      { name: 'Account Services', description: 'Manage accounts', type: 'queue', estimatedDuration: 15, organization: getOrg('National Trust Bank')._id },
      { name: 'Cash Counter', description: 'Teller services', type: 'queue', estimatedDuration: 5, organization: getOrg('National Trust Bank')._id },
      { name: 'Loan Services', description: 'Loan inquiries', type: 'appointment', estimatedDuration: 25, organization: getOrg('National Trust Bank')._id },
      { name: 'Card Services', description: 'Credit/Debit cards', type: 'queue', estimatedDuration: 10, organization: getOrg('National Trust Bank')._id },
      
      // CapitalBank
      { name: 'Account Opening', description: 'New accounts', type: 'queue', estimatedDuration: 20, organization: getOrg('CapitalBank')._id },
      { name: 'Cash Services', description: 'Teller transactions', type: 'queue', estimatedDuration: 5, organization: getOrg('CapitalBank')._id },
      { name: 'Loan Services', description: 'Apply for loans', type: 'appointment', estimatedDuration: 30, organization: getOrg('CapitalBank')._id },
      { name: 'Customer Support', description: 'General inquiries', type: 'queue', estimatedDuration: 15, organization: getOrg('CapitalBank')._id },

      // NIT Jamshedpur
      { name: 'Admission', description: 'Admission queries', type: 'queue', estimatedDuration: 15, organization: getOrg('NIT Jamshedpur Student Services')._id },
      { name: 'Examination Section', description: 'Exam related', type: 'queue', estimatedDuration: 10, organization: getOrg('NIT Jamshedpur Student Services')._id },
      { name: 'Scholarship', description: 'Scholarship forms', type: 'queue', estimatedDuration: 15, organization: getOrg('NIT Jamshedpur Student Services')._id },
      { name: 'Certificate Services', description: 'Degree collection', type: 'queue', estimatedDuration: 10, organization: getOrg('NIT Jamshedpur Student Services')._id },

      // Ranchi University
      { name: 'Admission', description: 'Admissions desk', type: 'queue', estimatedDuration: 15, organization: getOrg('Ranchi University Student Centre')._id },
      { name: 'Examination', description: 'Exam queries', type: 'queue', estimatedDuration: 10, organization: getOrg('Ranchi University Student Centre')._id },
      { name: 'Certificates', description: 'Document pickup', type: 'queue', estimatedDuration: 10, organization: getOrg('Ranchi University Student Centre')._id },
      { name: 'Student Support', description: 'General help', type: 'queue', estimatedDuration: 15, organization: getOrg('Ranchi University Student Centre')._id },

      // LifeCheck
      { name: 'Blood Test', description: 'Pathology', type: 'queue', estimatedDuration: 10, organization: getOrg('LifeCheck Diagnostics')._id },
      { name: 'X-Ray', description: 'Radiology', type: 'queue', estimatedDuration: 15, organization: getOrg('LifeCheck Diagnostics')._id },
      { name: 'Health Package', description: 'Full body check', type: 'appointment', estimatedDuration: 60, organization: getOrg('LifeCheck Diagnostics')._id },
      { name: 'Sample Collection', description: 'Drop off samples', type: 'queue', estimatedDuration: 5, organization: getOrg('LifeCheck Diagnostics')._id },

      // Prime Diagnostics
      { name: 'Blood Test', description: 'Pathology', type: 'queue', estimatedDuration: 10, organization: getOrg('Prime Diagnostics')._id },
      { name: 'MRI', description: 'Scan center', type: 'appointment', estimatedDuration: 45, organization: getOrg('Prime Diagnostics')._id },
      { name: 'X-Ray', description: 'Radiology', type: 'queue', estimatedDuration: 15, organization: getOrg('Prime Diagnostics')._id },
      { name: 'Health Package', description: 'Checkup', type: 'appointment', estimatedDuration: 60, organization: getOrg('Prime Diagnostics')._id },

      // Citizen Service Centre
      { name: 'Certificate Services', description: 'Birth, caste, income', type: 'queue', estimatedDuration: 20, organization: getOrg('Citizen Service Centre')._id },
      { name: 'Application Support', description: 'Form filling', type: 'queue', estimatedDuration: 15, organization: getOrg('Citizen Service Centre')._id },
      { name: 'Document Verification', description: 'Official attestation', type: 'appointment', estimatedDuration: 15, organization: getOrg('Citizen Service Centre')._id },

      // Public Service Centre
      { name: 'Document Services', description: 'Govt records', type: 'queue', estimatedDuration: 20, organization: getOrg('Public Service Centre')._id },
      { name: 'Application Support', description: 'Help desk', type: 'queue', estimatedDuration: 15, organization: getOrg('Public Service Centre')._id },
      { name: 'Citizen Assistance', description: 'General issues', type: 'queue', estimatedDuration: 15, organization: getOrg('Public Service Centre')._id }
    ];

    const services = await Service.insertMany(servicesData);
    console.log('Created Services.');

    // 5. Create Staff
    await User.create({ name: 'Rahul Sharma', email: 'rahul.sharma@queueless.com', password: 'password123', role: 'staff', status: 'active', organizations: [getOrg('CityCare Hospital')._id] });
    await User.create({ name: 'Sunrise Staff', email: 'staff.sunrise@queueless.com', password: 'password123', role: 'staff', status: 'active', organizations: [getOrg('Sunrise Multispeciality Hospital')._id] });
    await User.create({ name: 'Priya Singh', email: 'priya.singh@queueless.com', password: 'password123', role: 'staff', status: 'active', organizations: [getOrg('SecureBank')._id] });
    await User.create({ name: 'Aman Kumar', email: 'aman.kumar@queueless.com', password: 'password123', role: 'staff', status: 'active', organizations: [getOrg('LifeCheck Diagnostics')._id] });
    console.log('Created Staff accounts.');

    // 6. Create Customers
    const c1 = await User.create({ name: 'Rahul Kumar', email: 'rahul@example.com', password: 'password123', role: 'customer' });
    const c2 = await User.create({ name: 'Priya Verma', email: 'priya@example.com', password: 'password123', role: 'customer' });
    const c3 = await User.create({ name: 'Amit Sharma', email: 'amit@example.com', password: 'password123', role: 'customer' });
    const c4 = await User.create({ name: 'Sneha Patel', email: 'sneha@example.com', password: 'password123', role: 'customer' });
    const c5 = await User.create({ name: 'Vikram Das', email: 'vikram@example.com', password: 'password123', role: 'customer' });
    console.log('Created Customer accounts.');

    // 7. Seed active queues & appointments
    const cityCareGenConsult = services.find(s => s.name === 'General Consultation' && s.organization.equals(getOrg('CityCare Hospital')._id));
    const secureBankCash = services.find(s => s.name === 'Cash Services' && s.organization.equals(getOrg('SecureBank')._id));
    const lifeCheckBlood = services.find(s => s.name === 'Blood Test' && s.organization.equals(getOrg('LifeCheck Diagnostics')._id));
    
    if (cityCareGenConsult) {
      await QueueEntry.create({ customer: c1._id, organization: cityCareGenConsult.organization, service: cityCareGenConsult._id, tokenNumber: 'TKN-1001', status: 'completed', joinedAt: new Date(Date.now() - 3600000), calledAt: new Date(Date.now() - 3000000), completedAt: new Date(Date.now() - 2000000) });
      await QueueEntry.create({ customer: c2._id, organization: cityCareGenConsult.organization, service: cityCareGenConsult._id, tokenNumber: 'TKN-1002', status: 'serving', joinedAt: new Date(Date.now() - 2000000), calledAt: new Date(Date.now() - 500000), servedAt: new Date(Date.now() - 200000) });
      await QueueEntry.create({ customer: c3._id, organization: cityCareGenConsult.organization, service: cityCareGenConsult._id, tokenNumber: 'TKN-1003', status: 'waiting', joinedAt: new Date(Date.now() - 1000000) });
    }
    
    if (secureBankCash) {
      await QueueEntry.create({ customer: c4._id, organization: secureBankCash.organization, service: secureBankCash._id, tokenNumber: 'TKN-2001', status: 'waiting', joinedAt: new Date(Date.now() - 100000) });
    }

    if (lifeCheckBlood) {
      await QueueEntry.create({ customer: c5._id, organization: lifeCheckBlood.organization, service: lifeCheckBlood._id, tokenNumber: 'TKN-3001', status: 'waiting', joinedAt: new Date(Date.now() - 200000) });
    }

    const cityCareCardio = services.find(s => s.name === 'Cardiology' && s.organization.equals(getOrg('CityCare Hospital')._id));
    if (cityCareCardio) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await Appointment.create({
        customer: c2._id,
        organization: cityCareCardio.organization,
        service: cityCareCardio._id,
        date: tomorrow,
        time: '10:00',
        tokenNumber: 'APT-5050',
        status: 'scheduled'
      });
    }

    console.log('Seeded Queues & Appointments.');
    console.log('Data Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
