'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardUser {
  id: string;
  username: string;
  verified: boolean;
  balance: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (res.ok) {
          setUsers(data.leaderboard || []);
        } else {
          setError(data.error || 'Failed to load leaderboard data.');
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('An error occurred while loading the leaderboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { text: '👑 Gold', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)' };
    if (rank === 2) return { text: '🥈 Silver', color: '#e5e7eb', bg: 'rgba(229, 231, 235, 0.15)', border: '1px solid rgba(229, 231, 235, 0.3)' };
    if (rank === 3) return { text: '🥉 Bronze', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)' };
    return { text: `#${rank}`, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
      
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
          Ranked by wallet balance. Complete tasks and maintain high ratings to climb the board!
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--text-secondary)' }} className="animate-pulse-slow">Evaluating standings...</p>
          </div>
        ) : users.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rank</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Student User</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Balance</th>
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
                        padding: '0.3rem 0.6rem',
                        minWidth: '80px',
                        justifyContent: 'center'
                      }}>
                        {badge.text}
                      </span>
                    </td>
                    
                    {/* Username link */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link href={`/profile/${user.username}`} style={{ fontWeight: 600, color: rank <= 3 ? '#ffffff' : 'var(--text-primary)' }}>
                          @{user.username}
                        </Link>
                        {user.verified && (
                          <span style={{
                            color: 'var(--success)',
                            fontSize: '0.7rem',
                            background: 'rgba(16, 185, 129, 0.12)',
                            padding: '0.05rem 0.3rem',
                            borderRadius: '50px',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>✓</span>
                        )}
                      </div>
                    </td>

                    {/* Credit Balance */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--warning)', fontSize: '1.05rem' }}>
                      ₹{user.balance.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
            No students found on the leaderboard.
          </p>
        )}
      </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';
