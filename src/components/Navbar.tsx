import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import NavbarUserBox from './NavbarUserBox';
import { SideQuestWordmark } from './Icons';

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
      zIndex: 200,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Custom Logo Wordmark */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}>
          <SideQuestWordmark size={28} />
        </Link>

        {/* Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}>
          <Link href="/" style={{
            color: 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: '0.95rem',
            transition: 'color var(--transition-fast)'
          }}>
            Browse
          </Link>
          
          {user ? (
            <>
              <Link href={`/profile/${user.username}`} style={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.95rem',
                transition: 'color var(--transition-fast)'
              }}>
                My Quests
              </Link>
              <Link href="/chat" style={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.95rem',
                transition: 'color var(--transition-fast)'
              }}>
                Inbox
              </Link>
            </>
          ) : null}

          <Link href="/leaderboard" style={{
            color: 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: '0.95rem',
            transition: 'color var(--transition-fast)'
          }}>
            Leaderboard
          </Link>

          <Link href="/support" style={{
            color: 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: '0.95rem',
            transition: 'color var(--transition-fast)'
          }}>
            Support
          </Link>
        </nav>

        {/* User Session Info / Auth Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <NavbarUserBox user={user} />
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
