import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionRestored, setConnectionRestored] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setIsConnected(false);
      setIsReconnecting(false);
      return;
    }

    // Determine target URL: environment variable or Vite proxy / same domain
    let socketTarget;
    if (import.meta.env.VITE_SOCKET_URL) {
      socketTarget = import.meta.env.VITE_SOCKET_URL;
    } else if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.startsWith('/')) {
      try {
        socketTarget = new URL(import.meta.env.VITE_API_URL).origin;
      } catch (e) {
        socketTarget = undefined;
      }
    }

    let hadPriorDisconnect = false;
    let restoreTimer = null;

    const newSocket = io(socketTarget, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 8000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
      newSocket.emit('join_user', user._id);

      if (hadPriorDisconnect) {
        setConnectionRestored(true);
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          setConnectionRestored(false);
        }, 3000);
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        hadPriorDisconnect = true;
        setIsReconnecting(true);
      }
    });

    newSocket.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    newSocket.on('reconnect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
      newSocket.emit('join_user', user._id);
      setConnectionRestored(true);
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        setConnectionRestored(false);
      }, 3000);
    });

    newSocket.on('reconnect_failed', () => {
      setIsReconnecting(false);
      setConnectionError('Real-time connection unavailable');
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('reconnect_attempt');
      newSocket.off('reconnect');
      newSocket.off('reconnect_failed');
      newSocket.off('connect_error');
      newSocket.disconnect();
    };
  }, [user?._id]);

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
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      isReconnecting, 
      connectionRestored, 
      connectionError, 
      joinQueueRoom, 
      leaveQueueRoom 
    }}>
      {children}
    </SocketContext.Provider>
  );
};
