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

  useEffect(() => {
    if (!socket || !connected || !projectId) return;

    joinProject(projectId);

    socket.on('task_created', (newTask) => {
      setTasks((prev) => {
        
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
      
      setTasks(originalTasks);
    }
  };

  const handleTaskSave = async (taskData) => {
    setBoardError('');
    try {
      if (taskData._id) {
        
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
        
        setProject(res.data.project);
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to add member');
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="loading-text">Loading Workspace board...</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="board-container">
      <Navbar projectName={project.name} />

      {boardError && (
        <div className="board-banner-error">
          <span>⚠️ {boardError}</span>
          <button 
            onClick={() => setBoardError('')} 
            className="board-banner-error-btn"
          >
            &times;
          </button>
        </div>
      )}

      <div className="board-subheader">
        <div className="board-info">
          {isEditingProject ? (
            <form onSubmit={handleProjectUpdate} className="project-edit-form">
              <input
                type="text"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="project-edit-input"
                required
              />
              <input
                type="text"
                value={editProjectDesc}
                onChange={(e) => setEditProjectDesc(e.target.value)}
                className="project-edit-input"
                placeholder="Description"
              />
              <div className="project-edit-buttons">
                <button type="submit" className="btn-primary project-edit-btn">Save</button>
                <button type="button" className="btn-secondary project-edit-btn" onClick={() => setIsEditingProject(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <div className="project-header-actions">
                <h2>{project.name}</h2>
                {isOwner && (
                  <div className="project-header-buttons">
                    <button 
                      onClick={() => setIsEditingProject(true)} 
                      className="btn-icon-edit"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={handleProjectDelete} 
                      className="btn-icon-delete"
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
              <button type="submit" className="btn-secondary btn-invite-submit">
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
        <div className="project-banner-error">
          {inviteError}
        </div>
      )}

      {inviteSuccess && (
        <div className="project-banner-success">
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
    </div>
  );
}
