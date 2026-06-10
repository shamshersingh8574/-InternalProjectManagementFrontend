'use client';

import React, { useState, useEffect } from 'react';

export default function TaskModal({ task, isOpen, onClose, onSave, onDelete, projectMembers = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [assignees, setAssignees] = useState([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setAssignees(task.assignees ? task.assignees.map((u) => u._id || u) : []);
    } else {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setAssignees([]);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      _id: task?._id,
      title,
      description,
      status,
      priority,
      assignees,
    });
  };

  const toggleAssignee = (userId) => {
    if (assignees.includes(userId)) {
      setAssignees(assignees.filter((id) => id !== userId));
    } else {
      setAssignees([...assignees, userId]);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'Add New Task'}</h3>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="modal-title">Task Title</label>
            <input
              type="text"
              id="modal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Complete backend integration"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-desc">Description</label>
            <textarea
              id="modal-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done..."
            />
          </div>

          <div className="modal-row">
            <div className="form-group flex-1">
              <label htmlFor="modal-status">Status</label>
              <select
                id="modal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label htmlFor="modal-priority">Priority</label>
              <select
                id="modal-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Assign Members</label>
            <div className="member-checkbox-list">
              {projectMembers.length > 0 ? (
                projectMembers.map((member) => (
                  <label key={member._id} className="member-checkbox-label">
                    <input
                      type="checkbox"
                      checked={assignees.includes(member._id)}
                      onChange={() => toggleAssignee(member._id)}
                    />
                    <span>{member.username}</span>
                  </label>
                ))
              ) : (
                <p className="no-members-msg">No members added to this project yet.</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            {task && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    onDelete(task._id);
                  }
                }}
              >
                Delete
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
