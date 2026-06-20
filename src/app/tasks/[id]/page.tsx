'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  email: string;
  verified: boolean;
  credits: number;
}

interface Task {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  category: string;
  photo_url: string | null;
  budget: number;
  payment_amount: number | null;
  deadline: string;
  location: string;
  people_needed: number;
  assignment_mode: string;
  status: string;
  created_at: string;
  poster: {
    id: string;
    username: string;
    verified: boolean;
    hostel_block: string | null;
    bio: string | null;
  };
}

interface Application {
  id: string;
  task_id: string;
  applicant_id: string;
  status: string;
  offer_amount: number | null;
  created_at: string;
  applicant: {
    id: string;
    username: string;
    verified: boolean;
    hostel_block: string | null;
  };
}

interface TaskPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailsPage({ params }: TaskPageProps) {
  const router = useRouter();
  const [taskId, setTaskId] = useState('');
  
  // Data states
  const [task, setTask] = useState<Task | null>(null);
  const [isPoster, setIsPoster] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplication, setMyApplication] = useState<any | null>(null);
  const [applicantsCount, setApplicantsCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Form/UX states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Application form states
  const [useCustomOffer, setUseCustomOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');

  // Dispute form states
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // Resolve params
  useEffect(() => {
    params.then((p) => setTaskId(p.id));
  }, [params]);

  // Fetch all data
  const loadData = async () => {
    if (!taskId) return;
    setLoading(true);
    setError('');
    try {
      // 1. Fetch current session
      const meRes = await fetch('/api/auth/me');
      let userObj = null;
      if (meRes.ok) {
        const meData = await meRes.json();
        userObj = meData.user;
        setCurrentUser(meData.user);
      }

      // 2. Fetch task details
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load task details.');
      }

      setTask(data.task);
      setIsPoster(data.isPoster);
      setApplications(data.applications || []);
      setMyApplication(data.myApplication);
      setApplicantsCount(data.applicantsCount);
      
      // Pre-fill offer amount in case they want a custom offer
      if (data.task) {
        setOfferAmount(data.task.budget.toString());
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [taskId]);

  // Handle Application Submit
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    const parsedOffer = useCustomOffer ? parseFloat(offerAmount) : null;
    if (useCustomOffer && (isNaN(parsedOffer!) || parsedOffer! <= 0)) {
      setError('Please enter a valid positive offer amount.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_amount: parsedOffer }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply.');
      }

      setSuccess(data.message || 'Application submitted successfully!');
      loadData(); // reload details
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to apply.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Accept Application (Poster Action)
  const handleAcceptApplication = async (appId: string) => {
    if (!confirm('Are you sure you want to assign this student? Your locked credits will be updated.')) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/applications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId, action: 'accept' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept application.');
      }

      setSuccess(data.message || 'Application accepted successfully!');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to accept application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Application (Poster Action)
  const handleRejectApplication = async (appId: string) => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/applications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId, action: 'reject' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject application.');
      }

      setSuccess(data.message || 'Application rejected.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Task Completion (Doer Action)
  const handleCompleteTask = async () => {
    if (!confirm('Mark this task as completed? This will release the escrowed credits and award bonuses (+10 doer, +5 poster).')) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete task.');
      }

      setSuccess(data.message || 'Task marked completed!');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to complete task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Task Cancellation (Poster or Doer Action)
  const handleCancelTask = async () => {
    const penaltyMsg = isPoster 
      ? 'Are you sure you want to cancel? Because a student is assigned, you will incur a -5 credit penalty and your escrowed credits will be refunded.'
      : 'Are you sure you want to cancel your assignment? You will incur a -10 credit penalty and the task will be returned to open for other students.';

    if (!confirm(penaltyMsg)) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel task.');
      }

      setSuccess(data.message || 'Task successfully cancelled.');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispute Filing (Poster Action)
  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      setError('Please provide a reason for the dispute.');
      return;
    }
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disputed', dispute_reason: disputeReason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to file dispute.');
      }

      setSuccess('Dispute ticket filed successfully. Admin is reviewing.');
      setShowDisputeForm(false);
      setDisputeReason('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to file dispute.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }} className="animate-pulse-slow">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Task not found.</p>
        <Link href="/" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back to Browse</Link>
      </div>
    );
  }

  // Determine Doer details if assigned
  const acceptedApplication = applications.find(a => a.status === 'accepted') || null;
  const isAssignedDoer = acceptedApplication ? acceptedApplication.applicant_id === currentUser?.id : false;
  
  // Format deadline date
  const deadlineDate = new Date(task.deadline).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      {/* Back button */}
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        ← Back to Browse Quests
      </Link>

      {/* Title block */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge-tag" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            {task.category}
          </span>
          <span className="badge-tag" style={{
            background: task.status === 'open' ? 'rgba(16, 185, 129, 0.15)' : task.status === 'assigned' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: task.status === 'open' ? 'var(--success)' : task.status === 'assigned' ? 'var(--warning)' : 'var(--text-secondary)',
            border: `1px solid ${task.status === 'open' ? 'rgba(16,185,129,0.3)' : task.status === 'assigned' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`
          }}>
            Status: {task.status.toUpperCase()}
          </span>
        </div>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.3, marginBottom: '0.25rem' }}>{task.title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📍 Location: {task.location}</p>
      </div>

      {/* Success/Error Toasts */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          ✓ {success}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid-cols-2">
        
        {/* Left Column: Details & Attachment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Description</h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#e5e7eb', whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>
              {task.description}
            </p>

            {/* Photo Attachment */}
            {task.photo_url && (
              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Photo Attachment
                </h3>
                <div style={{ borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)', maxWidth: '100%', maxHeight: '350px' }}>
                  <img src={task.photo_url} alt="Task Attachment" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            )}
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>SideQuest Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Escrowed Budget:</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>🪙 {task.budget} Credits</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Agreed Payment:</span>
                <span style={{ fontWeight: 600 }}>🪙 {task.payment_amount || task.budget} Credits</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Deadline:</span>
                <span style={{ fontWeight: 500, color: 'var(--danger)' }}>{deadlineDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assignment Mode:</span>
                <span>{task.assignment_mode === 'first_come' ? '⚡ First-Come (Auto)' : '📋 Review & Select'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>People Needed:</span>
                <span>{task.people_needed} doer(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Applicants:</span>
                <span>{applicantsCount} students</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Poster Info & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Poster info */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quest Poster</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Link href={`/profile/${task.poster.username}`} style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                @{task.poster.username}
              </Link>
              {task.poster.verified && (
                <span className="badge-tag badge-tag-verified" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>✓ Verified</span>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: '0.75rem' }}>
              "{task.poster.bio || 'No bio added.'}"
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 Block: {task.poster.hostel_block || 'Not specified'}</p>
          </div>

          {/* Action cards based on role */}
          
          {/* Guest state */}
          {!currentUser && (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--glass-border-focus)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Want to apply for this task?</p>
              <Link href="/auth" className="btn btn-primary" style={{ width: '100%' }}>Sign In to Apply</Link>
            </div>
          )}

          {/* Poster View */}
          {currentUser && isPoster && (
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--accent-primary)' }}>Manage Quest</h2>
              
              {/* Task Open: View and Accept Applicants */}
              {task.status === 'open' && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Applicants ({applications.length})
                  </h3>
                  {applications.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {applications.map((app) => (
                        <div key={app.id} style={{
                          background: 'rgba(255,255,255,0.02)',
                          padding: '1rem',
                          borderRadius: 'var(--border-radius-md)',
                          border: '1px solid var(--glass-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Link href={`/profile/${app.applicant.username}`} style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                @{app.applicant.username}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 Block: {app.applicant.hostel_block || 'N/A'}</div>
                            </div>
                            <span style={{ fontWeight: 700, color: app.offer_amount ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '0.95rem' }}>
                              🪙 {app.offer_amount !== null ? `${app.offer_amount} (Offer)` : `${task.budget}`}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleAcceptApplication(app.id)}
                              className="btn btn-success"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', flex: 1 }}
                              disabled={actionLoading}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectApplication(app.id)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                      Waiting for applications...
                    </p>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1.5rem 0' }} />
                  <button onClick={handleCancelTask} className="btn btn-secondary" style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }} disabled={actionLoading}>
                    Cancel Quest (Refund Credits)
                  </button>
                </div>
              )}

              {/* Task Assigned/In Progress */}
              {(task.status === 'assigned' || task.status === 'in_progress') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.9rem' }}>
                    👥 Assigned Doer: <strong>@{acceptedApplication?.applicant.username}</strong>
                    <br />
                    💰 Final Offer: <strong>🪙 {task.payment_amount || task.budget} Credits</strong>
                  </div>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-primary" style={{ width: '100%' }}>
                    💬 Open Coordination Chat
                  </Link>

                  <button
                    onClick={handleCancelTask}
                    className="btn btn-danger"
                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--danger)', color: '#ffffff' }}
                    disabled={actionLoading}
                  >
                    Cancel Quest (⚠️ -5 Penalty Credits)
                  </button>
                </div>
              )}

              {/* Task Completed: Dispute Option */}
              {task.status === 'completed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.9rem', color: 'var(--success)' }}>
                    ✓ Completed by <strong>@{acceptedApplication?.applicant.username}</strong>. Escrow released.
                  </div>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-secondary" style={{ width: '100%' }}>
                    💬 View Chat Log (Read-Only)
                  </Link>

                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    {!showDisputeForm ? (
                      <button
                        onClick={() => setShowDisputeForm(true)}
                        className="btn btn-secondary"
                        style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                        disabled={actionLoading}
                      >
                        ⚠️ File a Dispute (48h Window)
                      </button>
                    ) : (
                      <form onSubmit={handleFileDispute} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#f87171' }}>File Dispute Ticket</h4>
                        <textarea
                          className="form-input"
                          placeholder="Describe the issue with the task delivery..."
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          style={{ minHeight: '80px', fontSize: '0.85rem' }}
                          required
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="submit" className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', flex: 1 }} disabled={actionLoading}>
                            Submit Dispute
                          </button>
                          <button type="button" onClick={() => setShowDisputeForm(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={actionLoading}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Task Cancelled */}
              {task.status === 'cancelled' && (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                  This task was cancelled. Credits were refunded.
                </p>
              )}
            </div>
          )}

          {/* Doer View (Assigned Doer) */}
          {currentUser && !isPoster && isAssignedDoer && (
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--accent-secondary)' }}>You are Assigned!</h2>
              
              {task.status === 'assigned' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    You have been assigned to this quest. Please complete the task and press complete to receive payment.
                  </p>
                  
                  <button
                    onClick={handleCompleteTask}
                    className="btn btn-success"
                    style={{ width: '100%', fontWeight: 700 }}
                    disabled={actionLoading}
                  >
                    ✓ Mark as Completed / Delivered
                  </button>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-primary" style={{ width: '100%' }}>
                    💬 Open Coordination Chat
                  </Link>

                  <button
                    onClick={handleCancelTask}
                    className="btn btn-danger"
                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--danger)', color: '#ffffff' }}
                    disabled={actionLoading}
                  >
                    Cancel Assignment (⚠️ -10 Credits Penalty)
                  </button>
                </div>
              )}

              {task.status === 'completed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 'var(--border-radius-md)', color: 'var(--success)', fontSize: '0.9rem' }}>
                    🎉 Completed! Payment of <strong>🪙 {task.payment_amount || task.budget} credits</strong> and completion bonus (+10 credits) have been added to your balance.
                  </div>
                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-secondary" style={{ width: '100%' }}>
                    💬 View Chat Log (Read-Only)
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Student View (Not Poster, Not Assigned) */}
          {currentUser && !isPoster && !isAssignedDoer && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Apply for Quest</h2>

              {/* Already Applied (Pending/Rejected) */}
              {myApplication ? (
                <div>
                  {myApplication.status === 'pending' ? (
                    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '1rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <p style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '0.25rem' }}>Application Pending</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Your offer: <strong>🪙 {myApplication.offer_amount !== null ? myApplication.offer_amount : task.budget} Credits</strong>
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <p style={{ fontWeight: 600, color: 'var(--danger)' }}>Application Declined</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>The poster declined this application.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Can Apply Form */
                task.status === 'open' ? (
                  <form onSubmit={handleApply}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                      Apply to this task. The default budget is <strong>🪙{task.budget} credits</strong>, but you can request a custom price offer.
                    </p>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          id="custom-offer-check"
                          checked={useCustomOffer}
                          onChange={(e) => setUseCustomOffer(e.target.checked)}
                          disabled={actionLoading}
                        />
                        <label htmlFor="custom-offer-check" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                          Submit custom price offer
                        </label>
                      </div>

                      {useCustomOffer && (
                        <div>
                          <label className="form-label" htmlFor="offer-amount">Your Bid (Credits)</label>
                          <input
                            className="form-input"
                            id="offer-amount"
                            type="number"
                            min="1"
                            value={offerAmount}
                            onChange={(e) => setOfferAmount(e.target.value)}
                            disabled={actionLoading}
                            required
                          />
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-primary"
                      type="submit"
                      style={{ width: '100%' }}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Submitting Application...' : 'Send Application'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                    This task is closed for applications.
                  </p>
                )
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';
