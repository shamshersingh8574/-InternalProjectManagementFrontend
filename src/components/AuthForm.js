'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthForm() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isLogin) {
      
      if (!email.trim() || !password.trim()) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const res = await login(email.trim(), password);
      if (!res.success) {
        setError(res.message);
      } else {
        sessionStorage.setItem('show_login_success', 'true');
      }
    } else {
      
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters');
        setLoading(false);
        return;
      }

      const res = await register(username.trim(), email.trim(), password);
      if (!res.success) {
        setError(res.message);
      } else {
        setSuccessMsg('Registration successful! Please enter your credentials to log in.');
        setIsLogin(true);
        setPassword('');
        setUsername('');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to access your projects' : 'Get started by creating a collaborative workspace'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {successMsg && (
          <div className="auth-success">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccessMsg('');
            }}
          >
            {isLogin ? 'Create one' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
