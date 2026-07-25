'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemStatus {
  server: string;
  database: string;
  databaseLatencyMs: number;
  api: string;
  auth: string;
  notifications: string;
  version: string;
  uptimeSec: number;
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch status.');
      }
      setStatus(data.status);
      setLastUpdated(new Date());
      setError('');
    } catch (err: any) {
      setError('Failed to reach diagnostics API.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 8 seconds
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (val: string) => {
    if (val === 'Online' || val === 'Connected' || val === 'Healthy') {
      return 'var(--success)';
    }
    return 'var(--danger)';
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: '#ffffff', letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            SideQuest <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.25)' }}>Status</span>
          </span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Live status reports of the SideQuest platform and databases.
          </p>
        </div>

        {/* Status card */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          {loading && !status ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="skeleton animate-pulse-slow" style={{ width: '40px', height: '40px', borderRadius: '50px', margin: '0 auto 1rem auto' }} />
              <div className="skeleton animate-pulse-slow" style={{ width: '150px', height: '18px', margin: '0 auto' }} />
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>{error}</p>
              <button onClick={fetchStatus} className="btn btn-secondary" style={{ marginTop: '1rem', padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                Retry connection
              </button>
            </div>
          ) : status ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Overall status bar */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                background: 'rgba(16, 185, 129, 0.06)', 
                border: '1px solid rgba(16, 185, 129, 0.18)', 
                padding: '1rem 1.25rem', 
                borderRadius: '12px',
                marginBottom: '0.5rem'
              }}>
                <span className="animate-pulse-slow" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>All Systems Operational</span>
              </div>

              {/* Status List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Web Server</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getStatusColor(status.server) }}>{status.server}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: 0 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Database Connection</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({status.databaseLatencyMs}ms ping)</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getStatusColor(status.database) }}>{status.database}</span>
                  </div>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: 0 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>API Gateway</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getStatusColor(status.api) }}>{status.api}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: 0 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Authentication Services</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getStatusColor(status.auth) }}>{status.auth}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: 0 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Notifications Engine</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getStatusColor(status.notifications) }}>{status.notifications}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: 0 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Uptime</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatUptime(status.uptimeSec)}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.03)', margin: 0 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Build Version</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>v{status.version}</span>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Last updated trigger */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>
            {lastUpdated && `Last Checked: ${lastUpdated.toLocaleTimeString()}`}
          </span>
          <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Back to SideQuest
          </Link>
        </div>

      </div>
    </div>
  );
}
