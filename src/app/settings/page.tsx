'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsIcon } from '@/components/Icons';
import { useToast } from '@/components/Toast';

interface UserData {
  username: string;
  email: string;
  bio: string | null;
  hostel_block: string | null;
  verified: boolean;
  availability: 'AVAILABLE' | 'BUSY';
  skills: string[];
  pref_notify_chat: boolean;
  pref_notify_applications: boolean;
  pref_notify_reviews: boolean;
  pref_notify_tasks: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  const [availability, setAvailability] = useState<'AVAILABLE' | 'BUSY'>('AVAILABLE');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Notification preferences states
  const [prefNotifyChat, setPrefNotifyChat] = useState(true);
  const [prefNotifyApplications, setPrefNotifyApplications] = useState(true);
  const [prefNotifyReviews, setPrefNotifyReviews] = useState(true);
  const [prefNotifyTasks, setPrefNotifyTasks] = useState(true);
  
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
        const res = await fetch('/api/users/me');
        if (!res.ok) {
          router.push('/auth');
          return;
        }
        const data = await res.json();
        
        if (data.user) {
          setUser(data.user);
          setUsername(data.user.username);
          setBio(data.user.bio || '');
          setHostelBlock(data.user.hostel_block || '');
          setAvailability(data.user.availability || 'AVAILABLE');
          setSkills(data.user.skills || []);
          setPrefNotifyChat(data.user.pref_notify_chat !== false);
          setPrefNotifyApplications(data.user.pref_notify_applications !== false);
          setPrefNotifyReviews(data.user.pref_notify_reviews !== false);
          setPrefNotifyTasks(data.user.pref_notify_tasks !== false);
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
          availability,
          skills,
          pref_notify_chat: prefNotifyChat,
          pref_notify_applications: prefNotifyApplications,
          pref_notify_reviews: prefNotifyReviews,
          pref_notify_tasks: prefNotifyTasks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile settings');
      }

      setSuccess('Profile updated successfully!');
      
      if (user) {
        setUser({
          ...user,
          username: data.user.username,
          bio: data.user.bio,
          hostel_block: data.user.hostel_block,
          availability: data.user.availability,
          skills: data.user.skills,
          pref_notify_chat: data.user.pref_notify_chat,
          pref_notify_applications: data.user.pref_notify_applications,
          pref_notify_reviews: data.user.pref_notify_reviews,
          pref_notify_tasks: data.user.pref_notify_tasks,
        });
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during update.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = newSkill.trim();
    if (!clean) return;

    if (clean.length > 25) {
      setError('Each skill tag must be 25 characters or fewer.');
      return;
    }

    if (skills.includes(clean)) {
      setError('Skill tag already added.');
      return;
    }

    if (skills.length >= 10) {
      setError('You can add up to 10 skills maximum.');
      return;
    }

    setSkills([...skills, clean]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
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

  const { toast } = useToast();

  const handleLogoutEverywhere = () => {
    toast('Logged out of all other active campus devices successfully.', 'SUCCESS');
  };

  const handleRemoveAccount = () => {
    if (confirm('Are you sure you want to permanently delete your student account? This action is irreversible.')) {
      toast('Account deletion request submitted to administration.', 'INFO');
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
    <div className="page-container route-entrance" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <SettingsIcon size={32} stroke="var(--accent-primary)" />
        <h1 style={{ fontSize: '2rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Account Settings
        </h1>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          [Warning] {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          [Success] {success}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="hostelBlock">Hostel Block / General Area</label>
                <input
                  className="form-input"
                  id="hostelBlock"
                  type="text"
                  placeholder="e.g. L Block, Q Block, SJT"
                  value={hostelBlock}
                  onChange={(e) => setHostelBlock(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="availability">Availability Status</label>
                <select
                  className="form-select"
                  id="availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as any)}
                  disabled={loading}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BUSY">Busy</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bio">Bio</label>
              <textarea
                className="form-textarea"
                id="bio"
                placeholder="Write a brief bio about yourself."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Skills Tags Editor */}
            <div className="form-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <label className="form-label">Skills & Expertise (Max 10 tags, 25 chars max each)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Java, Tutoring, Delivery"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  disabled={loading}
                  maxLength={25}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  disabled={loading}
                >
                  Add Tag
                </button>
              </div>

              {skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          padding: '0 0.15rem',
                        }}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No skill tags added yet.
                </span>
              )}
            </div>

            {/* Notification Preferences */}
            <div className="form-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              <label className="form-label" style={{ marginBottom: '0.75rem' }}>Notification Preferences</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefNotifyChat}
                    onChange={(e) => setPrefNotifyChat(e.target.checked)}
                    disabled={loading}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Chat messages</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefNotifyApplications}
                    onChange={(e) => setPrefNotifyApplications(e.target.checked)}
                    disabled={loading}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Bids and applications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefNotifyReviews}
                    onChange={(e) => setPrefNotifyReviews(e.target.checked)}
                    disabled={loading}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Reviews and ratings received</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefNotifyTasks}
                    onChange={(e) => setPrefNotifyTasks(e.target.checked)}
                    disabled={loading}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Task assignments and completions</span>
                </label>
              </div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ marginTop: '1.5rem', width: '100%' }} disabled={loading}>
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
                <span className="badge-tag" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.25)' }}>Verified</span>
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
                      [Dev Code]
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Logout of your student session. Next time you sign in, a new verification code will be required.
              </p>
              <button onClick={handleLogout} className="btn btn-danger" style={{ background: 'transparent', border: '1px solid var(--danger)', color: '#ffffff' }}>
                Log Out Account
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.1)', paddingTop: '1rem', opacity: 0.5 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Forced logout of your account from all logged-in devices across campus. (Coming Soon)
              </p>
              <button disabled className="btn btn-danger" style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                Logout Everywhere
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.1)', paddingTop: '1rem', opacity: 0.5 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Permanently delete your profile, credit balance, reviews, and support tickets from the database. (Coming Soon)
              </p>
              <button disabled className="btn btn-danger" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--text-muted)', border: '1px solid rgba(239, 68, 68, 0.1)', cursor: 'not-allowed' }}>
                Remove Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
