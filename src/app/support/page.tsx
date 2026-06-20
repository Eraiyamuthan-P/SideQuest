'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  user: {
    username: string;
    email: string;
  };
}

interface CompletedTask {
  id: string;
  title: string;
  budget: number;
  payment_amount: number | null;
  poster: { username: string };
  applications: Array<{ applicant: { username: string } }>;
}

export default function SupportPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // Student Ticket submission states
  const [ticketType, setTicketType] = useState('contact');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  // Admin dashboard states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [selectedTaskForDispute, setSelectedTaskForDispute] = useState('');
  const [disputeResolution, setDisputeResolution] = useState('favor_poster');

  // Loading/UX states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch session and support data
  const loadData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/auth');
        return;
      }
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      if (meData.user.username === 'vit_admin') {
        // Fetch admin ticket dashboard
        const adminRes = await fetch('/api/admin/support');
        const adminData = await adminRes.json();
        if (adminRes.ok) {
          setTickets(adminData.tickets || []);
          setCompletedTasks(adminData.completedTasks || []);
          if (adminData.completedTasks && adminData.completedTasks.length > 0) {
            setSelectedTaskForDispute(adminData.completedTasks[0].id);
          }
        }
      } else {
        // Fetch user tickets (client-side filter or re-fetch)
        // Since we retrieve all tickets for simplicity in v1, we fetch user's tickets
        // Wait, standard user doesn't have access to /api/admin/support.
        // We will just let them submit tickets. We can show their submission confirmations.
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load support page details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  // Submit Client Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: ticketType, subject: subject.trim(), message: message.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ticket');
      }

      setSuccess('Your support ticket has been submitted to VIT Admin. We will review it shortly!');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Ticket (Admin Action)
  const handleResolveTicket = async (ticketId: string, isDispute: boolean) => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    const body: any = {
      ticket_id: ticketId,
      status: 'resolved',
    };

    if (isDispute) {
      body.task_id = selectedTaskForDispute;
      body.resolution = disputeResolution;
    }

    try {
      const res = await fetch('/api/admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve ticket.');
      }

      setSuccess(isDispute 
        ? `Dispute resolved successfully! ${disputeResolution === 'favor_poster' ? 'Refunded Poster & Penalized Doer (-15)' : 'Penalized Poster (-15)'}`
        : 'Ticket marked resolved.'
      );
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }} className="animate-pulse-slow">Loading support portal...</p>
      </div>
    );
  }

  const isAdmin = currentUser?.username === 'vit_admin';

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      <h1 style={{
        fontSize: '2rem',
        marginBottom: '1.5rem',
        background: 'var(--accent-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block'
      }}>
        {isAdmin ? 'Admin Support Ticket Center' : 'Support & Feedback Portal'}
      </h1>

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

      {isAdmin ? (
        /* --- ADMIN DASHBOARD --- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Active Support Tickets ({tickets.length})</h2>
            {tickets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {tickets.map((ticket) => (
                  <div key={ticket.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '1.25rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: `1px solid ${ticket.status === 'open' ? 'var(--glass-border)' : 'rgba(255,255,255,0.03)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span className="badge-tag" style={{
                          background: ticket.type === 'dispute' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                          color: ticket.type === 'dispute' ? 'var(--danger)' : 'var(--accent-primary)',
                          border: `1px solid ${ticket.type === 'dispute' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
                          fontSize: '0.65rem',
                          marginRight: '0.5rem'
                        }}>
                          {ticket.type.toUpperCase()}
                        </span>
                        <strong>{ticket.subject}</strong>
                      </div>
                      <span className="badge-tag" style={{
                        background: ticket.status === 'open' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                        color: ticket.status === 'open' ? 'var(--warning)' : 'var(--success)',
                        border: `1px solid ${ticket.status === 'open' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                        fontSize: '0.65rem'
                      }}>
                        {ticket.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {ticket.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Submitted by @{ticket.user.username} ({ticket.user.email})</span>
                      <span>{new Date(ticket.created_at).toLocaleString()}</span>
                    </div>

                    {ticket.status === 'open' && (
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        {ticket.type === 'dispute' ? (
                          /* Dispute Resolution Form */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Completed Task</label>
                                <select
                                  className="form-select"
                                  value={selectedTaskForDispute}
                                  onChange={(e) => setSelectedTaskForDispute(e.target.value)}
                                  disabled={actionLoading}
                                  style={{ padding: '0.5rem' }}
                                >
                                  {completedTasks.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.title} (Poster: @{t.poster.username}, Doer: @{t.applications[0]?.applicant.username || 'None'})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Resolution Rule</label>
                                <select
                                  className="form-select"
                                  value={disputeResolution}
                                  onChange={(e) => setDisputeResolution(e.target.value)}
                                  disabled={actionLoading}
                                  style={{ padding: '0.5rem' }}
                                >
                                  <option value="favor_poster">Favor Poster (Refund + penalize Doer -15)</option>
                                  <option value="favor_doer">Favor Doer (Doer keeps payment + penalize Poster -15)</option>
                                </select>
                              </div>
                            </div>

                            <button
                              onClick={() => handleResolveTicket(ticket.id, true)}
                              className="btn btn-danger"
                              style={{ width: '100%', padding: '0.5rem' }}
                              disabled={actionLoading}
                            >
                              Resolve Dispute & Execute Credit Adjustment
                            </button>
                          </div>
                        ) : (
                          /* Standard Resolution */
                          <button
                            onClick={() => handleResolveTicket(ticket.id, false)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                            disabled={actionLoading}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No support tickets available.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* --- STANDARD USER: SUBMIT TICKETS --- */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Submit a Support Ticket</h2>
            <form onSubmit={handleSubmitTicket}>
              <div className="form-group">
                <label className="form-label" htmlFor="ticket-type">Ticket Type</label>
                <select
                  className="form-select"
                  id="ticket-type"
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="contact">Contact Us / General Inquiry</option>
                  <option value="feedback">Submit Feedback</option>
                  <option value="bug">Report a Bug</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ticket-subject">Subject</label>
                <input
                  className="form-input"
                  id="ticket-subject"
                  type="text"
                  placeholder="e.g. Issue with payment display, feedback on layout"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ticket-msg">Message</label>
                <textarea
                  className="form-textarea"
                  id="ticket-msg"
                  placeholder="Describe your issue or feedback in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={actionLoading}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit" style={{ marginTop: '0.5rem' }} disabled={actionLoading}>
                {actionLoading ? 'Submitting Ticket...' : 'Submit Support Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';
