import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import TaskEditor from './TaskEditor.jsx';

const statusLabels = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Completed',
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function TaskDetails({ task, onClose, onEdit }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="task-detail-title" aria-modal="true" className="dialog-card detail-dialog" role="dialog">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">TASK OVERVIEW</span>
            <h2 id="task-detail-title">{task.title}</h2>
          </div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button">×</button>
        </div>
        <span className={`status-pill status-${task.status}`}>{statusLabels[task.status]}</span>
        <p className="detail-description">{task.description || 'No description has been added.'}</p>
        <p className="detail-date">Created {formatDate(task.createdAt)}</p>
        <div className="dialog-actions">
          <button className="button button-secondary" onClick={onClose} type="button">Close</button>
          <button className="button button-primary" onClick={() => onEdit(task)} type="button">Edit task</button>
        </div>
      </section>
    </div>
  );
}

function TaskCard({ task, onView, onEdit, onDelete, onStatusChange }) {
  return (
    <article className="task-card">
      <div className="task-card-topline">
        <span className={`status-dot status-dot-${task.status}`} aria-hidden="true" />
        <span className={`status-pill status-${task.status}`}>{statusLabels[task.status]}</span>
        <span className="task-date">{formatDate(task.createdAt)}</span>
      </div>
      <h3>{task.title}</h3>
      <p className={`task-description${task.description ? '' : ' muted-description'}`}>
        {task.description || 'No description'}
      </p>
      <div className="task-card-footer">
        <label className="status-control">
          <span className="visually-hidden">Change status for {task.title}</span>
          <select
            aria-label={`Change status for ${task.title}`}
            onChange={(event) => onStatusChange(task, event.target.value)}
            value={task.status}
          >
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="task-actions">
          <button aria-label={`View ${task.title}`} className="icon-button" onClick={() => onView(task)} title="View task" type="button">
            <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="M2.4 10s2.7-4.8 7.6-4.8 7.6 4.8 7.6 4.8-2.7 4.8-7.6 4.8S2.4 10 2.4 10Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
          <button aria-label={`Edit ${task.title}`} className="icon-button" onClick={() => onEdit(task)} title="Edit task" type="button">
            <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="m12.9 4.2 2.9 2.9M4 16l3.2-.6 8.8-8.8a1.5 1.5 0 0 0-2.1-2.1l-8.8 8.8L4 16Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
          </button>
          <button aria-label={`Delete ${task.title}`} className="icon-button icon-button-danger" onClick={() => onDelete(task)} title="Delete task" type="button">
            <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="M4.8 6.2h10.4m-9.3 0 .6 9.5h7l.6-9.5M8 6.2V4.4h4v1.8m-3 2.2v4.6m2-4.6v4.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TaskDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorTask, setEditorTask] = useState(undefined);
  const [viewTask, setViewTask] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (searchQuery) params.set('q', searchQuery);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    let active = true;
    async function loadTasks() {
      setLoading(true);
      setError('');
      try {
        const allResult = await apiRequest('/tasks');
        const visibleResult = queryString ? await apiRequest(`/tasks${queryString}`) : allResult;
        if (active) {
          setAllTasks(allResult.tasks);
          setTasks(visibleResult.tasks);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTasks();
    return () => { active = false; };
  }, [queryString, refreshKey]);

  const counts = useMemo(() => ({
    total: allTasks.length,
    todo: allTasks.filter((task) => task.status === 'todo').length,
    inProgress: allTasks.filter((task) => task.status === 'in_progress').length,
    done: allTasks.filter((task) => task.status === 'done').length,
  }), [allTasks]);

  function refresh(message) {
    setNotice(message);
    setRefreshKey((key) => key + 1);
    window.setTimeout(() => setNotice(''), 3000);
  }

  async function handleStatusChange(task, status) {
    setError('');
    try {
      await apiRequest(`/tasks/${task._id}`, { method: 'PATCH', body: { status } });
      refresh('Task status updated.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(`Delete “${task.title}”? This action cannot be undone.`);
    if (!confirmed) return;
    setError('');
    try {
      await apiRequest(`/tasks/${task._id}`, { method: 'DELETE' });
      setViewTask(null);
      refresh('Task deleted.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleView(task) {
    setError('');
    try {
      const result = await apiRequest(`/tasks/${task._id}`);
      setViewTask(result.task);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleSaved(_task, wasEditing) {
    setEditorTask(undefined);
    setViewTask(null);
    refresh(wasEditing ? 'Task saved.' : 'Task created.');
  }

  function openEditor(task = null) {
    setViewTask(null);
    setEditorTask(task);
  }

  const firstName = user.email.split('@')[0];

  return (
    <div className="dashboard-layout">
      <header className="topbar dashboard-topbar">
        <a className="brand" href="#dashboard" aria-label="TaskFlow dashboard">
          <span className="brand-mark" aria-hidden="true">T</span><span>taskflow</span>
        </a>
        <div className="topbar-account">
          <span className="online-indicator" aria-hidden="true" />
          <span className="account-email">{user.email}</span>
          <button className="button button-quiet" onClick={onLogout} type="button">Log out</button>
        </div>
      </header>

      <main className="dashboard-main" id="dashboard">
        <div className="page-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>Good to see you, {firstName}.</h1>
            <p>Here’s what’s moving in your day.</p>
          </div>
          <button className="button button-primary create-button" onClick={() => openEditor()} type="button">
            <span aria-hidden="true">＋</span> New task
          </button>
        </div>

        <section aria-label="Task summaries" className="summary-grid">
          <article className="summary-card summary-total">
            <span className="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 5h12M7 12h12M7 19h12M3.5 5h.01M3.5 12h.01M3.5 19h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg></span>
            <span className="summary-label">Total tasks</span><strong>{counts.total}</strong>
            <span className="summary-note">Across your workspace</span>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon-todo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg></span>
            <span className="summary-label">To do</span><strong>{counts.todo}</strong>
            <span className="summary-note">Ready when you are</span>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon-progress" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 17.5 9.2 12l3.4 3 7.4-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M15 7h5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></span>
            <span className="summary-label">In progress</span><strong>{counts.inProgress}</strong>
            <span className="summary-note">Currently underway</span>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon-done" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.2 4L19 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" /></svg></span>
            <span className="summary-label">Completed</span><strong>{counts.done}</strong>
            <span className="summary-note">Nice work, keep going</span>
          </article>
        </section>

        <section aria-labelledby="task-list-heading" className="task-section">
          <div className="task-section-heading">
            <div>
              <h2 id="task-list-heading">Your tasks</h2>
              <p>Keep your next steps clear and achievable.</p>
            </div>
            <span className="task-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
          </div>

          <div className="task-toolbar">
            <label className="search-box">
              <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.5" /><path d="m13.2 13.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>
              <span className="visually-hidden">Search tasks</span>
              <input onChange={(event) => setSearchInput(event.target.value)} placeholder="Search your tasks…" type="search" value={searchInput} />
            </label>
            <label className="filter-select">
              <span className="filter-label">Status</span>
              <select onChange={(event) => setFilterStatus(event.target.value)} value={filterStatus}>
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          {notice && <p className="success-message" role="status">{notice}</p>}
          {error && <div className="inline-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')} type="button">×</button></div>}

          {loading ? (
            <div className="loading-panel" role="status"><span className="spinner" />Loading your tasks…</div>
          ) : tasks.length > 0 ? (
            <div className="task-grid">
              {tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  onDelete={handleDelete}
                  onEdit={openEditor}
                  onStatusChange={handleStatusChange}
                  onView={handleView}
                  task={task}
                />
              ))}
            </div>
          ) : allTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-illustration" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><rect x="13" y="11" width="38" height="44" rx="7" stroke="currentColor" strokeWidth="2" /><path d="M23 23h19M23 32h19M23 41h11" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /><path d="m18 11 2-4h24l2 4" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /></svg></span>
              <h3>A fresh page</h3>
              <p>Every good plan starts with one small next step.</p>
              <button className="button button-primary" onClick={() => openEditor()} type="button">Create your first task</button>
            </div>
          ) : (
            <div className="empty-filter-state">
              <span aria-hidden="true">⌕</span>
              <h3>No tasks found</h3>
              <p>Try a different search or status filter.</p>
              <button className="button button-secondary" onClick={() => { setSearchInput(''); setFilterStatus('all'); }} type="button">Clear filters</button>
            </div>
          )}
        </section>

        <footer className="dashboard-footer"><span>One step at a time.</span><span>TaskFlow · Personal workspace</span></footer>
      </main>

      {editorTask !== undefined && <TaskEditor onClose={() => setEditorTask(undefined)} onSaved={handleSaved} task={editorTask} />}
      {viewTask && <TaskDetails onClose={() => setViewTask(null)} onEdit={openEditor} task={viewTask} />}
    </div>
  );
}
