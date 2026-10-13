require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Service = require('../models/Service');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const http = require('http');

// Express app for end-to-end HTTP testing
const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/ai', require('../routes/aiRoutes'));

async function runEndToEndTests() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const server = app.listen(5099);
  console.log('Test server listening on port 5099.');

  // Find a customer user for authenticated test
  let customer = await User.findOne({ role: 'customer' });
  if (!customer) {
    customer = await User.create({
      name: 'Pappu Kumar',
      email: 'pappu_test@example.com',
      password: 'password123',
      role: 'customer'
    });
  }

  const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // Helper function to call the /api/ai/chat endpoint
  const callAiChat = (payload, authToken) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const req = http.request({
        hostname: 'localhost',
        port: 5099,
        path: '/api/ai/chat',
        method: 'POST',
        headers
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  };

  const testQueries = [
    { title: 'Test 1: Find Bank', query: 'hi how to find bank' },
    { title: 'Test 2: General Help', query: 'hii help me' },
    { title: 'Test 3: Hospitals in Jamshedpur', query: 'show me hospitals in Jamshedpur' },
    { title: 'Test 4: How to Book Appointment', query: 'how do I book an appointment?' },
    { title: 'Test 5: Check Queue Status (Authenticated Customer)', query: 'what is my current queue status?', useAuth: true }
  ];

  console.log('\n--- STARTING AI END-TO-END TESTS ---\n');

  for (const t of testQueries) {
    console.log(`\n======================================================`);
    console.log(`RUNNING: ${t.title}`);
    console.log(`QUERY: "${t.query}" (Auth: ${t.useAuth ? 'Bearer Token' : 'None'})`);

    const result = await callAiChat(
      { message: t.query },
      t.useAuth ? token : null
    );

    console.log(`STATUS CODE: ${result.statusCode}`);
    if (result.statusCode !== 200 || !result.body.success) {
      console.error('FAILED RESULT:', result.body);
      throw new Error(`Test failed for "${t.query}": ${JSON.stringify(result.body)}`);
    }

    console.log('AI REPLY:\n' + result.body.reply);
    console.log(`PASSED: ${t.title}`);
  }

  console.log('\n======================================================');
  console.log('ALL 5 END-TO-END AI TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================================\n');

  server.close();
  await mongoose.disconnect();
}

runEndToEndTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
