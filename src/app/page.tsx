'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  location: string;
  people_needed: number;
  assignment_mode: string;
  status: string;
  created_at: string;
  photo_url: string | null;
  poster: {
    username: string;
    verified: boolean;
  };
  _count: {
    applications: number;
  };
}

export default function BrowsingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (category && category !== 'All') params.append('category', category);
      if (budgetMin) params.append('budgetMin', budgetMin);
      if (budgetMax) params.append('budgetMax', budgetMax);
      params.append('sortBy', sortBy);
      params.append('status', 'open'); // default browse open tasks only

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch tasks.');
      }

      setTasks(data.tasks || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on mount and filter changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchTasks();
    }, 300); // debounce input

    return () => clearTimeout(delayDebounce);
  }, [search, category, budgetMin, budgetMax, sortBy]);

  // Quick Filter handlers
  const handleQuickAbove100 = () => {
    setBudgetMin('100');
    setBudgetMax('');
  };

  const handleQuickBelow100 = () => {
    setBudgetMin('');
    setBudgetMax('100');
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setBudgetMin('');
    setBudgetMax('');
    setSortBy('newest');
  };

  // Helper: Format deadline time remaining
  const formatTimeRemaining = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr);
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return 'Passed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} mins left`;
    }
    if (hours < 24) {
      return `${hours} hrs left`;
    }
    const days = Math.floor(hours / 24);
    return `${days} days left`;
  };

  const categories = ['All', 'Errands', 'Second-hand items', 'Tutoring', 'Freelancing', 'Transportation'];

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Campus SideQuests</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Hyperlocal micro-gigs exclusively for VIT students.</p>
        </div>
        <Link href="/tasks/new" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
          ＋ Post a SideQuest
        </Link>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Row 1: Search & Sort */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="text"
                placeholder="🔍 Search quests by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sort by:</span>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ minWidth: '160px', padding: '0.6rem' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="budget_desc">Budget: High to Low</option>
                <option value="budget_asc">Budget: Low to High</option>
              </select>
            </div>
          </div>

          {/* Row 2: Category Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="btn"
                style={{
                  padding: '0.4rem 1rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--border-radius-xl)',
                  background: category === cat ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                  border: `1px solid ${category === cat ? 'transparent' : 'var(--glass-border)'}`,
                  color: '#ffffff',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Row 3: Budget Ranges & Quick Filters */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderTop: '1px solid var(--glass-border)',
            paddingTop: '1rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Budget Range:</span>
              <input
                className="form-input"
                type="number"
                placeholder="Min credits"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                style={{ maxWidth: '120px', padding: '0.5rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                className="form-input"
                type="number"
                placeholder="Max credits"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                style={{ maxWidth: '120px', padding: '0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleQuickAbove100}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Above 🪙100
              </button>
              <button
                type="button"
                onClick={handleQuickBelow100}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Below 🪙100
              </button>
              {(search || category !== 'All' || budgetMin || budgetMax || sortBy !== 'newest') && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-danger"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Task Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }} className="animate-pulse-slow">
            Scanning for active quests...
          </p>
        </div>
      ) : tasks.length > 0 ? (
        <div className="grid-cols-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="glass-panel" style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              cursor: 'pointer',
              height: '100%',
              textDecoration: 'none',
              color: 'inherit',
            }}>
              {/* Card Photo (if available) */}
              {task.photo_url && (
                <div style={{ width: '100%', height: '140px', overflow: 'hidden', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem', border: '1px solid var(--glass-border)' }}>
                  <img src={task.photo_url} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Tag / Category */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge-tag" style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                }}>
                  {task.category}
                </span>

                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ⏱️ {formatTimeRemaining(task.deadline)}
                </span>
              </div>

              {/* Title & Description */}
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', lineHeight: 1.4, color: '#ffffff' }}>
                {task.title}
              </h3>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flex: 1,
              }}>
                {task.description}
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', marginBottom: '1rem' }} />

              {/* Card Footer Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    📍 {task.location}
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--warning)' }}>
                    🪙{task.budget}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.02)',
                  paddingTop: '0.5rem',
                }}>
                  <span>By @{task.poster.username}</span>
                  <span>👥 {task._count.applications} applied / {task.people_needed} needed</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--glass-border)' }}>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            No active quests found.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Try broadening your search term or filters, or post a new task yourself!
          </p>
          <Link href="/tasks/new" className="btn btn-primary">
            ＋ Post the First Quest
          </Link>
        </div>
      )}
    </div>
  );
}
