'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import Navbar from '../../../components/Navbar';
import KanbanBoard from '../../../components/KanbanBoard';
import TaskModal from '../../../components/TaskModal';
import axios from 'axios';

export default function ProjectRoom() {
  const { id: projectId } = useParams();
  const router = useRouter();
  const { user, token, API_URL } = useAuth();
  const { socket, connected, joinProject, leaveProject } = useSocket();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [boardError, setBoardError] = useState('');
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalStatus, setModalStatus] = useState('todo');
  const [unassignAlert, setUnassignAlert] = useState(null);

  const isOwner = user && project && project.owner && (project.owner._id === user._id || project.owner === user._id);

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    fetchProjectDetails();
    fetchProjectTasks();
  }, [projectId, token]);

  // Handle Socket events connection and lifecycle
  useEffect(() => {
    if (!socket || !connected || !projectId) return;

    // Join the workspace room
    joinProject(projectId);

    // Listeners for real-time task operations
    socket.on('task_created', (newTask) => {
      setTasks((prev) => {
        // Prevent duplicate appending
        if (prev.some((t) => t._id === newTask._id)) return prev;
        return [...prev, newTask];
      });
    });

    socket.on('task_updated', (updatedTask) => {
      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task))
      );
    });

    socket.on('task_deleted', (deletedTaskId) => {
      setTasks((prev) => prev.filter((task) => task._id !== deletedTaskId));
    });

    // Listen for project structure updates (e.g. member added)
    socket.on('project_updated', (updatedProject) => {
      setProject(updatedProject);
    });

    socket.on('project_deleted', (deletedProjectId) => {
      if (deletedProjectId === projectId) {
        router.push('/');
      }
    });

    socket.on('task_unassigned_notification', (data) => {
      setUnassignAlert(data);
    });

    // Clean up connections on component unmount
    return () => {
      leaveProject(projectId);
      socket.off('task_created');
      socket.off('task_updated');
      socket.off('task_deleted');
      socket.off('project_updated');
      socket.off('project_deleted');
      socket.off('task_unassigned_notification');
    };
  }, [socket, connected, projectId]);

  const fetchProjectDetails = async () => {
    try {
      setBoardError('');
      const res = await axios.get(`${API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setProject(res.data.project);
        setEditProjectName(res.data.project.name);
        setEditProjectDesc(res.data.project.description || '');
      }
    } catch (err) {
      console.error('Failed to fetch project details:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to load project workspace details.');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = async (e) => {
    e.preventDefault();
    setBoardError('');
    try {
      const res = await axios.put(
        `${API_URL}/projects/${projectId}`,
        { name: editProjectName, description: editProjectDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setProject(res.data.project);
        setIsEditingProject(false);
      }
    } catch (err) {
      console.error('Failed to update project:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to update project details.');
    }
  };

  const handleProjectDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This will permanently delete all tasks in the project.')) {
      return;
    }
    setBoardError('');
    try {
      await axios.delete(`${API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/');
    } catch (err) {
      console.error('Failed to delete project:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  const fetchProjectTasks = async () => {
    try {
      setBoardError('');
      const res = await axios.get(`${API_URL}/tasks/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to fetch task list.');
    }
  };

  const handleTaskMove = async (taskId, newStatus) => {
    // Optimistic UI updates
    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );
    setBoardError('');

    try {
      await axios.put(
        `${API_URL}/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to update task status:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to update task status.');
      // Revert state if backend request fails
      setTasks(originalTasks);
    }
  };

  const handleTaskSave = async (taskData) => {
    setBoardError('');
    try {
      if (taskData._id) {
        // Edit Task
        await axios.put(
          `${API_URL}/tasks/${taskData._id}`,
          {
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            assignees: taskData.assignees,
            unassignReasons: taskData.unassignReasons,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create Task
        await axios.post(
          `${API_URL}/tasks`,
          {
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            project: projectId,
            assignees: taskData.assignees,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save task:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to save task changes.');
    }
  };

  const handleTaskDelete = async (taskId) => {
    setBoardError('');
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err.message);
      setBoardError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    if (!inviteEmail.trim()) return;

    try {
      const res = await axios.post(
        `${API_URL}/projects/${projectId}/members`,
        { email: inviteEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setInviteSuccess('Member added successfully!');
        setInviteEmail('');
        // Refresh project member avatars
        setProject(res.data.project);
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to add member');
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ color: 'var(--text-secondary)' }}>Loading Workspace board...</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="board-container">
      <Navbar projectName={project.name} />

      {boardError && (
        <div 
          className="auth-error" 
          style={{ 
            borderRadius: '0', 
            margin: '0', 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '0.75rem 2rem'
          }}
        >
          <span>⚠️ {boardError}</span>
          <button 
            onClick={() => setBoardError('')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'inherit', 
              fontSize: '1.2rem', 
              cursor: 'pointer',
              lineHeight: '1'
            }}
          >
            &times;
          </button>
        </div>
      )}

      <div className="board-subheader">
        <div className="board-info">
          {isEditingProject ? (
            <form onSubmit={handleProjectUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '300px' }}>
              <input
                type="text"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)' }}
                required
              />
              <input
                type="text"
                value={editProjectDesc}
                onChange={(e) => setEditProjectDesc(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)' }}
                placeholder="Description"
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Save</button>
                <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setIsEditingProject(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2>{project.name}</h2>
                {isOwner && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setIsEditingProject(true)} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={handleProjectDelete} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      🗑️ Delete Project
                    </button>
                  </div>
                )}
              </div>
              <p>{project.description || 'No description provided'}</p>
            </div>
          )}
        </div>

        <div className="board-actions">
          {isOwner && (
            <form onSubmit={handleInviteMember} className="invite-member-form">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                Add Member
              </button>
            </form>
          )}
          
          {isOwner && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditingTask(null);
                setModalStatus('todo');
                setModalOpen(true);
              }}
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {inviteError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.5rem 2rem', fontSize: '0.85rem', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          {inviteError}
        </div>
      )}

      {inviteSuccess && (
        <div style={{ background: 'rgba(16,185,129,0.1)', color: '#a7f3d0', padding: '0.5rem 2rem', fontSize: '0.85rem', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
          {inviteSuccess}
        </div>
      )}

      <KanbanBoard
        tasks={isOwner ? tasks : tasks.filter(t => t.assignees && t.assignees.some(u => (u._id || u) === user?._id))}
        onTaskMove={handleTaskMove}
        onTaskEdit={(task) => {
          setEditingTask(task);
          setModalOpen(true);
        }}
        onAddTask={(status) => {
          if (!isOwner) return;
          setEditingTask(null);
          setModalStatus(status);
          setModalOpen(true);
        }}
        isOwner={isOwner}
        currentUser={user}
      />

      <TaskModal
        task={editingTask}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        projectMembers={
          project 
            ? [project.owner, ...(project.members || [])]
                .filter(Boolean)
                .filter((member, idx, self) => self.findIndex(m => m._id === member._id) === idx)
            : []
        }
        isOwner={isOwner}
        currentUser={user}
      />

      {unassignAlert && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '1.25rem',
          color: '#f8fafc',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          maxWidth: '350px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ Task Unassigned
            </span>
            <button onClick={() => setUnassignAlert(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.2rem' }}>&times;</button>
          </div>
          <p style={{ fontSize: '0.9rem', margin: 0, color: '#e2e8f0' }}>
            You were unassigned from task <strong>{unassignAlert.taskTitle}</strong> in project <strong>{unassignAlert.projectName}</strong>.
          </p>
          <div style={{ fontSize: '0.85rem', color: '#f1f5f9', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', borderLeft: '3px solid #ef4444', wordBreak: 'break-word' }}>
            <strong>Reason:</strong> {unassignAlert.reason}
          </div>
        </div>
      )}
    </div>
  );
}
