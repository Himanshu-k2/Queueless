const socketIo = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: '*', // For development
        methods: ['GET', 'POST']
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
