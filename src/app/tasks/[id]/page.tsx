'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  StarIcon,
  VerifiedIcon,
  ClockIcon,
  LocationIcon,
  ApplicantsIcon,
  ChatIcon,
  AttachmentIcon,
  SavedIcon,
  getCategoryIcon
} from '@/components/Icons';
import { EmptyState } from '@/components/EmptyState';

interface User {
  id: string;
  username: string;
  email: string;
  verified: boolean;
}

interface Task {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  category: string;
  photo_url: string | null;
  offeredAmount: number;
  agreedAmount: number | null;
  pendingPaymentSince: string | null;
  deadline: string;
  location: string;
  people_needed: number;
  assignment_mode: string;
  status: string;
  created_at: string;
  cancellationRequestedBy: string | null;
  isUrgent: boolean;
  estimatedDuration: string;
  isPinned: boolean;
  poster: {
    id: string;
    username: string;
    verified: boolean;
    hostel_block: string | null;
    bio: string | null;
    ratingAverage: number;
    ratingCount: number;
  };
  reviews: {
    id: string;
    reviewer_id: string;
    rating: number;
    comment: string;
    created_at: string;
    reviewer: { username: string };
  }[];
}

interface Application {
  id: string;
  taskId: string;
  doerId: string;
  status: string;
  requestedAmount: number;
  isCounterBid: boolean;
  createdAt: string;
  doer: {
    id: string;
    username: string;
    verified: boolean;
    hostel_block: string | null;
    ratingAverage: number;
    ratingCount: number;
  };
}

const getCategoryLabel = (cat: string) => {
  const mapping: Record<string, string> = {
    TUTORING: 'Tutoring',
    FOOD_PICKUP: 'Food Pickup',
    RIDE_SHARING: 'Ride Sharing',
    PARCEL_DELIVERY: 'Parcel Delivery',
    SHOPPING: 'Shopping',
    CODING_HELP: 'Coding Help',
    NOTES: 'Notes',
    PRINTING: 'Printing',
    HOSTEL_HELP: 'Hostel Help',
    EVENT_ASSISTANCE: 'Event Assistance',
  };
  return mapping[cat] || cat;
};

const getLocationLabel = (loc: string) => {
  const mapping: Record<string, string> = {
    MENS_HOSTEL: 'Mens Hostel',
    WOMENS_HOSTEL: 'Womens Hostel',
    TT: 'TT',
    LIBRARY: 'Library',
    SJT: 'SJT',
    SMV: 'SMV',
    PRP: 'PRP',
    MG_BLOCK: 'MG Block',
    FOODYS: 'Foodys',
    MAIN_GATE: 'Main Gate',
  };
  return mapping[loc] || loc;
};

const getDurationLabel = (dur: string) => {
  const mapping: Record<string, string> = {
    MIN_10: '10m',
    MIN_30: '30m',
    HOUR_1: '1h',
    HALF_DAY: 'half day',
    FULL_DAY: 'full day',
  };
  return mapping[dur] || dur;
};

