'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTaskPage() {
  const router = useRouter();
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Errands');
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('first_come');
  
  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // UX states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [policyError, setPolicyError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, JPG, and PNG images are allowed.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be under 5MB.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPolicyError('');

    // Client-side validations
    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      setError('Budget must be a positive number greater than 0.');
      return;
    }

    const parsedPeople = parseInt(peopleNeeded.toString(), 10);
    if (isNaN(parsedPeople) || parsedPeople < 1) {
      setError('At least 1 person is needed for a task.');
      return;
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      setError('Deadline must be a date and time in the future.');
      return;
    }

    setLoading(true);

    try {
      let photoUrl = '';

      // 1. Upload photo if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload photo attachment.');
        }

        photoUrl = uploadData.url;
      }

      // 2. Submit task details
      const taskRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          photo_url: photoUrl,
          category,
          people_needed: parsedPeople,
          budget: parsedBudget,
          deadline: deadlineDate.toISOString(),
          location: location.trim(),
          assignment_mode: assignmentMode,
        }),
      });

      const taskData = await taskRes.json();

      if (!taskRes.ok) {
        if (taskData.policyBlocked) {
          setPolicyError(taskData.error);
          return;
        }
        throw new Error(taskData.error || 'Failed to create task.');
      }

      // Success - redirect to task list
      router.refresh();
      router.push('/');

    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '700px', paddingBottom: '4rem' }}>
      <h1 style={{
        fontSize: '2rem',
        marginBottom: '1.5rem',
        background: 'var(--accent-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block'
      }}>
        Create New SideQuest
      </h1>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#f87171',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--border-radius-md)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {policyError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          color: '#ffffff',
          padding: '1.25rem',
          borderRadius: 'var(--border-radius-md)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚫</span> Academic Policy Warning
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>{policyError}</p>
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', background: 'rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
            💡 <strong>Allowed:</strong> tutoring, explaining step-by-step problems, and proofreading essays.
            <br />
            ❌ <strong>Prohibited:</strong> ghostwriting essays, taking exams/tests, or submitting graded assignments on behalf of others.
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Task Title</label>
            <input
              className="form-input"
              id="task-title"
              type="text"
              placeholder="e.g. Help carry boxes to L Block"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-desc">Task Description</label>
            <textarea
              className="form-textarea"
              id="task-desc"
              placeholder="Provide a detailed description of the task. Note: Academic writing or test help will be automatically flagged."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={1000}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Category */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-cat">Category</label>
              <select
                className="form-select"
                id="task-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                <option value="Errands">Errands</option>
                <option value="Second-hand items">Second-hand items</option>
                <option value="Tutoring">Tutoring</option>
                <option value="Freelancing">Freelancing</option>
                <option value="Transportation">Transportation</option>
              </select>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-loc">Location</label>
              <input
                className="form-input"
                id="task-loc"
                type="text"
                placeholder="e.g. SJT 405, Q Block Lobby"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
            {/* Budget */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-budget">Budget (Credits)</label>
              <input
                className="form-input"
                id="task-budget"
                type="number"
                min="1"
                placeholder="100"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* People Needed */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-people">People Needed</label>
              <input
                className="form-input"
                id="task-people"
                type="number"
                min="1"
                value={peopleNeeded}
                onChange={(e) => setPeopleNeeded(parseInt(e.target.value, 10))}
                disabled={loading}
                required
              />
            </div>

            {/* Assignment Mode */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-mode">Assignment Mode</label>
              <select
                className="form-select"
                id="task-mode"
                value={assignmentMode}
                onChange={(e) => setAssignmentMode(e.target.value)}
                disabled={loading}
              >
                <option value="first_come">First-Come (Auto)</option>
                <option value="review_select">Review & Select</option>
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-deadline">Deadline Date & Time</label>
            <input
              className="form-input"
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Photo Attachment */}
          <div className="form-group">
            <label className="form-label">Photo Attachment (Optional)</label>
            <div style={{
              border: '2px dashed var(--glass-border)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.01)',
              position: 'relative'
            }}>
              {!imagePreview ? (
                <>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                    disabled={loading}
                  />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    📸 Drag & drop or click to upload photo
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    JPEG, JPG, PNG formats up to 5MB
                  </p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={imagePreview}
                    alt="Upload Preview"
                    style={{
                      maxHeight: '180px',
                      maxWidth: '100%',
                      borderRadius: 'var(--border-radius-md)',
                      border: '1px solid var(--glass-border)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    disabled={loading}
                  >
                    Remove Photo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Disclaimer */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px dashed rgba(245, 158, 11, 0.25)',
            padding: '1rem',
            borderRadius: 'var(--border-radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: 1.5
          }}>
            🔐 <strong>Escrow Lock:</strong> Upon posting, the budget amount ({budget || '0'} credits) will be immediately deducted from your credit balance and held securely. The credits will be released to the doer(s) once the task is marked as completed. If you cancel the task, your credits will be refunded (minus any cancellation penalties).
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating Task...' : 'Post SideQuest'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => router.push('/')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
