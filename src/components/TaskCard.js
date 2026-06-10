'use client';

import React from 'react';

export default function TaskCard({ task, onEdit, isOwner, currentUser }) {
  const isAssigned = task.assignees && task.assignees.some(u => (u._id || u) === currentUser?._id);
  const isDraggable = isOwner || isAssigned;

  const handleDragStart = (e) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task._id);
    // Add visual class while dragging if desired
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  return (
    <div
      className="task-card"
      draggable={isDraggable}
      style={{ cursor: isDraggable ? 'grab' : 'pointer' }}
      onDragStart={handleDragStart}
      onClick={() => onEdit(task)}
    >
      <div className="task-card-header">
        <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <h4 className="task-card-title">{task.title}</h4>
      {task.description && (
        <p className="task-card-description">{task.description}</p>
      )}
      <div className="task-card-footer">
        <div className="task-assignees">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map((user) => (
              <span
                key={user._id}
                className="assignee-avatar"
                title={user.username}
              >
                {user.username[0].toUpperCase()}
              </span>
            ))
          ) : (
            <span className="no-assignee" title="Unassigned">👤</span>
          )}
        </div>
      </div>
    </div>
  );
}
