'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    console.log(`Connecting socket to ${socketUrl}...`);

    // Connect to Socket.IO server, passing token in auth handshake
    const newSocket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket'], // force WebSocket only
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully!');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Join a project room
  const joinProject = (projectId) => {
    if (socket && connected) {
      socket.emit('join_project', projectId);
    }
  };

  // Leave a project room
  const leaveProject = (projectId) => {
    if (socket && connected) {
      socket.emit('leave_project', projectId);
    }
  };

  // Broadcast minor actions (dragging, typing, etc.)
  const broadcastAction = (projectId, action, details = {}) => {
    if (socket && connected) {
      socket.emit('user_action', { projectId, action, details });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        joinProject,
        leaveProject,
        broadcastAction,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
