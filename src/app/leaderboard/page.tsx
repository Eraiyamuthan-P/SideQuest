import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { TaskStatus, ApplicationStatus } from '@prisma/client';
import { StarIcon, VerifiedIcon, LeaderboardIcon } from '@/components/Icons';
import { EmptyState } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  let users: {
    id: string;
    username: string;
    verified: boolean;
    credits: number;
    ratingAverage: number;
    ratingCount: number;
    _count: {
      posted_tasks: number;
      applications: number;
    };
  }[] = [];
  let error = '';

  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        verified: true,
        credits: true,
        ratingAverage: true,
        ratingCount: true,
        _count: {
          select: {
            posted_tasks: {
              where: { status: TaskStatus.COMPLETED },
            },
            applications: {
              where: { status: ApplicationStatus.ACCEPTED, task: { status: TaskStatus.COMPLETED } },
            },
          },
        },
      },
      orderBy: {
        credits: 'desc',
      },
      take: 50,
    }) as any;
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    error = 'An error occurred while loading the leaderboard.';
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { text: 'Gold', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)' };
    if (rank === 2) return { text: 'Silver', color: '#e5e7eb', bg: 'rgba(229, 231, 235, 0.15)', border: '1px solid rgba(229, 231, 235, 0.3)' };
    if (rank === 3) return { text: 'Bronze', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)' };
    return { text: `#${rank}`, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
  };

  return (
    <div className="page-container route-entrance" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '2.25rem',
          marginBottom: '0.5rem',
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        }}>
          Campus Leaderboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Ranked by credits score. Complete tasks and maintain high ratings to climb the board!
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          [Warning] {error}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {users.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rank</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Student User</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>Rating</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>Completions</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Credits</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const rank = index + 1;
                const badge = getRankBadge(rank);
                return (
                  <tr key={user.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    background: rank <= 3 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    transition: 'background var(--transition-fast)',
                  }}>
                    {/* Rank Badge */}
                    <td style={{ padding: '1rem' }}>
                      <span className="badge-tag" style={{
                        background: badge.bg,
                        color: badge.color,
                        border: badge.border,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.6rem',
                        minWidth: '80px',
                        justifyContent: 'center',
                        display: 'inline-flex'
                      }}>
                        {badge.text}
                      </span>
                    </td>
                    
                    {/* Username link */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link href={`/profile/${user.username}`} style={{ fontWeight: 600, color: rank <= 3 ? '#ffffff' : 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          @{user.username}
                        </Link>
                        {user.verified && (
                          <VerifiedIcon size={14} />
                        )}
                      </div>
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--warning)', fontWeight: 600 }}>
                        {user.ratingCount >= 3 ? (
                          <>
                            <StarIcon size={14} fill="var(--warning)" stroke="var(--warning)" />
                            <span>{user.ratingAverage.toFixed(1)} ({user.ratingCount})</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>New</span>
                        )}
                      </div>
                    </td>

                    {/* Completions */}
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {user._count.posted_tasks + user._count.applications}
                    </td>

                    {/* Credits Score */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', fontWeight: 700, color: 'var(--accent-secondary)', fontSize: '1.05rem' }}>
                        <LeaderboardIcon size={16} stroke="var(--accent-secondary)" />
                        <span>{user.credits}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No leaderboard entries"
            description="The campus board is currently empty. Complete quests to gain credits and become the top student!"
          />
        )}
      </div>

    </div>
  );
}
