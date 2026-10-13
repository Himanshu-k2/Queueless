const socketIo = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL
    ].filter(Boolean);

    io = socketIo(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (
            allowedOrigins.includes(origin) ||
            (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) ||
            origin.endsWith('.onrender.com') ||
            origin.endsWith('.vercel.app')
          ) {
            return callback(null, true);
          }
          return callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      // Room for specific queue updates (staff & waiting customers)
      socket.on('join_queue', (serviceId) => {
        if (serviceId) socket.join(`queue_${serviceId}`);
      });
      
      socket.on('leave_queue', (serviceId) => {
        if (serviceId) socket.leave(`queue_${serviceId}`);
      });

      // Room for specific user updates (appointments, notifications)
      socket.on('join_user', (userId) => {
        if (userId) socket.join(`user_${userId}`);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
