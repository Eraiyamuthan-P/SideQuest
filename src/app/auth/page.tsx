'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(true);

  const handleGoogleCredentialResponse = async (response: any) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Sign-In failed');
      }
      setMessage('Successfully authenticated with Google!');
      router.refresh();
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogleSignIn = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured in .env');
          return;
        }

        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });

        const container = document.getElementById('google-signin-btn');
        if (container) {
          (window as any).google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 356, // matches typical form card width
          });
        }
      }
    };

    const timer = setTimeout(initGoogleSignIn, 500);
    return () => clearTimeout(timer);
  }, []);

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
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: '2.25rem',
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
            [Warning] {error}
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

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          width: '100%',
        }}>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}>
            Sign in with your official VIT student or admin Google account to access SideQuest.
          </p>

          <div 
            id="google-signin-btn" 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              minHeight: '44px',
              width: '100%',
              overflow: 'hidden',
              borderRadius: 'var(--border-radius-md)'
            }} 
          />
          
          {loading && (
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--accent-secondary)',
              marginTop: '0.5rem',
            }} className="animate-pulse-slow">
              Verifying credentials...
            </p>
          )}
        </div>
      </div>

      {/* Domain Instruction Modal */}
      {showDomainModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(5, 3, 10, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }} className="animate-fade-in">
          <div className="glass-panel" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '2.5rem 2rem',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 20px 50px rgba(168, 85, 247, 0.25)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}>
            <div style={{
              fontSize: '2.5rem',
              display: 'inline-block',
              margin: '0 auto',
            }}>
              🎓
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: '#ffffff' }}>
                VIT Campus Network
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                SideQuest is restricted to Vellore Institute of Technology. 
                Please ensure you sign in with your official university Google account:
              </p>
              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '0.5rem',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  @vitstudent.ac.in
                </span>
                <span style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: 'var(--accent-secondary)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  padding: '0.5rem',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  @vit.ac.in
                </span>
              </div>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '1.25rem',
              }}>
                Attempts to login using personal accounts (Gmail, Yahoo, etc.) will be rejected by the server.
              </p>
            </div>
            
            <button
              onClick={() => setShowDomainModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
            >
              I Understand, Proceed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
