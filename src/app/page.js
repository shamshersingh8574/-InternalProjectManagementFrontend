'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import AuthForm from '../components/AuthForm';
import Link from 'next/link';
import axios from 'axios';

export default function Home() {
  const { user, token, loading, API_URL } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [error, setError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [fetchingProjects, setFetchingProjects] = useState(false);

  // Fetch projects list when user logs in
  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  const fetchProjects = async () => {
    setFetchingProjects(true);
    setDashboardError('');
    try {
      const response = await axios.get(`${API_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        setProjects(response.data.projects);
      }
    } catch (err) {
      console.error('Error fetching projects:', err.response?.data?.message || err.message);
      setDashboardError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setFetchingProjects(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/projects`,
        { name: projectName, description: projectDesc },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setProjects([response.data.project, ...projects]);
        setProjectName('');
        setProjectDesc('');
        setShowCreateForm(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ color: 'var(--text-secondary)' }}>Loading your workspace...</div>
      </div>
    );
  }

  // Show Auth login screen if user is not authenticated
  if (!user) {
    return <AuthForm />;
  }

  return (
    <div>
      <Navbar />

      <main className="dashboard-container">
        {dashboardError && (
          <div className="auth-error" style={{ width: '100%', marginBottom: '1.5rem' }}>
            {dashboardError}
          </div>
        )}

        <div className="dashboard-header">
          <h1>Your Workspaces</h1>
          {!showCreateForm && (
            <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
              + New Project
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
            <div className="auth-header" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <h2>Create New Project</h2>
              <p>Add details for your new collaborative project board</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleCreateProject} className="auth-form">
              <div className="form-group">
                <label htmlFor="proj-name">Project Name</label>
                <input
                  type="text"
                  id="proj-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="E.g., Website Redesign 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="proj-desc">Description</label>
                <textarea
                  id="proj-desc"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="E.g., Redesigning the landing page and dashboard..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {fetchingProjects ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
            Fetching projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            className="new-project-card"
            style={{ width: '100%', height: '240px' }}
            onClick={() => setShowCreateForm(true)}
          >
            <span className="plus-icon">+</span>
            <h3>Create your first project</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Click here to get started with real-time task management.
            </p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project._id} className="project-card">
                <div className="project-card-info">
                  <h3>{project.name}</h3>
                  <p>{project.description || 'No description provided.'}</p>
                </div>
                <div className="project-card-footer">
                  <span className="project-members-count">
                    👥 {project.members?.length || 1} Member(s)
                  </span>
                  <Link href={`/project/${project._id}`} className="btn-open-project">
                    Open Board &rarr;
                  </Link>
                </div>
              </div>
            ))}

            <div className="new-project-card" onClick={() => setShowCreateForm(true)}>
              <span className="plus-icon">+</span>
              <h3>New Workspace</h3>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
