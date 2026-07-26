'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { AdminDashboardSkeleton } from '@/components/Skeleton';

type TabType = 'overview' | 'users' | 'quests' | 'reports' | 'support' | 'analytics' | 'audit' | 'status' | 'administrators';

interface AuditLogRecord {
  id: string;
  createdAt: string;
  actorId: string;
  actor: {
    username: string;
  };
  actorEmail: string;
  targetId: string | null;
  targetEmail: string | null;
  action: string;
  reason: string;
  metadata: any;
  ipAddress: string | null;
}

interface SupportTicketRecord {
  id: string;
  user: {
    username: string;
    email?: string;
  };
  type: string;
  subject: string;
  message: string;
  status: string;
  priority?: string;
  notes?: string | null;
  timeline?: any;
  created_at: string;
}

interface UserRecord {
  id: string;
  username: string;
  email: string;
  verified: boolean;
  credits: number;
  role: string;
  ratingAverage: number;
  ratingCount: number;
  status: string;
  created_at: string;
}

interface QuestRecord {
  id: string;
  title: string;
  description: string;
  offeredAmount: number;
  status: string;
  location: string;
  created_at: string;
  poster: {
    username: string;
  };
}

interface AdministratorRecord {
  id: string;
  type: 'user' | 'invitation';
  username: string;
  email: string;
  role: string;
  status: 'Active' | 'Pending' | 'Expired';
  createdOn: string;
  createdBy: string;
  daysRemaining: number | null;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const alert = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('success') || lower.includes('completed') || lower.includes('resolved') || lower.includes('updated')) {
      toast(msg, 'SUCCESS');
    } else if (lower.includes('failed') || lower.includes('error') || lower.includes('forbidden') || lower.includes('blocked') || lower.includes('aborted')) {
      toast(msg, 'ERROR');
    } else {
      toast(msg, 'INFO');
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [quests, setQuests] = useState<QuestRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [statusData, setStatusData] = useState<any>(null);
  const [administrators, setAdministrators] = useState<AdministratorRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Administrators State
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSubTab, setAdminSubTab] = useState<'active' | 'pending'>('active');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MODERATOR');

  // Advanced Audit Logs Filter State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditDateFilter, setAuditDateFilter] = useState('ALL');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditActionCategory, setAuditActionCategory] = useState('ALL');

  // Selected User timeline details state
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Dialog/Action states
  const [overrideReason, setOverrideReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }

      // 2. Fetch Users
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
      }

      // 3. Fetch Quests
      const questsRes = await fetch('/api/admin/quests');
      if (questsRes.ok) {
        const d = await questsRes.json();
        setQuests(d.tasks || []);
      }

      // 4. Fetch Support Tickets
      const supportRes = await fetch('/api/admin/support');
      if (supportRes.ok) {
        const d = await supportRes.json();
        setTickets(d.tickets || []);
      }

      // 5. Fetch Diagnostics Status
      const diagnosticsRes = await fetch('/api/status');
      if (diagnosticsRes.ok) {
        const d = await diagnosticsRes.json();
        setStatusData(d.status);
      }

      // 6. Fetch Administrators
      const adminsRes = await fetch('/api/admin/administrators');
      if (adminsRes.ok) {
        const d = await adminsRes.json();
        setAdministrators(d.administrators || []);
      }

      // 7. Fetch Audit Logs with active filters
      await refreshAuditLogs();

    } catch (err: any) {
      setError('Failed to fetch administrative data. Ensure your user account has ADMIN, SUPER_ADMIN or MODERATOR permissions.');
    } finally {
      setLoading(false);
    }
  };

  const refreshAuditLogs = async () => {
    try {
      let queryUrl = `/api/admin/audit-logs?search=${encodeURIComponent(auditSearch)}&dateFilter=${auditDateFilter}&actionCategory=${auditActionCategory}`;
      if (auditDateFilter === 'CUSTOM' && auditStartDate && auditEndDate) {
        queryUrl += `&startDate=${auditStartDate}&endDate=${auditEndDate}`;
      }
      const logsRes = await fetch(queryUrl);
      if (logsRes.ok) {
        const d = await logsRes.json();
        setLogs(d.logs || []);
      }
    } catch (err) {
      // Failed to load audit logs silently
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    refreshAuditLogs();
  }, [auditSearch, auditDateFilter, auditStartDate, auditEndDate, auditActionCategory]);

  const handleQuestOverride = async (taskId: string, action: string) => {
    if (!overrideReason.trim() || overrideReason.trim().length < 10 || overrideReason.trim().length > 500) {
      alert('Administrative justification reason must be between 10 and 500 characters long.');
      return;
    }
    setActionLoading(taskId);
    try {
      const res = await fetch('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action, reason: overrideReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply override.');
      
      setOverrideReason('');
      await loadAllData();
      alert(`Quest override applied successfully!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserVerifyToggle = async (targetUserId: string) => {
    const reason = prompt('Enter justification reason for toggling user verification:');
    if (reason === null) return;
    
    setActionLoading(targetUserId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: 'TOGGLE_VERIFY', reason: reason || 'Admin override verify status' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update verification status.');
      
      await loadAllData();
      alert(`User profile updated successfully!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserLifecycleAction = async (targetUserId: string, username: string, action: 'SUSPEND_USER' | 'BAN_USER' | 'RESTORE_USER' | 'DELETE_USER') => {
    // 1. Safety typed confirmation for dangerous actions
    if (action === 'SUSPEND_USER') {
      const conf = prompt(`Dangerous action: Suspend user @${username}. Type "SUSPEND" to continue:`);
      if (conf !== 'SUSPEND') {
        alert('Action aborted: incorrect confirmation text.');
        return;
      }
    } else if (action === 'DELETE_USER') {
      const conf = prompt(`Dangerous action: Soft-delete user @${username}. Type "DELETE" to continue:`);
      if (conf !== 'DELETE') {
        alert('Action aborted: incorrect confirmation text.');
        return;
      }
    }

    const reason = prompt('Enter administrative justification reason (10 to 500 characters):');
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert('Action blocked: administrative reason must be between 10 and 500 characters long.');
      return;
    }

    setActionLoading(targetUserId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to modify account lifecycle.');
      
      if (selectedUser && selectedUser.id === targetUserId) {
        setSelectedUser(null);
      }
      await loadAllData();
      alert('Operation completed successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjustUserRole = async (targetUserId: string, username: string, currentRole: string) => {
    const desiredRole = prompt(`Change role for @${username} (Current: ${currentRole}). Enter STUDENT, MODERATOR, ADMIN, or SUPER_ADMIN:`);
    if (desiredRole === null) return;
    const normalizedRole = desiredRole.toUpperCase().trim();
    if (!['STUDENT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) {
      alert('Invalid role. Choose from STUDENT, MODERATOR, ADMIN, SUPER_ADMIN.');
      return;
    }

    // Role Promotion Confirmation
    const confirmMsg = `Promote/Change "${username}" to ${normalizedRole}?`;
    if (!window.confirm(confirmMsg)) return;

    const reason = prompt('Enter administrative justification reason (10 to 500 characters):');
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert('Action blocked: administrative reason must be between 10 and 500 characters long.');
      return;
    }

    setActionLoading(targetUserId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: 'ADJUST_ROLE', desiredRole: normalizedRole, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.');
      
      if (selectedUser && selectedUser.id === targetUserId) {
        setSelectedUser(null);
      }
      await loadAllData();
      alert(`User role updated successfully!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert('Please enter an email address.');
      return;
    }
    const confirmMsg = `Promote "${inviteEmail}" to ${inviteRole}?`;
    if (!window.confirm(confirmMsg)) return;

    const reason = prompt('Enter administrative reason (10 to 500 characters):');
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert('Action blocked: administrative reason must be between 10 and 500 characters long.');
      return;
    }

    setActionLoading('invite');
    try {
      const res = await fetch('/api/admin/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation.');
      
      alert(data.message || 'Invitation/Promotion resolved successfully!');
      setInviteEmail('');
      await loadAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await fetch('/api/admin/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'RESEND' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend invitation.');
      
      alert(data.message || 'Invitation resent successfully.');
      await loadAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeInviteRole = async (email: string, currentRole: string) => {
    const desiredRole = prompt(`Change role for invitation of "${email}" (Current: ${currentRole}). Enter MODERATOR, ADMIN, or SUPER_ADMIN:`);
    if (desiredRole === null) return;
    const normalizedRole = desiredRole.toUpperCase().trim();
    if (!['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) {
      alert('Invalid role. Choose from MODERATOR, ADMIN, SUPER_ADMIN.');
      return;
    }

    const reason = prompt('Enter administrative reason (10 to 500 characters):');
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert('Action blocked: administrative reason must be between 10 and 500 characters long.');
      return;
    }

    setActionLoading(email);
    try {
      const res = await fetch('/api/admin/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: normalizedRole, action: 'CHANGE_ROLE', reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change invitation role.');
      
      alert(data.message || 'Invitation role updated successfully.');
      await loadAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (id: string, email: string, type: string) => {
    const confirmMsg = `Remove ${type === 'invitation' ? 'invitation' : 'MODERATOR/ADMIN privileges'} for "${email}"?`;
    if (!window.confirm(confirmMsg)) return;

    const reason = prompt('Enter administrative reason (10 to 500 characters):');
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert('Action blocked: administrative reason must be between 10 and 500 characters long.');
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/administrators?id=${id}&type=${type}&reason=${encodeURIComponent(reason.trim())}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke permissions.');
      
      alert(data.message || 'Permissions revoked successfully.');
      await loadAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTicketUpdate = async (ticketId: string, params: { status?: string; notes?: string; priority?: string }) => {
    const reason = prompt('Enter justification reason (10 to 500 characters) for this action:');
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert('Action blocked: administrative reason must be between 10 and 500 characters long.');
      return;
    }

    setActionLoading(ticketId);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, reason: reason.trim(), ...params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update support ticket.');
      
      await loadAllData();
      alert('Support ticket updated successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const buildUserTimeline = (u: UserRecord) => {
    const timeline = [];
    
    // 1. Account Created Node
    timeline.push({
      date: new Date(u.created_at).getTime(),
      title: 'Account Created',
      description: `@${u.username} registered on the platform.`,
    });

    // 2. Add Audit Log events
    const userLogs = logs.filter(log => log.targetEmail === u.email || log.targetId === u.id);
    for (const log of userLogs) {
      timeline.push({
        date: new Date(log.createdAt).getTime(),
        title: log.action.replace('USER_', '').replace('ROLE_', 'ROLE '),
        description: `${log.reason} (by @${log.actor?.username || 'System'})`,
      });
    }

    // Sort Chronologically
    timeline.sort((a, b) => a.date - b.date);
    return timeline;
  };

  const renderRoleBadge = (role: string) => {
    let styles = {
      background: 'rgba(100, 116, 139, 0.15)',
      color: '#94A3B8',
      border: '1px solid rgba(100, 116, 139, 0.25)',
    };
    if (role === 'SUPER_ADMIN') {
      styles = {
        background: 'rgba(99, 102, 241, 0.15)',
        color: 'var(--accent-primary)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
      };
    } else if (role === 'ADMIN') {
      styles = {
        background: 'rgba(139, 92, 246, 0.15)',
        color: 'var(--accent-secondary)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
      };
    } else if (role === 'MODERATOR') {
      styles = {
        background: 'rgba(100, 116, 139, 0.15)',
        color: '#94A3B8',
        border: '1px solid rgba(100, 116, 139, 0.25)',
      };
    }
    
    return (
      <span style={{ 
        ...styles,
        padding: '0.2rem 0.6rem', 
        borderRadius: '6px', 
        fontSize: '0.75rem', 
        fontWeight: 700, 
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        display: 'inline-block'
      }}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }} className="route-entrance">
        <aside style={{ width: '260px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--glass-border)', padding: '2rem 1.5rem' }}>
          <div style={{ height: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '2rem' }} />
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: '36px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '0.5rem' }} />
          ))}
        </aside>
        <main style={{ flex: 1, padding: '3rem' }}>
          <AdminDashboardSkeleton />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px', padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 800 }}>Access Forbidden</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>{error}</p>
          <Link href="/" className="btn btn-primary">Return to Homepage</Link>
        </div>
      </div>
    );
  }

  const sidebarTabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'administrators', label: 'Administrators' },
    { id: 'quests', label: 'Quests' },
    { id: 'reports', label: 'Reports' },
    { id: 'support', label: 'Support' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'status', label: 'System Status' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }} className="route-entrance">
      {/* Left Sidebar Navigation */}
      <aside style={{ width: '260px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--glass-border)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.03em' }}>SideQuest Control</span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Administration Console</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sidebarTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedUser(null);
              }}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Back to Quest Feed
          </Link>
        </div>
      </aside>

      {/* Main Content viewport */}
      <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
        
        {/* Header */}
        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#ffffff', textTransform: 'capitalize' }}>
              {activeTab === 'audit' ? 'Audit Logs' : activeTab === 'status' ? 'System Uptime Status' : activeTab}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Moderation workspace logs, system configurations, and statistics.
            </p>
          </div>
          <button onClick={loadAllData} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Sync Live Logs
          </button>
        </header>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Total Students</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem' }}>{stats.totalStudents}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Moderators</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.5rem' }}>{stats.totalModerators}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Admins</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.5rem' }}>{stats.totalAdmins}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Pending Invitations</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.5rem' }}>{stats.pendingInvitations}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Open Quests</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>{stats.openQuests}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Active Disputes</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.5rem' }}>{stats.activeDisputes}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Open Reports</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.5rem' }}>{stats.openReports}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Support Tickets</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem' }}>{stats.supportTickets}</div>
              </div>
            </div>

            {/* Health Widget */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>Platform Health Indicators</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Database</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Healthy</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>API gateway</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Healthy</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Notifications</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Healthy</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Authentication</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Healthy</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Backup</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>Today 02:00</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Server Uptime</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>99.98%</span>
                </div>
              </div>
            </div>

            {/* Quick Audit Snapshot */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Recent Audit Records</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logs.slice(0, 5).map(log => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <span style={{ color: '#ffffff', fontWeight: 700 }}>@{log.actor?.username || 'System'}</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>triggered</span>{' '}
                      <span style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.action}</span>
                      <span style={{ color: 'var(--text-muted)' }}> on target </span>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{log.targetEmail || log.targetId || 'N/A'}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {logs.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent audit activity registered.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {selectedUser && (
              <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Chronological User Timeline: @{selectedUser.username}
                  </h3>
                  <button onClick={() => setSelectedUser(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                    Close Timeline
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                  {buildUserTimeline(selectedUser).map((node, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <div style={{ 
                        position: 'absolute', 
                        left: '-29px', 
                        top: '4px', 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        background: 'var(--accent-primary)',
                        border: '2px solid var(--bg-primary)' 
                      }} />
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          {new Date(node.date).toLocaleString()}
                        </span>
                        <span style={{ color: '#ffffff', fontWeight: 700, display: 'block', marginTop: '0.1rem' }}>
                          {node.title}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                          {node.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Username</th>
                    <th style={{ padding: '0.75rem' }}>Email</th>
                    <th style={{ padding: '0.75rem' }}>Role</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Credits</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                      <td style={{ padding: '1rem 0.75rem', color: '#ffffff', fontWeight: 700 }}>
                        <button onClick={() => setSelectedUser(u)} style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 700, padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>
                          @{u.username}
                        </button>
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>{renderRoleBadge(u.role)}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span style={{ 
                          background: u.status === 'ACTIVE' ? 'rgba(34,197,94,0.12)' : u.status === 'SUSPENDED' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', 
                          color: u.status === 'ACTIVE' ? 'var(--success)' : u.status === 'SUSPENDED' ? 'var(--warning)' : 'var(--danger)', 
                          padding: '0.15rem 0.4rem', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          fontWeight: 700 
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 700, color: u.credits < 0 ? 'var(--danger)' : 'var(--success)' }}>{u.credits}</td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button onClick={() => handleUserVerifyToggle(u.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                            Verify
                          </button>
                          <button onClick={() => handleAdjustUserRole(u.id, u.username, u.role)} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                            Role
                          </button>
                          {u.status === 'ACTIVE' ? (
                            <button onClick={() => handleUserLifecycleAction(u.id, u.username, 'SUSPEND_USER')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                              Suspend
                            </button>
                          ) : (
                            <button onClick={() => handleUserLifecycleAction(u.id, u.username, 'RESTORE_USER')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>
                              Restore
                            </button>
                          )}
                          <button onClick={() => handleUserLifecycleAction(u.id, u.username, 'BAN_USER')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                            Ban
                          </button>
                          <button onClick={() => handleUserLifecycleAction(u.id, u.username, 'DELETE_USER')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'var(--danger)' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <h3>No users found.</h3>
                        <p style={{ fontSize: '0.85rem' }}>Register a student account to see user records here.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Administrators Directory & Invitations */}
        {activeTab === 'administrators' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Invitation Form Card */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Promote / Invite Co-Admin
              </h3>
              <form onSubmit={handleInviteAdmin} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  type="email"
                  placeholder="Enter verified VIT email address..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ flex: 1, minWidth: '240px' }}
                  required
                />
                
                <select
                  className="form-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{ width: '180px', padding: '0.5rem', height: '40px' }}
                >
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>

                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }} disabled={actionLoading === 'invite'}>
                  {actionLoading === 'invite' ? 'Sending...' : 'Invite / Promote'}
                </button>
              </form>
            </div>

            {/* Administrators Tabs and Search Filters */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ display: 'inline-flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <button 
                    onClick={() => setAdminSubTab('active')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: adminSubTab === 'active' ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    Active Administrators
                  </button>
                  <button 
                    onClick={() => setAdminSubTab('pending')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: adminSubTab === 'pending' ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    Pending Invitations
                  </button>
                </div>

                {/* Instant Search Box */}
                <input
                  className="form-input"
                  type="text"
                  placeholder="Instant search by Email, User or Role..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  style={{ width: '300px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                {adminSubTab === 'active' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem' }}>Username</th>
                        <th style={{ padding: '0.75rem' }}>Email</th>
                        <th style={{ padding: '0.75rem' }}>Role</th>
                        <th style={{ padding: '0.75rem' }}>Created On</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {administrators
                        .filter(admin => admin.type === 'user')
                        .filter(admin => {
                          const query = adminSearch.toLowerCase();
                          return admin.email.toLowerCase().includes(query) || admin.username.toLowerCase().includes(query) || admin.role.toLowerCase().includes(query);
                        })
                        .map(admin => (
                          <tr key={admin.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                            <td style={{ padding: '1rem 0.75rem', color: '#ffffff', fontWeight: 700 }}>@{admin.username}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>{admin.email}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>{renderRoleBadge(admin.role)}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>{new Date(admin.createdOn).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                              <button 
                                onClick={() => handleRevokeAdmin(admin.id, admin.email, admin.type)}
                                className="btn btn-secondary" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--danger)', color: '#ffffff' }}
                                disabled={actionLoading !== null}
                              >
                                Revoke Privileges
                              </button>
                            </td>
                          </tr>
                        ))}
                      {administrators.filter(a => a.type === 'user').length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)' }}>No administrators found.</h4>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>Invite a trusted VIT student to help manage SideQuest.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem' }}>Email Address</th>
                        <th style={{ padding: '0.75rem' }}>Assigned Role</th>
                        <th style={{ padding: '0.75rem' }}>Invited By</th>
                        <th style={{ padding: '0.75rem' }}>Created</th>
                        <th style={{ padding: '0.75rem' }}>Days Remaining</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {administrators
                        .filter(admin => admin.type === 'invitation')
                        .filter(admin => {
                          const query = adminSearch.toLowerCase();
                          return admin.email.toLowerCase().includes(query) || admin.role.toLowerCase().includes(query);
                        })
                        .map(admin => (
                          <tr key={admin.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                            <td style={{ padding: '1rem 0.75rem', color: '#ffffff', fontWeight: 600 }}>{admin.email}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>{renderRoleBadge(admin.role)}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>{admin.createdBy}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>{new Date(admin.createdOn).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem 0.75rem', fontWeight: 700 }}>
                              {admin.status === 'Expired' ? '0' : `${admin.daysRemaining} days`}
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span style={{ 
                                background: admin.status === 'Pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', 
                                color: admin.status === 'Pending' ? 'var(--warning)' : 'var(--danger)', 
                                padding: '0.15rem 0.4rem', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                fontWeight: 700 
                              }}>
                                {admin.status}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                <button 
                                  onClick={() => handleResendInvite(admin.email)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={actionLoading !== null}
                                >
                                  Resend
                                </button>
                                <button 
                                  onClick={() => handleChangeInviteRole(admin.email, admin.role)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={actionLoading !== null}
                                >
                                  Change Role
                                </button>
                                <button 
                                  onClick={() => handleRevokeAdmin(admin.id, admin.email, admin.type)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'var(--danger)', color: '#ffffff' }}
                                  disabled={actionLoading !== null}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {administrators.filter(a => a.type === 'invitation').length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)' }}>No pending invitations.</h4>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>Create a co-admin invitation above to authorize new administrators.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Quests Overrides */}
        {activeTab === 'quests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                className="form-input"
                type="text"
                placeholder="Type administrative override justification reason here (10 to 500 characters)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>*Required before actions</span>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Quest Title</th>
                    <th style={{ padding: '0.75rem' }}>Poster</th>
                    <th style={{ padding: '0.75rem' }}>Reward</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Administrative Overrides</th>
                  </tr>
                </thead>
                <tbody>
                  {quests.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                      <td style={{ padding: '1rem 0.75rem', color: '#ffffff', fontWeight: 700 }}>{q.title}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>@{q.poster?.username}</td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--warning)', fontWeight: 700 }}>₹{q.offeredAmount}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span style={{ background: q.status === 'COMPLETED' ? 'rgba(34,197,94,0.12)' : q.status === 'CANCELLED' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: q.status === 'COMPLETED' ? 'var(--success)' : q.status === 'CANCELLED' ? 'var(--danger)' : 'var(--warning)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {q.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button onClick={() => handleQuestOverride(q.id, 'FORCE_COMPLETE')} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--success)' }} disabled={actionLoading === q.id}>
                            Force Complete
                          </button>
                          <button onClick={() => handleQuestOverride(q.id, 'FORCE_CANCEL')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--danger)' }} disabled={actionLoading === q.id}>
                            Force Cancel
                          </button>
                          <button onClick={() => handleQuestOverride(q.id, 'REOPEN_QUEST')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} disabled={actionLoading === q.id}>
                            Reopen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {quests.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>No quests listed.</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>When users post tasks, they will appear in this control board.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Reports (Escalated Disputes) */}
        {activeTab === 'reports' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Escalated Disputes Reports</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {tickets.filter(t => t.type === 'dispute').map(t => (
                <div key={t.id} style={{ border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', marginRight: '0.5rem', fontWeight: 700 }}>{t.type.toUpperCase()}</span>
                      <span style={{ fontWeight: 800, color: '#ffffff' }}>{t.subject}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Priority selector */}
                      <select 
                        value={t.priority || 'normal'}
                        onChange={(e) => handleTicketUpdate(t.id, { priority: e.target.value })}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', borderRadius: '4px', fontSize: '0.75rem', padding: '0.2rem 0.4rem', outline: 'none' }}
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="high">High Priority</option>
                      </select>

                      {/* Status selector */}
                      <select 
                        value={t.status}
                        onChange={(e) => handleTicketUpdate(t.id, { status: e.target.value })}
                        style={{ 
                          background: t.status === 'open' ? 'rgba(239,68,68,0.12)' : t.status === 'in_progress' ? 'rgba(99,102,241,0.12)' : t.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', 
                          color: t.status === 'open' ? 'var(--danger)' : t.status === 'in_progress' ? 'var(--accent-primary)' : t.status === 'resolved' ? 'var(--success)' : 'var(--text-secondary)', 
                          border: 'none', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          padding: '0.2rem 0.4rem',
                          outline: 'none'
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_for_user">Waiting for User</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{t.message}</p>
                  
                  {/* Internal Notes box */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Internal Notes (Admin-Only)</div>
                    <input 
                      type="text" 
                      placeholder={t.notes ? t.notes : "Add internal note here..."}
                      defaultValue={t.notes || ''}
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== t.notes) {
                          handleTicketUpdate(t.id, { notes: e.target.value });
                        }
                      }}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#ffffff', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* History Timeline */}
                  {t.timeline && Array.isArray(t.timeline) && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Dispute Timeline History</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {t.timeline.map((event: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>🕒 {new Date(event.timestamp).toLocaleString()}</span> — <strong style={{ color: 'var(--text-secondary)' }}>{event.action}</strong> by {event.actor}
                            {event.note && <div style={{ marginLeft: '1.25rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{event.note}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <span>Posted by @{t.user?.username} {t.user?.email ? `(${t.user.email})` : ''}</span>
                    {t.status === 'open' && (
                      <button onClick={() => handleTicketUpdate(t.id, { status: 'resolved' })} className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'var(--success)' }}>
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {tickets.filter(t => t.type === 'dispute').length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <h4 style={{ margin: 0, fontWeight: 700 }}>No active disputes.</h4>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Support Tickets */}
        {activeTab === 'support' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Help & Support Center Tickets</h3>
              <button 
                onClick={() => {
                  const sub = prompt('Enter ticket subject:');
                  if (!sub) return;
                  const msg = prompt('Enter ticket message description:');
                  if (!msg) return;
                  const cat = prompt('Enter ticket category (contact, feedback, bug, dispute):');
                  if (!cat || !['contact', 'feedback', 'bug', 'dispute'].includes(cat.toLowerCase().trim())) {
                    alert('Invalid category. Use: contact, feedback, bug, dispute.');
                    return;
                  }
                  
                  fetch('/api/support', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: cat.toLowerCase().trim(), subject: sub, message: msg }),
                  }).then(res => {
                    if (res.ok) {
                      loadAllData();
                      alert('Support ticket created successfully!');
                    } else {
                      alert('Failed to create ticket.');
                    }
                  });
                }}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                + Open Support Ticket
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {tickets.filter(t => t.type !== 'dispute').map(t => (
                <div key={t.id} style={{ border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', marginRight: '0.5rem', fontWeight: 700 }}>{t.type.toUpperCase()}</span>
                      <span style={{ fontWeight: 800, color: '#ffffff' }}>{t.subject}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Priority selector */}
                      <select 
                        value={t.priority || 'normal'}
                        onChange={(e) => handleTicketUpdate(t.id, { priority: e.target.value })}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', borderRadius: '4px', fontSize: '0.75rem', padding: '0.2rem 0.4rem', outline: 'none' }}
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="high">High Priority</option>
                      </select>

                      {/* Status selector */}
                      <select 
                        value={t.status}
                        onChange={(e) => handleTicketUpdate(t.id, { status: e.target.value })}
                        style={{ 
                          background: t.status === 'open' ? 'rgba(245,158,11,0.12)' : t.status === 'in_progress' ? 'rgba(99,102,241,0.12)' : t.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', 
                          color: t.status === 'open' ? 'var(--warning)' : t.status === 'in_progress' ? 'var(--accent-primary)' : t.status === 'resolved' ? 'var(--success)' : 'var(--text-secondary)', 
                          border: 'none', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          padding: '0.2rem 0.4rem',
                          outline: 'none'
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_for_user">Waiting for User</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{t.message}</p>

                  {/* Internal Notes box */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Internal Notes (Admin-Only)</div>
                    <input 
                      type="text" 
                      placeholder={t.notes ? t.notes : "Add internal note here..."}
                      defaultValue={t.notes || ''}
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== t.notes) {
                          handleTicketUpdate(t.id, { notes: e.target.value });
                        }
                      }}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#ffffff', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* History Timeline */}
                  {t.timeline && Array.isArray(t.timeline) && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ticket Timeline History</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {t.timeline.map((event: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>🕒 {new Date(event.timestamp).toLocaleString()}</span> — <strong style={{ color: 'var(--text-secondary)' }}>{event.action}</strong> by {event.actor}
                            {event.note && <div style={{ marginLeft: '1.25rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{event.note}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <span>Posted by @{t.user?.username} {t.user?.email ? `(${t.user.email})` : ''}</span>
                    {t.status === 'open' && (
                      <button onClick={() => handleTicketUpdate(t.id, { status: 'resolved' })} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                        Close & Settle
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {tickets.filter(t => t.type !== 'dispute').length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <h4 style={{ margin: 0, fontWeight: 700 }}>No active tickets.</h4>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Advanced Audit Logs */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Filter Panel */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              {/* Text Search */}
              <input
                className="form-input"
                type="text"
                placeholder="Search by username, email, action..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
              />

              {/* Action Category selector */}
              <select
                className="form-select"
                value={auditActionCategory}
                onChange={(e) => setAuditActionCategory(e.target.value)}
                style={{ width: '180px', padding: '0.5rem', height: '40px' }}
              >
                <option value="ALL">All Event Categories</option>
                <option value="ROLE">Role Changes</option>
                <option value="SUSPENSION">Suspensions & Bans</option>
                <option value="QUEST">Quest Overrides</option>
                <option value="SUPPORT">Disputes & Tickets</option>
              </select>

              {/* Date Filter Selector */}
              <select
                className="form-select"
                value={auditDateFilter}
                onChange={(e) => setAuditDateFilter(e.target.value)}
                style={{ width: '160px', padding: '0.5rem', height: '40px' }}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="7_DAYS">Last 7 Days</option>
                <option value="30_DAYS">Last 30 Days</option>
                <option value="CUSTOM">Custom Range</option>
              </select>

              {/* Custom Date Range Picker inputs */}
              {auditDateFilter === 'CUSTOM' && (
                <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '38px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                  <input
                    type="date"
                    className="form-input"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '38px' }}
                  />
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '2rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem' }}>Administrator</th>
                    <th style={{ padding: '0.75rem' }}>Event Action</th>
                    <th style={{ padding: '0.75rem' }}>Target</th>
                    <th style={{ padding: '0.75rem' }}>Justification Reason</th>
                    <th style={{ padding: '0.75rem' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                      <td style={{ padding: '1rem 0.75rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '1rem 0.75rem', color: '#ffffff', fontWeight: 700 }}>
                        @{log.actor?.username || 'System'}
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{log.actorEmail}</span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.75rem' }}>
                        {log.targetEmail || log.targetId || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>{log.reason}</td>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>No matching activity.</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>Try changing the selected filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 8: System Status */}
        {activeTab === 'status' && statusData && (
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Live Diagnostics Panel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Web Server</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{statusData.server}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database connection</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{statusData.database} ({statusData.databaseLatencyMs}ms latency)</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>API Gateway</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{statusData.api}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Authentication</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{statusData.auth}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Notifications</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{statusData.notifications}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Uptime</span>
                <span>{Math.floor(statusData.uptimeSec / 60)} minutes</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Build Version</span>
                <span style={{ fontFamily: 'monospace' }}>v{statusData.version}</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
