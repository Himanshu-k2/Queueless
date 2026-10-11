const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');

async function run() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'supersecret';
  process.env.ADMIN_EMAIL = 'admin@queueless.com';
  process.env.ADMIN_PASSWORD = 'password123';
  process.env.GEMINI_API_KEY = 'dummy';
  process.env.CLIENT_URL = 'http://localhost:5173';
  
  const server = spawn('node', ['server.js'], { env: process.env, stdio: 'inherit' });
  
  server.on('close', (code) => {
    mongod.stop();
  });
}

run();
