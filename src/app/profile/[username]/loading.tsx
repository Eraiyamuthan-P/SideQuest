import React from 'react';

export default function ProfileLoading() {
  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      
      {/* 1. Header Profile Banner Skeleton */}
      <div className="glass-panel" style={{
        padding: '2.5rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              {/* Username & verified skeleton */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="skeleton animate-pulse-slow" style={{ width: '200px', height: '32px', borderRadius: '8px' }} />
                <div className="skeleton animate-pulse-slow" style={{ width: '100px', height: '24px', borderRadius: '50px' }} />
              </div>
              {/* Email skeleton */}
              <div className="skeleton animate-pulse-slow" style={{ width: '150px', height: '16px', borderRadius: '4px' }} />
            </div>
            
            {/* Rating / Credits placeholders */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="skeleton animate-pulse-slow" style={{ width: '120px', height: '40px', borderRadius: '8px' }} />
              <div className="skeleton animate-pulse-slow" style={{ width: '120px', height: '40px', borderRadius: '8px' }} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

          {/* Bio skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton animate-pulse-slow" style={{ width: '80px', height: '14px' }} />
            <div className="skeleton animate-pulse-slow" style={{ width: '100%', height: '18px' }} />
            <div className="skeleton animate-pulse-slow" style={{ width: '90%', height: '18px' }} />
          </div>

          {/* Joined date / Hostel Block skeleton */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div className="skeleton animate-pulse-slow" style={{ width: '100px', height: '16px' }} />
            <div className="skeleton animate-pulse-slow" style={{ width: '120px', height: '16px' }} />
          </div>
        </div>
      </div>

      {/* 2. Columns (Poster vs Doer) Skeletons */}
      <div className="grid-cols-2">
        {/* Left Column Skeleton */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div className="skeleton animate-pulse-slow" style={{ width: '120px', height: '24px', marginBottom: '1.5rem' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton animate-pulse-slow" style={{ height: '70px', borderRadius: '8px' }} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton animate-pulse-slow" style={{ height: '90px', borderRadius: '8px' }} />
            ))}
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div className="skeleton animate-pulse-slow" style={{ width: '120px', height: '24px', marginBottom: '1.5rem' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton animate-pulse-slow" style={{ height: '70px', borderRadius: '8px' }} />
            ))}
          </div>

          <div className="skeleton animate-pulse-slow" style={{ width: '90px', height: '16px', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton animate-pulse-slow" style={{ width: '110px', height: '30px', borderRadius: '8px' }} />
            ))}
          </div>

          <div className="skeleton animate-pulse-slow" style={{ width: '90px', height: '16px', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton animate-pulse-slow" style={{ width: '70px', height: '24px', borderRadius: '50px' }} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
