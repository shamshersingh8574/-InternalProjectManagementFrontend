'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function TaskModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  projectMembers = [], 
  isOwner = false, 
  currentUser = null 
}) {
  const { token, API_URL } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [assignees, setAssignees] = useState([]);

  // Comment State
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

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
    setCommentError('');
    setCommentText('');
  }, [task, isOpen]);

  if (!isOpen) return null;

  const isAssigned = task && task.assignees && task.assignees.some((u) => {
    const assigneeId = u._id || u;
    return assigneeId === currentUser?._id;
  });

  const canEditFields = isOwner;
  const canEditStatus = isOwner || isAssigned;
  const canDelete = isOwner;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const originalAssigneeIds = task && task.assignees ? task.assignees.map(u => u._id || u) : [];
    const removedAssignees = originalAssigneeIds.filter(id => !assignees.includes(id));
    const unassignReasons = {};

    if (removedAssignees.length > 0) {
      for (const userId of removedAssignees) {
        const userObj = task.assignees.find(u => (u._id || u) === userId);
        const userName = userObj && userObj.username ? userObj.username : 'User';
        const reason = prompt(`Provide a reason for unassigning ${userName} from this task:`, "Task reassignment / cleanup");
        unassignReasons[userId] = reason || "No reason provided.";
      }
    }

    onSave({
      _id: task?._id,
      title,
      description,
      status,
      priority,
      assignees,
      unassignReasons,
    });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    setCommentError('');
    try {
      await axios.post(
        `${API_URL}/tasks/${task._id}/comments`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
      setCommentError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const toggleAssignee = (userId) => {
    if (assignees.includes(userId)) {
      setAssignees(assignees.filter((id) => id !== userId));
    } else {
      setAssignees([...assignees, userId]);
    }
  };

  const comments = task?.comments || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task ? 'Task Details' : 'Add New Task'}</h3>
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
              disabled={!canEditFields}
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
              disabled={!canEditFields}
            />
          </div>

          <div className="modal-row">
            <div className="form-group flex-1">
              <label htmlFor="modal-status">Status</label>
              <select
                id="modal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!canEditStatus}
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
                disabled={!canEditFields}
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
                  <label key={member._id} className="member-checkbox-label" style={{ opacity: !canEditFields ? 0.75 : 1 }}>
                    <input
                      type="checkbox"
                      checked={assignees.includes(member._id)}
                      onChange={() => toggleAssignee(member._id)}
                      disabled={!canEditFields}
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
            {task && canDelete && (
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
                {canEditFields || canEditStatus ? 'Cancel' : 'Close'}
              </button>
              {(canEditFields || canEditStatus) && (
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </form>

        {task && (
          <div className="comments-section">
            <h4 className="comments-title">Comments ({comments.length})</h4>
            
            {commentError && (
              <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                {commentError}
              </div>
            )}
            
            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment._id || comment.id || Math.random()} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-user">
                        {comment.user?.username || 'Unknown User'}
                      </span>
                      <span className="comment-date">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.5rem 0' }}>
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
            
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <input
                type="text"
                className="comment-input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="comment-submit-btn"
                disabled={isSubmittingComment}
              >
                {isSubmittingComment ? 'Posting...' : 'Comment'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
