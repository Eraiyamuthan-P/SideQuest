'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const isNetworkOffline = typeof window !== 'undefined' && !window.navigator.onLine;

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }} className="route-entrance">
      <div className="glass-panel" style={{
        padding: '3rem 2rem',
        maxWidth: '500px',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        boxShadow: 'var(--glass-shadow)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Banner decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '120px',
          height: '120px',
          background: 'rgba(139, 92, 246, 0.15)',
          filter: 'blur(50px)',
          borderRadius: '50%'
        }} />

        <h1 style={{
          fontSize: '4.5rem',
          margin: 0,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 800,
        }}>
          {isNetworkOffline ? 'Offline' : '500'}
        </h1>
        
        <h2 style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '0.75rem', color: '#ffffff' }}>
          {isNetworkOffline ? 'No Network Connection' : 'Space-Time Disruption'}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {isNetworkOffline 
            ? 'It looks like your device is offline. Please check your campus Wi-Fi or data connection.'
            : 'An unexpected error occurred while loading this page. This could be due to a lost campus network connection or a system timeout.'
          }
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
          >
            Try Again
          </button>
          
          <Link href="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
            Campus Board
          </Link>
        </div>
      </div>
    </div>
  );
}
