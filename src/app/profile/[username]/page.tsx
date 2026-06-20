import React from 'react';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';

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
      email: true,
      verified: true,
      credits: true,
      bio: true,
      hostel_block: true,
      created_at: true,
    },
  });

  if (!profileUser) {
    notFound();
  }

  // Fetch session user
  const currentUser = await getSessionUser();
  const isOwner = currentUser ? currentUser.id === profileUser.id : false;

  // --- POSTER STATS ---
  const totalPosted = await prisma.task.count({
    where: { poster_id: profileUser.id },
  });

  const postedCompleted = await prisma.task.count({
    where: { poster_id: profileUser.id, status: 'completed' },
  });

  const postedCancelled = await prisma.task.count({
    where: { poster_id: profileUser.id, status: 'cancelled' },
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
      status: 'completed',
      applications: {
        some: {
          applicant_id: profileUser.id,
          status: 'accepted',
        },
      },
    },
  });

  const doerCancelled = await prisma.creditTransaction.count({
    where: {
      user_id: profileUser.id,
      reason: { contains: 'Cancel after being assigned (doer)' },
    },
  });

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
      status: 'completed',
      applications: {
        some: {
          applicant_id: profileUser.id,
          status: 'accepted',
        },
      },
    },
    select: { category: true },
    distinct: ['category'],
  });

  const skillTags = completedTasksForSkills.map(t => t.category);
  const bioText = (profileUser.bio || '').toLowerCase();
  const commonSkills = ['java', 'python', 'math', 'calculus', 'physics', 'proofreading', 'editing', 'drawing', 'coding', 'react'];
  commonSkills.forEach(skill => {
    if (bioText.includes(skill) && !skillTags.includes(skill)) {
      skillTags.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });

  // --- PRIVATE LOGS (OWNER ONLY) ---
  const transactions = isOwner
    ? await prisma.creditTransaction.findMany({
        where: { user_id: profileUser.id },
        orderBy: { created_at: 'desc' },
      })
    : [];

  const earnings = isOwner
    ? await prisma.task.findMany({
        where: {
          status: 'completed',
          applications: {
            some: {
              applicant_id: profileUser.id,
              status: 'accepted',
            },
          },
        },
        select: {
          id: true,
          title: true,
          budget: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
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
                  <span className="badge-tag badge-tag-verified" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    ✓ Verified Student
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                📧 {profileUser.email}
              </p>
            </div>
            
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
              🪙 {profileUser.credits} Credits
            </div>
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
            <div>📍 Block: <strong>{profileUser.hostel_block || 'Not specified'}</strong></div>
            <div>📅 Joined: <strong>{memberSince}</strong></div>
          </div>
        </div>
      </div>

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
            <span>📢</span> As Poster
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
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>⭐ {averagePosterRating}</div>
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No poster reviews received yet.
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
            <span>⚡</span> As Doer
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
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>⭐ {averageDoerRating}</div>
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
                  let badgeIcon = '🏆';
                  if (badge.badge_type.includes('DOER')) {
                    badgeIcon = '🚀';
                    badgeName = badge.badge_type.includes('5') ? 'Bronze Doer (5)' : 'Silver Doer (10)';
                  } else if (badge.badge_type.includes('POSTER')) {
                    badgeIcon = '📢';
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
                      <span>{badgeIcon}</span> {badgeName}
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No doer reviews received yet.
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

          <div className="grid-cols-2">
            {/* Earning History */}
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Earning History</h3>
              {earnings.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Task</th>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Credits Received</th>
                        <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((task) => (
                        <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{task.title}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--success)', fontWeight: 600 }}>+10 Credits</td>
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
                  No earnings logged yet. Complete tasks to earn credits!
                </p>
              )}
            </div>

            {/* Credit Transaction History */}
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Transaction History</h3>
              {transactions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {transactions.map((tx) => {
                    const isPositive = tx.amount >= 0;
                    return (
                      <div key={tx.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tx.reason}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: isPositive ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {isPositive ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  No transactions recorded.
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
