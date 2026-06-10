'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', action = null) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type, action }]);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  };

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
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

    // Real-time global notifications listeners
    newSocket.on('task_assigned', (data) => {
      console.log('Task assignment event received:', data);
      addNotification(
        `You have been assigned to task "${data.task.title}" in project "${data.project.name}"`,
        'success',
        () => router.push(`/project/${data.project._id}`)
      );
    });

    newSocket.on('project_invited', (data) => {
      console.log('Project invited event received:', data);
      addNotification(
        `You have been invited to project "${data.name}"`,
        'info',
        () => router.push(`/project/${data._id}`)
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('task_assigned');
      newSocket.off('project_invited');
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
        addNotification,
      }}
    >
      {children}
      <div className="toast-notifications-container">
        {notifications.map((notif) => (
          <div key={notif.id} className={`toast-notification ${notif.type}`}>
            <div className="toast-content">
              <span className="toast-message">{notif.message}</span>
              {notif.action && (
                <button
                  className="toast-action"
                  onClick={() => {
                    notif.action();
                    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                  }}
                >
                  View
                </button>
              )}
            </div>
            <button
              className="toast-close"
              onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};
