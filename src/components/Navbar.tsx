import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';

export async function Navbar() {
  const user = await getSessionUser();

  return (
    <header style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--glass-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1.5rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em',
        }}>
          SideQuest
        </Link>

        {/* Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}>
          {user && (
            <>
              <Link href="/" style={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.95rem',
                transition: 'color var(--transition-fast)'
              }}>
                Browse
              </Link>
              <Link href="/leaderboard" style={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.95rem',
                transition: 'color var(--transition-fast)'
              }}>
                Leaderboard
              </Link>
              <Link href="/chat" style={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.95rem',
                transition: 'color var(--transition-fast)'
              }}>
                Chat
              </Link>
              <Link href="/support" style={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.95rem',
                transition: 'color var(--transition-fast)'
              }}>
                Support
              </Link>
            </>
          )}
        </nav>

        {/* User Session Info / Auth Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--border-radius-xl)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--warning)',
              }}>
                🪙 {user.credits} Credits
              </div>

              <Link href={`/profile/${user.username}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#ffffff',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--border-radius-md)',
              }}>
                <span>@{user.username}</span>
                {user.verified && (
                  <span style={{
                    color: 'var(--success)',
                    fontSize: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '50px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}>✓</span>
                )}
              </Link>

              <Link href="/settings" style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                transition: 'color var(--transition-fast)'
              }}>
                ⚙️
              </Link>
            </>
          ) : (
            <Link href="/auth" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
