'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
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
        border: '1px solid rgba(239, 68, 68, 0.2)',
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
          background: 'rgba(239, 68, 68, 0.15)',
          filter: 'blur(50px)',
          borderRadius: '50%'
        }} />

        <h1 style={{
          fontSize: '4.5rem',
          margin: 0,
          background: 'linear-gradient(135deg, var(--danger) 0%, #f87171 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 800,
        }}>
          404
        </h1>
        
        <h2 style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '0.75rem', color: '#ffffff' }}>
          Quest Lost in Space
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          This corner of the campus doesn't seem to exist, or the SideQuest was cancelled or completed and archived.
        </p>

        <Link href="/" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
          Return to Campus Board
        </Link>
      </div>
    </div>
  );
}
