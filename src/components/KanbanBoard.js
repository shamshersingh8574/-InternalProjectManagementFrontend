'use client';

import React from 'react';
import TaskCard from './TaskCard';

export default function KanbanBoard({ tasks = [], onTaskMove, onTaskEdit, onAddTask }) {
  const columns = [
    { id: 'todo', title: 'To Do', emoji: '📋' },
    { id: 'in-progress', title: 'In Progress', emoji: '⚡' },
    { id: 'done', title: 'Done', emoji: '✅' },
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskMove(taskId, columnId);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <div className="kanban-board-container">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        return (
          <div
            key={column.id}
            className={`kanban-column column-${column.id}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="kanban-column-header">
              <div className="column-title-wrapper">
                <span className="column-emoji">{column.emoji}</span>
                <h3>{column.title}</h3>
                <span className="column-task-count">{columnTasks.length}</span>
              </div>
              <button
                className="add-task-header-btn"
                onClick={() => onAddTask(column.id)}
                title={`Add task to ${column.title}`}
              >
                +
              </button>
            </div>

            <div className="kanban-cards-list">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={onTaskEdit}
                  />
                ))
              ) : (
                <div className="empty-column-placeholder">
                  <p>No tasks here. Drag tasks or click + to add.</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
