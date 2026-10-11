import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

const statusOptions = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Completed' },
];

export default function TaskEditor({ task, onClose, onSaved }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(task);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle) {
      setError('Add a title before saving this task.');
      return;
    }
    if (cleanTitle.length > 160 || cleanDescription.length > 5000) {
      setError('Keep the title under 160 characters and the description under 5,000.');
      return;
    }

    setSaving(true);
    try {
      const fields = { title: cleanTitle, description: cleanDescription, status };
      const result = await apiRequest(isEditing ? `/tasks/${task._id}` : '/tasks', {
        method: isEditing ? 'PATCH' : 'POST',
        body: fields,
      });
      onSaved(result.task, isEditing);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="task-editor-title" aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">TASK DETAILS</span>
            <h2 id="task-editor-title">{isEditing ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button">×</button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label htmlFor="task-title">Task title <span aria-hidden="true">*</span></label>
          <input
            autoFocus
            id="task-title"
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to get done?"
            required
            value={title}
          />
          <div className="field-meta"><span>Keep it clear and actionable</span><span>{title.length}/160</span></div>

          <label htmlFor="task-description">Description <span className="optional-label">Optional</span></label>
          <textarea
            id="task-description"
            maxLength={5000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context, notes, or useful links…"
            rows={4}
            value={description}
          />

          <label htmlFor="task-status">Status</label>
          <select id="task-status" onChange={(event) => setStatus(event.target.value)} value={status}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button className="button button-secondary" onClick={onClose} type="button">Cancel</button>
            <button className="button button-primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
