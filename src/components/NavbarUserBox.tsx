'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BellIcon, StarIcon, VerifiedIcon, SettingsIcon, getNotificationIcon } from './Icons';

interface UserBoxProps {
  user: {
    id: string;
    username: string;
    verified: boolean;
    ratingAverage: number;
    ratingCount: number;
  };
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export default function NavbarUserBox({ user }: UserBoxProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setNotificationsLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (showLoading) setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    // Poll every 15 seconds for lightweight real-time alerts
    const interval = setInterval(() => fetchNotifications(false), 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const previousNotifications = notifications;
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
      // Rollback on failure
      setNotifications(previousNotifications);
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    setDropdownOpen(false);
    const wasUnread = !n.is_read;
    if (wasUnread) {
      const previousNotifications = notifications;
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );

      try {
        const res = await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: n.id }),
        });
        if (!res.ok) throw new Error('Failed to mark notification read');
      } catch (err) {
        console.error('Failed to mark notification read:', err);
        // Rollback on failure
        setNotifications(previousNotifications);
      }
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  // Get color theme based on notification type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BID': return 'rgba(59, 130, 246, 0.15)'; // Blue
      case 'ASSIGNMENT': return 'rgba(139, 92, 246, 0.15)'; // Purple
      case 'CHAT': return 'rgba(99, 102, 241, 0.15)'; // Indigo
      case 'COMPLETION': return 'rgba(34, 197, 94, 0.15)'; // Green
      case 'REVIEW': return 'rgba(245, 158, 11, 0.15)'; // Amber
      case 'REJECTION': return 'rgba(239, 68, 68, 0.15)'; // Red
      default: return 'rgba(100, 116, 139, 0.15)'; // Gray
    }
  };

  const getTypeBorder = (type: string) => {
    switch (type) {
      case 'BID': return '#3b82f6';
      case 'ASSIGNMENT': return '#8b5cf6';
      case 'CHAT': return '#6366f1';
      case 'COMPLETION': return '#22c55e';
      case 'REVIEW': return '#f59e0b';
      case 'REJECTION': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }} ref={dropdownRef}>
      
      {/* Bell Notification Trigger */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="Toggle notifications"
          style={{
            background: 'transparent',
            border: 'none',
            color: dropdownOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            transition: 'color var(--transition-fast)',
          }}
        >
          <BellIcon size={22} />
        </button>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: 'var(--danger)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '16px',
              height: '16px',
              borderRadius: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 0.2rem',
              border: '2px solid var(--bg-primary)',
            }}
          >
            {unreadCount}
          </span>
        )}

        {/* Dropdown Container */}
        {dropdownOpen && (
          <div
            className="glass-panel dropdown-fade-in"
            style={{
              position: 'absolute',
              top: '2.5rem',
              right: 0,
              width: '320px',
              maxHeight: '420px',
              overflowY: 'auto',
              zIndex: 200,
              padding: '1rem',
              border: '1px solid var(--glass-border-focus)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {notificationsLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.65rem', padding: '0.75rem', alignItems: 'center' }}>
                    <div className="skeleton animate-pulse-slow" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="skeleton animate-pulse-slow" style={{ width: '60%', height: '12px' }} />
                      <div className="skeleton animate-pulse-slow" style={{ width: '90%', height: '10px' }} />
                    </div>
                  </div>
                ))
              ) : notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      background: n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${n.is_read ? 'transparent' : getTypeBorder(n.type)}`,
                      padding: '0.75rem',
                      borderRadius: 'var(--border-radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '0.65rem',
                      alignItems: 'flex-start',
                      transition: 'background var(--transition-fast)',
                    }}
                    className="notification-item"
                  >
                    <div style={{
                      background: getTypeColor(n.type),
                      padding: '0.35rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getTypeBorder(n.type),
                    }}>
                      {getNotificationIcon(n.type, 18)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: n.is_read ? 'var(--text-secondary)' : '#ffffff', marginBottom: '0.15rem' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        {n.message}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>You're all caught up</div>
                  <div>No notifications yet.</div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'default' }}>
                All caught up
              </span>
            </div>
          </div>
        )}
      </div>

      {/* User Badge Profile Link */}
      <Link href={`/profile/${user.username}`} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        fontSize: '0.95rem',
        color: '#ffffff',
        border: '1px solid var(--glass-border)',
        background: 'rgba(255,255,255,0.03)',
        padding: '0.4rem 0.8rem',
        borderRadius: 'var(--border-radius-md)',
        transition: 'border-color var(--transition-fast)',
      }}>
        <span>@{user.username}</span>
        {user.verified && (
          <VerifiedIcon size={14} />
        )}
        {user.ratingCount >= 3 ? (
          <span style={{
            color: 'var(--warning)',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.15rem'
          }}>
            <StarIcon size={12} fill="var(--warning)" stroke="var(--warning)" />
            {user.ratingAverage.toFixed(1)}
          </span>
        ) : (
          <span style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>New</span>
        )}
      </Link>

      {/* Settings Cog */}
      <Link href="/settings" style={{
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        transition: 'color var(--transition-fast)',
      }}>
        <SettingsIcon size={20} />
      </Link>
    </div>
  );
}
