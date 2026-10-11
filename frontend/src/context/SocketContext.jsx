import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Usually we'd use environment variable, but proxy makes it same domain
    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_user', user._id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinQueueRoom = (serviceId) => {
    if (socket && serviceId) {
      socket.emit('join_queue', serviceId);
    }
  };

  const leaveQueueRoom = (serviceId) => {
    if (socket && serviceId) {
      socket.emit('leave_queue', serviceId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinQueueRoom, leaveQueueRoom }}>
      {children}
    </SocketContext.Provider>
  );
};
