'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const KeyboardShortcuts: React.FC = () => {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number>(0);

  useEffect(() => {
    // Retrieve authenticated user metadata to resolve profile shortcuts
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUsername(data.user.username);
          }
        }
      } catch (e) {
        // Silent error
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check if the user is typing inside form elements
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape key to close modals
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('[data-close-modal="true"]') as HTMLButtonElement | null;
        if (closeBtn) {
          closeBtn.click();
        }
        return;
      }

      // / key focuses the main quest search input
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const searchInput = document.getElementById('quest-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // N key routes to new quest creation
      if ((e.key === 'n' || e.key === 'N') && !isInput) {
        e.preventDefault();
        router.push('/tasks/new');
        return;
      }

      // G H or G P sequences
      if (!isInput) {
        const now = Date.now();
        const key = e.key.toLowerCase();

        if (lastKeyPressed === 'g' && now - lastKeyPressTime < 1000) {
          if (key === 'h') {
            e.preventDefault();
            router.push('/');
            setLastKeyPressed(null);
            return;
          } else if (key === 'p') {
            e.preventDefault();
            if (username) {
              router.push(`/profile/${username}`);
            } else {
              router.push('/auth');
            }
            setLastKeyPressed(null);
            return;
          }
        }

        if (key === 'g') {
          setLastKeyPressed('g');
          setLastKeyPressTime(now);
        } else {
          setLastKeyPressed(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [username, lastKeyPressed, lastKeyPressTime, router]);

  return null;
};
