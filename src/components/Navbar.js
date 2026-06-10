'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Link from 'next/link';

export default function Navbar({ projectName }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="navbar-header">
      <div className="navbar-left">
        <Link href="/" className="logo-link">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Collaborate</span>
        </Link>
        {projectName && (
          <>
            <span className="navbar-separator">/</span>
            <span className="navbar-project-name">{projectName}</span>
          </>
        )}
      </div>

      <div className="navbar-right">
        <div className="status-indicator">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-label">{connected ? 'Live' : 'Connecting...'}</span>
        </div>

        {user && (
          <div className="user-profile-menu">
            <span className="user-avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</span>
            <span className="user-name">{user.username}</span>
            <button onClick={logout} className="btn-logout" title="Log Out">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