interface TaskPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailsPage({ params }: TaskPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);

  // Edit bid states
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [editBidAmount, setEditBidAmount] = useState('');

  // Saved task state
  const [isSaved, setIsSaved] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setTaskId(p.id));
  }, [params]);

  // Handle counterBid param from URL
  useEffect(() => {
    if (searchParams.get('counterBid') === 'true') {
      setUseCustomOffer(true);
    }
  }, [searchParams]);

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

      // Check bookmark status
      if (userObj) {
        const savedRes = await fetch(`/api/tasks/${taskId}/save`);
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          setIsSaved(!!savedData.saved);
        }
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
        setOfferAmount(data.task.offeredAmount.toString());
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

    const parsedOffer = parseInt(offerAmount, 10);
    if (useCustomOffer && (isNaN(parsedOffer) || parsedOffer <= 0)) {
      setError('Please enter a valid positive offer amount.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedAmount: useCustomOffer ? parsedOffer : task?.offeredAmount,
          isCounterBid: useCustomOffer,
        }),
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
    if (!confirm('Are you sure you want to assign this student to this quest?')) return;
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
    if (!confirm('Mark this task as completed? This will notify the poster to confirm offline payment.')) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_payment' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete task.');
      }

      setSuccess(data.message || 'Task marked completed! Waiting for poster payment confirmation.');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to complete task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Confirm Payment (Poster Action)
  const handleConfirmPayment = async () => {
    if (!confirm(`Confirm you have paid ₹${task?.agreedAmount || task?.offeredAmount} to @${acceptedApplication?.doer.username} offline?`)) return;
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
        throw new Error(data.error || 'Failed to confirm payment.');
      }

      setSuccess(data.message || 'Offline payment confirmed successfully!');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Task Cancellation / Request (Poster or Doer Action)
  const handleCancelTask = async () => {
    const isConfirm = task?.cancellationRequestedBy 
      ? confirm('Confirm you want to accept the cancellation request? This will cancel the assignment.')
      : confirm('Are you sure you want to request cancellation for this quest? This will require confirmation from the other user.');

    if (!isConfirm) return;
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

  // Handle Decline Cancellation (Dispute it)
  const handleDeclineCancellation = async () => {
    if (!confirm('Are you sure you want to decline this cancellation request? This will open an administrative dispute ticket.')) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disputed' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispute cancellation.');
      }

      setSuccess('Cancellation request declined and dispute opened.');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to dispute.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Pin/Unpin Quest
  const handleTogglePin = async () => {
    if (!task) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !task.isPinned }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to pin task.');
      }

      setSuccess(data.message || 'Quest pin status updated.');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to pin.');
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const url = `/api/tasks/${taskId}/review`;
      const method = isEditingReview ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      setSuccess(isEditingReview ? 'Review updated successfully!' : 'Review submitted successfully!');
      setReviewComment('');
      setReviewRating(5);
      setIsEditingReview(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setActionLoading(false);
    }
  };

  const startEditingReview = (existingRating: number, existingComment: string) => {
    setReviewRating(existingRating);
    setReviewComment(existingComment);
    setIsEditingReview(true);
  };

  // Withdraw application
  const handleWithdrawApplication = async () => {
    if (!confirm('Are you sure you want to withdraw your application for this quest?')) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/apply`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to withdraw application.');
      }

      setSuccess('Application successfully withdrawn.');
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit edited bid
  const handleEditBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(editBidAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Bid amount must be a positive integer.');
      return;
    }

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/apply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedAmount: parsedAmount,
          isCounterBid: parsedAmount !== task?.offeredAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update bid.');
      }

      setSuccess('Bid amount updated successfully!');
      setIsEditingBid(false);
      loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update bid.');
    } finally {
      setActionLoading(false);
    }
  };

  const startEditingBid = (currentAmount: number) => {
    setEditBidAmount(currentAmount.toString());
    setIsEditingBid(true);
  };

  const handleToggleSave = async () => {
    if (!currentUser) return;
    setError('');
    setSuccess('');

    const previousSaved = isSaved;
    // Optimistic UI update
    setIsSaved(!previousSaved);

    try {
      const res = await fetch(`/api/tasks/${taskId}/save`, {
        method: previousSaved ? 'DELETE' : 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update bookmark.');
      setSuccess(data.message || 'Bookmark updated.');
    } catch (err: any) {
      // Rollback on failure
      setIsSaved(previousSaved);
      setError(err.message || 'Failed to update.');
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
      <EmptyState
        title="Quest not found"
        description="This corner of the campus doesn't seem to exist, or the SideQuest was cancelled or completed and archived."
        actionText="Back to Browse"
        actionLink="/"
      />
    );
  }

  const canDoerDispute = () => {
    if (task?.status !== 'PENDING_PAYMENT' || !task?.pendingPaymentSince) return false;
    const pendingTime = new Date(task.pendingPaymentSince).getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    return Date.now() - pendingTime >= fortyEightHoursMs;
  };

  // Determine Doer details if assigned
  const acceptedApplication = applications.find(a => a.status === 'ACCEPTED') || null;
  const isAssignedDoer = acceptedApplication ? acceptedApplication.doerId === currentUser?.id : false;
  
  // Format deadline date
  const deadlineDate = new Date(task.deadline).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="page-container route-entrance" style={{ paddingBottom: '5rem' }}>
      
      {/* Back button */}
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        ← Back to Browse Quests
      </Link>

      {/* Title block */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            {getCategoryIcon(task.category, 14)}
            {getCategoryLabel(task.category)}
          </span>
          {task.isUrgent && (
            <span className="badge-tag" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              URGENT
            </span>
          )}
          <span className="badge-tag" style={{
            background: task.status === 'OPEN' ? 'rgba(16, 185, 129, 0.15)' : task.status === 'ASSIGNED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: task.status === 'OPEN' ? 'var(--success)' : task.status === 'ASSIGNED' ? 'var(--warning)' : 'var(--text-secondary)',
            border: `1px solid ${task.status === 'OPEN' ? 'rgba(16,185,129,0.3)' : task.status === 'ASSIGNED' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`
          }}>
            Status: {task.status.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.3, margin: 0, flex: 1 }}>{task.title}</h1>
          {currentUser && (
            <button
              onClick={handleToggleSave}
              className="btn-bookmark"
              style={{
                color: isSaved ? 'var(--warning)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.01)',
              }}
              disabled={actionLoading}
            >
              <SavedIcon size={18} fill={isSaved ? 'var(--warning)' : 'none'} stroke={isSaved ? 'var(--warning)' : 'currentColor'} />
              <span>{isSaved ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <LocationIcon size={14} /> Location: {getLocationLabel(task.location)}
        </p>
      </div>

      {/* Success/Error Toasts */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          [Warning] {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          [Success] {success}
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
                  <Image src={task.photo_url} alt="Task Attachment" width={600} height={350} unoptimized style={{ width: '100%', height: 'auto', maxHeight: '350px', objectFit: 'contain' }} />
                </div>
              </div>
            )}
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>SideQuest Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Offered Amount:</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>₹ {task.offeredAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Duration:</span>
                <span style={{ fontWeight: 500 }}>{getDurationLabel(task.estimatedDuration)}</span>
              </div>
              {task.agreedAmount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Agreed Amount:</span>
                  <span style={{ fontWeight: 600 }}>₹ {task.agreedAmount}</span>
                </div>
              )}
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

          {/* Reviews Panel */}
          {task.status === 'COMPLETED' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Ratings & Reviews</h2>

              {/* Form to submit / edit review */}
              {currentUser && (isPoster || isAssignedDoer) && (
                (!task.reviews.some(r => r.reviewer_id === currentUser.id) || isEditingReview) ? (
                  <form onSubmit={handleReviewSubmit} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: '#ffffff' }}>
                      {isEditingReview ? 'Edit Your Review' : `Leave a Review for @${isPoster ? acceptedApplication?.doer.username : task.poster.username}`}
                    </h3>

                    {/* Star Rating Select */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Rating:</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.5rem',
                              color: star <= reviewRating ? 'var(--warning)' : 'var(--text-muted)',
                              padding: '0 0.1rem',
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <textarea
                        className="form-input"
                        placeholder="Write your feedback comment..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        style={{ minHeight: '80px', fontSize: '0.9rem' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={actionLoading}>
                        {actionLoading ? 'Saving...' : isEditingReview ? 'Save Changes' : 'Submit Review'}
                      </button>
                      {isEditingReview && (
                        <button type="button" onClick={() => { setIsEditingReview(false); setReviewComment(''); setReviewRating(5); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} disabled={actionLoading}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                ) : null
              )}

              {/* Display existing reviews */}
              {task.reviews && task.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {task.reviews.map((rev) => (
                    <div key={rev.id} style={{
                      background: 'rgba(255,255,255,0.01)',
                      padding: '1rem',
                      borderRadius: 'var(--border-radius-md)',
                      border: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>@{rev.reviewer.username}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ color: 'var(--warning)', fontWeight: 700 }}>
                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                          </span>

                          {/* Check edit window: 24h & current user matches reviewer */}
                          {currentUser && rev.reviewer_id === currentUser.id && (Date.now() - new Date(rev.created_at).getTime() <= 24 * 60 * 60 * 1000) && !isEditingReview && (
                            <button
                              type="button"
                              onClick={() => startEditingReview(rev.rating, rev.comment)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              Edit Review
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {rev.comment}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
                  No reviews yet. Be the first student to review this user.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Poster Info & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Poster info */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quest Poster</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <Link href={`/profile/${task.poster.username}`} style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                @{task.poster.username}
              </Link>
              {task.poster.verified && (
                <span className="badge-tag badge-tag-verified" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                  <VerifiedIcon size={12} /> VIT Verified
                </span>
              )}
              {task.poster.ratingCount >= 3 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontWeight: 600 }}>
                  <StarIcon size={14} fill="var(--warning)" stroke="var(--warning)" />
                  {task.poster.ratingAverage.toFixed(1)} ({task.poster.ratingCount})
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>New Member</span>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: '0.75rem' }}>
              "{task.poster.bio || 'No bio added.'}"
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <LocationIcon size={14} /> Block: {task.poster.hostel_block || 'Not specified'}
            </p>
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
              {task.status === 'OPEN' && (
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                <Link href={`/profile/${app.doer.username}`} style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                  @{app.doer.username}
                                </Link>
                                {app.doer.verified && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.05rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 'bold' }}>
                                    <VerifiedIcon size={12} /> VIT Verified
                                  </span>
                                )}
                                {app.doer.ratingCount >= 3 ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <StarIcon size={12} fill="var(--warning)" stroke="var(--warning)" />
                                    {app.doer.ratingAverage.toFixed(1)} ({app.doer.ratingCount})
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>New Member</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <LocationIcon size={12} /> Block: {app.doer.hostel_block || 'N/A'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontWeight: 700, color: app.isCounterBid ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                ₹{app.requestedAmount}
                              </span>
                              {app.isCounterBid && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                                  Counter-Bid
                                </span>
                              )}
                            </div>
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
                  <button
                    onClick={handleTogglePin}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '0.75rem', borderColor: 'var(--warning)', color: '#ffffff' }}
                    disabled={actionLoading}
                  >
                    {task.isPinned ? 'Unpin Quest from Profile' : 'Pin Quest to Profile'}
                  </button>
                  <button onClick={handleCancelTask} className="btn btn-secondary" style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }} disabled={actionLoading}>
                    Cancel Quest
                  </button>
                </div>
              )}

              {/* Task Assigned */}
              {task.status === 'ASSIGNED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><ApplicantsIcon size={16} /> Assigned Doer: <strong>@{acceptedApplication?.doer.username}</strong></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>💰 Agreed Payment: <strong>₹{task.agreedAmount || task.offeredAmount}</strong></div>
                  </div>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ChatIcon size={16} /> Open Coordination Chat
                  </Link>

                  {!task.cancellationRequestedBy ? (
                    <button
                      onClick={handleCancelTask}
                      className="btn btn-danger"
                      style={{ width: '100%', background: 'transparent', border: '1px solid var(--danger)', color: '#ffffff' }}
                      disabled={actionLoading}
                    >
                      Cancel Quest
                    </button>
                  ) : task.cancellationRequestedBy === currentUser?.id ? (
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', color: 'var(--warning)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      <ClockIcon size={16} /> Cancellation request pending doer approval.
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>Doer requested cancellation.</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleCancelTask} className="btn btn-danger" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} disabled={actionLoading}>
                          Accept
                        </button>
                        <button onClick={handleDeclineCancellation} className="btn btn-secondary" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} disabled={actionLoading}>
                          Decline & Dispute
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Task Pending Payment */}
              {task.status === 'PENDING_PAYMENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '1.5rem',
                    borderRadius: 'var(--border-radius-md)',
                  }}>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--warning)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      Confirm Offline Payment
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                      Confirm you have paid <strong>₹{task.agreedAmount || task.offeredAmount}</strong> to <strong>@{acceptedApplication?.doer.username}</strong> offline.
                    </p>
                    <button
                      onClick={handleConfirmPayment}
                      className="btn btn-success"
                      style={{ width: '100%', fontWeight: 700 }}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Confirming...' : 'Yes, I have Paid Offline'}
                    </button>
                  </div>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ChatIcon size={16} /> Open Coordination Chat
                  </Link>
                </div>
              )}

              {/* Task Completed */}
              {task.status === 'COMPLETED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.9rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Completed by <strong>@{acceptedApplication?.doer.username}</strong>. Payment confirmed.
                  </div>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-secondary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ChatIcon size={16} /> View Chat Log (Read-Only)
                  </Link>

                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    {!showDisputeForm ? (
                      <button
                        onClick={() => setShowDisputeForm(true)}
                        className="btn btn-secondary"
                        style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                        disabled={actionLoading}
                      >
                        File a Dispute
                      </button>
                    ) : (
                      <form onSubmit={handleFileDispute} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#f87171' }}>File Dispute Ticket</h4>
                        <textarea
                          className="form-input"
                          placeholder="Describe the issue..."
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

              {/* Task Disputed */}
              {task.status === 'DISPUTED' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: 'var(--border-radius-md)' }}>
                  <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '0.25rem' }}>Under Dispute</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Admin is reviewing the non-payment report for this task.
                  </p>
                </div>
              )}

              {/* Task Cancelled */}
              {task.status === 'CANCELLED' && (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                  This task was cancelled.
                </p>
              )}
            </div>
          )}

          {/* Doer View (Assigned Doer) */}
          {currentUser && !isPoster && isAssignedDoer && (
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--accent-secondary)' }}>You are Assigned!</h2>
              
              {task.status === 'ASSIGNED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    You have been assigned to this quest. Please complete the task and mark it as completed to request payment.
                  </p>
                  
                  <button
                    onClick={handleCompleteTask}
                    className="btn btn-success"
                    style={{ width: '100%', fontWeight: 700 }}
                    disabled={actionLoading}
                  >
                    Mark as Completed / Delivered
                  </button>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ChatIcon size={16} /> Open Coordination Chat
                  </Link>

                  {!task.cancellationRequestedBy ? (
                    <button
                      onClick={handleCancelTask}
                      className="btn btn-danger"
                      style={{ width: '100%', background: 'transparent', border: '1px solid var(--danger)', color: '#ffffff' }}
                      disabled={actionLoading}
                    >
                      Cancel Assignment
                    </button>
                  ) : task.cancellationRequestedBy === currentUser?.id ? (
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', color: 'var(--warning)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      <ClockIcon size={16} /> Cancellation request pending poster approval.
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>Poster requested cancellation.</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleCancelTask} className="btn btn-danger" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} disabled={actionLoading}>
                          Accept
                        </button>
                        <button onClick={handleDeclineCancellation} className="btn btn-secondary" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} disabled={actionLoading}>
                          Decline & Dispute
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {task.status === 'PENDING_PAYMENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <ClockIcon size={16} /> Waiting for poster payment confirmation of <strong>₹{task.agreedAmount || task.offeredAmount}</strong> offline.
                  </div>

                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ChatIcon size={16} /> Open Coordination Chat
                  </Link>

                  {/* Dispute filing option after 48h */}
                  {canDoerDispute() ? (
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                      {!showDisputeForm ? (
                        <button
                          onClick={() => setShowDisputeForm(true)}
                          className="btn btn-danger"
                          style={{ width: '100%' }}
                          disabled={actionLoading}
                        >
                          Report Non-Payment (48h Passed)
                        </button>
                      ) : (
                        <form onSubmit={handleFileDispute} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.9rem', color: '#f87171' }}>Report Non-Payment</h4>
                          <textarea
                            className="form-input"
                            placeholder="Describe what happened (e.g. completed work but poster hasn't paid)..."
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            style={{ minHeight: '80px', fontSize: '0.85rem' }}
                            required
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', flex: 1 }} disabled={actionLoading}>
                              Submit Report
                            </button>
                            <button type="button" onClick={() => setShowDisputeForm(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={actionLoading}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      You can file a non-payment report if the poster doesn't confirm payment within 48 hours.
                    </p>
                  )}
                </div>
              )}

              {task.status === 'COMPLETED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 'var(--border-radius-md)', color: 'var(--success)', fontSize: '0.9rem' }}>
                    Completed! Poster confirmed offline payment of <strong>₹{task.agreedAmount || task.offeredAmount}</strong> and you have received +10 credits!
                  </div>
                  <Link href={`/chat?taskId=${task.id}`} className="btn btn-secondary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ChatIcon size={16} /> View Chat Log (Read-Only)
                  </Link>
                </div>
              )}

              {task.status === 'DISPUTED' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: 'var(--border-radius-md)' }}>
                  <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '0.25rem' }}>Under Dispute</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your non-payment report has been submitted. Admin is reviewing the case.
                  </p>
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
                  {myApplication.status === 'PENDING' ? (
                    isEditingBid ? (
                      <form onSubmit={handleEditBidSubmit}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                          Modify your counter-bid for this quest. Poster offered: <strong>₹{task.offeredAmount}</strong>.
                        </p>
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                          <label className="form-label" htmlFor="edit-offer-amount">Your New Bid (₹ INR)</label>
                          <input
                            className="form-input"
                            id="edit-offer-amount"
                            type="number"
                            min="1"
                            value={editBidAmount}
                            onChange={(e) => setEditBidAmount(e.target.value)}
                            disabled={actionLoading}
                            required
                            autoFocus
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-primary"
                            type="submit"
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Updating...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsEditingBid(false)}
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
                            disabled={actionLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '1.25rem', borderRadius: 'var(--border-radius-md)' }}>
                        <p style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '0.25rem', textAlign: 'center' }}>Application Pending</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'center' }}>
                          Your request: <strong>₹{myApplication.requestedAmount}</strong> {myApplication.isCounterBid && '(Counter-Bid)'}
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => startEditingBid(myApplication.requestedAmount)}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                            disabled={actionLoading}
                          >
                            ✏️ Edit Bid
                          </button>
                          <button
                            type="button"
                            onClick={handleWithdrawApplication}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                            disabled={actionLoading}
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <p style={{ fontWeight: 600, color: 'var(--danger)' }}>Application Declined</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>The poster declined this application.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Can Apply Form */
                task.status === 'OPEN' ? (
                  !useCustomOffer ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Apply to this task. The default offered amount is <strong>₹{task.offeredAmount}</strong>. You can accept the default or propose a custom bid.
                      </p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                          type="button"
                          onClick={handleApply}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Applying...' : `Accept ₹${task.offeredAmount}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseCustomOffer(true)}
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                          disabled={actionLoading}
                        >
                          Bid Different Amount
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleApply}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                        Propose a counter-bid. The poster offered <strong>₹{task.offeredAmount}</strong>.
                      </p>
                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label" htmlFor="offer-amount">Your Bid (₹ INR)</label>
                        <input
                          className="form-input"
                          id="offer-amount"
                          type="number"
                          min="1"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          disabled={actionLoading}
                          required
                          autoFocus
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                          className="btn btn-primary"
                          type="submit"
                          style={{ flex: 1 }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Submitting Counter-Bid...' : 'Send Counter-Bid'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setUseCustomOffer(false)}
                          style={{ flex: 0.5 }}
                          disabled={actionLoading}
                        >
                          Back
                        </button>
                      </div>
                    </form>
                  )
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
