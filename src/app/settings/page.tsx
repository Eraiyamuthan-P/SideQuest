'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  username: string;
  email: string;
  bio: string | null;
  hostel_block: string | null;
  verified: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  
  // Re-verify email states
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch current user details on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/auth');
          return;
        }
        const data = await res.json();
        
        // Fetch full profile info for bio and hostel block
        const profileRes = await fetch(`/api/users/${data.user.username}`);
        const profileData = await profileRes.json();
        
        if (profileData.user) {
          setUser(profileData.user);
          setUsername(profileData.user.username);
          setBio(profileData.user.bio || '');
          setHostelBlock(profileData.user.hostel_block || '');
        }
      } catch (err) {
        console.error('Failed to load settings data:', err);
        setError('Failed to load user profile details.');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchUserData();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          bio: bio.trim(),
          hostel_block: hostelBlock.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile settings');
      }

      setSuccess('Profile updated successfully!');
      
      // Update local user state
      if (user) {
        setUser({
          ...user,
          username: data.user.username,
          bio: data.user.bio,
          hostel_block: data.user.hostel_block,
        });
      }

      // Refresh layout to update Navbar username
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during update.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReverificationOtp = async () => {
    if (!user) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setSuccess('Verification code sent to your email!');
      setOtpStep('verify');
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReverificationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp: otp.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP');
      }

      setSuccess('Email successfully re-verified!');
      setOtpStep('request');
      setOtp('');
      setDevOtp('');
      
      // Mark verified in local state
      setUser({ ...user, verified: true });
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.refresh();
      router.push('/auth');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (fetchLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }} className="animate-pulse-slow">
          Loading your settings...
        </p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
        Account Settings
      </h1>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          ✓ {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Profile Settings Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Profile Information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                className="form-input"
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Your username matches your profile URL: sidequest/profile/username.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="hostelBlock">Hostel Block / General Area</label>
              <input
                className="form-input"
                id="hostelBlock"
                type="text"
                placeholder="e.g. L Block, Q Block, SJT, Main Gate"
                value={hostelBlock}
                onChange={(e) => setHostelBlock(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bio">Bio</label>
              <textarea
                className="form-textarea"
                id="bio"
                placeholder="Write a brief bio. List your skills here (e.g. Java, Tutoring, Proofreading) to show tags on your profile!"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
              />
            </div>

            <button className="btn btn-primary" type="submit" style={{ marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Email Verification Status */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Email Verification</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}>
              <span>Email: <strong>{user?.email}</strong></span>
              {user?.verified ? (
                <span className="badge-tag badge-tag-verified">Verified</span>
              ) : (
                <span className="badge-tag" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>Unverified</span>
              )}
            </div>

            {otpStep === 'request' ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Need to re-verify your college email domain? Click below to request a new verification code.
                </p>
                <button
                  onClick={handleSendReverificationOtp}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Send Verification Code
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyReverificationOtp} style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="settings-otp">Enter Code</label>
                  <input
                    className="form-input"
                    id="settings-otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    style={{ textAlign: 'center', letterSpacing: '4px', maxWidth: '200px', fontWeight: 'bold' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    Verify Code
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setOtpStep('request');
                      setOtp('');
                      setDevOtp('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>

                {devOtp && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed var(--glass-border-focus)', borderRadius: 'var(--border-radius-md)', background: 'rgba(168, 85, 247, 0.05)', maxWidth: '250px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '0.25rem' }}>
                      🛠️ Dev Code
                    </p>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{devOtp}</div>
                    <button type="button" onClick={() => setOtp(devOtp)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                      Auto-fill
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Danger Area / Logout */}
        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '1rem' }}>Danger Zone</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Logout of your student session. Next time you sign in, a new verification code will be required.
          </p>
          <button onClick={handleLogout} className="btn btn-danger">
            Log Out Account
          </button>
        </div>
      </div>
    </div>
  );
}
