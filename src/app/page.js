'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import AuthForm from '../components/AuthForm';
import Link from 'next/link';
import axios from 'axios';

export default function Home() {
  const { user, token, loading, API_URL } = useAuth();
  const { socket, connected } = useSocket();
  const [projects, setProjects] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [error, setError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [unassignAlert, setUnassignAlert] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (user && sessionStorage.getItem('show_login_success') === 'true') {
      setSuccessToast(`Welcome back, ${user.username || 'User'}! You have logged in successfully.`);
      sessionStorage.removeItem('show_login_success');
      
      const timer = setTimeout(() => {
        setSuccessToast('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleProjectInvited = (newProject) => {
      setProjects((prev) => {
        if (prev.some((p) => p._id === newProject._id)) return prev;
        return [newProject, ...prev];
      });
    };

    const handleProjectUpdated = (updatedProject) => {
      setProjects((prev) =>
        prev.map((p) => (p._id === updatedProject._id ? updatedProject : p))
      );
    };

    const handleProjectDeleted = (deletedProjectId) => {
      setProjects((prev) => prev.filter((p) => p._id !== deletedProjectId));
    };

    const handleTaskUnassigned = (data) => {
      setUnassignAlert(data);
    };

    socket.on('project_invited', handleProjectInvited);
    socket.on('project_updated', handleProjectUpdated);
    socket.on('project_deleted', handleProjectDeleted);
    socket.on('task_unassigned_notification', handleTaskUnassigned);

    return () => {
      socket.off('project_invited', handleProjectInvited);
      socket.off('project_updated', handleProjectUpdated);
      socket.off('project_deleted', handleProjectDeleted);
      socket.off('task_unassigned_notification', handleTaskUnassigned);
    };
  }, [socket, connected]);

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
        <div className="loading-text">Loading your workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div>
      <Navbar />

      <main className="dashboard-container">
        {dashboardError && (
          <div className="dashboard-error">
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
          <div className="auth-card dashboard-create-card">
            <div className="auth-header dashboard-create-header">
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

              <div className="form-actions">
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
          <div className="projects-loading">
            Fetching projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            className="new-project-card first-project-card"
            onClick={() => setShowCreateForm(true)}
          >
            <span className="plus-icon">+</span>
            <h3>Create your first project</h3>
            <p className="new-project-card-desc">
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

      {unassignAlert && (
        <div className="toast-unassigned">
          <div className="toast-header">
            <span className="toast-title-danger">
              ⚠️ Task Unassigned
            </span>
            <button onClick={() => setUnassignAlert(null)} className="toast-close-btn">&times;</button>
          </div>
          <p className="toast-body">
            You were unassigned from task <strong>{unassignAlert.taskTitle}</strong> in project <strong>{unassignAlert.projectName}</strong>.
          </p>
          <div className="toast-reason">
            <strong>Reason:</strong> {unassignAlert.reason}
          </div>
        </div>
      )}

      {successToast && (
        <div className="toast-success">
          <span className="toast-success-text">
            🎉 {successToast}
          </span>
          <button onClick={() => setSuccessToast('')} className="toast-close-btn-green">&times;</button>
        </div>
      )}
    </div>
  );
}
