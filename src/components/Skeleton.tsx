'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  borderRadius = '6px',
  style,
}) => {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
    />
  );
};

export const QuestCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel animate-pulse-slow" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="40%" height="1.25rem" />
        <Skeleton width="60px" height="1.5rem" borderRadius="12px" />
      </div>
      <Skeleton width="100%" height="0.85rem" />
      <Skeleton width="85%" height="0.85rem" />
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <Skeleton width="100px" height="2rem" />
        <Skeleton width="80px" height="2rem" />
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', margin: '0.5rem 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Skeleton width={32} height={32} borderRadius="50%" />
          <Skeleton width="80px" height="0.85rem" />
        </div>
        <Skeleton width="90px" height="0.85rem" />
      </div>
    </div>
  );
};

export const LeaderboardSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <Skeleton width="24px" height="1.25rem" />
            <Skeleton width="40px" height="40px" borderRadius="50%" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              <Skeleton width="35%" height="1rem" />
              <Skeleton width="15%" height="0.75rem" />
            </div>
          </div>
          <Skeleton width="80px" height="1.5rem" />
        </div>
      ))}
    </div>
  );
};

export const NotificationSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <Skeleton width="36px" height="36px" borderRadius="50%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <Skeleton width="60%" height="1.1rem" />
            <Skeleton width="95%" height="0.85rem" />
            <Skeleton width="120px" height="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const InboxSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="glass-panel"
          style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="40%" height="0.9rem" />
              <Skeleton width="20px" height="0.75rem" />
            </div>
            <Skeleton width="80%" height="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem' }}>
            <Skeleton width="50%" height="0.85rem" />
            <Skeleton width="30%" height="2rem" style={{ marginTop: '0.5rem' }} />
          </div>
        ))}
      </div>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <Skeleton width="250px" height="1.5rem" style={{ marginBottom: '1.5rem' }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <Skeleton width="30%" height="1rem" />
            <Skeleton width="20%" height="1rem" />
            <Skeleton width="15%" height="1rem" />
          </div>
        ))}
      </div>
    </div>
  );
};
