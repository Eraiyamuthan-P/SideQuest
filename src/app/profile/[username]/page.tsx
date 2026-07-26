import React from 'react';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { TaskStatus, ApplicationStatus } from '@prisma/client';
import {
  StarIcon,
  VerifiedIcon,
  LocationIcon,
  ApplicantsIcon,
  LeaderboardIcon,
  SavedIcon
} from '@/components/Icons';

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

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = await params;
  const username = resolvedParams.username;

  // Fetch the profile user
  const profileUser = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      verified: true,
      credits: true,
      ratingAverage: true,
      ratingCount: true,
      bio: true,
      hostel_block: true,
      created_at: true,
      availability: true,
      skills: true,
    },
  });

  if (!profileUser) {
    notFound();
  }

  // Fetch session user
  const currentUser = await getSessionUser();
  const isOwner = currentUser ? currentUser.id === profileUser.id : false;

  // Fetch pinned task if any
  const pinnedTask = await prisma.task.findFirst({
    where: {
      poster_id: profileUser.id,
      isPinned: true,
      status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
    },
    include: {
      _count: { select: { applications: true } },
    },
  });

  // --- POSTER STATS ---
  const totalPosted = await prisma.task.count({
    where: { poster_id: profileUser.id },
  });

  const postedCompleted = await prisma.task.count({
    where: { poster_id: profileUser.id, status: TaskStatus.COMPLETED },
  });

  const postedCancelled = await prisma.task.count({
    where: { poster_id: profileUser.id, status: TaskStatus.CANCELLED },
  });

  const posterClosedTotal = postedCompleted + postedCancelled;
  const posterCompletionRate = posterClosedTotal > 0 
    ? Math.round((postedCompleted / posterClosedTotal) * 100) 
    : 100;
  const posterCancellationRate = posterClosedTotal > 0 
    ? Math.round((postedCancelled / posterClosedTotal) * 100) 
    : 0;

  const posterReviews = await prisma.review.findMany({
    where: { reviewee_id: profileUser.id, role: 'doer' },
    include: {
      reviewer: { select: { username: true } },
      task: { select: { title: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const averagePosterRating = posterReviews.length > 0
    ? (posterReviews.reduce((sum, r) => sum + r.rating, 0) / posterReviews.length).toFixed(1)
    : '0.0';

  // --- DOER STATS ---
  const doerCompleted = await prisma.task.count({
    where: {
      status: TaskStatus.COMPLETED,
      applications: {
        some: {
          doerId: profileUser.id,
          status: ApplicationStatus.ACCEPTED,
        },
      },
    },
  });

  const doerCancelled = 0;

  const doerClosedTotal = doerCompleted + doerCancelled;
  const doerCompletionRate = doerClosedTotal > 0
    ? Math.round((doerCompleted / doerClosedTotal) * 100)
    : 100;

  const doerReviews = await prisma.review.findMany({
    where: { reviewee_id: profileUser.id, role: 'poster' },
    include: {
      reviewer: { select: { username: true } },
      task: { select: { title: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const averageDoerRating = doerReviews.length > 0
    ? (doerReviews.reduce((sum, r) => sum + r.rating, 0) / doerReviews.length).toFixed(1)
    : '0.0';

  const badges = await prisma.badge.findMany({
    where: { user_id: profileUser.id },
    orderBy: { earned_at: 'desc' },
  });

  // Extract skills dynamically
  const completedTasksForSkills = await prisma.task.findMany({
    where: {
      status: TaskStatus.COMPLETED,
      applications: {
        some: {
          doerId: profileUser.id,
          status: ApplicationStatus.ACCEPTED,
        },
      },
    },
    select: { category: true },
    distinct: ['category'],
  });

  const skillTags = [...(profileUser.skills || [])];
  const completedCategories = completedTasksForSkills.map(t => {
    const labels: Record<string, string> = {
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
    return labels[t.category] || t.category;
  });
  
  completedCategories.forEach(cat => {
    if (!skillTags.includes(cat)) {
      skillTags.push(cat);
    }
  });

  const bioText = (profileUser.bio || '').toLowerCase();
  const commonSkills = ['java', 'python', 'math', 'calculus', 'physics', 'proofreading', 'editing', 'drawing', 'coding', 'react'];
  commonSkills.forEach(skill => {
    const formattedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
    if (bioText.includes(skill) && !skillTags.some(s => s.toLowerCase() === skill)) {
      skillTags.push(formattedSkill);
    }
  });

  // --- PRIVATE LOGS (OWNER ONLY) ---
  const earnings = isOwner
    ? await prisma.task.findMany({
        where: {
          status: TaskStatus.COMPLETED,
          applications: {
            some: {
              doerId: profileUser.id,
              status: ApplicationStatus.ACCEPTED,
            },
          },
        },
        select: {
          id: true,
          title: true,
          offeredAmount: true,
          agreedAmount: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      })
    : [];

  // Fetch saved tasks if owner
  const savedTasks = isOwner
    ? await prisma.savedTask.findMany({
        where: { user_id: profileUser.id },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              offeredAmount: true,
              agreedAmount: true,
              status: true,
            }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    : [];

  // Format date
  const memberSince = new Date(profileUser.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* 1. Header Profile Banner */}
      <div className="glass-panel" style={{
        padding: '2.5rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: 'var(--accent-gradient)',
          filter: 'blur(60px)',
          opacity: 0.2,
          borderRadius: '50%',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '2.25rem', margin: 0 }}>@{profileUser.username}</h1>
                {profileUser.verified && (
                  <span className="badge-tag badge-tag-verified" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    <VerifiedIcon size={14} /> VIT Verified
                  </span>
                )}
                <span className="badge-tag" style={{
                  background: profileUser.availability === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: profileUser.availability === 'AVAILABLE' ? 'var(--success)' : 'var(--warning)',
                  border: `1px solid ${profileUser.availability === 'AVAILABLE' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  fontWeight: 600,
                }}>
                  {profileUser.availability === 'AVAILABLE' ? 'Available' : 'Busy'}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Rating (Public) */}
              {profileUser.ratingCount >= 3 ? (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: 'var(--warning)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.1)',
                }}>
                  <StarIcon size={18} fill="var(--warning)" stroke="var(--warning)" />
                  {profileUser.ratingAverage.toFixed(1)} ({profileUser.ratingCount} Reviews)
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  New Member
                </div>
              )}
              {/* Credits (Public) */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                color: 'var(--accent-secondary)',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--border-radius-md)',
                fontSize: '1.1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 0 15px rgba(168, 85, 247, 0.1)',
              }}>
                <LeaderboardIcon size={18} /> {profileUser.credits} Credits
              </div>
            </div>

            {/* Profile Completion Bar for Owner */}
            {isOwner && (() => {
              const hasAvatar = true; // initials avatar exists automatically
              const hasBio = !!profileUser.bio;
              const hasHostel = !!profileUser.hostel_block;
              const hasSkills = profileUser.skills && profileUser.skills.length > 0;
              
              // Dynamic checks for future fields if added to DB
              const hasPhone = 'phone' in profileUser && !!(profileUser as any).phone;
              const hasAboutMe = 'about_me' in profileUser && !!(profileUser as any).about_me;
              
              const completeness = (hasAvatar ? 20 : 0) + (hasBio ? 30 : 0) + (hasHostel ? 20 : 0) + (hasSkills ? 30 : 0);
              return (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  padding: '1.25rem',
                  borderRadius: 'var(--border-radius-md)',
                  marginTop: '0.5rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Profile Completion</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{completeness}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', overflow: 'hidden' }}>
                    <div style={{ width: `${completeness}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '50px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: hasAvatar ? 'var(--success)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>Avatar (20%)</span>
                    <span style={{ fontSize: '0.7rem', color: hasBio ? 'var(--success)' : 'var(--text-muted)' }}>Bio (30%)</span>
                    <span style={{ fontSize: '0.7rem', color: hasHostel ? 'var(--success)' : 'var(--text-muted)' }}>Hostel (20%)</span>
                    <span style={{ fontSize: '0.7rem', color: hasSkills ? 'var(--success)' : 'var(--text-muted)' }}>Skills (30%)</span>
                    {'phone' in profileUser && (
                      <span style={{ fontSize: '0.7rem', color: hasPhone ? 'var(--success)' : 'var(--text-muted)' }}>Phone</span>
                    )}
                    {'about_me' in profileUser && (
                      <span style={{ fontSize: '0.7rem', color: hasAboutMe ? 'var(--success)' : 'var(--text-muted)' }}>About Me</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bio
            </h3>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#ffffff' }}>
              {profileUser.bio || "No bio added yet."}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><LocationIcon size={14} /> Block: <strong>{profileUser.hostel_block || 'Not specified'}</strong></div>
            <div>Joined: <strong>{memberSince}</strong></div>
          </div>
        </div>
      </div>

      {/* Pinned active task */}
      {pinnedTask && (
        <div className="glass-panel" style={{
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.02)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            fontSize: '0.8rem',
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--warning)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--border-radius-xl)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            Pinned Quest
          </div>
          
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#ffffff' }}>{pinnedTask.title}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {pinnedTask.description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', alignItems: 'center' }}>
            <div>Offered: <strong style={{ color: 'var(--warning)' }}>₹{pinnedTask.offeredAmount}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><LocationIcon size={12} /> Location: <strong>{getLocationLabel(pinnedTask.location)}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ApplicantsIcon size={12} /> Applicants: <strong>{pinnedTask._count.applications}</strong></div>
            <Link href={`/tasks/${pinnedTask.id}`} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
               View Quest Details
            </Link>
          </div>
        </div>
      )}

      {/* 2. Columns (Poster vs Doer) */}
      <div className="grid-cols-2" style={{ marginBottom: '2.5rem' }}>
        {/* Left Column - As Poster */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{
            fontSize: '1.35rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            paddingBottom: '0.75rem',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            As Poster
          </h2>

          {/* Poster Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 0.5rem', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalPosted}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks Posted</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 0.5rem', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{posterCompletionRate}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completion</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 0.5rem', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ fontSize: posterReviews.length >= 3 ? '1.5rem' : '0.9rem', fontWeight: 800, color: 'var(--warning)', minHeight: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                {posterReviews.length >= 3 ? (
                  <>
                    <StarIcon size={14} fill="var(--warning)" stroke="var(--warning)" />
                    {averagePosterRating}
                  </>
                ) : 'New'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <span>Cancellation Rate:</span>
            <span style={{ color: posterCancellationRate > 20 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {posterCancellationRate}%
            </span>
          </div>

          {/* Poster Reviews */}
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Reviews from Doers ({posterReviews.length})</h3>
          {posterReviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posterReviews.map((review) => (
                <div key={review.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '1rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <Link href={`/profile/${review.reviewer.username}`} style={{ fontWeight: 600 }}>
                      @{review.reviewer.username}
                    </Link>
                    <span style={{ color: 'var(--warning)' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    "{review.comment}"
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Task: {review.task.title}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
              No reviews yet. Be the first student to review this user.
            </p>
          )}
        </div>

        {/* Right Column - As Doer */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{
            fontSize: '1.35rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(168, 85, 247, 0.3)',
            paddingBottom: '0.75rem',
            color: 'var(--accent-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            As Doer
          </h2>

          {/* Doer Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 0.5rem', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{doerCompleted}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks Completed</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 0.5rem', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{doerCompletionRate}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completion</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 0.5rem', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ fontSize: doerReviews.length >= 3 ? '1.5rem' : '0.9rem', fontWeight: 800, color: 'var(--warning)', minHeight: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                {doerReviews.length >= 3 ? (
                  <>
                    <StarIcon size={14} fill="var(--warning)" stroke="var(--warning)" />
                    {averageDoerRating}
                  </>
                ) : 'New'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</div>
            </div>
          </div>

          {/* Badges Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Badges
            </h3>
            {badges.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {badges.map((badge) => {
                  let badgeName = badge.badge_type;
                  let badgeClass = 'Doer';
                  if (badge.badge_type.includes('DOER')) {
                    badgeClass = 'Doer';
                    badgeName = badge.badge_type.includes('5') ? 'Bronze Doer (5)' : 'Silver Doer (10)';
                  } else if (badge.badge_type.includes('POSTER')) {
                    badgeClass = 'Poster';
                    badgeName = badge.badge_type.includes('5') ? 'Bronze Poster (5)' : 'Silver Poster (10)';
                  }
                  
                  return (
                    <span key={badge.id} className="badge-tag badge-tag-credits" style={{
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      color: 'var(--accent-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                    }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.8 }}>[{badgeClass}]</span> {badgeName}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No achievements unlocked yet. Awarded at 5/10 tasks completed or posted.
              </p>
            )}
          </div>

          {/* Skill Tags */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Skill Tags
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {skillTags.map((tag, idx) => (
                <span key={idx} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}>
                  🏷️ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Doer Reviews */}
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Reviews from Posters ({doerReviews.length})</h3>
          {doerReviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {doerReviews.map((review) => (
                <div key={review.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '1rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <Link href={`/profile/${review.reviewer.username}`} style={{ fontWeight: 600 }}>
                      @{review.reviewer.username}
                    </Link>
                    <span style={{ color: 'var(--warning)' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    "{review.comment}"
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Task: {review.task.title}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
              No reviews yet. Be the first student to review this user.
            </p>
          )}
        </div>
      </div>

      {/* 3. Private Owner Section */}
      {isOwner && (
        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <h2 style={{
            fontSize: '1.35rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(245, 158, 11, 0.3)',
            paddingBottom: '0.75rem',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>🔒</span> Private Section (Owner-Only)
          </h2>

          <div>
            {/* Earning History */}
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Earning History</h3>
              {earnings.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Task</th>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Earnings</th>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((task) => (
                        <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                            <Link href={`/tasks/${task.id}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                              {task.title}
                            </Link>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--success)', fontWeight: 600 }}>₹{(task.agreedAmount || task.offeredAmount).toFixed(0)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                            {new Date(task.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  No earnings logged yet. Complete tasks to earn money!
                </p>
              )}
            </div>

            {/* Saved Quests (Bookmarks) */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff' }}>
                <SavedIcon size={16} fill="var(--warning)" stroke="var(--warning)" /> Saved Quests
              </h3>
              {savedTasks.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Quest Title</th>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Budget</th>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedTasks.map(({ task }) => (
                        <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                            <Link href={`/tasks/${task.id}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                              {task.title}
                            </Link>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--warning)', fontWeight: 600, textAlign: 'right' }}>
                            ₹{(task.agreedAmount || task.offeredAmount).toFixed(0)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                            {task.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  You haven't saved any quests.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export const dynamic = 'force-dynamic';
