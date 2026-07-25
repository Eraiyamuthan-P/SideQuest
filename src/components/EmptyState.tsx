'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  actionLink,
  onActionClick,
}) => {
  return (
    <div
      className="glass-panel route-entrance"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '2rem auto',
        border: '1px dashed var(--glass-border)',
      }}
    >
      {/* Branded Abstract SVG Placeholder Icon */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: 'var(--accent-primary)',
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8" />
        </svg>
      </div>

      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          marginBottom: '2rem',
          maxWidth: '380px',
        }}
      >
        {description}
      </p>

      {actionText && (
        <>
          {actionLink ? (
            <Link href={actionLink} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
              {actionText}
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
            >
              {actionText}
            </button>
          )}
        </>
      )}
    </div>
  );
};
