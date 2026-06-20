'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Please enter your VIT email address.');
      return;
    }

    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail.endsWith('@vitstudent.ac.in') && !trimmedEmail.endsWith('@vit.ac.in')) {
      setError('Only @vitstudent.ac.in and @vit.ac.in email domains are allowed.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage(data.message || 'OTP sent successfully!');
      setStep('otp');
      
      // Store developer OTP if returned (development fallback)
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), otp: otp.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP');
      }

      setMessage('Successfully authenticated!');
      
      // Refresh the page/router to update the Server Component navbar state, then redirect
      router.refresh();
      setTimeout(() => {
        router.push('/');
      }, 500);

    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const autofillDevOtp = () => {
    if (devOtp) {
      setOtp(devOtp);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Blur Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '300px',
        height: '300px',
        background: 'var(--accent-primary)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        opacity: 0.15,
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '20%',
        width: '350px',
        height: '350px',
        background: 'var(--accent-secondary)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        opacity: 0.15,
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            marginBottom: '0.5rem',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}>
            SideQuest
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Hyperlocal marketplace for VITians
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--border-radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            lineHeight: 1.4,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Message Alert */}
        {message && !error && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--border-radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            lineHeight: 1.4,
          }}>
            ✓ {message}
          </div>
        )}

        {/* Step 1: Email Request */}
        {step === 'email' ? (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">VIT Email Address</label>
              <input
                className="form-input"
                id="email"
                type="email"
                placeholder="your.name2022@vitstudent.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Only @vitstudent.ac.in and @vit.ac.in domains are permitted.
              </span>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Sending Code...' : 'Get Verification Code'}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">6-Digit Verification Code</label>
              <input
                className="form-input"
                id="otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}
                autoFocus
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'center' }}>
                Sent to: <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>
              </span>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setStep('email');
                setError('');
                setMessage('');
                setDevOtp('');
              }}
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={loading}
            >
              Back to Email
            </button>

            {/* Developer OTP display Helper */}
            {devOtp && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                border: '1px dashed var(--glass-border-focus)',
                borderRadius: 'var(--border-radius-md)',
                background: 'rgba(168, 85, 247, 0.05)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  🛠️ Developer OTP Log
                </p>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '2px', color: '#ffffff', marginBottom: '0.75rem' }}>
                  {devOtp}
                </div>
                <button
                  type="button"
                  onClick={autofillDevOtp}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                >
                  Auto-fill OTP
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
