const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Route files
const userRoutes = require('./routes/userRoutes');
const orgRoutes = require('./routes/orgRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const queueRoutes = require('./routes/queueRoutes');

// Load env vars
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'GEMINI_API_KEY', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`SERVER CONFIGURATION ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please configure them in your .env file.');
  process.exit(1);
}

// Support legacy MONGODB_URI if used
if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  process.env.MONGODB_URI = process.env.MONGO_URI;
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'QueueLess API is running smoothly.' });
});

// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Server Error';

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered.';
  }

  // Handle Mongoose Timeout Error
  if (err.message && err.message.includes('buffering timed out')) {
    statusCode = 503;
    message = 'The service is temporarily unavailable. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'API route not found' });
});

// Start Server only after MongoDB is connected
const startServer = async () => {
  // Connect to database
  await connectDB();
  
  const http = require('http');
  const server = http.createServer(app);
  const io = require('./socket').init(server);

  const PORT = process.env.PORT || 5001;

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
