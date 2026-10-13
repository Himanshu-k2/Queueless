const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

dotenv.config();

const fixIndexes = async () => {
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await connectDB();
      connected = true;
      break;
    } catch (err) {
      console.log(`Connection attempt ${attempt} failed, retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!connected) {
    console.error('Could not connect to MongoDB after 3 attempts.');
    process.exit(1);
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:', collections.map(c => c.name));

  for (const col of collections) {
    const indexes = await mongoose.connection.db.collection(col.name).indexes();
    console.log(`\nIndexes on ${col.name}:`, indexes.map(i => i.name));
    
    // Check for bookingReference_1 on appointments
    if (col.name === 'appointments') {
      const hasBookingRef = indexes.some(i => i.name === 'bookingReference_1');
      if (hasBookingRef) {
        console.log('Dropping obsolete unique index bookingReference_1 on appointments...');
        await mongoose.connection.db.collection('appointments').dropIndex('bookingReference_1');
        console.log('Successfully dropped bookingReference_1 index!');
      }
    }
  }

  console.log('\nIndex verification completed.');
  process.exit(0);
};

fixIndexes();
