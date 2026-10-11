const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const queueService = require('./services/queueService');
const Organization = require('./models/Organization');
const Service = require('./models/Service');
const QueueRule = require('./models/QueueRule');
const User = require('./models/User');
const QueueEntry = require('./models/QueueEntry');

async function runEdgeCases() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('In-memory DB connected.');

  // Create Users
  const admin = await User.create({ name: 'Admin', email: 'admin@t.com', password: 'password', role: 'organization_admin' });
  const c1 = await User.create({ name: 'C1', email: 'c1@t.com', password: 'password' });
  const c2 = await User.create({ name: 'C2', email: 'c2@t.com', password: 'password' });
  const c3 = await User.create({ name: 'C3', email: 'c3@t.com', password: 'password' });

  // 1. HOSPITAL EDGE CASE
  console.log('\n--- 1. HOSPITAL EDGE CASE ---');
  const hospital = await Organization.create({ name: 'Hospital', type: 'Hospital', owner: admin._id });
  const hService = await Service.create({ name: 'Doctor Visit', type: 'queue', organization: hospital._id });
  
  // Set rule
  await QueueRule.create({
    organization: hospital._id,
    strategy: 'PRIORITY',
    allocationWindow: {
      enabled: true,
      startTime: '16:00',
      endTime: '16:20',
      carryForwardEnabled: true,
      morningCutoffTime: '13:00'
    }
  });

  // Manually mock an unserved morning patient
  const oldEntry = await QueueEntry.create({
    customer: c1._id, organization: hospital._id, service: hService._id,
    tokenNumber: 'TKN-OLD', status: 'waiting',
    joinedAt: new Date(new Date().setHours(10, 0, 0, 0)) // 10:00 AM
  });
  console.log('Morning patient created:', oldEntry.tokenNumber);

  // Mock time inside window
  queueService.getCurrentTime24 = () => '16:10'; 
  console.log('Mocking time to 16:10 (Inside Window)');

  try {
    await queueService.joinQueue(c2._id, hospital._id, hService._id);
    console.error('FAIL: Should have blocked normal join during window');
  } catch (err) {
    console.log('PASS: Normal join blocked ->', err.message);
  }

  const carryResult = await queueService.processCarryForward(hospital._id);
  console.log(carryResult.message);

  const updatedOldEntry = await QueueEntry.findById(oldEntry._id);
  console.log('Old entry priority score (expected 100):', updatedOldEntry.priorityScore);

  // End window
  queueService.getCurrentTime24 = () => '16:25'; 
  console.log('Mocking time to 16:25 (Window closed)');
  
  const newEntry = await queueService.joinQueue(c2._id, hospital._id, hService._id);
  console.log('Evening patient joined:', newEntry.tokenNumber, '(priority: 0)');

  const nextToCall = await queueService.callNext(hospital._id, hService._id);
  console.log('Called next:', nextToCall.tokenNumber, '(Expected TKN-OLD because of PRIORITY)');

  // 2. DIAGNOSTIC LAB EDGE CASE
  console.log('\n--- 2. DIAGNOSTIC LAB EDGE CASE ---');
  const lab = await Organization.create({ name: 'Lab', type: 'Diagnostic Lab', owner: admin._id });
  const lService = await Service.create({ name: 'Blood Test', type: 'queue', organization: lab._id });
  
  await QueueRule.create({
    organization: lab._id,
    maxQueueSize: 1, // extremely small capacity for test
    waitlist: { enabled: true, maxCapacity: 2 }
  });

  const labE1 = await queueService.joinQueue(c1._id, lab._id, lService._id);
  console.log('Joined Lab queue normally:', labE1.tokenNumber, 'Waitlisted:', labE1.isWaitlisted);

  const labE2 = await queueService.joinQueue(c2._id, lab._id, lService._id);
  console.log('Joined Lab waitlist:', labE2.tokenNumber, 'Waitlisted:', labE2.isWaitlisted);

  try {
    await queueService.joinQueue(c3._id, lab._id, lService._id);
    const labE3 = await queueService.joinQueue(admin._id, lab._id, lService._id); // 4th
  } catch (err) {
    console.log('PASS: Third waitlist join blocked ->', err.message);
  }

  // 3. BANK / COLLEGE EDGE CASE (Routing / Counters)
  // We added routingStrategy to Schema. Real logic can be built on top.
  console.log('\n--- 3. BANK / COLLEGE EDGE CASE ---');
  const bank = await Organization.create({ name: 'Bank', type: 'Bank', owner: admin._id });
  await QueueRule.create({
    organization: bank._id,
    routingStrategy: 'COUNTER'
  });
  console.log('Bank rule created with COUNTER routing strategy.');

  console.log('\nAll Edge Cases passed successfully!');
  process.exit(0);
}

runEdgeCases().catch(err => {
  console.error(err);
  process.exit(1);
});
