'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  StarIcon,
  VerifiedIcon,
  ClockIcon,
  LocationIcon,
  ApplicantsIcon,
  getCategoryIcon,
  RewardIcon
} from '@/components/Icons';
import { QuestCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  offeredAmount: number;
  deadline: string;
  location: string;
  people_needed: number;
  assignment_mode: string;
  status: string;
  created_at: string;
  photo_url: string | null;
  isUrgent: boolean;
  estimatedDuration: string;
  poster: {
    id: string;
    username: string;
    verified: boolean;
    ratingAverage: number;
    ratingCount: number;
  };
  _count: {
    applications: number;
  };
  applications?: {
    id: string;
    status: string;
  }[];
}

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

export default function BrowsingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [applyLoadingId, setApplyLoadingId] = useState<string | null>(null);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isSticky, setIsSticky] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [filterHeight, setFilterHeight] = useState<number>(0);

  // Stats state
  const [stats, setStats] = useState({
    totalStudents: 0,
    completedQuests: 0,
    openQuests: 0,
    averageRating: null as number | null,
  });

  // Track sticky status on scroll and measure height dynamically
  useEffect(() => {
    const handleScroll = () => {
      const wrapper = wrapperRef.current;
      if (wrapper) {
        // Sticky activates when the wrapper's top edge scrolls past the bottom of the navbar (72px / 4.5rem offset)
        setIsSticky(window.scrollY > wrapper.offsetTop - 72);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initial trigger
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (filterRef.current) {
        setFilterHeight(filterRef.current.offsetHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Fetch session user & stats
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch((err) => console.error('Error fetching session user:', err));

    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setStats({
            totalStudents: data.totalStudents || 0,
            completedQuests: data.completedQuests || 0,
            openQuests: data.openQuests || 0,
            averageRating: data.averageRating,
          });
        }
      })
      .catch((err) => console.error('Error fetching statistics:', err));
  }, []);

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
      params.append('status', 'OPEN'); // database is case sensitive, uppercase OPEN

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

  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setBudgetMin('');
    setBudgetMax('');
    setSortBy('newest');
  };

  const handleDirectApply = async (taskId: string, amount: number) => {
    setError('');
    setApplyLoadingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedAmount: amount, isCounterBid: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply.');
      }
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to apply.');
    } finally {
      setApplyLoadingId(null);
    }
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

  const categories = [
    { label: 'All', value: 'All' },
    { label: 'Tutoring', value: 'TUTORING' },
    { label: 'Food Pickup', value: 'FOOD_PICKUP' },
    { label: 'Ride Sharing', value: 'RIDE_SHARING' },
    { label: 'Parcel Delivery', value: 'PARCEL_DELIVERY' },
    { label: 'Shopping', value: 'SHOPPING' },
    { label: 'Coding Help', value: 'CODING_HELP' },
    { label: 'Notes', value: 'NOTES' },
    { label: 'Printing', value: 'PRINTING' },
    { label: 'Hostel Help', value: 'HOSTEL_HELP' },
    { label: 'Event Assistance', value: 'EVENT_ASSISTANCE' },
  ];

  const getCategoryLabel = (catValue: string) => {
    const cat = categories.find(c => c.value === catValue);
    return cat ? cat.label : catValue;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="route-entrance">
      
      {/* 1. Hero & Stats Marketing Lander */}
      <section className="hero-marketing-bg" style={{ padding: '5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '3rem', alignItems: 'center' }} className="grid-cols-mobile-stack">
          {/* Left Column: Hero Wording */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.15em', marginBottom: '1rem' }}>
              Trusted Campus Marketplace
            </span>
            <h1 style={{ fontSize: '3.25rem', lineHeight: 1.1, marginBottom: '1.25rem', fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
              Complete Campus Quests.<br />
              Help Fellow Students.<br />
              Earn Trust Along the Way.
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '580px' }}>
              Complete real campus quests with trusted VIT students. No platform fees. Payments happen directly between students.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => document.getElementById('quest-board')?.scrollIntoView({ behavior: 'smooth' })} 
                className="btn btn-primary" 
                style={{ padding: '0.9rem 2.2rem', fontSize: '0.95rem' }}
              >
                Browse Quests
              </button>
              <Link 
                href="/tasks/new" 
                className="btn btn-secondary" 
                style={{ padding: '0.9rem 2.2rem', fontSize: '0.95rem' }}
              >
                Post a Quest
              </Link>
            </div>
          </div>

          {/* Right Column: Platform Live Stats */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total Students</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {stats.totalStudents || 0}
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Completed Quests</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {stats.completedQuests || 0}
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Open Quests</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {stats.openQuests || 0}
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Average Rating</div>
              {stats.averageRating !== null && stats.averageRating > 0 ? (
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <StarIcon size={24} fill="var(--warning)" stroke="var(--warning)" /> {stats.averageRating.toFixed(1)}
                </div>
              ) : (
                <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
                  — <span style={{ fontSize: '0.85rem', fontWeight: 500, marginLeft: '0.15rem' }}>No ratings yet</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. How SideQuest Works Section (4 Steps) */}
      <section style={{ padding: '6rem 1.5rem', display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.005)' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>How SideQuest Works</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Trusted student-to-student collaboration built exclusively for VIT campus life.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 700 }}>1</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>Post a Quest</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Describe what you need help with, specify the location block, and set your reward amount.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)', fontWeight: 700 }}>2</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>Choose the Student</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Review incoming applications and counter-bids from fellow students, selecting the best fit.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', fontWeight: 700 }}>3</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>Meet & Complete</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Coordinate chat instructions, finish the task on campus, and settle the payment directly.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', fontWeight: 700 }}>4</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>Build Reputation</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Earn reviews, reputation credits, and verified trust points for future campus marketplace gigs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Students Use SideQuest Section */}
      <section style={{ padding: '6rem 1.5rem', display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.002)', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>Why Students Choose SideQuest</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Built by VIT students, for VIT students. A trusted space for campus help.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Find Help in Minutes</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Need notes copied before exams, heavy books moved to your hostel room, or a midnight food run? Post a quest and get responses from nearby peers instantly.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Earn Money on Campus</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Turn your spare campus hours into earnings. Deliver parcels, tutor fellow students in coding, or share rides to the station during vacations.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Trusted VIT-Only Community</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Access is limited strictly to verified VIT student accounts. No third parties, no external agents. Just verified student peers collaborating.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Reputation Marketplace</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Your credits score and verified user reviews build a trusted visual identity on campus, making it easy to know who you're working with.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Explore Quests Showcase Section */}
      <section style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.003)', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Explore Quests</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Click any category card to filter active quests immediately below.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {categories.filter(c => c.value !== 'All').map((cat) => (
              <div 
                key={cat.value} 
                onClick={() => {
                  setCategory(cat.value);
                  document.getElementById('quest-board')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="glass-panel"
                style={{ 
                  padding: '1.75rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  transition: 'all 200ms ease',
                  border: category === cat.value ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: category === cat.value ? 'rgba(99, 102, 241, 0.05)' : 'var(--glass-bg)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = category === cat.value ? 'var(--accent-primary)' : 'var(--glass-border)';
                }}
              >
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '12px', 
                  background: 'rgba(99, 102, 241, 0.12)', 
                  color: 'var(--accent-primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {getCategoryIcon(cat.value, 20)}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>{cat.label}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Explore quests</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Live Quest Board */}
      <section id="quest-board" style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', flex: 1, borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          
          <div className="board-header-row">
            <div>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>Browse Active Quests</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Browse and accept active campus tasks instantly.</p>
            </div>
            <Link href="/tasks/new" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
              Post a Quest
            </Link>
          </div>

          {/* FilterWrapper maintains the original layout height to prevent jumping */}
          <div 
            ref={wrapperRef} 
            className="filter-wrapper"
            style={{ 
              minHeight: isSticky ? `${filterHeight}px` : 'auto',
              marginBottom: '2rem',
              width: '100%',
              position: 'relative'
            }}
          >
            {/* Sticky Filter and Search Panel */}
            <div ref={filterRef} className={`sticky-filter-panel ${isSticky ? 'is-sticky' : ''}`}>
              {/* Search & Sort */}
              <div className="filter-search-row">
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Search quests, categories or locations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sort:</span>
                  <select
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: '140px', padding: '0.5rem', height: '40px' }}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="budget_desc">Highest Reward</option>
                    <option value="budget_asc">Lowest Reward</option>
                  </select>
                </div>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }} className="hide-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`category-pill ${category === cat.value ? 'active' : ''}`}
                  >
                    {cat.value !== 'All' && getCategoryIcon(cat.value, 14)}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Offered Amount Ranges */}
              <div className="filter-budget-row">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Offered Amount Range:</span>
                <div className="filter-budget-inputs">
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Min ₹"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    style={{ maxWidth: '100px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>to</span>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Max ₹"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    style={{ maxWidth: '100px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
                {(budgetMin || budgetMax || category !== 'All' || search) && (
                  <button onClick={handleClearFilters} className="btn btn-secondary filter-clear-btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Task Grid */}
          {loading ? (
            <div className="grid-cols-3" style={{ gap: '2rem' }}>
              {[1, 2, 3].map((i) => (
                <QuestCardSkeleton key={i} />
              ))}
            </div>
          ) : tasks.length > 0 ? (
            <div className="grid-cols-3" style={{ gap: '2rem' }}>
              {tasks.map((task) => (
                <div key={task.id} className="task-card">
                  <Link href={`/tasks/${task.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Tag & Status Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge-tag" style={{
                          background: 'rgba(99, 102, 241, 0.08)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(99, 102, 241, 0.18)',
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                          {getCategoryIcon(task.category, 12)}
                          {getCategoryLabel(task.category)}
                        </span>
                        {task.isUrgent && (
                          <span className="badge-tag" style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            fontSize: '0.65rem',
                            padding: '0.15rem 0.45rem',
                            fontWeight: 'bold',
                          }}>
                            URGENT
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span className="badge-tag" style={{
                        background: task.status === 'OPEN' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        color: task.status === 'OPEN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${task.status === 'OPEN' ? 'rgba(99, 102, 241, 0.18)' : 'var(--glass-border)'}`,
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.55rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                      }}>
                        {task.status.toUpperCase()}
                        {task.status.toUpperCase() === 'OPEN' ? ` • ${task._count.applications} Applicant${task._count.applications === 1 ? '' : 's'}` : ''}
                      </span>
                    </div>

                    {/* Quest Banner Image */}
                    {task.photo_url && (
                      <div style={{ width: '100%', height: '140px', overflow: 'hidden', borderRadius: '12px', marginBottom: '1rem', border: '1px solid var(--glass-border)' }}>
                        <Image src={task.photo_url} alt={task.title} width={300} height={140} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Title & Description */}
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', lineHeight: 1.3, color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                  </Link>

                  <hr className="card-divider" />

                  {/* Metadata Row: Location & Time Remaining */}
                  <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <LocationIcon size={13} style={{ color: 'var(--accent-primary)' }} /> {getLocationLabel(task.location)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ClockIcon size={13} style={{ color: 'var(--accent-secondary)' }} /> {formatTimeRemaining(task.deadline)}
                    </span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: '0.5rem 0' }} />

                  {/* Reward Section (Visually Separated & Stacked) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <RewardIcon size={11} style={{ color: 'var(--warning)' }} /> Reward
                    </span>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      ₹{task.offeredAmount.toFixed(0)}
                    </span>
                  </div>

                  <hr className="card-divider" />

                  {/* Footer Poster Info */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>By @{task.poster.username}</span>
                      {task.poster.verified && (
                        <span style={{
                          color: 'var(--success)',
                          fontSize: '0.65rem',
                          background: 'rgba(16, 185, 129, 0.08)',
                          padding: '0.05rem 0.2rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}><VerifiedIcon size={10} /></span>
                      )}
                      {task.poster.ratingCount >= 3 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: 'var(--warning)', fontWeight: 600 }}>
                          <StarIcon size={10} fill="var(--warning)" stroke="var(--warning)" />
                          {task.poster.ratingAverage.toFixed(1)} ({task.poster.ratingCount})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.05rem 0.25rem', borderRadius: '4px' }}>New Member</span>
                      )}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <ApplicantsIcon size={12} /> {task._count.applications} / {task.people_needed}
                    </span>
                  </div>

                  {/* Action CTA Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {!currentUser ? (
                      <Link href="/auth" className="btn btn-secondary" style={{ textAlign: 'center', fontSize: '0.8rem', padding: '0.5rem' }}>
                        Sign In to Apply
                      </Link>
                    ) : currentUser.id === task.poster.id ? (
                      <div style={{
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '0.5rem',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px dashed var(--glass-border)',
                      }}>
                        Your posted task
                      </div>
                    ) : task.applications && task.applications.length > 0 ? (
                      <div style={{
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: 'var(--warning)',
                        background: 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.1)',
                        padding: '0.5rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontWeight: 600,
                      }}>
                        Applied ({task.applications[0].status.toUpperCase()})
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            await handleDirectApply(task.id, task.offeredAmount);
                          }}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flex: 1 }}
                          disabled={applyLoadingId === task.id}
                        >
                          {applyLoadingId === task.id ? 'Applying...' : `Accept ₹${task.offeredAmount}`}
                        </button>
                        <Link
                          href={`/tasks/${task.id}?counterBid=true`}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flex: 1, textAlign: 'center' }}
                        >
                          Bid Different
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={search.trim() || category !== 'All' || budgetMin || budgetMax ? "No matching quests found" : "Welcome to SideQuest"}
              description={search.trim() || category !== 'All' || budgetMin || budgetMax ? "Try broadening your search term or clearing your filters." : "You're ready to collaborate with trusted VIT students. Explore active quests or create one to get started."}
              actionText={search.trim() || category !== 'All' || budgetMin || budgetMax ? "Clear Filters" : "Post a Quest"}
              actionLink={search.trim() || category !== 'All' || budgetMin || budgetMax ? undefined : "/tasks/new"}
              onActionClick={search.trim() || category !== 'All' || budgetMin || budgetMax ? handleClearFilters : undefined}
            />
          )}
        </div>
      </section>

      {/* 6. FAQ Block */}
      <section style={{ padding: '6rem 1.5rem', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.002)' }}>
        <div style={{ maxWidth: '800px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>Frequently Asked Questions</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Everything you need to know about campus collaborations.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Is there any platform transaction fee?</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>No. SideQuest is run as a free campus service. All payments happen directly student-to-student offline (via UPI or cash) when the task is completed.</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>How do credits and ratings build trust?</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Every completed task awards reputation credits to both posters and doers. Positive ratings increase a user's verified rating average, visible to everyone on campus.</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>What happens in case of disputes or cancellations?</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>If a cancellation is declined, it is marked as a dispute and escalated to administration. Administrators review chat logs and task details to arbitrate fairly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Landing Footer (Expanded Columns) */}
      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '4rem 1.5rem 3rem 1.5rem', display: 'flex', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', gap: '2rem', marginBottom: '3rem' }} className="grid-cols-mobile-stack">
            {/* Branding Column */}
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.03em' }}>SideQuest</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5, maxWidth: '280px' }}>
                The trusted campus-focused marketplace for student collaboration. Designed exclusively for VIT campus life.
              </p>
            </div>
            
            {/* Product Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Product</h4>
              <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#ffffff'} onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-secondary)'}>Browse Quests</Link>
              <Link href="/leaderboard" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#ffffff'} onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-secondary)'}>Leaderboard</Link>
              <Link href="/support" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#ffffff'} onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-secondary)'}>Support Center</Link>
            </div>

            {/* Resources Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Resources</h4>
              <Link href="/support" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#ffffff'} onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-secondary)'}>FAQ</Link>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'default' }}>Privacy Policy</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'default' }}>Terms of Service</span>
            </div>

            {/* University Specifications Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>University</h4>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Verified VIT Only</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Direct UPI Payments</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reputation Tracking</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>© 2026 SideQuest. Built for VIT students.</span>
            <span>All platform payments are resolved directly between students.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
